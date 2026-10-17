/**
 * Script: Download and Store All Images Locally
 *
 * Enhanced version with:
 * - Wikimedia Commons API metadata extraction
 * - Sharp image optimization
 * - License metadata storage in DB
 * - Retry with exponential backoff
 *
 * Usage: npx ts-node scripts/images/download-and-store-all-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import { getImageMetadata, getImageMetadataBatch, downloadWithRetry, optimizeImage } from '../utils/image-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

// Chunk array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Extract search term from old URL
 */
function extractSearchTerm(url: string): string | null {
  const match = url.match(/\/([^\/]+)\.(jpg|png|svg)/i);
  if (!match) return null;

  let filename = decodeURIComponent(match[1]);
  // Remove prefixes: "20150616_Antonio_Conte" -> "Antonio Conte"
  filename = filename.replace(/^\d+px-/, '').replace(/^\d{8}_/, '');
  // Replace underscores with spaces
  filename = filename.replace(/_/g, ' ');
  // Remove year suffix: "Antonio Conte 2023" -> "Antonio Conte"
  filename = filename.replace(/\s+\d{4}$/, '');
  return filename;
}

/**
 * Search for replacement image on Wikimedia Commons
 */
async function searchReplacementImage(oldUrl: string): Promise<string | null> {
  const searchTerm = extractSearchTerm(oldUrl);
  if (!searchTerm) return null;

  try {
    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: `${searchTerm} filetype:bitmap|drawing`,
        gsrnamespace: 6, // File namespace
        gsrlimit: 1, // Just get the best match
        prop: 'imageinfo',
        iiprop: 'url',
      },
      headers: {
        'User-Agent': 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)'
      },
      timeout: 15000,
    });

    const pages = response.data?.query?.pages;
    if (!pages) return null;

    // Get first result
    const pageId = Object.keys(pages)[0];
    const imageUrl = pages[pageId]?.imageinfo?.[0]?.url;

    return imageUrl || null;

  } catch (error) {
    return null;
  }
}

// Image storage directory (frontend public folder)
const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

// Load optimal delay if available
function getOptimalDelay(): number {
  const configPath = path.join(__dirname, 'optimal-delay.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`✅ Using optimal delay from test: ${config.delayMs / 1000}s\n`);
    return config.delayMs;
  }
  console.log(`⚠️  No optimal delay found. Using default: 30s\n`);
  console.log(`   Run test-download-speed-safe.ts first to find optimal delay.\n`);
  return 30000;
}

async function downloadAndStoreAllImages() {
  const prisma = getPrismaClient();
  const DELAY_MS = getOptimalDelay();

  // Track failed images for report
  const failedImages: Array<{
    questionId: number | string;
    questionText: string;
    oldUrl: string;
    error: string;
    searchAttempted: boolean;
  }> = [];

  try {
    console.log('\n========================================');
    console.log('📥 Image Download Pipeline - 2 Phases');
    console.log('========================================\n');
    console.log('Phase 1: Normal downloads + find replacements');
    console.log('Phase 2: Download replacements\n');

    // Create images directory if it doesn't exist
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      console.log(`✅ Created directory: ${IMAGES_DIR}\n`);
    }

    // Get all image questions
    const imageQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { not: null },
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
        mediaSourceUrl: true,
        mediaLicenseAuthor: true,
        mediaLicenseType: true,
        mediaLicenseUrl: true,
      },
    });

    console.log(`Found ${imageQuestions.length} image questions\n`);

    // Pre-process: extract Wikimedia URLs and filter questions needing metadata
    const questionsNeedingMetadata: Array<{ question: typeof imageQuestions[0], wikimediaUrl: string }> = [];

    for (const question of imageQuestions) {
      if (!question.mediaUrl) continue;

      let wikimediaUrl = question.mediaUrl;

      // Extract real URL from proxy
      if (wikimediaUrl.includes('localhost:3000/api/proxy/image?url=')) {
        wikimediaUrl = decodeURIComponent(wikimediaUrl.split('url=')[1] || wikimediaUrl);
      } else if (wikimediaUrl.includes('images.weserv.nl/?url=')) {
        wikimediaUrl = wikimediaUrl.replace('https://images.weserv.nl/?url=', '');
        if (!wikimediaUrl.startsWith('http')) {
          wikimediaUrl = 'https://' + wikimediaUrl;
        }
      }

      // Skip if already local or already has metadata
      if (wikimediaUrl.startsWith('/images/quiz/')) continue;
      if (question.mediaSourceUrl && question.mediaLicenseAuthor) continue;

      questionsNeedingMetadata.push({ question, wikimediaUrl });
    }

    // Batch fetch metadata for all questions needing it
    const metadataCache = new Map<string, any>();

    if (questionsNeedingMetadata.length > 0) {
      console.log(`📦 Fetching metadata in batches for ${questionsNeedingMetadata.length} images...\n`);

      const batches = chunk(questionsNeedingMetadata, 50);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const urls = batch.map(item => item.wikimediaUrl);

        console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: Fetching metadata for ${urls.length} images...`);
        const batchMetadata = await getImageMetadataBatch(urls);

        // Add to cache
        for (const [url, metadata] of batchMetadata.entries()) {
          metadataCache.set(url, metadata);
        }

        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} complete\n`);

        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ All metadata fetched (${metadataCache.size} images)\n`);
    }

    let downloaded = 0;
    let cached = 0;
    let failed = 0;

    // Now process all questions sequentially
    for (const question of imageQuestions) {
      if (!question.mediaUrl) continue;

      // Extract original Wikimedia URL (declare outside try for catch access)
      let wikimediaUrl = question.mediaUrl;

      try {

        // If it's a proxy URL, extract the real URL
        if (wikimediaUrl.includes('localhost:3000/api/proxy/image?url=')) {
          wikimediaUrl = decodeURIComponent(
            wikimediaUrl.split('url=')[1] || wikimediaUrl
          );
        } else if (wikimediaUrl.includes('images.weserv.nl/?url=')) {
          wikimediaUrl = wikimediaUrl.replace('https://images.weserv.nl/?url=', '');
          if (!wikimediaUrl.startsWith('http')) {
            wikimediaUrl = 'https://' + wikimediaUrl;
          }
        }

        // If already a local URL, skip
        if (wikimediaUrl.startsWith('/images/quiz/')) {
          console.log(`⏭️  Already local: ${question.text.substring(0, 60)}...`);
          cached++;
          continue;
        }

        // Clean URL (remove UTM parameters) before generating hash
        const cleanUrl = wikimediaUrl.split('?')[0];
        const hash = crypto.createHash('md5').update(cleanUrl).digest('hex');
        const ext = cleanUrl.split('.').pop() || 'jpg';
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Check if already downloaded
        if (fs.existsSync(filepath) && question.mediaSourceUrl) {
          console.log(`⏭️  Cached: ${question.text.substring(0, 60)}...`);

          // Update URL to local path if needed
          if (!question.mediaUrl.startsWith('/images/quiz/')) {
            await prisma.question.update({
              where: { id: question.id },
              data: { mediaUrl: `/images/quiz/${filename}` },
            });
          }

          cached++;
          continue;
        }

        console.log(`\n📥 Processing: ${question.text.substring(0, 60)}...`);
        console.log(`   From: ${wikimediaUrl.substring(0, 80)}...`);

        // 1. Get metadata (from batch cache, DB cache, or fallback API call)
        let metadata;
        if (question.mediaSourceUrl && question.mediaLicenseAuthor) {
          // Metadata already in DB
          console.log(`   ✓ Using DB cached metadata`);
          metadata = {
            author: question.mediaLicenseAuthor,
            license: question.mediaLicenseType,
            licenseUrl: question.mediaLicenseUrl,
            sourceUrl: question.mediaSourceUrl,
          };
        } else if (metadataCache.has(wikimediaUrl)) {
          // Metadata from batch fetch
          metadata = metadataCache.get(wikimediaUrl);
          console.log(`   ✓ Using batch metadata`);
          console.log(`   📄 Author: ${metadata.author || 'Unknown'}`);
          console.log(`   📜 License: ${metadata.license || 'Unknown'}`);
        } else {
          // Fallback: single API call (shouldn't happen normally)
          console.log(`   🔍 Fetching metadata from API (fallback)...`);
          metadata = await getImageMetadata(wikimediaUrl);
          console.log(`   📄 Author: ${metadata.author || 'Unknown'}`);
          console.log(`   📜 License: ${metadata.license || 'Unknown'}`);
        }

        // 2. Download the image
        console.log(`   ⬇️  Downloading image...`);
        const imageBuffer = await downloadWithRetry(wikimediaUrl);
        console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Optimize the image
        console.log(`   🔧 Optimizing...`);
        const optimizedBuffer = await optimizeImage(imageBuffer, wikimediaUrl);
        const sizeBefore = (imageBuffer.length / 1024).toFixed(1);
        const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
        const savings = ((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(0);
        console.log(`   📊 Optimized: ${sizeBefore} KB → ${sizeAfter} KB (${savings}% saved)`);

        // 4. Save the image
        fs.writeFileSync(filepath, optimizedBuffer);
        console.log(`   💾 Saved: ${filename}`);

        // 5. Update DB with local URL and metadata
        await prisma.question.update({
          where: { id: question.id },
          data: {
            mediaUrl: `/images/quiz/${filename}`,
            mediaLicenseAuthor: metadata.author,
            mediaLicenseType: metadata.license,
            mediaLicenseUrl: metadata.licenseUrl,
            mediaSourceUrl: metadata.sourceUrl,
          },
        });

        console.log(`   ✅ Database updated`);
        downloaded++;

        // Progress
        const total = downloaded + cached;
        const progress = (total / imageQuestions.length * 100).toFixed(1);
        console.log(`   📊 Progress: ${total}/${imageQuestions.length} (${progress}%)`);

        // Add random variation to delay (±20%)
        if (total < imageQuestions.length) {
          const variation = DELAY_MS * 0.2;
          const delay = DELAY_MS + (Math.random() * variation * 2 - variation);
          const remaining = imageQuestions.length - total - failed;
          const estimatedMinutes = (remaining * delay / 1000 / 60).toFixed(0);

          console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s... (${remaining} left, ~${estimatedMinutes} min remaining)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        console.error(`\n❌ Failed: ${question.text.substring(0, 60)}...`);
        console.error(`   Error: ${error.message}`);

        // Check if it's a 404 error (image not found)
        const is404 = error.message && error.message.includes('404');
        let replacementFound = false;

        if (is404) {
          console.log(`   🔍 Searching for replacement image...`);

          try {
            const replacementUrl = await searchReplacementImage(wikimediaUrl);

            if (replacementUrl) {
              console.log(`   ✅ Found replacement!`);
              console.log(`   🔄 New URL: ${replacementUrl.substring(0, 80)}...`);

              // Update URL in database (will be downloaded in Phase 2)
              await prisma.question.update({
                where: { id: question.id },
                data: { mediaUrl: replacementUrl }
              });

              console.log(`   📝 URL updated - will download in Phase 2`);
              replacementFound = true;

            } else {
              console.log(`   ❌ No replacement found`);
            }
          } catch (searchError: any) {
            console.log(`   ⚠️  Search failed: ${searchError.message}`);
          }
        }

        // If no replacement found, disable the question and add to report
        if (!replacementFound) {
          console.log(`   🚫 Disabling question...`);

          await prisma.question.update({
            where: { id: question.id },
            data: {
              enabledForDaily: false,
              enabledForMcq: false
            }
          });

          failedImages.push({
            questionId: question.id,
            questionText: question.text,
            oldUrl: wikimediaUrl,
            error: error.message,
            searchAttempted: is404
          });

          console.log(`   ✅ Question disabled`);
          failed++;
        }

        // Add delay even on failure to avoid hammering the server
        const delay = DELAY_MS;
        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s before next...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n========================================');
    console.log('📊 Phase 1 Complete');
    console.log('========================================');
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Already cached: ${cached}`);
    console.log(`   Failed: ${failed}`);
    console.log('========================================\n');

    // ============================================================
    // PHASE 2: Download Replacements
    // ============================================================

    console.log('========================================');
    console.log('📥 Phase 2: Downloading Replacements');
    console.log('========================================\n');

    // Get all questions with Wikimedia URLs (= replacements found in Phase 1)
    const replacementQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { startsWith: 'https://upload.wikimedia.org/' }
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
        mediaSourceUrl: true,
        mediaLicenseAuthor: true,
        mediaLicenseType: true,
        mediaLicenseUrl: true,
      },
    });

    console.log(`Found ${replacementQuestions.length} replacement images to download\n`);

    if (replacementQuestions.length > 0) {
      // Pre-fetch metadata in batches (like Phase 1)
      const needsMetadata = replacementQuestions.filter(q => !q.mediaSourceUrl || !q.mediaLicenseAuthor);

      if (needsMetadata.length > 0) {
        console.log(`📦 Fetching metadata in batches for ${needsMetadata.length} images...\n`);

        const urlsToFetch = needsMetadata.map(q => q.mediaUrl!);
        const batches = chunk(urlsToFetch, 50);

        for (let i = 0; i < batches.length; i++) {
          console.log(`📦 Batch ${i + 1}/${batches.length}: Fetching metadata for ${batches[i].length} images...`);
          const metadataResults = await getImageMetadataBatch(batches[i]);

          // Store in cache
          for (const [url, metadata] of metadataResults.entries()) {
            metadataCache.set(url, metadata);
          }

          console.log(`✅ Batch ${i + 1}/${batches.length} complete\n`);
        }

        console.log(`✅ All metadata fetched (${batches.length} batches)\n`);
      }

      // Download each replacement
      let replacementsDownloaded = 0;
      let replacementsFailed = 0;

      for (const question of replacementQuestions) {
        const wikimediaUrl = question.mediaUrl!;

        try {
          console.log(`\n📥 Processing replacement: ${question.text.substring(0, 60)}...`);
          console.log(`   From: ${wikimediaUrl.substring(0, 80)}...`);

          // Clean URL
          const cleanUrl = wikimediaUrl.split('?')[0];
          const hash = crypto.createHash('md5').update(cleanUrl).digest('hex');
          const ext = cleanUrl.split('.').pop() || 'jpg';
          const filename = `${hash}.${ext}`;
          const filepath = path.join(IMAGES_DIR, filename);

          // Check if already downloaded
          if (fs.existsSync(filepath)) {
            console.log(`   ⏭️  Already downloaded`);
            replacementsDownloaded++;
            continue;
          }

          // Get metadata (from cache, DB, or API)
          let metadata;
          if (question.mediaSourceUrl && question.mediaLicenseAuthor) {
            metadata = {
              author: question.mediaLicenseAuthor,
              license: question.mediaLicenseType,
              licenseUrl: question.mediaLicenseUrl,
              sourceUrl: question.mediaSourceUrl,
            };
            console.log(`   ✓ Using DB cached metadata`);
          } else if (metadataCache.has(wikimediaUrl)) {
            metadata = metadataCache.get(wikimediaUrl);
            console.log(`   ✓ Using batch metadata`);
          } else {
            console.log(`   🔍 Fetching metadata from API (fallback)...`);
            metadata = await getImageMetadata(wikimediaUrl);
          }

          console.log(`   📄 Author: ${metadata.author || 'Unknown'}`);
          console.log(`   📜 License: ${metadata.license || 'Unknown'}`);

          // Download
          console.log(`   ⬇️  Downloading...`);
          const imageBuffer = await downloadWithRetry(wikimediaUrl);
          console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

          // Optimize
          console.log(`   🔧 Optimizing...`);
          const optimizedBuffer = await optimizeImage(imageBuffer, wikimediaUrl);
          const sizeBefore = (imageBuffer.length / 1024).toFixed(1);
          const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
          const savings = ((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(0);
          console.log(`   📊 Optimized: ${sizeBefore} KB → ${sizeAfter} KB (${savings}% saved)`);

          // Save
          fs.writeFileSync(filepath, optimizedBuffer);
          console.log(`   💾 Saved: ${filename}`);

          // Update DB
          await prisma.question.update({
            where: { id: question.id },
            data: {
              mediaUrl: `/images/quiz/${filename}`,
              mediaLicenseAuthor: metadata.author,
              mediaLicenseType: metadata.license,
              mediaLicenseUrl: metadata.licenseUrl,
              mediaSourceUrl: metadata.sourceUrl,
            },
          });

          console.log(`   ✅ Database updated`);
          replacementsDownloaded++;

          // Progress
          const total = replacementsDownloaded + replacementsFailed;
          const progress = (total / replacementQuestions.length * 100).toFixed(1);
          console.log(`   📊 Progress: ${total}/${replacementQuestions.length} (${progress}%)`);

          // Delay
          if (total < replacementQuestions.length) {
            const variation = DELAY_MS * 0.2;
            const delay = DELAY_MS + (Math.random() * variation * 2 - variation);
            const remaining = replacementQuestions.length - total;
            const estimatedMinutes = (remaining * delay / 1000 / 60).toFixed(0);

            console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s... (${remaining} left, ~${estimatedMinutes} min remaining)`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (error: any) {
          console.error(`\n❌ Replacement failed: ${question.text.substring(0, 60)}...`);
          console.error(`   Error: ${error.message}`);
          replacementsFailed++;

          // Add delay
          const delay = DELAY_MS;
          console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s before next...\n`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log('\n========================================');
      console.log('📊 Phase 2 Complete');
      console.log('========================================');
      console.log(`   Downloaded: ${replacementsDownloaded}`);
      console.log(`   Failed: ${replacementsFailed}`);
      console.log('========================================\n');

      // Update final counts
      downloaded += replacementsDownloaded;
      failed += replacementsFailed;
    }

    // ============================================================
    // FINAL SUMMARY
    // ============================================================

    console.log('\n========================================');
    console.log('📊 Final Summary');
    console.log('========================================');
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Already cached: ${cached}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${imageQuestions.length}`);
    console.log('========================================\n');

    // Generate failed images report
    if (failedImages.length > 0) {
      const reportPath = path.join(__dirname, 'failed-images-report.json');
      const report = {
        date: new Date().toISOString(),
        totalFailed: failedImages.length,
        questions: failedImages
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`📋 Failed Images Report:`);
      console.log(`   Total: ${failedImages.length}`);
      console.log(`   Saved to: ${reportPath}\n`);
    }

    // Show storage size
    if (fs.existsSync(IMAGES_DIR)) {
      const files = fs.readdirSync(IMAGES_DIR);
      let totalSize = 0;
      files.forEach(file => {
        const stats = fs.statSync(path.join(IMAGES_DIR, file));
        totalSize += stats.size;
      });

      console.log(`💾 Total storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📁 Location: ${IMAGES_DIR}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  downloadAndStoreAllImages()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { downloadAndStoreAllImages };

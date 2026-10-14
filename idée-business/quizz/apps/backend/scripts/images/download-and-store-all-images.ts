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

// Chunk array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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

  try {
    console.log('\n========================================');
    console.log('📥 Downloading and Storing All Images');
    console.log('========================================\n');

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

      try {
        // Extract original Wikimedia URL
        let wikimediaUrl = question.mediaUrl;

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

        // Generate filename from hash
        const hash = crypto.createHash('md5').update(wikimediaUrl).digest('hex');
        const ext = wikimediaUrl.split('.').pop()?.split('?')[0] || 'jpg';
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
        failed++;

        // Add delay even on failure to avoid hammering the server
        const delay = DELAY_MS;
        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s before next...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary:');
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Already cached: ${cached}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${imageQuestions.length}`);
    console.log('========================================\n');

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

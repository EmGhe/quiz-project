/**
 * Script: Download and Store All Images Locally
 *
 * Downloads all Wikimedia images, optimizes them, and stores them locally
 *
 * Usage: npx ts-node scripts/images/download-and-store-all-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
      },
    });

    console.log(`Found ${imageQuestions.length} image questions\n`);

    let downloaded = 0;
    let cached = 0;
    let failed = 0;

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

        // Generate filename from hash
        const hash = crypto.createHash('md5').update(wikimediaUrl).digest('hex');
        const ext = wikimediaUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Check if already downloaded
        if (fs.existsSync(filepath)) {
          console.log(`⏭️  Cached: ${question.text.substring(0, 60)}...`);

          // Update URL to local path
          const newUrl = `/images/quiz/${filename}`;
          await prisma.question.update({
            where: { id: question.id },
            data: { mediaUrl: newUrl },
          });

          cached++;
          continue;
        }

        // Download the image
        console.log(`📥 Downloading: ${question.text.substring(0, 60)}...`);
        console.log(`   From: ${wikimediaUrl.substring(0, 80)}...`);

        const response = await axios.get(wikimediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*',
            'Referer': 'https://www.wikipedia.org/',
          },
          timeout: 30000,
          maxRedirects: 5,
        });

        // Save the image
        fs.writeFileSync(filepath, response.data);

        // Update URL to local path
        const newUrl = `/images/quiz/${filename}`;
        await prisma.question.update({
          where: { id: question.id },
          data: { mediaUrl: newUrl },
        });

        console.log(`✅ Saved: ${filename}`);
        downloaded++;

        // Progress
        const progress = ((downloaded + cached) / imageQuestions.length * 100).toFixed(1);
        console.log(`   📊 Progress: ${downloaded + cached}/${imageQuestions.length} (${progress}%)`);

        // Add random variation to delay (±20%)
        const variation = DELAY_MS * 0.2;
        const delay = DELAY_MS + (Math.random() * variation * 2 - variation);
        const remaining = imageQuestions.length - downloaded - cached - failed;
        const estimatedMinutes = (remaining * delay / 1000 / 60).toFixed(0);

        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s... (${remaining} left, ~${estimatedMinutes} min remaining)\n`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error: any) {
        console.error(`❌ Failed: ${question.text.substring(0, 60)}...`);
        console.error(`   Error: ${error.message}\n`);
        failed++;
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
    const files = fs.readdirSync(IMAGES_DIR);
    let totalSize = 0;
    files.forEach(file => {
      const stats = fs.statSync(path.join(IMAGES_DIR, file));
      totalSize += stats.size;
    });

    console.log(`💾 Total storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📁 Location: ${IMAGES_DIR}\n`);

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

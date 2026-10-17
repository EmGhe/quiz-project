/**
 * Fix Corrupted Images
 *
 * Identifies and re-downloads corrupted image files (like the drapeau [34] issue)
 *
 * Usage: npx ts-node scripts/images/fix-corrupted-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import { getImageMetadata, downloadWithRetry, optimizeImage } from '../utils/image-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

async function fixCorruptedImages() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Fix Corrupted Images');
    console.log('========================================\n');

    // Get all image questions with local URLs
    const imageQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { startsWith: '/images/quiz/' },
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
        mediaSourceUrl: true,
        fact: {
          select: {
            data: true
          }
        }
      },
    });

    console.log(`Found ${imageQuestions.length} local images to check\n`);

    let fixed = 0;
    let errors = 0;

    for (const question of imageQuestions) {
      const filename = path.basename(question.mediaUrl!);
      const filepath = path.join(IMAGES_DIR, filename);

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        console.log(`❌ Missing: ${question.text.substring(0, 60)}...`);
        errors++;
        continue;
      }

      // Check if SVG is corrupted (contains binary/non-UTF8 data)
      if (filename.endsWith('.svg')) {
        try {
          const content = fs.readFileSync(filepath, 'utf-8');

          // Valid SVG should contain <svg tag
          if (!content.includes('<svg') && !content.includes('<?xml')) {
            console.log(`\n🔧 Corrupted SVG detected: ${question.text.substring(0, 60)}...`);
            console.log(`   File: ${filename}`);

            // Get original URL from fact.data
            const originalUrl = (question.fact?.data as any)?.flagUrl;

            if (!originalUrl) {
              console.log(`   ❌ No original URL found in fact.data`);
              errors++;
              continue;
            }

            console.log(`   Original URL: ${originalUrl}`);

            // Re-download
            console.log(`   ⬇️  Downloading...`);
            const imageBuffer = await downloadWithRetry(originalUrl);

            // For SVG, no optimization needed
            fs.writeFileSync(filepath, imageBuffer);
            console.log(`   ✅ Fixed: ${filename}`);
            fixed++;

          }
        } catch (error: any) {
          console.log(`❌ Error checking SVG ${filename}: ${error.message}`);
          errors++;
        }
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total checked: ${imageQuestions.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  fixCorruptedImages()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixCorruptedImages };

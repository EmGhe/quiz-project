/**
 * Smart Crop for Portrait Images
 *
 * Re-processes portrait photos (coaches, actors, directors) with intelligent cropping
 * to ensure faces are visible and centered.
 *
 * Strategy:
 * - For portrait photos, use "attention" strategy in Sharp (focuses on most interesting region)
 * - Resize to square format (400x400) to ensure faces are prominent
 * - Fallback to center crop if attention fails
 *
 * Usage: npx ts-node scripts/images/smart-crop-portraits.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import * as fs from 'fs';
import * as path from 'path';
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

/**
 * Smart crop with attention strategy (focuses on faces/interesting regions)
 */
async function smartCropPortrait(buffer: Buffer): Promise<Buffer> {
  try {
    // Get original dimensions
    const metadata = await sharp(buffer).metadata();

    // Strategy: Create a square crop focused on the most interesting region (usually the face)
    // Sharp's "attention" strategy uses edge detection and importance weighting
    const targetSize = 500; // Larger than current 800px width for better face visibility

    const result = await sharp(buffer)
      .resize(targetSize, targetSize, {
        fit: 'cover',               // Crop to fit
        position: 'attention',      // Focus on most interesting region (faces)
      })
      .jpeg({ quality: 90 })        // High quality for portraits
      .toBuffer();

    return result;
  } catch (error: any) {
    console.warn(`Smart crop failed, using original:`, error.message);
    return buffer;
  }
}

async function smartCropPortraits() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🎯 Smart Crop Portrait Images');
    console.log('========================================\n');

    // Find all portrait questions (coaches, actors, directors, etc.)
    const portraitQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { startsWith: '/images/quiz/' },
        OR: [
          { text: { contains: 'entraîneur' } },
          { text: { contains: 'entraineur' } },
          { text: { contains: 'acteur' } },
          { text: { contains: 'actrice' } },
          { text: { contains: 'réalisateur' } },
          { text: { contains: 'réalisatrice' } },
          { text: { contains: 'auteur' } },
          { text: { contains: 'autrice' } },
          { text: { contains: 'peintre' } },
          { text: { contains: 'compositeur' } },
          { text: { contains: 'compositrice' } },
        ]
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
      },
    });

    console.log(`Found ${portraitQuestions.length} portrait images\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const question of portraitQuestions) {
      const filename = path.basename(question.mediaUrl!);
      const filepath = path.join(IMAGES_DIR, filename);

      // Skip SVG files (not portraits)
      if (filename.endsWith('.svg')) {
        skipped++;
        continue;
      }

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        console.log(`❌ Missing: ${filename}`);
        errors++;
        continue;
      }

      try {
        console.log(`\n🎯 Processing: ${question.text.substring(0, 60)}...`);
        console.log(`   File: ${filename}`);

        // Read original file
        const originalBuffer = fs.readFileSync(filepath);
        const originalSize = (originalBuffer.length / 1024).toFixed(1);
        console.log(`   Original: ${originalSize} KB`);

        // Apply smart crop
        console.log(`   🔧 Applying smart crop (attention strategy)...`);
        const croppedBuffer = await smartCropPortrait(originalBuffer);
        const newSize = (croppedBuffer.length / 1024).toFixed(1);
        console.log(`   Result: ${newSize} KB (500x500 square, face-focused)`);

        // Create backup of original
        const backupPath = filepath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.writeFileSync(backupPath, originalBuffer);
          console.log(`   💾 Backup saved: ${filename}.backup`);
        }

        // Save cropped version
        fs.writeFileSync(filepath, croppedBuffer);
        console.log(`   ✅ Saved cropped version`);

        processed++;

      } catch (error: any) {
        console.error(`❌ Error processing ${filename}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${portraitQuestions.length}`);
    console.log('========================================\n');

    console.log('💡 Tip: Original files backed up as .backup');
    console.log('   To restore: for f in *.backup; do mv "$f" "${f%.backup}"; done\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  smartCropPortraits()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { smartCropPortraits };

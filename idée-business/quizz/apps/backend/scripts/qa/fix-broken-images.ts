/**
 * Script: Fix Broken Images
 *
 * Finds questions with broken image URLs and converts them to text questions
 *
 * Usage: npx ts-node scripts/qa/fix-broken-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';

async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, {
      headers: {
        'Range': 'bytes=0-0',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 5000,
      validateStatus: (status) => status === 206 || status === 200 || status === 416,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function fixBrokenImages() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Finding Questions with Broken Images');
    console.log('========================================\n');

    const imageQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { not: null },
        status: 'publie',
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
      },
    });

    console.log(`Found ${imageQuestions.length} image questions to check...\n`);

    const brokenImages: any[] = [];
    let checked = 0;

    for (const q of imageQuestions) {
      checked++;
      if (checked % 50 === 0) {
        console.log(`  Progress: ${checked}/${imageQuestions.length}...`);
      }

      if (!q.mediaUrl) continue;

      const isValid = await checkImageUrl(q.mediaUrl);

      if (!isValid) {
        brokenImages.push(q);
        console.log(`❌ Broken: ${q.text.substring(0, 60)}...`);
        console.log(`   URL: ${q.mediaUrl}\n`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total checked: ${imageQuestions.length}`);
    console.log(`   Broken images: ${brokenImages.length}\n`);

    if (brokenImages.length === 0) {
      console.log('✅ No broken images found!\n');
      return;
    }

    console.log('🔧 Fixing broken images (converting to text questions)...\n');

    for (const q of brokenImages) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          questionType: 'texte',
          mediaUrl: null,
          enabledForDaily: false, // Disable temporarily
        },
      });

      console.log(`✅ Fixed: ${q.text.substring(0, 60)}...`);
    }

    console.log(`\n✅ Fixed ${brokenImages.length} broken images\n`);

    // Export list
    const fs = require('fs');
    const path = require('path');
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const jsonPath = path.join(exportDir, 'broken-images.json');
    fs.writeFileSync(jsonPath, JSON.stringify(brokenImages, null, 2));
    console.log(`📄 List saved to: ${jsonPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  fixBrokenImages()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixBrokenImages };

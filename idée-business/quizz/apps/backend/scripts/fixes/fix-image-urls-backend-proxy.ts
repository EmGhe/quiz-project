/**
 * Script: Fix Image URLs to Use Backend Proxy
 *
 * Updates all image URLs to use our backend proxy instead of external services
 *
 * Usage: npx ts-node scripts/fixes/fix-image-urls-backend-proxy.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function fixImageUrls() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Fixing Image URLs to Use Backend Proxy');
    console.log('========================================\n');

    // Get all questions that were disabled (converted to text) because of broken images
    const brokenImageQuestions = await prisma.question.findMany({
      where: {
        questionType: 'texte',
        mediaUrl: null,
        // These were previously image questions
        text: {
          contains: '[',
        },
      },
      select: {
        id: true,
        text: true,
      },
    });

    console.log(`Found ${brokenImageQuestions.length} potentially broken image questions\n`);

    // Also get questions with weserv proxy that might be broken
    const weservQuestions = await prisma.question.findMany({
      where: {
        mediaUrl: {
          contains: 'images.weserv.nl',
        },
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
      },
    });

    console.log(`Found ${weservQuestions.length} questions using weserv proxy\n`);

    // Load the list of broken images we exported earlier
    const fs = require('fs');
    const path = require('path');
    const brokenImagesPath = path.join(__dirname, '../../exports/broken-images.json');

    if (!fs.existsSync(brokenImagesPath)) {
      console.log('⚠️  No broken-images.json found. Run check-broken-images.ts first.\n');
      return;
    }

    const brokenImagesData = JSON.parse(fs.readFileSync(brokenImagesPath, 'utf-8'));
    console.log(`Loaded ${brokenImagesData.length} broken image records\n`);

    let fixed = 0;

    for (const item of brokenImagesData) {
      const originalUrl = item.mediaUrl;

      // Extract the actual Wikimedia URL from the weserv proxy URL
      let wikimediaUrl = originalUrl;
      if (originalUrl.includes('images.weserv.nl/?url=')) {
        wikimediaUrl = originalUrl.replace('https://images.weserv.nl/?url=', '');
        if (!wikimediaUrl.startsWith('http')) {
          wikimediaUrl = 'https://' + wikimediaUrl;
        }
      }

      // Create new URL using our backend proxy
      const newUrl = `http://localhost:3000/api/proxy/image?url=${encodeURIComponent(wikimediaUrl)}`;

      // Update the question
      await prisma.question.update({
        where: { id: item.id },
        data: {
          questionType: 'image',
          mediaUrl: newUrl,
          enabledForDaily: true, // Re-enable
        },
      });

      console.log(`✅ Fixed: ${item.text.substring(0, 60)}...`);
      console.log(`   Old: ${originalUrl.substring(0, 80)}...`);
      console.log(`   New: ${newUrl.substring(0, 80)}...\n`);
      fixed++;
    }

    console.log(`\n========================================`);
    console.log(`✅ Fixed ${fixed} image URLs`);
    console.log(`========================================\n`);

    console.log('⚠️  NOTE: Images will now be proxied through the backend at:');
    console.log('   http://localhost:3000/api/proxy/image\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  fixImageUrls()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixImageUrls };

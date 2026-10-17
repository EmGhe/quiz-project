/**
 * Script: Convert All Images to Backend Proxy
 *
 * Converts ALL remaining weserv.nl URLs to use our backend proxy
 *
 * Usage: npx ts-node scripts/fixes/convert-all-to-backend-proxy.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function convertAllToBackendProxy() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Converting All Images to Backend Proxy');
    console.log('========================================\n');

    // Get all questions still using weserv
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

    let converted = 0;

    for (const q of weservQuestions) {
      if (!q.mediaUrl) continue;

      // Extract the actual Wikimedia URL from weserv
      let wikimediaUrl = q.mediaUrl.replace('https://images.weserv.nl/?url=', '');

      // Ensure it starts with https://
      if (!wikimediaUrl.startsWith('http')) {
        wikimediaUrl = 'https://' + wikimediaUrl;
      }

      // Create new URL using our backend proxy
      const newUrl = `http://localhost:3000/api/proxy/image?url=${encodeURIComponent(wikimediaUrl)}`;

      // Update the question
      await prisma.question.update({
        where: { id: q.id },
        data: {
          mediaUrl: newUrl,
        },
      });

      console.log(`✅ Converted: ${q.text.substring(0, 60)}...`);
      console.log(`   Old: ${q.mediaUrl.substring(0, 80)}...`);
      console.log(`   New: ${newUrl.substring(0, 80)}...\n`);

      converted++;
    }

    console.log('\n========================================');
    console.log(`✅ Converted ${converted} images to backend proxy`);
    console.log('========================================\n');

    // Verify
    const remaining = await prisma.question.count({
      where: {
        mediaUrl: {
          contains: 'images.weserv.nl',
        },
      },
    });

    console.log(`📊 Verification:`);
    console.log(`   Remaining weserv URLs: ${remaining}`);
    console.log(`   Backend proxy URLs: ${await prisma.question.count({
      where: {
        mediaUrl: {
          contains: 'localhost:3000/api/proxy/image',
        },
      },
    })}`);

    if (remaining === 0) {
      console.log(`\n✅ All images now use the backend proxy!\n`);
    } else {
      console.log(`\n⚠️  ${remaining} images still using weserv\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  convertAllToBackendProxy()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { convertAllToBackendProxy };

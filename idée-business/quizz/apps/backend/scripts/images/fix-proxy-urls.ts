import { getPrismaClient, closePrismaConnection } from '../utils/db';

/**
 * Fix proxy URLs in database
 * Converts: http://localhost:3000/api/proxy/image?url=https%3A%2F%2Fupload.wikimedia.org%2F...
 * To: https://upload.wikimedia.org/...
 */
async function fixProxyUrls() {
  const prisma = getPrismaClient();

  try {
    // Find all questions with proxy URLs
    const proxyQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: {
          startsWith: 'http://localhost:3000/api/proxy/image?url='
        }
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true
      }
    });

    console.log(`\n🔍 Found ${proxyQuestions.length} questions with proxy URLs\n`);

    let fixed = 0;
    let failed = 0;

    for (const question of proxyQuestions) {
      try {
        // Extract URL parameter from proxy URL
        const url = new URL(question.mediaUrl!);
        const wikimediaUrl = url.searchParams.get('url');

        if (!wikimediaUrl) {
          console.log(`❌ No URL parameter found: ${question.text}`);
          failed++;
          continue;
        }

        // Decode the URL
        const decodedUrl = decodeURIComponent(wikimediaUrl);

        // Verify it's a Wikimedia URL
        if (!decodedUrl.startsWith('https://upload.wikimedia.org/')) {
          console.log(`⚠️  Not a Wikimedia URL: ${decodedUrl}`);
          console.log(`   Question: ${question.text}`);
          failed++;
          continue;
        }

        // Update the database
        await prisma.question.update({
          where: { id: question.id },
          data: { mediaUrl: decodedUrl }
        });

        console.log(`✅ Fixed: ${question.text}`);
        console.log(`   From: ${question.mediaUrl}`);
        console.log(`   To:   ${decodedUrl}\n`);
        fixed++;

      } catch (error) {
        console.log(`❌ Error processing: ${question.text}`);
        console.log(`   Error: ${error.message}\n`);
        failed++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${proxyQuestions.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await closePrismaConnection();
  }
}

fixProxyUrls();

/**
 * Script: Use Direct Wikimedia URLs
 *
 * Converts all URLs to direct Wikimedia Commons URLs (they support CORS)
 *
 * Usage: npx ts-node scripts/fixes/use-direct-wikimedia-urls.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';

async function useDirectWikimediaUrls() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Using Direct Wikimedia URLs');
    console.log('========================================\n');

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

    let converted = 0;
    let working = 0;
    let broken = 0;

    for (const q of imageQuestions) {
      if (!q.mediaUrl) continue;

      // Extract original Wikimedia URL
      let wikimediaUrl = q.mediaUrl;

      if (wikimediaUrl.includes('localhost:3000/api/proxy/image?url=')) {
        wikimediaUrl = decodeURIComponent(wikimediaUrl.split('url=')[1]);
      } else if (wikimediaUrl.includes('images.weserv.nl/?url=')) {
        wikimediaUrl = wikimediaUrl.replace('https://images.weserv.nl/?url=', '');
        if (!wikimediaUrl.startsWith('http')) {
          wikimediaUrl = 'https://' + wikimediaUrl;
        }
      }

      // Skip if already a direct URL
      if (!wikimediaUrl.includes('localhost') && !wikimediaUrl.includes('weserv')) {
        console.log(`⏭️  Already direct: ${q.text.substring(0, 60)}...`);
        continue;
      }

      // Test if URL works
      try {
        await axios.head(wikimediaUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        // URL works - use it directly
        await prisma.question.update({
          where: { id: q.id },
          data: { mediaUrl: wikimediaUrl },
        });

        console.log(`✅ Working: ${q.text.substring(0, 60)}...`);
        console.log(`   URL: ${wikimediaUrl.substring(0, 80)}...\n`);
        working++;
        converted++;

      } catch (error: any) {
        // URL broken - disable image
        console.log(`❌ Broken (${error.response?.status || 'timeout'}): ${q.text.substring(0, 60)}...`);
        console.log(`   URL: ${wikimediaUrl.substring(0, 80)}...`);

        await prisma.question.update({
          where: { id: q.id },
          data: {
            questionType: 'texte',
            mediaUrl: null,
            enabledForDaily: false,
          },
        });

        console.log(`   ⚠️  Converted to text question\n`);
        broken++;
        converted++;
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n========================================');
    console.log('📊 Summary:');
    console.log(`   Working URLs: ${working}`);
    console.log(`   Broken URLs (converted to text): ${broken}`);
    console.log(`   Total converted: ${converted}`);
    console.log('========================================\n');

    console.log('✅ All working images now use direct Wikimedia URLs');
    console.log('   No proxy needed - Wikimedia Commons supports CORS!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  useDirectWikimediaUrls()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { useDirectWikimediaUrls };

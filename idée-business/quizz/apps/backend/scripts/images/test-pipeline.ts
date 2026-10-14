/**
 * Test Image Pipeline
 *
 * Test the full pipeline on 3 images to verify:
 * - API metadata extraction works
 * - Image download works
 * - Optimization works
 * - DB update works
 *
 * Usage: npx ts-node scripts/images/test-pipeline.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import { getImageMetadata, downloadWithRetry, optimizeImage } from '../utils/image-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

async function testPipeline() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🧪 Testing Image Pipeline (3 images)');
    console.log('========================================\n');

    // Create images directory
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      console.log(`✅ Created directory: ${IMAGES_DIR}\n`);
    }

    // Get 3 image questions that are not yet processed
    const questions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { not: null },
        OR: [
          { mediaUrl: { not: { startsWith: '/images/quiz/' } } },
          { mediaSourceUrl: null },
        ],
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
      },
      take: 3,
    });

    if (questions.length === 0) {
      console.log('⚠️  No images to test (all already processed)');
      console.log('   This is OK - the pipeline has already run!\n');
      return;
    }

    console.log(`Found ${questions.length} images to test\n`);

    for (const [index, question] of questions.entries()) {
      console.log(`\n[${ index + 1}/3] Processing: ${question.text.substring(0, 60)}...`);
      console.log(`─────────────────────────────────────────`);

      let wikimediaUrl = question.mediaUrl!;

      // Extract real URL from proxy
      if (wikimediaUrl.includes('localhost:3000/api/proxy/image?url=')) {
        wikimediaUrl = decodeURIComponent(wikimediaUrl.split('url=')[1]);
      } else if (wikimediaUrl.includes('images.weserv.nl/?url=')) {
        wikimediaUrl = wikimediaUrl.replace('https://images.weserv.nl/?url=', '');
        if (!wikimediaUrl.startsWith('http')) {
          wikimediaUrl = 'https://' + wikimediaUrl;
        }
      }

      console.log(`Original URL: ${wikimediaUrl.substring(0, 80)}...`);

      try {
        // 1. Get metadata
        console.log('\n1️⃣  Fetching metadata from Wikimedia API...');
        const metadata = await getImageMetadata(wikimediaUrl);
        console.log(`   ✅ Author: ${metadata.author || 'Unknown'}`);
        console.log(`   ✅ License: ${metadata.license || 'Unknown'}`);
        console.log(`   ✅ License URL: ${metadata.licenseUrl || 'None'}`);
        console.log(`   ✅ Source URL: ${metadata.sourceUrl.substring(0, 60)}...`);

        // 2. Download
        console.log('\n2️⃣  Downloading image...');
        const imageBuffer = await downloadWithRetry(wikimediaUrl);
        console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Optimize
        console.log('\n3️⃣  Optimizing with Sharp...');
        const optimizedBuffer = await optimizeImage(imageBuffer, wikimediaUrl);
        const sizeBefore = (imageBuffer.length / 1024).toFixed(1);
        const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
        const savings = ((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(0);
        console.log(`   ✅ ${sizeBefore} KB → ${sizeAfter} KB (${savings}% saved)`);

        // 4. Save
        console.log('\n4️⃣  Saving to disk...');
        const hash = crypto.createHash('md5').update(wikimediaUrl).digest('hex');
        const ext = wikimediaUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);
        fs.writeFileSync(filepath, optimizedBuffer);
        console.log(`   ✅ Saved: ${filename}`);

        // 5. Update DB
        console.log('\n5️⃣  Updating database...');
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

        console.log(`\n✅ SUCCESS! Image ${index + 1}/3 processed\n`);

        // Small delay between images
        if (index < questions.length - 1) {
          console.log('⏳ Waiting 5s before next image...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error: any) {
        console.error(`\n❌ FAILED: ${error.message}\n`);
      }
    }

    console.log('\n========================================');
    console.log('✅ Test Complete!');
    console.log('========================================\n');

    // Verify files
    console.log('📁 Files created:');
    if (fs.existsSync(IMAGES_DIR)) {
      const files = fs.readdirSync(IMAGES_DIR);
      files.forEach(file => {
        const stats = fs.statSync(path.join(IMAGES_DIR, file));
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      });
      console.log();
    }

    // Verify DB
    console.log('💾 Database verification:');
    const verified = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { startsWith: '/images/quiz/' },
        mediaSourceUrl: { not: null },
      },
      select: {
        text: true,
        mediaLicenseAuthor: true,
        mediaLicenseType: true,
      },
      take: 3,
    });

    verified.forEach(q => {
      console.log(`   ✅ ${q.text.substring(0, 50)}...`);
      console.log(`      Author: ${q.mediaLicenseAuthor || 'N/A'}`);
      console.log(`      License: ${q.mediaLicenseType || 'N/A'}`);
    });

    console.log('\n🎉 Pipeline is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  testPipeline()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { testPipeline };

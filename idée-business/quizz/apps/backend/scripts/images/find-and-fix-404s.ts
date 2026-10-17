/**
 * Find and Fix 404 Images
 *
 * Recherche automatiquement des images de remplacement pour les URLs 404
 * en utilisant l'API de recherche Wikimedia Commons.
 *
 * Usage: npx ts-node scripts/images/find-and-fix-404s.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import { getImageMetadata, downloadWithRetry, optimizeImage } from '../utils/image-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

/**
 * Search for replacement image on Wikimedia Commons
 */
async function searchImage(searchTerm: string, year?: number): Promise<string | null> {
  try {
    // Build search query
    let query = `${searchTerm} filetype:bitmap|drawing`;
    if (year) {
      query += ` ${year}`;
    }

    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: 6, // File namespace
        gsrlimit: 5, // Get top 5 results
        prop: 'imageinfo',
        iiprop: 'url|size',
      },
      headers: {
        'User-Agent': 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform)',
      },
      timeout: 15000,
    });

    const pages = response.data?.query?.pages;
    if (!pages) return null;

    // Get first valid result (< 2MB, reasonable dimensions)
    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page?.imageinfo?.[0];

      if (imageInfo) {
        const size = imageInfo.size || 0;
        const url = imageInfo.url;

        // Skip too large files
        if (size > 2 * 1024 * 1024) continue;

        return url;
      }
    }

    return null;
  } catch (error) {
    console.error('Search error:', error);
    return null;
  }
}

async function findAndFix404s() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Finding 404 Images');
    console.log('========================================\n');

    // Read report from previous run
    const reportPath = path.join(__dirname, 'missing-images-report.json');

    if (!fs.existsSync(reportPath)) {
      console.log('❌ No missing-images-report.json found.');
      console.log('   Run fix-missing-images.ts first.\n');
      return;
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const failed404s = report.details.filter((item: any) =>
      item.result === 'failed' &&
      item.error?.includes('404')
    );

    console.log(`Found ${failed404s.length} images with 404 errors\n`);

    if (failed404s.length === 0) {
      console.log('✅ No 404 errors to fix\n');
      return;
    }

    let fixed = 0;
    let stillFailed = 0;

    for (const item of failed404s) {
      const questionId = item.question.id;
      const questionText = item.question.text;

      console.log(`\n🔍 Processing: ${questionText.substring(0, 60)}...`);

      // Get question and answer to build search query
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          fact: true,
          acceptedAnswers: true,
        },
      });

      if (!question) {
        console.log('   ❌ Question not found in DB');
        stillFailed++;
        continue;
      }

      const answer = question.acceptedAnswers[0]?.answer;
      if (!answer) {
        console.log('   ❌ No answer found');
        stillFailed++;
        continue;
      }

      console.log(`   Answer: ${answer}`);
      console.log(`   🔍 Searching Wikimedia Commons...`);

      // Try different search strategies
      let replacementUrl: string | null = null;

      // Strategy 1: Direct name search
      replacementUrl = await searchImage(answer);

      // Strategy 2: Add year if available
      if (!replacementUrl) {
        const factData = question.fact.data as any;
        const year = factData?.year || factData?.birthYear;
        if (year) {
          console.log(`   🔍 Trying with year ${year}...`);
          replacementUrl = await searchImage(answer, year);
        }
      }

      if (!replacementUrl) {
        console.log(`   ❌ No replacement found`);

        // Disable question
        await prisma.question.update({
          where: { id: questionId },
          data: {
            enabledForDaily: false,
            enabledForMcq: false,
          },
        });

        console.log(`   🚫 Question disabled`);
        stillFailed++;
        continue;
      }

      console.log(`   ✅ Found: ${replacementUrl.substring(0, 80)}...`);

      try {
        // Download replacement
        console.log(`   ⬇️  Downloading...`);
        const imageBuffer = await downloadWithRetry(replacementUrl);
        console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

        // Optimize
        console.log(`   🔧 Optimizing...`);
        const optimizedBuffer = await optimizeImage(imageBuffer, replacementUrl);
        const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
        console.log(`   📊 Optimized: ${sizeAfter} KB`);

        // Save
        const cleanUrl = replacementUrl.split('?')[0];
        const hash = crypto.createHash('md5').update(cleanUrl).digest('hex');
        const ext = cleanUrl.split('.').pop() || 'jpg';
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        fs.writeFileSync(filepath, optimizedBuffer);
        console.log(`   💾 Saved: ${filename}`);

        // Get metadata
        console.log(`   📄 Fetching metadata...`);
        const metadata = await getImageMetadata(replacementUrl);

        // Update question
        await prisma.question.update({
          where: { id: questionId },
          data: {
            questionType: 'image',
            mediaUrl: `/images/quiz/${filename}`,
            mediaLicenseAuthor: metadata.author,
            mediaLicenseType: metadata.license,
            mediaLicenseUrl: metadata.licenseUrl,
            mediaSourceUrl: metadata.sourceUrl,
          },
        });

        console.log(`   ✅ Question fixed with replacement image`);
        fixed++;

        // Update fact.data with new URL
        const factData = question.fact.data as any || {};
        const urlField = factData.imageUrl ? 'imageUrl' :
                        factData.directorImageUrl ? 'directorImageUrl' :
                        factData.actorImageUrl ? 'actorImageUrl' : 'imageUrl';

        factData[urlField] = replacementUrl;

        await prisma.fact.update({
          where: { id: question.factId },
          data: { data: factData },
        });

        // Delay between downloads
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error: any) {
        console.error(`   ❌ Failed to download replacement: ${error.message}`);
        stillFailed++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`   Fixed with replacements: ${fixed}`);
    console.log(`   Still failed: ${stillFailed}`);
    console.log(`   Total 404s: ${failed404s.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  findAndFix404s()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { findAndFix404s };

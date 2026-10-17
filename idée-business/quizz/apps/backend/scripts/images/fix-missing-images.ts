/**
 * Fix Missing or Broken Image Questions
 *
 * Détecte et corrige :
 * 1. Questions "image" avec mediaUrl corrompu/invalide
 * 2. Questions "texte" qui devraient être "image" (ont une URL dans fact.data)
 * 3. Fichiers images manquants
 *
 * Usage: npx ts-node scripts/images/fix-missing-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import { getImageMetadata, downloadWithRetry, optimizeImage } from '../utils/image-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

interface FixReport {
  question: {
    id: string;
    text: string;
    currentType: string;
    currentMediaUrl: string | null;
  };
  issue: string;
  action: string;
  result: 'success' | 'failed';
  error?: string;
}

async function fixMissingImages() {
  const prisma = getPrismaClient();
  const report: FixReport[] = [];

  try {
    console.log('\n========================================');
    console.log('🔍 Detecting Image Issues');
    console.log('========================================\n');

    // 1. Find questions with "image" type but corrupted/missing mediaUrl
    const imageQuestions = await prisma.question.findMany({
      where: {
        questionType: 'image',
      },
      include: {
        fact: true,
        acceptedAnswers: true,
      },
    });

    console.log(`Found ${imageQuestions.length} image questions\n`);

    // 2. Find questions with "texte" type but should be "image"
    const textQuestions = await prisma.question.findMany({
      where: {
        questionType: 'texte',
        text: {
          contains: 'Qui est c',
        },
      },
      include: {
        fact: true,
        acceptedAnswers: true,
      },
    });

    console.log(`Found ${textQuestions.length} text questions to check\n`);

    let fixed = 0;
    let failed = 0;

    // Process image questions with issues
    for (const question of imageQuestions) {
      const mediaUrl = question.mediaUrl;

      // Check for corrupted mediaUrl (invalid filename)
      if (mediaUrl && (
        mediaUrl.includes('utm_campaign') ||
        mediaUrl.includes('&') ||
        !mediaUrl.match(/\.(jpg|jpeg|png|svg)$/i)
      )) {
        console.log(`\n🔧 Corrupted mediaUrl: ${question.text.substring(0, 60)}...`);
        console.log(`   Current: ${mediaUrl}`);

        const reportEntry: FixReport = {
          question: {
            id: question.id,
            text: question.text,
            currentType: question.questionType,
            currentMediaUrl: mediaUrl,
          },
          issue: 'Corrupted mediaUrl',
          action: '',
          result: 'failed',
        };

        // Try to find original URL in fact.data
        const factData = question.fact.data as any;
        const originalUrl = factData?.imageUrl || factData?.directorImageUrl || factData?.actorImageUrl;

        if (!originalUrl) {
          console.log(`   ❌ No original URL found in fact.data`);
          reportEntry.action = 'No original URL available';
          reportEntry.error = 'Missing original URL in fact.data';
          report.push(reportEntry);
          failed++;
          continue;
        }

        try {
          console.log(`   Original: ${originalUrl}`);

          // Download and optimize
          console.log(`   ⬇️  Downloading...`);
          const imageBuffer = await downloadWithRetry(originalUrl);
          console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

          console.log(`   🔧 Optimizing...`);
          const optimizedBuffer = await optimizeImage(imageBuffer, originalUrl);
          const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
          console.log(`   📊 Optimized: ${sizeAfter} KB`);

          // Save with correct hash
          const cleanUrl = originalUrl.split('?')[0];
          const hash = crypto.createHash('md5').update(cleanUrl).digest('hex');
          const ext = cleanUrl.split('.').pop() || 'jpg';
          const filename = `${hash}.${ext}`;
          const filepath = path.join(IMAGES_DIR, filename);

          fs.writeFileSync(filepath, optimizedBuffer);
          console.log(`   💾 Saved: ${filename}`);

          // Get metadata
          console.log(`   📄 Fetching metadata...`);
          const metadata = await getImageMetadata(originalUrl);

          // Update question
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

          console.log(`   ✅ Question updated`);

          reportEntry.action = `Re-downloaded and fixed mediaUrl → ${filename}`;
          reportEntry.result = 'success';
          report.push(reportEntry);
          fixed++;

        } catch (error: any) {
          console.error(`   ❌ Failed: ${error.message}`);
          reportEntry.action = 'Attempted re-download';
          reportEntry.error = error.message;
          report.push(reportEntry);
          failed++;
        }
      }

      // Check for missing file
      else if (mediaUrl && mediaUrl.startsWith('/images/quiz/')) {
        const filename = path.basename(mediaUrl);
        const filepath = path.join(IMAGES_DIR, filename);

        if (!fs.existsSync(filepath)) {
          console.log(`\n🔧 Missing file: ${question.text.substring(0, 60)}...`);
          console.log(`   File: ${filename}`);

          const reportEntry: FixReport = {
            question: {
              id: question.id,
              text: question.text,
              currentType: question.questionType,
              currentMediaUrl: mediaUrl,
            },
            issue: 'Missing file',
            action: '',
            result: 'failed',
          };

          // Try to re-download from original URL
          const factData = question.fact.data as any;
          const originalUrl = factData?.imageUrl || factData?.directorImageUrl || factData?.actorImageUrl;

          if (!originalUrl) {
            console.log(`   ❌ No original URL found in fact.data`);
            reportEntry.action = 'Disabled question (no original URL)';
            reportEntry.error = 'Missing original URL';

            await prisma.question.update({
              where: { id: question.id },
              data: {
                enabledForDaily: false,
                enabledForMcq: false,
              },
            });

            report.push(reportEntry);
            failed++;
            continue;
          }

          try {
            console.log(`   Original: ${originalUrl}`);
            console.log(`   ⬇️  Downloading...`);
            const imageBuffer = await downloadWithRetry(originalUrl);
            const optimizedBuffer = await optimizeImage(imageBuffer, originalUrl);
            fs.writeFileSync(filepath, optimizedBuffer);
            console.log(`   ✅ File restored: ${filename}`);

            reportEntry.action = `Re-downloaded missing file`;
            reportEntry.result = 'success';
            report.push(reportEntry);
            fixed++;

          } catch (error: any) {
            console.error(`   ❌ Failed: ${error.message}`);
            reportEntry.action = 'Attempted re-download';
            reportEntry.error = error.message;
            report.push(reportEntry);
            failed++;
          }
        }
      }
    }

    // Process text questions that should be image questions
    for (const question of textQuestions) {
      const factData = question.fact.data as any;
      const imageUrl = factData?.imageUrl || factData?.directorImageUrl || factData?.actorImageUrl;

      // Skip if no image URL in fact
      if (!imageUrl) continue;

      // Skip if already has mediaUrl (shouldn't happen but safety check)
      if (question.mediaUrl) continue;

      console.log(`\n🔧 Converting to image question: ${question.text.substring(0, 60)}...`);
      console.log(`   Current type: ${question.questionType}`);
      console.log(`   Image URL: ${imageUrl}`);

      const reportEntry: FixReport = {
        question: {
          id: question.id,
          text: question.text,
          currentType: question.questionType,
          currentMediaUrl: null,
        },
        issue: 'Text question with image in fact.data',
        action: '',
        result: 'failed',
      };

      try {
        // Download and optimize
        console.log(`   ⬇️  Downloading...`);
        const imageBuffer = await downloadWithRetry(imageUrl);
        console.log(`   ✅ Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

        console.log(`   🔧 Optimizing...`);
        const optimizedBuffer = await optimizeImage(imageBuffer, imageUrl);
        const sizeAfter = (optimizedBuffer.length / 1024).toFixed(1);
        console.log(`   📊 Optimized: ${sizeAfter} KB`);

        // Save
        const cleanUrl = imageUrl.split('?')[0];
        const hash = crypto.createHash('md5').update(cleanUrl).digest('hex');
        const ext = cleanUrl.split('.').pop() || 'jpg';
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        fs.writeFileSync(filepath, optimizedBuffer);
        console.log(`   💾 Saved: ${filename}`);

        // Get metadata
        console.log(`   📄 Fetching metadata...`);
        const metadata = await getImageMetadata(imageUrl);

        // Update question to image type
        await prisma.question.update({
          where: { id: question.id },
          data: {
            questionType: 'image',
            mediaUrl: `/images/quiz/${filename}`,
            mediaLicenseAuthor: metadata.author,
            mediaLicenseType: metadata.license,
            mediaLicenseUrl: metadata.licenseUrl,
            mediaSourceUrl: metadata.sourceUrl,
          },
        });

        console.log(`   ✅ Converted to image question`);

        reportEntry.action = `Converted to image + downloaded → ${filename}`;
        reportEntry.result = 'success';
        report.push(reportEntry);
        fixed++;

      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        reportEntry.action = 'Attempted conversion';
        reportEntry.error = error.message;
        report.push(reportEntry);
        failed++;
      }

      // Small delay between downloads
      if (fixed + failed < textQuestions.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total issues: ${report.length}`);
    console.log('========================================\n');

    // Save report
    if (report.length > 0) {
      const reportPath = path.join(__dirname, 'missing-images-report.json');
      const reportData = {
        date: new Date().toISOString(),
        totalIssues: report.length,
        fixed,
        failed,
        details: report,
      };

      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📋 Report saved: ${reportPath}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  fixMissingImages()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixMissingImages };

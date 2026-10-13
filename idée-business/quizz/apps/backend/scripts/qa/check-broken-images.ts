/**
 * Script: Check Broken Images
 *
 * Tests all mediaUrl to identify broken image links
 *
 * Usage: npx ts-node scripts/qa/check-broken-images.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';

async function checkImageUrl(url: string): Promise<boolean> {
  try {
    // Use GET with range header to minimize bandwidth
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'Range': 'bytes=0-0',
      },
      validateStatus: (status) => status === 200 || status === 206, // 206 = Partial Content
    });
    return response.status === 200 || response.status === 206;
  } catch (error) {
    // If range request fails, try a simple HEAD request
    try {
      const headResponse = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });
      return headResponse.status === 200;
    } catch {
      return false;
    }
  }
}

async function checkBrokenImages() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Checking for Broken Image URLs');
    console.log('========================================\n');

    // Get all questions with media
    const questionsWithMedia = await prisma.question.findMany({
      where: {
        mediaUrl: { not: null },
        status: 'publie',
      },
      include: {
        category: {
          select: { name: true },
        },
        acceptedAnswers: {
          where: { isPrimary: true },
        },
      },
    });

    console.log(`📊 Found ${questionsWithMedia.length} questions with media URLs\n`);

    const broken: any[] = [];
    const working: any[] = [];

    let checked = 0;

    for (const question of questionsWithMedia) {
      if (!question.mediaUrl) continue;

      checked++;
      console.log(`[${checked}/${questionsWithMedia.length}] Checking: ${question.text.substring(0, 50)}...`);
      console.log(`   URL: ${question.mediaUrl}`);

      const isWorking = await checkImageUrl(question.mediaUrl);

      if (isWorking) {
        console.log(`   ✅ OK\n`);
        working.push(question);
      } else {
        console.log(`   ❌ BROKEN\n`);
        broken.push(question);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('📊 Results:');
    console.log(`   ✅ Working: ${working.length}`);
    console.log(`   ❌ Broken: ${broken.length}`);
    console.log('========================================\n');

    if (broken.length > 0) {
      console.log('🔴 Broken Images:\n');

      broken.forEach((q, index) => {
        const answer = q.acceptedAnswers[0]?.answer || 'N/A';
        console.log(`${index + 1}. ${q.text}`);
        console.log(`   Answer: ${answer}`);
        console.log(`   Category: ${q.category?.name || 'N/A'}`);
        console.log(`   URL: ${q.mediaUrl}`);
        console.log(`   ID: ${q.id}\n`);
      });

      // Export to JSON
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(__dirname, '../../exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const jsonPath = path.join(exportDir, 'broken-images.json');
      const exportData = {
        summary: {
          total: questionsWithMedia.length,
          working: working.length,
          broken: broken.length,
        },
        brokenImages: broken.map(q => ({
          id: q.id,
          text: q.text,
          answer: q.acceptedAnswers[0]?.answer || 'N/A',
          category: q.category?.name || 'N/A',
          currentUrl: q.mediaUrl,
          suggestedFix: `Find new image for: ${q.acceptedAnswers[0]?.answer || q.text}`,
        })),
      };

      fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
      console.log(`✅ Report saved to: ${jsonPath}\n`);
    }

    return {
      total: questionsWithMedia.length,
      working: working.length,
      broken: broken.length,
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Execute if run directly
if (require.main === module) {
  checkBrokenImages()
    .then((result) => {
      console.log('✅ Check complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkBrokenImages };

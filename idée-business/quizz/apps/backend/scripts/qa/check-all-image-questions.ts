/**
 * Script: Check All Image Questions
 *
 * Verifies the current state of all image questions
 *
 * Usage: npx ts-node scripts/qa/check-all-image-questions.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function checkAllImageQuestions() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Checking All Image Questions');
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
        status: true,
        enabledForDaily: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Total image questions: ${imageQuestions.length}\n`);

    // Categorize by URL type
    const categories = {
      backendProxy: [] as any[],
      weservProxy: [] as any[],
      directWikimedia: [] as any[],
      other: [] as any[],
    };

    imageQuestions.forEach(q => {
      if (!q.mediaUrl) return;

      if (q.mediaUrl.includes('localhost:3000/api/proxy/image')) {
        categories.backendProxy.push(q);
      } else if (q.mediaUrl.includes('images.weserv.nl')) {
        categories.weservProxy.push(q);
      } else if (q.mediaUrl.includes('wikimedia.org') || q.mediaUrl.includes('wikipedia.org')) {
        categories.directWikimedia.push(q);
      } else {
        categories.other.push(q);
      }
    });

    console.log('📊 Image URLs by type:\n');

    console.log(`✅ Backend Proxy (safe): ${categories.backendProxy.length}`);
    console.log(`   These images use our backend proxy and should work\n`);

    console.log(`⚠️  Weserv Proxy (may fail): ${categories.weservProxy.length}`);
    if (categories.weservProxy.length > 0) {
      console.log(`   These still use weserv.nl and may fail for /en/ URLs`);
      console.log(`   First 5 examples:`);
      categories.weservProxy.slice(0, 5).forEach(q => {
        console.log(`   - ${q.text.substring(0, 60)}...`);
        console.log(`     ${q.mediaUrl.substring(0, 100)}...`);
      });
      console.log('');
    }

    console.log(`⚠️  Direct Wikimedia (CORS issues): ${categories.directWikimedia.length}`);
    if (categories.directWikimedia.length > 0) {
      console.log(`   These use direct Wikimedia URLs which will have CORS issues`);
      console.log(`   First 5 examples:`);
      categories.directWikimedia.slice(0, 5).forEach(q => {
        console.log(`   - ${q.text.substring(0, 60)}...`);
        console.log(`     ${q.mediaUrl.substring(0, 100)}...`);
      });
      console.log('');
    }

    console.log(`❓ Other URLs: ${categories.other.length}`);
    if (categories.other.length > 0) {
      console.log(`   First 5 examples:`);
      categories.other.slice(0, 5).forEach(q => {
        console.log(`   - ${q.text.substring(0, 60)}...`);
        console.log(`     ${q.mediaUrl.substring(0, 100)}...`);
      });
      console.log('');
    }

    // Summary
    console.log('\n========================================');
    console.log('📋 Summary:');
    console.log('========================================\n');

    const problematic = categories.weservProxy.length + categories.directWikimedia.length;
    const safe = categories.backendProxy.length;

    console.log(`✅ Safe (backend proxy): ${safe} (${((safe/imageQuestions.length)*100).toFixed(1)}%)`);
    console.log(`⚠️  Potentially problematic: ${problematic} (${((problematic/imageQuestions.length)*100).toFixed(1)}%)`);

    if (problematic > 0) {
      console.log(`\n⚠️  Recommendation: Convert ${problematic} questions to use backend proxy\n`);
    } else {
      console.log(`\n✅ All images are using the backend proxy!\n`);
    }

    // Status breakdown
    console.log('\n📊 By status:');
    const byStatus: Record<string, number> = {};
    imageQuestions.forEach(q => {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1;
    });
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n📊 Enabled for Daily:');
    const enabledCount = imageQuestions.filter(q => q.enabledForDaily).length;
    console.log(`   Yes: ${enabledCount}`);
    console.log(`   No: ${imageQuestions.length - enabledCount}\n`);

    // Export problematic ones
    if (problematic > 0) {
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const exportData = {
        weservProxy: categories.weservProxy,
        directWikimedia: categories.directWikimedia,
        total: problematic,
      };

      const jsonPath = path.join(exportDir, 'problematic-image-urls.json');
      fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
      console.log(`📄 Problematic URLs exported to: ${jsonPath}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  checkAllImageQuestions()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkAllImageQuestions };

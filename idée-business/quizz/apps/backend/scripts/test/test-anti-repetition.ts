/**
 * Script: Test Anti-Repetition System
 *
 * Tests the anti-repetition system by simulating multiple days
 *
 * Usage: npx ts-node scripts/test/test-anti-repetition.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function testAntiRepetition() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🧪 Testing Anti-Repetition System');
    console.log('========================================\n');

    // Get current dailies
    const existingDailies = await prisma.daily.findMany({
      take: 7,
      orderBy: { dailyNumber: 'desc' },
      include: {
        questions: {
          select: { questionId: true },
        },
      },
    });

    console.log(`Current dailies in DB: ${existingDailies.length}\n`);

    existingDailies.forEach(d => {
      const questionIds = d.questions.map(q => q.questionId);
      console.log(`Daily #${d.dailyNumber} (${d.date}):`);
      console.log(`  Questions: ${questionIds.length}`);
      console.log(`  IDs: ${questionIds.slice(0, 3).join(', ')}...`);
    });

    // Check for duplicates between consecutive dailies
    console.log('\n🔍 Checking for duplicates...\n');

    let totalDuplicates = 0;

    for (let i = 0; i < existingDailies.length - 1; i++) {
      const daily1 = existingDailies[i];
      const daily2 = existingDailies[i + 1];

      const questions1 = new Set(daily1.questions.map(q => q.questionId));
      const questions2 = new Set(daily2.questions.map(q => q.questionId));

      const duplicates = [...questions1].filter(qId => questions2.has(qId));

      if (duplicates.length > 0) {
        console.log(`❌ Daily #${daily1.dailyNumber} & #${daily2.dailyNumber}: ${duplicates.length} duplicates`);
        totalDuplicates += duplicates.length;

        // Show duplicate questions
        for (const qId of duplicates.slice(0, 3)) {
          const q = await prisma.question.findUnique({
            where: { id: qId },
            select: { text: true },
          });
          console.log(`     "${q?.text.substring(0, 60)}..."`);
        }
      } else {
        console.log(`✅ Daily #${daily1.dailyNumber} & #${daily2.dailyNumber}: No duplicates`);
      }
    }

    console.log(`\n📊 Total duplicates found: ${totalDuplicates}`);

    if (totalDuplicates === 0) {
      console.log('✅ Anti-repetition system working correctly!\n');
    } else {
      console.log('⚠️  Anti-repetition system needs adjustment\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  testAntiRepetition()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { testAntiRepetition };

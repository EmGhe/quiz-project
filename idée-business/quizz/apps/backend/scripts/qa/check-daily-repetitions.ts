/**
 * Script: Check Daily Repetitions
 *
 * Checks for repeated questions across recent dailies
 *
 * Usage: npx ts-node scripts/qa/check-daily-repetitions.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function checkDailyRepetitions() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Checking Daily Repetitions');
    console.log('========================================\n');

    const recentDailies = await prisma.daily.findMany({
      take: 10,
      orderBy: { dailyNumber: 'desc' },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    console.log(`Found ${recentDailies.length} recent dailies\n`);

    // Check consecutive dailies for duplicates
    for (let i = 0; i < recentDailies.length - 1; i++) {
      const daily1 = recentDailies[i];
      const daily2 = recentDailies[i + 1];

      const questions1 = new Set(daily1.questions.map(q => q.questionId));
      const questions2 = new Set(daily2.questions.map(q => q.questionId));

      const duplicates = [...questions1].filter(qId => questions2.has(qId));

      if (duplicates.length > 0) {
        console.log(`⚠️  Daily #${daily1.dailyNumber} (${daily1.date}) and Daily #${daily2.dailyNumber} (${daily2.date}):`);
        console.log(`   ${duplicates.length} duplicate question(s):`);

        duplicates.forEach(qId => {
          const question = daily1.questions.find(q => q.questionId === qId)?.question;
          console.log(`   - "${question?.text.substring(0, 80)}..."`);
        });
        console.log('');
      }
    }

    // Check within last 7 dailies for any duplicates
    if (recentDailies.length >= 7) {
      const last7 = recentDailies.slice(0, 7);
      const questionCounts = new Map<string, number>();

      last7.forEach(daily => {
        daily.questions.forEach(q => {
          questionCounts.set(q.questionId, (questionCounts.get(q.questionId) || 0) + 1);
        });
      });

      const repeated = Array.from(questionCounts.entries()).filter(([_, count]) => count > 1);

      if (repeated.length > 0) {
        console.log(`\n📊 Questions appearing multiple times in last 7 dailies:`);
        repeated.forEach(([qId, count]) => {
          const question = recentDailies[0].questions.find(q => q.questionId === qId)?.question ||
                          recentDailies[1].questions.find(q => q.questionId === qId)?.question ||
                          recentDailies[2].questions.find(q => q.questionId === qId)?.question;
          console.log(`   [${count}x] "${question?.text.substring(0, 80)}..."`);
        });
        console.log('');
      } else {
        console.log('✅ No repeated questions in last 7 dailies\n');
      }
    }

    // Show each daily
    console.log('\n📅 Recent Dailies:');
    recentDailies.forEach(daily => {
      console.log(`\n  Daily #${daily.dailyNumber} (${daily.date}):`);
      daily.questions.forEach(q => {
        console.log(`    ${q.order}. ${q.question.text.substring(0, 80)}...`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  checkDailyRepetitions()
    .then(() => {
      console.log('\n✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkDailyRepetitions };

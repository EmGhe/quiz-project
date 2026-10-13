import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`🔄 Resetting Daily for ${today}...\n`);

  // Find today's daily
  const daily = await prisma.daily.findUnique({
    where: { date: today },
    include: {
      _count: {
        select: {
          submissions: true,
          questions: true,
        },
      },
    },
  });

  if (!daily) {
    console.log('❌ No Daily found for today. Nothing to reset.');
    return;
  }

  console.log(`Found Daily #${daily.dailyNumber}:`);
  console.log(`  - ${daily._count.questions} questions`);
  console.log(`  - ${daily._count.submissions} submissions\n`);

  // Delete today's daily (cascade will delete submissions and daily_questions)
  await prisma.daily.delete({
    where: { id: daily.id },
  });

  console.log(`✅ Daily #${daily.dailyNumber} deleted!`);
  console.log(`\nA new Daily will be generated automatically when you visit /api/daily/today`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

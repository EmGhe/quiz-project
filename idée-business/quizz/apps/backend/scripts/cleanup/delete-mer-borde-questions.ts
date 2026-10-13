import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting "Quelle mer borde..." questions...\n');

  // Find all questions starting with "Quelle mer borde"
  const questionsToDelete = await prisma.question.findMany({
    where: {
      text: {
        startsWith: 'Quelle mer borde'
      }
    },
    include: {
      acceptedAnswers: true,
    }
  });

  console.log(`Found ${questionsToDelete.length} questions to delete:\n`);

  questionsToDelete.forEach(q => {
    const answer = q.acceptedAnswers.find(a => a.isPrimary)?.answer;
    console.log(`❌ ${q.text} → ${answer}`);
  });

  if (questionsToDelete.length === 0) {
    console.log('✅ No questions to delete');
    return;
  }

  console.log('\n⚠️  Deleting in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete questions
  for (const question of questionsToDelete) {
    await prisma.distractor.deleteMany({ where: { questionId: question.id } });
    await prisma.acceptedAnswer.deleteMany({ where: { questionId: question.id } });
    await prisma.dailyQuestion.deleteMany({ where: { questionId: question.id } });
    await prisma.questionMetadata.deleteMany({ where: { questionId: question.id } });
    await prisma.question.delete({ where: { id: question.id } });
  }

  console.log(`\n✅ Deleted ${questionsToDelete.length} questions`);

  const total = await prisma.question.count({ where: { status: 'publie' } });
  console.log(`\n📊 Total remaining: ${total} questions`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

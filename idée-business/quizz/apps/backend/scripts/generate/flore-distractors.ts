import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌺 Generating flore distractors...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'flore-plantes' },
    include: {
      questions: {
        where: { status: 'publie' },
        include: { fact: true, distractors: true },
      },
    },
  });

  if (!category) throw new Error('Category not found');

  const allFacts = await prisma.fact.findMany({
    where: { categoryId: category.id },
  });

  let created = 0;

  for (const question of category.questions) {
    if (question.distractors.length > 0) continue;

    const correctAnswer = (question.fact.data as any)?.answer || question.fact.object;
    const otherFacts = allFacts.filter((f) => {
      const factAnswer = (f.data as any)?.answer || f.object;
      return factAnswer !== correctAnswer;
    });

    const shuffled = otherFacts.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3).map((f) => (f.data as any)?.answer || f.object);

    for (let i = 0; i < distractors.length; i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: distractors[i],
          order: i + 1,
          plausibilityScore: 80,
        },
      });
    }

    await prisma.question.update({
      where: { id: question.id },
      data: { enabledForMcq: true },
    });

    created++;
    console.log(`✅ ${question.text}`);
  }

  console.log(`\n✅ ${created} questions updated`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

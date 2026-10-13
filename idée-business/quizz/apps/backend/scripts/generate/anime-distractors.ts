import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎌 Generating anime distractors...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'animation-japonaise' },
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

    const questionType = (question.fact.data as any)?.questionType;
    const correctAnswer = questionType === 'character_name'
      ? (question.fact.data as any)?.character
      : (question.fact.data as any)?.anime;

    // Get distractors based on question type
    const otherFacts = allFacts.filter((f) => {
      const factType = (f.data as any)?.questionType;
      if (factType !== questionType) return false;

      const factAnswer = questionType === 'character_name'
        ? (f.data as any)?.character
        : (f.data as any)?.anime;

      return factAnswer !== correctAnswer;
    });

    const shuffled = otherFacts.sort(() => Math.random() - 0.5);
    const selectedFacts = shuffled.slice(0, 3);

    for (let i = 0; i < selectedFacts.length; i++) {
      const distractorAnswer = questionType === 'character_name'
        ? (selectedFacts[i].data as any)?.character
        : (selectedFacts[i].data as any)?.anime;

      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: distractorAnswer,
          order: i + 1,
          plausibilityScore: 85,
        },
      });
    }

    await prisma.question.update({
      where: { id: question.id },
      data: { enabledForMcq: true },
    });

    created++;
    console.log(`✅ ${question.text.substring(0, 60)}...`);
  }

  console.log(`\n✅ ${created} questions updated with distractors`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

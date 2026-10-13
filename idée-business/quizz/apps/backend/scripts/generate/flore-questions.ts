import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌺 Generating flore questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'flore-plantes' },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id },
  });

  let created = 0;
  let skipped = 0;
  let questionNumber = 1;

  for (const fact of facts) {
    const answer = (fact.data as any)?.answer || fact.object;
    const mediaUrl = (fact.data as any)?.mediaUrl;

    const questionText = `Quelle est cette plante ? [${questionNumber}]`;
    questionNumber++;

    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const question = await prisma.question.create({
      data: {
        text: questionText,
        questionType: 'image',
        mediaUrl,
        difficulty: 'moyen',
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: false,
      },
    });

    // Accepted answers
    const variants = [
      { answer, isPrimary: true, variantType: 'exacte' },
      { answer: answer.toLowerCase(), isPrimary: false, variantType: 'casse' },
    ];

    for (const variant of variants) {
      await prisma.acceptedAnswer.create({
        data: {
          questionId: question.id,
          answer: variant.answer,
          isPrimary: variant.isPrimary,
          variantType: variant.variantType,
          levenshteinThreshold: answer.length <= 5 ? 1 : 2,
        },
      });
    }

    created++;
    console.log(`✅ ${questionText} → ${answer}`);
  }

  console.log(`\n✅ ${created} questions created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

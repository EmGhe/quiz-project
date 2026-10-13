import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚽ Generating football coaches questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'sports-football' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'football_coach_photo' },
  });

  let created = 0;
  let questionNumber = 1;

  for (const fact of facts) {
    const name = (fact.data as any)?.name;
    const mediaUrl = (fact.data as any)?.mediaUrl;

    const questionText = `Qui est cet entraîneur de football ? [${questionNumber}]`;
    questionNumber++;

    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) continue;

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

    // Accepted answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: name,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 2,
      },
    });

    created++;
    console.log(`✅ ${questionText} → ${name}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

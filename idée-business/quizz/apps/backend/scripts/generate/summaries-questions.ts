import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📖 Generating summaries questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'cinema-films' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'summary' },
  });

  let created = 0;

  for (const fact of facts) {
    const title = (fact.data as any)?.title;
    const summary = (fact.data as any)?.summary;
    const type = (fact.data as any)?.type;

    const questionText = type === 'film'
      ? `Quel film raconte l'histoire suivante : ${summary} ?`
      : `Quel livre raconte l'histoire suivante : ${summary} ?`;

    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) continue;

    const question = await prisma.question.create({
      data: {
        text: questionText,
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
        answer: title,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 3,
      },
    });

    created++;
    console.log(`✅ ${type}: ${title}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

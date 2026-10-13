import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Generating authors questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'cinema-films' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: {
      categoryId: category.id,
      property: { in: ['author_réalisé', 'author_écrit'] },
    },
  });

  let created = 0;

  for (const fact of facts) {
    const work = (fact.data as any)?.work;
    const author = (fact.data as any)?.author;
    const type = (fact.data as any)?.type;

    const questionText = type === 'réalisé'
      ? `Qui a réalisé le film "${work}" ?`
      : `Qui a écrit le livre "${work}" ?`;

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
        answer: author,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 3,
      },
    });

    created++;
    console.log(`✅ ${questionText} → ${author}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

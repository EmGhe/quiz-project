import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔤 Generating sigles questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'sigles' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'sigle_meaning' },
  });

  let created = 0;

  for (const fact of facts) {
    const sigle = (fact.data as any)?.sigle;
    const meaning = (fact.data as any)?.meaning;

    const questionText = `Quelle est la signification du sigle "${sigle}" ?`;

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
        answer: meaning,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 3,
      },
    });

    created++;
    console.log(`✅ ${questionText} → ${meaning}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

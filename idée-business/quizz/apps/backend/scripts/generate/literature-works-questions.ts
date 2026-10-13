import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📚 Generating literature works questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'litterature-francaise' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'literature_work' },
  });

  let created = 0;

  for (const fact of facts) {
    const author = (fact.data as any)?.author;
    const work = (fact.data as any)?.work;
    const distractors = (fact.data as any)?.distractors || [];

    const questionText = `Quelle œuvre a été créée par ${author} ?`;

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
        enabledForDaily: false, // QCM only
        enabledForMcq: true,
      },
    });

    // Accepted answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: work,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 3,
      },
    });

    // Distractors
    for (let i = 0; i < Math.min(3, distractors.length); i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: distractors[i],
          order: i + 1,
          plausibilityScore: 85,
        },
      });
    }

    created++;
    console.log(`✅ ${questionText} → ${work}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

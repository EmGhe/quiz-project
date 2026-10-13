import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎨 Generating peinture questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'peinture-peintres' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'painter' },
  });

  // Get all painters for distractors
  const allPainters = [...new Set(facts.map(f => (f.data as any)?.painter))];

  let created = 0;
  let questionNumber = 1;

  for (const fact of facts) {
    const painter = (fact.data as any)?.painter;
    const painting = (fact.data as any)?.painting;
    const mediaUrl = (fact.data as any)?.mediaUrl;

    const questionText = `À quel peintre correspond ce tableau ? [${questionNumber}]`;
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
        enabledForDaily: false, // QCM only
        enabledForMcq: true,
      },
    });

    // Accepted answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: painter,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 2,
      },
    });

    // Distractors (3 other painters)
    const otherPainters = allPainters.filter(p => p !== painter);
    const shuffled = otherPainters.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3);

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

    created++;
    console.log(`✅ ${painting} → ${painter}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

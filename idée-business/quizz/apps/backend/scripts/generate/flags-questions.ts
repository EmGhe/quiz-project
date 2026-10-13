import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getLevenshteinThreshold(answer: string): number {
  if (answer.length <= 5) return 1;
  if (answer.length <= 10) return 2;
  return 3;
}

async function main() {
  console.log('🏁 Generating flag questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'geographie-drapeaux' },
  });

  if (!category) {
    throw new Error('Category geographie-drapeaux not found');
  }

  // Get all flag facts
  const flagFacts = await prisma.fact.findMany({
    where: {
      categoryId: category.id,
      property: 'drapeau',
    },
    orderBy: { subject: 'asc' },
  });

  console.log(`Found ${flagFacts.length} flag facts\n`);

  let questionCounter = 0;

  for (const fact of flagFacts) {
    const country = fact.subject;
    const flagUrl = (fact.data as any)?.flagUrl;

    if (!flagUrl) {
      console.log(`⚠️  Skipping ${country} - no flag URL`);
      continue;
    }

    questionCounter++;
    const questionText = `À quel pays appartient ce drapeau ? [${questionCounter}]`;
    const answer = country;

    await prisma.question.create({
      data: {
        factId: fact.id,
        text: questionText,
        questionType: 'image',
        mediaUrl: flagUrl,
        difficulty: 'moyen',
        categoryId: category.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            {
              answer,
              isPrimary: true,
              variantType: 'exacte',
              levenshteinThreshold: getLevenshteinThreshold(answer),
            },
          ],
        },
      },
    });
  }

  console.log(`\n✅ Generated ${questionCounter} flag questions`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🦁 Generating faune questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'faune-animaux' },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const facts = await prisma.fact.findMany({
    where: {
      categoryId: category.id,
    },
  });

  console.log(`Found ${facts.length} facts\n`);

  let created = 0;
  let skipped = 0;
  let questionNumber = 1;

  for (const fact of facts) {
    const type = (fact.data as any)?.type;
    const answer = (fact.data as any)?.answer || fact.object;
    const description = (fact.data as any)?.description;
    const mediaUrl = (fact.data as any)?.mediaUrl;

    let questionText: string;
    let questionType = 'texte';

    if (type === 'photo') {
      questionText = `Quel est cet animal ? [${questionNumber}]`;
      questionType = 'image';
      questionNumber++;
    } else {
      questionText = `${description} ?`;
    }

    // Check if question already exists
    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        text: questionText,
        questionType,
        mediaUrl: mediaUrl || null,
        difficulty: 'moyen',
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: false,
      },
    });

    // Create accepted answers with variants
    const variants = generateAnswerVariants(answer);

    for (const variant of variants) {
      await prisma.acceptedAnswer.create({
        data: {
          questionId: question.id,
          answer: variant.answer,
          isPrimary: variant.isPrimary,
          variantType: variant.variantType,
          levenshteinThreshold: variant.levenshteinThreshold,
        },
      });
    }

    created++;
    console.log(`✅ ${questionText.substring(0, 70)}... → ${answer}`);
  }

  console.log(`\n✅ ${created} questions created, ${skipped} skipped`);
}

function generateAnswerVariants(answer: string): Array<{
  answer: string;
  isPrimary: boolean;
  variantType: string;
  levenshteinThreshold: number;
}> {
  const variants: Array<{
    answer: string;
    isPrimary: boolean;
    variantType: string;
    levenshteinThreshold: number;
  }> = [];

  // Primary answer
  variants.push({
    answer: answer,
    isPrimary: true,
    variantType: 'exacte',
    levenshteinThreshold: getLevenshteinThreshold(answer),
  });

  // Lowercase variant
  if (answer !== answer.toLowerCase()) {
    variants.push({
      answer: answer.toLowerCase(),
      isPrimary: false,
      variantType: 'casse',
      levenshteinThreshold: getLevenshteinThreshold(answer),
    });
  }

  // Without accents
  const withoutAccents = removeAccents(answer);
  if (withoutAccents !== answer) {
    variants.push({
      answer: withoutAccents,
      isPrimary: false,
      variantType: 'accent',
      levenshteinThreshold: getLevenshteinThreshold(answer),
    });
  }

  return variants;
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function getLevenshteinThreshold(answer: string): number {
  const length = answer.length;
  if (length <= 5) return 1;
  if (length <= 10) return 2;
  return 3;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

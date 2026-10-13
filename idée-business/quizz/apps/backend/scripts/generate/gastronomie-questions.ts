import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍽️  Generating gastronomie questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'gastronomie-plats-monde' },
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

  for (const fact of facts) {
    const description = (fact.data as any)?.description;
    const answer = (fact.data as any)?.answer || fact.object;

    if (!description) {
      console.log(`⚠️  Skipping ${answer} - no description`);
      skipped++;
      continue;
    }

    // Determine question type based on answer
    let questionType = 'plat';
    const lowerAnswer = answer.toLowerCase();

    if (lowerAnswer.includes('croissant') || lowerAnswer.includes('éclair') || lowerAnswer.includes('panettone')) {
      questionType = 'viennoiserie/pâtisserie';
    } else if (lowerAnswer.includes('pain') || lowerAnswer.includes('baguette') || lowerAnswer.includes('naan')) {
      questionType = 'pain';
    } else if (lowerAnswer.includes('soupe') || lowerAnswer.includes('gazpacho') || lowerAnswer.includes('ramen')) {
      questionType = 'soupe/plat';
    } else if (lowerAnswer.includes('dessert') || lowerAnswer.includes('tiramisu')) {
      questionType = 'dessert';
    }

    // Generate question with appropriate article
    let questionText: string;

    if (questionType === 'viennoiserie/pâtisserie') {
      questionText = `Quelle viennoiserie ou pâtisserie ${description} ?`;
    } else if (questionType === 'pain') {
      questionText = `Quel pain ${description} ?`;
    } else if (questionType === 'dessert') {
      questionText = `Quel dessert ${description} ?`;
    } else if (questionType === 'soupe/plat') {
      questionText = `Quel plat ${description} ?`;
    } else {
      questionText = `Quel plat ${description} ?`;
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
        difficulty: 'moyen',
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: false, // Will add distractors later for MCQ
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
    console.log(`✅ ${questionText.substring(0, 80)}... → ${answer}`);
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

  // Common abbreviations/variants
  const commonVariants: Record<string, string[]> = {
    'houmous': ['hummus', 'houmos'],
    'falafel': ['felafel'],
  };

  const lowerAnswer = answer.toLowerCase();
  if (commonVariants[lowerAnswer]) {
    for (const variant of commonVariants[lowerAnswer]) {
      variants.push({
        answer: variant,
        isPrimary: false,
        variantType: 'orthographe',
        levenshteinThreshold: getLevenshteinThreshold(answer),
      });
    }
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

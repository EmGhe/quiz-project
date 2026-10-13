import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🇺🇸 Adding "USA" variant for "États-Unis"...\n');

  // Find all questions with "États-Unis" as answer
  const questions = await prisma.question.findMany({
    where: {
      acceptedAnswers: {
        some: {
          answer: 'États-Unis'
        }
      }
    },
    include: {
      acceptedAnswers: true,
    }
  });

  console.log(`Found ${questions.length} questions with "États-Unis" as answer\n`);

  let addedCount = 0;

  for (const question of questions) {
    // Check if "USA" variant already exists
    const existingUSA = question.acceptedAnswers.find(a => a.answer === 'USA');
    if (existingUSA) {
      console.log(`⏭️  ${question.text} → "USA" already exists`);
      continue;
    }

    // Add "USA" as variant
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: 'USA',
        isPrimary: false,
        variantType: 'abreviation',
        levenshteinThreshold: 1,
      }
    });

    addedCount++;
    console.log(`✅ ${question.text} → Added "USA" variant`);
  }

  console.log(`\n✅ Added ${addedCount} "USA" variants`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

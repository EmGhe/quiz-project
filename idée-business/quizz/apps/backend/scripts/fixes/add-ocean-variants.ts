import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌊 Adding ocean name variants...\n');

  // Find all questions about oceans
  const oceanQuestions = await prisma.question.findMany({
    where: {
      text: {
        startsWith: 'Quel océan'
      }
    },
    include: {
      acceptedAnswers: true,
    }
  });

  console.log(`Found ${oceanQuestions.length} ocean questions\n`);

  let addedCount = 0;

  for (const question of oceanQuestions) {
    const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary);
    if (!primaryAnswer) continue;

    const fullName = primaryAnswer.answer; // e.g., "Océan Atlantique"

    // Extract short name (without "Océan")
    const shortName = fullName.replace('Océan ', '');

    if (shortName === fullName) continue; // No "Océan" prefix

    // Check if variant already exists
    const existingVariant = question.acceptedAnswers.find(a => a.answer === shortName);
    if (existingVariant) {
      console.log(`⏭️  ${question.text} → "${shortName}" already exists`);
      continue;
    }

    // Add short name as variant
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: shortName,
        isPrimary: false,
        variantType: 'alternative',
        levenshteinThreshold: 2,
      }
    });

    addedCount++;
    console.log(`✅ ${question.text} → Added "${shortName}" variant`);
  }

  console.log(`\n✅ Added ${addedCount} ocean name variants`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

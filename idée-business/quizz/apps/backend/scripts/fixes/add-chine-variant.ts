/**
 * Add "Chine" as accepted answer variant for Pékin questions
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

async function addChineVariant() {
  console.log('\n========================================');
  console.log('🔧 Adding "Chine" as accepted variant');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Find all Pékin questions
    const pekingQuestions = await prisma.question.findMany({
      where: {
        OR: [
          { text: { contains: 'Pékin' } },
          { text: { contains: 'Pekin' } },
        ],
      },
      include: {
        acceptedAnswers: true,
      },
    });

    console.log(`Found ${pekingQuestions.length} Pékin questions\n`);

    for (const question of pekingQuestions) {
      // Check if "Chine" already exists
      const hasChine = question.acceptedAnswers.some(
        (a) => a.answer.toLowerCase() === 'chine'
      );

      if (hasChine) {
        console.log(`✓ "${question.text}" already has "Chine" variant`);
        continue;
      }

      // Add "Chine" as variant
      await prisma.acceptedAnswer.create({
        data: {
          questionId: question.id,
          answer: 'Chine',
          isPrimary: false,
          variantType: 'abreviation',
          levenshteinThreshold: 1,
        },
      });

      console.log(`✓ Added "Chine" to: "${question.text}"`);
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  addChineVariant()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { addChineVariant };

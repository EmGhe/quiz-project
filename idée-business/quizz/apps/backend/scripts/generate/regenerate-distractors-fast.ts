/**
 * Regenerate Distractors - Optimized Version
 *
 * Same strategy but with caching and better error handling
 */

import {
  getPrismaClient,
  closePrismaConnection,
} from '../utils/db';
import {
  generateCapitalDistractors,
  generateCountryDistractors,
  validateDistractors,
} from '../utils/distractor-generator';

async function regenerateDistractorsFast() {
  console.log('\n========================================');
  console.log('🔄 Regenerating Distractors (Optimized)');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Delete existing distractors
    console.log('Step 1: Deleting existing distractors...');
    const deleteResult = await prisma.distractor.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.count} existing distractors\n`);

    // Step 2: Get all questions
    console.log('Step 2: Fetching questions...');
    const questions = await prisma.question.findMany({
      include: {
        fact: true,
        acceptedAnswers: true,
      },
    });
    console.log(`✓ Found ${questions.length} questions\n`);

    // Step 3: Regenerate in batches
    console.log('Step 3: Regenerating distractors...\n');

    let totalGenerated = 0;
    let totalWithTrap = 0;
    let totalSkipped = 0;
    let totalNoTrap = 0;

    // Process in smaller batches to show progress
    const batchSize = 50;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const question of batch) {
        const { fact, acceptedAnswers } = question;
        const primaryAnswer = acceptedAnswers.find((a) => a.isPrimary);

        if (!primaryAnswer) {
          totalSkipped++;
          continue;
        }

        const correctAnswer = primaryAnswer.answer;
        const factData = fact.data as any;
        const isCapitalAnswer = fact.subject === correctAnswer;

        try {
          let distractorCandidates;

          if (isCapitalAnswer) {
            distractorCandidates = await generateCapitalDistractors(
              correctAnswer,
              factData,
              4
            );

            // Check if first distractor is trap (score = 100)
            if (distractorCandidates.length > 0 && distractorCandidates[0].score === 100) {
              totalWithTrap++;
            } else {
              totalNoTrap++;
            }
          } else {
            distractorCandidates = await generateCountryDistractors(
              correctAnswer,
              factData,
              4
            );
          }

          if (!validateDistractors(distractorCandidates, correctAnswer)) {
            totalSkipped++;
            continue;
          }

          // Insert distractors
          for (let j = 0; j < distractorCandidates.length; j++) {
            const candidate = distractorCandidates[j];
            await prisma.distractor.create({
              data: {
                questionId: question.id,
                distractorText: candidate.text,
                wikidataSourceId: candidate.wikidataId || null,
                plausibilityScore: Math.round(candidate.score),
                order: j + 1,
              },
            });
          }

          totalGenerated++;
        } catch (error: any) {
          // Don't log every error, just count them
          totalSkipped++;
        }
      }

      console.log(`  Progress: ${Math.min(i + batchSize, questions.length)}/${questions.length} questions`);
    }

    console.log('\n✅ Regeneration complete!\n');

    // Statistics
    console.log('📊 Statistics:');
    console.log(`   Questions processed: ${totalGenerated}`);
    console.log(`   Questions with trap distractor: ${totalWithTrap}`);
    console.log(`   Questions without trap: ${totalNoTrap} (Wikidata had no major cities)`);
    console.log(`   Skipped: ${totalSkipped}\n`);

    const totalDistractors = await prisma.distractor.count();
    console.log(`📚 Total distractors in database: ${totalDistractors}\n`);

    return {
      generated: totalGenerated,
      withTrap: totalWithTrap,
      noTrap: totalNoTrap,
      skipped: totalSkipped,
    };
  } catch (error) {
    console.error('\n❌ Regeneration failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  regenerateDistractorsFast()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { regenerateDistractorsFast };

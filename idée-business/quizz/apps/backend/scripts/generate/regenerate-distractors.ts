/**
 * Regenerate Distractors with New Strategy
 *
 * Deletes existing distractors and regenerates them with improved strategy:
 * - 1 distractor = major city from same country (trap!)
 * - 3 distractors = capitals from other countries
 *
 * Usage: npx ts-node scripts/generate/regenerate-distractors.ts
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

async function regenerateDistractors() {
  console.log('\n========================================');
  console.log('🔄 Regenerating Distractors with New Strategy');
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

    // Step 3: Regenerate distractors with new strategy
    console.log('Step 3: Regenerating distractors with new strategy...');
    console.log('(1 trap distractor from same country + 3 capital distractors)\n');

    let totalGenerated = 0;
    let totalWithTrap = 0;
    let totalSkipped = 0;

    for (const question of questions) {
      const { fact, acceptedAnswers } = question;
      const primaryAnswer = acceptedAnswers.find((a) => a.isPrimary);

      if (!primaryAnswer) {
        console.error(`  ⚠️  Question ${question.id} has no primary answer`);
        totalSkipped++;
        continue;
      }

      const correctAnswer = primaryAnswer.answer;
      const factData = fact.data as any;

      // Determine if answer is a capital or country
      const isCapitalAnswer = fact.subject === correctAnswer;

      let distractorCandidates;

      try {
        if (isCapitalAnswer) {
          // Generate capital distractors (with trap!)
          distractorCandidates = await generateCapitalDistractors(
            correctAnswer,
            factData,
            4
          );
        } else {
          // Generate country distractors
          distractorCandidates = await generateCountryDistractors(
            correctAnswer,
            factData,
            4
          );
        }

        // Validate distractors
        if (!validateDistractors(distractorCandidates, correctAnswer)) {
          console.error(
            `  ⚠️  Invalid distractors for question: ${question.text}`
          );
          totalSkipped++;
          continue;
        }

        if (distractorCandidates.length < 4) {
          console.warn(
            `  ⚠️  Only ${distractorCandidates.length} distractors found for: ${question.text}`
          );
        }

        // Insert distractors
        for (let i = 0; i < distractorCandidates.length; i++) {
          const candidate = distractorCandidates[i];

          await prisma.distractor.create({
            data: {
              questionId: question.id,
              distractorText: candidate.text,
              wikidataSourceId: candidate.wikidataId || null,
              plausibilityScore: Math.round(candidate.score),
              order: i + 1,
            },
          });

          // Check if this is the trap distractor (score = 100 usually)
          if (i === 0 && candidate.score === 100) {
            totalWithTrap++;
          }
        }

        totalGenerated++;

        if (totalGenerated % 100 === 0) {
          console.log(`  Progress: ${totalGenerated} questions processed...`);
        }
      } catch (error: any) {
        console.error(
          `  ⚠️  Error generating distractors for "${question.text}":`,
          error.message
        );
        totalSkipped++;
      }
    }

    console.log('\n✅ Regeneration complete!\n');

    // Step 4: Display statistics
    console.log('📊 Statistics:');
    console.log(`   Questions processed: ${totalGenerated}`);
    console.log(`   Questions with trap distractor: ${totalWithTrap}`);
    console.log(`   Skipped: ${totalSkipped}\n`);

    // Count total distractors
    const totalDistractors = await prisma.distractor.count();
    console.log(`📚 Total distractors in database: ${totalDistractors}`);

    // Average distractors per question
    const questionsWithDistractors = await prisma.question.findMany({
      include: {
        _count: {
          select: { distractors: true },
        },
      },
      where: {
        distractors: {
          some: {},
        },
      },
    });

    if (questionsWithDistractors.length > 0) {
      const avgDistractors =
        totalDistractors / questionsWithDistractors.length;
      console.log(
        `📈 Average distractors per question: ${avgDistractors.toFixed(1)}`
      );
    }

    // Sample questions with NEW distractors (showing trap distractors)
    console.log('\n🎯 Sample Questions with NEW Distractors (with traps!):\n');
    console.log('─'.repeat(80));

    const samples = await prisma.question.findMany({
      take: 5,
      include: {
        acceptedAnswers: true,
        distractors: {
          orderBy: {
            order: 'asc',
          },
        },
        fact: true,
      },
      where: {
        distractors: {
          some: {},
        },
        difficulty: 'facile', // Show easy questions to see trap effect
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    samples.forEach((q, index) => {
      const primaryAnswer = q.acceptedAnswers.find((a) => a.isPrimary);
      const factData = q.fact.data as any;
      const countryName = factData?.countryNameFr || q.fact.object;

      console.log(`${index + 1}. ${q.text}`);
      console.log(`   Pays concerné: ${countryName}`);
      console.log(`   Choix:`);

      const choices = [
        primaryAnswer?.answer || '',
        ...q.distractors.map((d) => d.distractorText),
      ];

      choices.forEach((choice, i) => {
        const isCorrect = choice === primaryAnswer?.answer;
        const distractor = q.distractors.find((d) => d.distractorText === choice);
        const isTrap = distractor && distractor.plausibilityScore === 100 && distractor.order === 1;
        const marker = isCorrect ? '✓' : (isTrap ? '🎯' : ' ');
        console.log(`     ${String.fromCharCode(65 + i)}. ${choice} ${marker}`);
      });

      console.log('   🎯 = Trap distractor (ville du même pays)');
      console.log('');
    });

    console.log('─'.repeat(80));

    return {
      generated: totalGenerated,
      withTrap: totalWithTrap,
      skipped: totalSkipped,
    };
  } catch (error) {
    console.error('\n❌ Regeneration failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  regenerateDistractors()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { regenerateDistractors };

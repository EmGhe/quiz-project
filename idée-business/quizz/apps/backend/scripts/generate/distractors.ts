/**
 * Generate Distractors for MCQ Questions
 *
 * For each question, generates 4 plausible but incorrect answers
 *
 * Usage: npx ts-node scripts/generate/distractors.ts
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

async function generateDistractors() {
  console.log('\n========================================');
  console.log('🎯 Generating Distractors for MCQ Questions');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Get all questions without distractors
    console.log('Step 1: Fetching questions...');

    const questions = await prisma.question.findMany({
      where: {
        status: 'brouillon',
      },
      include: {
        fact: true,
        acceptedAnswers: true,
        distractors: true,
      },
    });

    console.log(`✓ Found ${questions.length} questions\n`);

    // Filter questions that don't have distractors yet
    const questionsNeedingDistractors = questions.filter(
      (q) => q.distractors.length === 0
    );

    console.log(`✓ ${questionsNeedingDistractors.length} questions need distractors\n`);

    if (questionsNeedingDistractors.length === 0) {
      console.log('✅ All questions already have distractors!');
      return;
    }

    // Step 2: Generate distractors for each question
    console.log('Step 2: Generating distractors...');

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const question of questionsNeedingDistractors) {
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
      // If subject of fact matches answer, it's a capital question
      // If object of fact matches answer, it's a country question
      const isCapitalAnswer = fact.subject === correctAnswer;

      let distractorCandidates;

      try {
        if (isCapitalAnswer) {
          // Generate capital distractors
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
          // Still create with what we have
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

    console.log('\n✅ Distractor generation complete!\n');

    // Step 3: Display statistics
    console.log('📊 Statistics:');
    console.log(`   Questions processed: ${totalGenerated}`);
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

    // Sample questions with distractors
    console.log('\n🎯 Sample Questions with Distractors:\n');
    console.log('─'.repeat(80));

    const samples = await prisma.question.findMany({
      take: 5,
      include: {
        acceptedAnswers: true,
        distractors: true,
        fact: true,
      },
      where: {
        distractors: {
          some: {},
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    samples.forEach((q, index) => {
      const primaryAnswer = q.acceptedAnswers.find((a) => a.isPrimary);
      const choices = [
        primaryAnswer?.answer || '',
        ...q.distractors.map((d) => d.distractorText),
      ];

      console.log(`${index + 1}. ${q.text}`);
      console.log(`   Difficulté: ${q.difficulty}`);
      console.log(`   Choix:`);
      choices.forEach((choice, i) => {
        const isCorrect = choice === primaryAnswer?.answer;
        const marker = isCorrect ? '✓' : ' ';
        console.log(`     ${String.fromCharCode(65 + i)}. ${choice} ${marker}`);
      });

      // Show plausibility scores
      const scores = q.distractors
        .map((d) => `${d.plausibilityScore}`)
        .join(', ');
      console.log(`   Scores de plausibilité: [${scores}]`);
      console.log('');
    });

    console.log('─'.repeat(80));

    return {
      generated: totalGenerated,
      skipped: totalSkipped,
    };
  } catch (error) {
    console.error('\n❌ Distractor generation failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  generateDistractors()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { generateDistractors };

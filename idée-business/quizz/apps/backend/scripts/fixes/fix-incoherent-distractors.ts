/**
 * Script: Fix Incoherent Distractors
 *
 * Replaces incoherent distractors with coherent ones from similar questions
 * Example: If answer is a person name, replace title distractors with person names
 *
 * Usage: npx ts-node scripts/fixes/fix-incoherent-distractors.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

// Define expected answer types by category
const CATEGORY_TYPES: Record<string, string> = {
  'Cinéma - Acteurs': 'person',
  'Cinéma - Réalisateurs': 'person',
  'Musique - Artistes français': 'person',
  'Musique - Artistes internationaux': 'person',
  'Internet - YouTubeurs FR': 'person',
  'Internet - Streamers FR': 'person',
  'Sports - Football': 'person-or-team',
  'Sports - NBA': 'person',
  'Sports - Tennis': 'person',
  'Sports - Rugby': 'person-or-team',
  'Sports - F1': 'person',
  'Sports - UFC': 'person',
  'Histoire - Personnages': 'person',

  'Cinéma - Films': 'title',
  'Cinéma - Personnages': 'title', // Film title
  'Cinéma - Répliques': 'title', // Film title
  'Littérature - Française': 'title', // Book title
  'Littérature - Internationale': 'title', // Book title
  'Musique - Albums': 'title',

  'Géographie - Capitales': 'place',
  'Géographie - Villes': 'place',
  'Géographie - Pays': 'place',
  'Géographie - Drapeaux': 'place',
};

// Heuristics to detect if a text is a person name, title, or place
function guessType(text: string): string {
  if (!text) return 'unknown';

  // Check for common title prefixes
  if (/^(La |Le |Les |L'|Une |Un |Des |The |A |An )/.test(text)) {
    return 'title';
  }

  // Check for multi-word capitalized (likely person name)
  if (/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/.test(text)) {
    return 'person';
  }

  // Single capitalized word (could be place or person)
  if (/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+$/.test(text)) {
    return 'place-or-person';
  }

  return 'unknown';
}

async function fixIncoherentDistractors() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Fixing Incoherent Distractors');
    console.log('========================================\n');

    // Get all questions
    const questions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        category: true,
        fact: true,
        acceptedAnswers: {
          where: { isPrimary: true },
        },
        distractors: {
          orderBy: { order: 'asc' },
        },
      },
    });

    console.log(`📊 Analyzing ${questions.length} questions...\n`);

    let fixed = 0;
    let skipped = 0;
    let totalDistractorsReplaced = 0;

    for (const question of questions) {
      if (question.distractors.length !== 4) continue;

      const category = question.category?.name;
      if (!category) continue;

      const expectedType = CATEGORY_TYPES[category];
      if (!expectedType) {
        skipped++;
        continue;
      }

      const answer = question.acceptedAnswers[0]?.answer;
      if (!answer) continue;

      const answerGuessedType = guessType(answer);

      // Check each distractor
      const incoherentDistractors: any[] = [];

      question.distractors.forEach((d: any) => {
        const distractorType = guessType(d.distractorText);

        // Detect incoherence
        let isIncoherent = false;

        if (expectedType === 'person' || expectedType === 'person-or-team') {
          // If answer looks like a person, distractor should not be a title
          if (answerGuessedType === 'person' && distractorType === 'title') {
            isIncoherent = true;
          }
        } else if (expectedType === 'title') {
          // If answer is a title, distractor should not be a person
          if (answerGuessedType === 'title' && distractorType === 'person') {
            isIncoherent = true;
          }
        }

        if (isIncoherent) {
          incoherentDistractors.push(d);
        }
      });

      if (incoherentDistractors.length > 0) {
        console.log(`[${fixed + 1}] ${question.text}`);
        console.log(`   Category: ${category}`);
        console.log(`   Answer: "${answer}" (expected: ${expectedType})`);
        console.log(`   Incoherent: ${incoherentDistractors.map((d: any) => d.distractorText).join(', ')}`);

        // Find replacement distractors from similar questions
        const similarQuestions = await prisma.question.findMany({
          where: {
            categoryId: question.categoryId,
            status: 'publie',
            id: { not: question.id },
          },
          include: {
            acceptedAnswers: {
              where: { isPrimary: true },
            },
            fact: true,
          },
          take: 50,
        });

        const replacementPool: string[] = [];

        similarQuestions.forEach(sq => {
          const sqAnswer = sq.acceptedAnswers[0]?.answer;
          if (!sqAnswer) return;
          if (sqAnswer === answer) return;
          if (question.distractors.some((d: any) => d.distractorText === sqAnswer)) return;

          const sqType = guessType(sqAnswer);

          // Add to pool if type matches
          if (expectedType === 'person' || expectedType === 'person-or-team') {
            if (sqType === 'person' || sqType === 'place-or-person') {
              replacementPool.push(sqAnswer);
            }
          } else if (expectedType === 'title') {
            if (sqType === 'title') {
              replacementPool.push(sqAnswer);
            }
          } else if (expectedType === 'place') {
            if (sqType === 'place-or-person') {
              replacementPool.push(sqAnswer);
            }
          }
        });

        // Shuffle pool
        const shuffled = replacementPool.sort(() => Math.random() - 0.5);

        // Replace incoherent distractors
        let replaced = 0;
        for (const incoherentDist of incoherentDistractors) {
          if (shuffled.length === 0) break;

          const replacement = shuffled.shift()!;

          await prisma.distractor.update({
            where: { id: incoherentDist.id },
            data: { distractorText: replacement },
          });

          console.log(`   ✅ Replaced "${incoherentDist.distractorText}" → "${replacement}"`);
          replaced++;
          totalDistractorsReplaced++;
        }

        if (replaced > 0) {
          fixed++;
          console.log('');
        } else {
          console.log(`   ⚠️  No replacement found in pool\n`);
        }
      }

      // Progress every 100
      if ((fixed + skipped) % 100 === 0 && fixed + skipped > 0) {
        console.log(`📊 Progress: ${fixed} fixed, ${skipped} skipped...\n`);
      }
    }

    console.log('\n========================================');
    console.log('📊 Final Statistics:');
    console.log(`   Fixed: ${fixed} questions`);
    console.log(`   Distractors replaced: ${totalDistractorsReplaced}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('========================================\n');

    return {
      fixed,
      totalDistractorsReplaced,
      skipped,
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Execute if run directly
if (require.main === module) {
  fixIncoherentDistractors()
    .then((result) => {
      console.log('✅ Fix complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixIncoherentDistractors };

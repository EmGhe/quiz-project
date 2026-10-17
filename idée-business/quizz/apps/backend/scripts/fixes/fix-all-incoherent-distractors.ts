/**
 * Script: Fix All Incoherent Distractors (Improved)
 *
 * More robust approach using category-based type detection
 *
 * Usage: npx ts-node scripts/fixes/fix-all-incoherent-distractors.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

// Comprehensive category mappings
const PERSON_CATEGORIES = [
  'Cinéma - Acteurs',
  'Cinéma - Réalisateurs',
  'Musique - Artistes français',
  'Musique - Artistes internationaux',
  'Internet - YouTubeurs FR',
  'Internet - Streamers FR',
  'Sports - Football',
  'Sports - NBA',
  'Sports - Tennis',
  'Sports - Rugby',
  'Sports - F1',
  'Sports - UFC',
  'Sports - Handball',
  'Sports - Ultra Trail',
  'Histoire - Personnages',
];

const TITLE_CATEGORIES = [
  'Cinéma - Films',
  'Cinéma - Personnages', // Answer is film title
  'Cinéma - Répliques', // Answer is film title
  'Littérature - Française',
  'Littérature - Internationale',
  'Littérature - Œuvres',
  'Musique - Albums',
];

const PLACE_CATEGORIES = [
  'Géographie - Capitales',
  'Géographie - Villes',
  'Géographie - Pays',
  'Géographie - Drapeaux',
];

// Simple heuristics
function startsWithArticle(text: string): boolean {
  return /^(La |Le |Les |L'|Une |Un |Des |The |A |An |l'|la |le |les )/i.test(text);
}

function isMultiWordCapitalized(text: string): boolean {
  // At least 2 words, each starting with capital
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return false;
  return words.every(w => /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/.test(w));
}

function isSingleCapitalizedWord(text: string): boolean {
  return /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+$/.test(text.trim());
}

function detectType(text: string, category?: string): 'person' | 'title' | 'place' | 'unknown' {
  if (!text) return 'unknown';

  // Use category first
  if (category) {
    if (PERSON_CATEGORIES.includes(category)) return 'person';
    if (TITLE_CATEGORIES.includes(category)) return 'title';
    if (PLACE_CATEGORIES.includes(category)) return 'place';
  }

  // Fallback to heuristics
  if (startsWithArticle(text)) return 'title';
  if (isMultiWordCapitalized(text)) return 'person';
  if (isSingleCapitalizedWord(text)) return 'place'; // Could be person too, ambiguous

  return 'unknown';
}

async function fixAllIncoherentDistractors() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Fix All Incoherent Distractors (Improved)');
    console.log('========================================\n');

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
    let alreadyCoherent = 0;

    for (const question of questions) {
      if (question.distractors.length !== 4) continue;

      const category = question.category?.name;
      if (!category) continue;

      const answer = question.acceptedAnswers[0]?.answer;
      if (!answer) continue;

      // Determine expected type
      const expectedType = detectType(answer, category);
      if (expectedType === 'unknown') {
        skipped++;
        continue;
      }

      // Check each distractor
      const incoherentDistractors: any[] = [];

      question.distractors.forEach((d: any) => {
        const distractorType = detectType(d.distractorText, category);

        // Check if coherent
        let isCoherent = true;

        // Strict type matching
        if (expectedType === 'person') {
          if (distractorType === 'title') isCoherent = false;
          if (startsWithArticle(d.distractorText)) isCoherent = false; // Titles usually start with articles
        } else if (expectedType === 'title') {
          if (distractorType === 'person' && isMultiWordCapitalized(d.distractorText)) {
            isCoherent = false;
          }
        } else if (expectedType === 'place') {
          if (distractorType === 'title') isCoherent = false;
          if (distractorType === 'person' && isMultiWordCapitalized(d.distractorText)) {
            isCoherent = false;
          }
        }

        if (!isCoherent) {
          incoherentDistractors.push(d);
        }
      });

      if (incoherentDistractors.length === 0) {
        alreadyCoherent++;
        continue;
      }

      console.log(`[${fixed + 1}] ${question.text.substring(0, 80)}...`);
      console.log(`   Category: ${category}`);
      console.log(`   Answer: "${answer}" (type: ${expectedType})`);
      console.log(`   Incoherent: ${incoherentDistractors.map((d: any) => `"${d.distractorText}"`).join(', ')}`);

      // Find replacement pool
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
        },
        take: 100,
      });

      const replacementPool: string[] = [];
      const currentDistractorTexts = question.distractors.map((d: any) => d.distractorText);

      similarQuestions.forEach(sq => {
        const sqAnswer = sq.acceptedAnswers[0]?.answer;
        if (!sqAnswer) return;
        if (sqAnswer === answer) return;
        if (currentDistractorTexts.includes(sqAnswer)) return;
        if (replacementPool.includes(sqAnswer)) return;

        const sqType = detectType(sqAnswer, category);

        // Must match expected type
        if (sqType === expectedType) {
          replacementPool.push(sqAnswer);
        } else if (expectedType === 'person' && sqType === 'place' && isSingleCapitalizedWord(sqAnswer)) {
          // Single word could be person (like "Indila", "Soprano")
          replacementPool.push(sqAnswer);
        } else if (expectedType === 'place' && sqType === 'person' && isSingleCapitalizedWord(sqAnswer)) {
          // Ambiguous case
          replacementPool.push(sqAnswer);
        }
      });

      // Shuffle
      const shuffled = replacementPool.sort(() => Math.random() - 0.5);

      // Replace
      let replaced = 0;
      for (const incoherentDist of incoherentDistractors) {
        if (shuffled.length === 0) {
          console.log(`   ⚠️  No more replacements available`);
          break;
        }

        const replacement = shuffled.shift()!;

        await prisma.distractor.update({
          where: { id: incoherentDist.id },
          data: { distractorText: replacement },
        });

        console.log(`   ✅ "${incoherentDist.distractorText}" → "${replacement}"`);
        replaced++;
        totalDistractorsReplaced++;
      }

      if (replaced > 0) {
        fixed++;
        console.log('');
      }

      // Progress
      if ((fixed + alreadyCoherent) % 50 === 0 && (fixed + alreadyCoherent) > 0) {
        console.log(`📊 Progress: ${fixed} fixed, ${alreadyCoherent} already coherent...\n`);
      }
    }

    console.log('\n========================================');
    console.log('📊 Final Statistics:');
    console.log(`   Fixed: ${fixed} questions`);
    console.log(`   Distractors replaced: ${totalDistractorsReplaced}`);
    console.log(`   Already coherent: ${alreadyCoherent}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('========================================\n');

    // Verify
    console.log('🔍 Running verification...\n');

    const allQuestions = await prisma.question.findMany({
      where: { status: 'publie' },
      include: {
        category: true,
        acceptedAnswers: { where: { isPrimary: true } },
        distractors: { orderBy: { order: 'asc' } },
      },
    });

    let stillIncoherent = 0;

    allQuestions.forEach(q => {
      if (q.distractors.length !== 4) return;
      const category = q.category?.name;
      if (!category) return;
      const answer = q.acceptedAnswers[0]?.answer;
      if (!answer) return;

      const expectedType = detectType(answer, category);
      if (expectedType === 'unknown') return;

      const hasIncoherent = q.distractors.some((d: any) => {
        const dType = detectType(d.distractorText, category);
        if (expectedType === 'person' && (dType === 'title' || startsWithArticle(d.distractorText))) return true;
        if (expectedType === 'title' && dType === 'person' && isMultiWordCapitalized(d.distractorText)) return true;
        return false;
      });

      if (hasIncoherent) stillIncoherent++;
    });

    console.log(`✅ Verification complete:`);
    console.log(`   Coherent: ${allQuestions.length - stillIncoherent}`);
    console.log(`   Still incoherent: ${stillIncoherent}\n`);

    return {
      fixed,
      totalDistractorsReplaced,
      stillIncoherent,
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
  fixAllIncoherentDistractors()
    .then((result) => {
      console.log('✅ Fix complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { fixAllIncoherentDistractors };

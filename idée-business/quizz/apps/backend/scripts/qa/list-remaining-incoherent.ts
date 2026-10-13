/**
 * Script: List Remaining Incoherent Questions
 *
 * Lists the remaining questions with incoherent distractors
 *
 * Usage: npx ts-node scripts/qa/list-remaining-incoherent.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

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
  'Cinéma - Personnages',
  'Cinéma - Répliques',
  'Littérature - Française',
  'Littérature - Internationale',
  'Musique - Albums',
];

function startsWithArticle(text: string): boolean {
  return /^(La |Le |Les |L'|Une |Un |Des |The |A |An |l'|la |le |les )/i.test(text);
}

function isMultiWordCapitalized(text: string): boolean {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return false;
  return words.every(w => /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/.test(w));
}

function detectType(text: string, category?: string): 'person' | 'title' | 'place' | 'unknown' {
  if (!text) return 'unknown';

  if (category) {
    if (PERSON_CATEGORIES.includes(category)) return 'person';
    if (TITLE_CATEGORIES.includes(category)) return 'title';
  }

  if (startsWithArticle(text)) return 'title';
  if (isMultiWordCapitalized(text)) return 'person';

  return 'place';
}

async function listRemainingIncoherent() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Listing Remaining Incoherent Questions');
    console.log('========================================\n');

    const questions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        category: true,
        acceptedAnswers: {
          where: { isPrimary: true },
        },
        distractors: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const incoherent: any[] = [];

    questions.forEach(q => {
      if (q.distractors.length !== 4) return;
      const category = q.category?.name;
      if (!category) return;
      const answer = q.acceptedAnswers[0]?.answer;
      if (!answer) return;

      const expectedType = detectType(answer, category);
      if (expectedType === 'unknown') return;

      const incoherentDistractors: any[] = [];

      q.distractors.forEach((d: any) => {
        const dType = detectType(d.distractorText, category);

        let isCoherent = true;

        if (expectedType === 'person') {
          if (dType === 'title' || startsWithArticle(d.distractorText)) {
            isCoherent = false;
          }
        } else if (expectedType === 'title') {
          if (dType === 'person' && isMultiWordCapitalized(d.distractorText)) {
            isCoherent = false;
          }
        }

        if (!isCoherent) {
          incoherentDistractors.push(d);
        }
      });

      if (incoherentDistractors.length > 0) {
        incoherent.push({
          question: q,
          answer,
          expectedType,
          incoherentDistractors,
        });
      }
    });

    console.log(`Found ${incoherent.length} questions with incoherent distractors:\n`);

    incoherent.forEach((item, index) => {
      console.log(`${index + 1}. ${item.question.text}`);
      console.log(`   ID: ${item.question.id}`);
      console.log(`   Category: ${item.question.category?.name || 'N/A'}`);
      console.log(`   Answer: "${item.answer}" (type: ${item.expectedType})`);
      console.log(`   All distractors:`);
      item.question.distractors.forEach((d: any) => {
        const isIncoherent = item.incoherentDistractors.some((id: any) => id.id === d.id);
        const dType = detectType(d.distractorText, item.question.category?.name);
        console.log(`     ${isIncoherent ? '❌' : '✅'} "${d.distractorText}" (type: ${dType})`);
      });
      console.log('');
    });

    // Export to JSON
    const fs = require('fs');
    const path = require('path');
    const exportDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const jsonPath = path.join(exportDir, 'remaining-incoherent.json');
    const exportData = {
      total: incoherent.length,
      questions: incoherent.map(item => ({
        id: item.question.id,
        text: item.question.text,
        category: item.question.category?.name || 'N/A',
        answer: item.answer,
        expectedType: item.expectedType,
        allDistractors: item.question.distractors.map((d: any) => ({
          text: d.distractorText,
          type: detectType(d.distractorText, item.question.category?.name),
          isIncoherent: item.incoherentDistractors.some((id: any) => id.id === d.id),
        })),
      })),
    };

    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Report saved to: ${jsonPath}\n`);

    return incoherent;

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  listRemainingIncoherent()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { listRemainingIncoherent };

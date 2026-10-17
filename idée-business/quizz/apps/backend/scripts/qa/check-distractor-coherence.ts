/**
 * Script: Check Distractor Coherence
 *
 * Identifies questions where distractors are not coherent with the answer type
 * Example: Answer = person name, Distractor = song title (WRONG)
 *
 * Usage: npx ts-node scripts/qa/check-distractor-coherence.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

interface QuestionWithDistractors {
  id: string;
  text: string;
  category: { name: string } | null;
  fact: {
    subject: string;
    property: string;
    object: string;
  };
  acceptedAnswers: Array<{ answer: string; isPrimary: boolean }>;
  distractors: Array<{ distractorText: string; order: number }>;
}

// Patterns to detect answer types
const PATTERNS = {
  // Person names: capitalized words, often with spaces
  personName: /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+(\s[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)+$/,

  // Titles: often start with articles or quotes
  songTitle: /^(La|Le|Les|L'|Une|Un|Des|"|«).*$/i,

  // Single word (likely a country, city, or single-name artist)
  singleWord: /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+$/,

  // Numbers
  number: /^\d+$/,
};

function detectType(text: string): string {
  if (!text || text.trim() === '') return 'empty';

  const trimmed = text.trim();

  if (PATTERNS.number.test(trimmed)) return 'number';
  if (PATTERNS.personName.test(trimmed)) return 'person-name';
  if (PATTERNS.singleWord.test(trimmed)) return 'single-word';
  if (PATTERNS.songTitle.test(trimmed)) return 'title';

  return 'other';
}

function isCoherent(answerType: string, distractorType: string): boolean {
  // Same type is always coherent
  if (answerType === distractorType) return true;

  // Person name vs title is INCOHERENT
  if (answerType === 'person-name' && distractorType === 'title') return false;
  if (answerType === 'title' && distractorType === 'person-name') return false;

  // Single word can mix with person names (e.g., "Indila" with "Héloïse Létissier")
  if (answerType === 'person-name' && distractorType === 'single-word') return true;
  if (answerType === 'single-word' && distractorType === 'person-name') return true;

  // Numbers should only mix with numbers
  if (answerType === 'number' || distractorType === 'number') {
    return answerType === distractorType;
  }

  return true;
}

async function checkDistractorCoherence() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Checking Distractor Coherence');
    console.log('========================================\n');

    const questions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        category: {
          select: { name: true },
        },
        fact: true,
        acceptedAnswers: {
          where: { isPrimary: true },
        },
        distractors: {
          orderBy: { order: 'asc' },
        },
      },
    });

    console.log(`📊 Analyzing ${questions.length} published questions...\n`);

    const incoherent: any[] = [];
    const coherent: any[] = [];

    for (const q of questions) {
      if (q.distractors.length === 0) continue;

      const answer = q.acceptedAnswers[0]?.answer;
      if (!answer) continue;

      const answerType = detectType(answer);
      const distractorTypes = q.distractors.map(d => ({
        text: d.distractorText,
        type: detectType(d.distractorText),
      }));

      // Check if all distractors are coherent with answer
      const incoherentDistractors = distractorTypes.filter(
        dt => !isCoherent(answerType, dt.type)
      );

      if (incoherentDistractors.length > 0) {
        incoherent.push({
          question: q,
          answer,
          answerType,
          distractors: distractorTypes,
          incoherentCount: incoherentDistractors.length,
        });
      } else {
        coherent.push(q);
      }
    }

    console.log('📈 Results:');
    console.log(`   ✅ Coherent: ${coherent.length}`);
    console.log(`   ❌ Incoherent: ${incoherent.length}\n`);

    if (incoherent.length > 0) {
      console.log('🔴 Incoherent Questions:\n');

      // Sort by most incoherent first
      incoherent.sort((a, b) => b.incoherentCount - a.incoherentCount);

      incoherent.slice(0, 50).forEach((item, index) => {
        console.log(`${index + 1}. ${item.question.text}`);
        console.log(`   Category: ${item.question.category?.name || 'N/A'}`);
        console.log(`   Answer: "${item.answer}" (type: ${item.answerType})`);
        console.log(`   Distractors:`);
        item.distractors.forEach((d: any) => {
          const coherent = isCoherent(item.answerType, d.type);
          console.log(`     ${coherent ? '✅' : '❌'} "${d.text}" (type: ${d.type})`);
        });
        console.log(`   ID: ${item.question.id}\n`);
      });

      if (incoherent.length > 50) {
        console.log(`   ... and ${incoherent.length - 50} more\n`);
      }

      // Export to JSON
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(__dirname, '../../exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const jsonPath = path.join(exportDir, 'incoherent-distractors.json');
      const exportData = {
        summary: {
          total: questions.length,
          coherent: coherent.length,
          incoherent: incoherent.length,
          percentage: ((incoherent.length / questions.length) * 100).toFixed(1),
        },
        incoherentQuestions: incoherent.map(item => ({
          id: item.question.id,
          text: item.question.text,
          category: item.question.category?.name || 'N/A',
          answer: item.answer,
          answerType: item.answerType,
          distractors: item.distractors,
          incoherentCount: item.incoherentCount,
        })),
      };

      fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
      console.log(`✅ Report saved to: ${jsonPath}\n`);
    }

    return {
      total: questions.length,
      coherent: coherent.length,
      incoherent: incoherent.length,
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
  checkDistractorCoherence()
    .then((result) => {
      console.log('✅ Analysis complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkDistractorCoherence };

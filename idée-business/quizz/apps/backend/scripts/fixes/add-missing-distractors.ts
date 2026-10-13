/**
 * Script: Add Missing Distractors
 *
 * Generates and adds missing distractors for questions
 * Uses intelligent context-aware distractor generation
 *
 * Usage: npx ts-node scripts/fixes/add-missing-distractors.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { getPrismaClient, closePrismaConnection } from '../utils/db';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Question {
  id: string;
  text: string;
  category: { name: string; slug: string } | null;
  difficulty: string | null;
  fact: {
    subject: string;
    property: string;
    object: string;
    data: any;
  };
  acceptedAnswers: Array<{ answer: string; isPrimary: boolean }>;
  distractors: Array<{ text: string; order: number }>;
}

async function generateDistractors(
  question: Question,
  neededCount: number
): Promise<string[]> {
  const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary)?.answer || question.acceptedAnswers[0]?.answer;
  const existingDistractors = question.distractors.map(d => d.text);

  const prompt = `Tu es un expert en création de distracteurs pour des questions de quiz en français.

QUESTION: ${question.text}
RÉPONSE CORRECTE: ${primaryAnswer}
CATÉGORIE: ${question.category?.name || 'Non catégorisé'}
DISTRACTEURS EXISTANTS: ${existingDistractors.length > 0 ? existingDistractors.join(', ') : 'Aucun'}

CONTEXTE DU FAIT:
- Sujet: ${question.fact.subject}
- Propriété: ${question.fact.property}
- Objet: ${question.fact.object}

CONSIGNES STRICTES:
1. Génère exactement ${neededCount} distracteur(s) plausible(s)
2. Les distracteurs doivent être du MÊME TYPE que la réponse correcte
3. Ils doivent être COHÉRENTS avec la catégorie de la question
4. Ils NE doivent PAS être la bonne réponse ou ses variantes
5. Ils NE doivent PAS être parmi les distracteurs existants
6. Utilise des noms/termes RÉELS et reconnaissables
7. Privilégie des options de difficulté similaire à la bonne réponse

EXEMPLES PAR TYPE:
- Capitale → autres capitales de pays similaires
- Pays → autres pays de la même région/continent
- Réalisateur → autres réalisateurs célèbres
- Acteur → autres acteurs du même genre de films
- Ville → autres villes du même pays/région
- Film → autres films du même genre/époque
- Personnage → autres personnages de franchises similaires
- Date → autres dates d'événements similaires (±10-50 ans)
- Nombre → autres nombres dans une fourchette plausible

Réponds UNIQUEMENT avec les ${neededCount} distracteur(s), un par ligne, sans numérotation, sans explication.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const distractors = content.text
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, neededCount);

    if (distractors.length !== neededCount) {
      console.warn(`⚠️  Expected ${neededCount} distractors, got ${distractors.length}`);
    }

    return distractors;
  } catch (error) {
    console.error('Error generating distractors:', error);
    throw error;
  }
}

async function addMissingDistractors() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Adding Missing Distractors');
    console.log('========================================\n');

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Get all questions with missing distractors
    const questions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        category: {
          select: { name: true, slug: true },
        },
        fact: true,
        acceptedAnswers: {
          where: { isPrimary: true },
        },
        distractors: {
          select: { text: true, order: true },
        },
      },
    });

    // Filter questions with less than 4 distractors
    const questionsNeedingDistractors = questions.filter(q => q.distractors.length < 4);

    console.log(`📊 Found ${questionsNeedingDistractors.length} questions needing distractors\n`);

    if (questionsNeedingDistractors.length === 0) {
      console.log('✅ All questions already have 4 distractors!\n');
      return;
    }

    // Stats
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let totalDistractorsAdded = 0;

    // Process in batches to respect rate limits
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < questionsNeedingDistractors.length; i += BATCH_SIZE) {
      const batch = questionsNeedingDistractors.slice(i, i + BATCH_SIZE);

      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questionsNeedingDistractors.length / BATCH_SIZE)}`);
      console.log(`   Questions ${i + 1}-${Math.min(i + BATCH_SIZE, questionsNeedingDistractors.length)} of ${questionsNeedingDistractors.length}\n`);

      for (const question of batch) {
        const currentCount = question.distractors.length;
        const neededCount = 4 - currentCount;

        try {
          console.log(`[${processed + 1}/${questionsNeedingDistractors.length}] Processing: ${question.text.substring(0, 60)}...`);
          console.log(`   Current: ${currentCount} distractors, Need: ${neededCount} more`);

          // Generate distractors
          const newDistractors = await generateDistractors(question as Question, neededCount);
          console.log(`   Generated: ${newDistractors.join(', ')}`);

          // Find the next available order numbers
          const existingOrders = question.distractors.map(d => d.order);
          const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : 0;

          // Add distractors to database
          const distractorsToCreate = newDistractors.map((text, index) => ({
            questionId: question.id,
            text: text,
            order: maxOrder + index + 1,
          }));

          await prisma.distractor.createMany({
            data: distractorsToCreate,
          });

          totalDistractorsAdded += newDistractors.length;
          successful++;
          console.log(`   ✅ Added ${newDistractors.length} distractors\n`);

        } catch (error) {
          failed++;
          console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        }

        processed++;

        // Small delay between questions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Delay between batches
      if (i + BATCH_SIZE < questionsNeedingDistractors.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('\n========================================');
    console.log('📊 Final Statistics:');
    console.log(`   Processed: ${processed}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total distractors added: ${totalDistractorsAdded}`);
    console.log('========================================\n');

    // Verify results
    console.log('🔍 Verifying results...\n');

    const updatedQuestions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        _count: {
          select: { distractors: true },
        },
      },
    });

    const perfect = updatedQuestions.filter(q => q._count.distractors === 4).length;
    const stillMissing = updatedQuestions.filter(q => q._count.distractors < 4).length;

    console.log(`✅ Questions with 4 distractors: ${perfect} / ${updatedQuestions.length}`);
    console.log(`⚠️  Questions still missing distractors: ${stillMissing}\n`);

    return {
      processed,
      successful,
      failed,
      totalDistractorsAdded,
      perfect,
      stillMissing,
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
  addMissingDistractors()
    .then((result) => {
      if (result) {
        console.log('✅ Distractor generation complete!\n');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { addMissingDistractors };

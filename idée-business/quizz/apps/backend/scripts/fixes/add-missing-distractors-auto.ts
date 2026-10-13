/**
 * Script: Add Missing Distractors (Automatic)
 *
 * Generates missing distractors using existing answers from similar questions
 * This approach uses the database to find coherent distractors
 *
 * Usage: npx ts-node scripts/fixes/add-missing-distractors-auto.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

interface Question {
  id: string;
  text: string;
  categoryId: string | null;
  difficulty: string | null;
  category: { name: string; slug: string } | null;
  fact: {
    subject: string;
    property: string;
    object: string;
  };
  acceptedAnswers: Array<{ answer: string; isPrimary: boolean }>;
  distractors: Array<{ distractorText: string; order: number }>;
}

async function findDistractorsFromCategory(
  prisma: any,
  question: Question,
  neededCount: number
): Promise<string[]> {
  const correctAnswer = question.acceptedAnswers.find(a => a.isPrimary)?.answer || question.acceptedAnswers[0]?.answer;
  const existingDistractors = question.distractors.map(d => d.distractorText);

  // Get questions from the same category
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
    take: 100, // Limit to avoid too much data
  });

  // Extract potential distractors from similar questions
  const potentialDistractors: string[] = [];

  similarQuestions.forEach((q: any) => {
    const answer = q.acceptedAnswers[0]?.answer;
    if (!answer) return;

    // Skip if it's the correct answer or already exists
    if (answer === correctAnswer) return;
    if (existingDistractors.includes(answer)) return;
    if (potentialDistractors.includes(answer)) return;

    // For same property type, prefer those (e.g., all capitals)
    if (q.fact.property === question.fact.property) {
      potentialDistractors.unshift(answer); // Add at beginning (priority)
    } else {
      potentialDistractors.push(answer);
    }
  });

  // Shuffle to avoid always picking the same ones
  const shuffled = potentialDistractors.sort(() => Math.random() - 0.5);

  // Return the needed count
  return shuffled.slice(0, neededCount);
}

async function generateFallbackDistractors(
  question: Question,
  neededCount: number
): Promise<string[]> {
  const correctAnswer = question.acceptedAnswers.find(a => a.isPrimary)?.answer || question.acceptedAnswers[0]?.answer;

  // Fallback generic distractors by category
  const fallbacks: Record<string, string[]> = {
    'geographie': ['Paris', 'Londres', 'Berlin', 'Madrid', 'Rome', 'Tokyo', 'New York', 'Moscou', 'Pékin', 'Le Caire'],
    'cinema': ['Steven Spielberg', 'Martin Scorsese', 'Quentin Tarantino', 'Christopher Nolan', 'James Cameron'],
    'musique': ['The Beatles', 'Michael Jackson', 'Madonna', 'Queen', 'Elvis Presley'],
    'litterature': ['Victor Hugo', 'Molière', 'Albert Camus', 'Honoré de Balzac', 'Émile Zola'],
    'sports': ['Football', 'Basketball', 'Tennis', 'Rugby', 'Handball'],
    'histoire': ['1789', '1914', '1945', '1804', '1848'],
  };

  const categorySlug = question.category?.slug || '';
  let pool: string[] = [];

  // Find matching fallback pool
  for (const [key, values] of Object.entries(fallbacks)) {
    if (categorySlug.includes(key)) {
      pool = values;
      break;
    }
  }

  if (pool.length === 0) {
    pool = ['Réponse A', 'Réponse B', 'Réponse C', 'Réponse D', 'Réponse E'];
  }

  // Filter out correct answer and existing distractors
  const existingDistractors = question.distractors.map(d => d.distractorText);
  const filtered = pool.filter(d => d !== correctAnswer && !existingDistractors.includes(d));

  return filtered.slice(0, neededCount);
}

async function addMissingDistractorsAuto() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔧 Adding Missing Distractors (Auto)');
    console.log('========================================\n');

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
          orderBy: { isPrimary: 'desc' },
        },
        distractors: {
          select: { distractorText: true, order: true },
        },
      },
    });

    // Filter questions with less than 4 distractors
    const questionsNeedingDistractors = questions.filter(q => q.distractors.length < 4);

    console.log(`📊 Found ${questionsNeedingDistractors.length} questions needing distractors\n`);

    if (questionsNeedingDistractors.length === 0) {
      console.log('✅ All questions already have 4 distractors!\n');
      return { processed: 0, successful: 0, failed: 0, totalDistractorsAdded: 0 };
    }

    // Stats
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let totalDistractorsAdded = 0;
    let usedCategory = 0;
    let usedFallback = 0;

    // Process each question
    for (const question of questionsNeedingDistractors) {
      const currentCount = question.distractors.length;
      const neededCount = 4 - currentCount;

      try {
        console.log(`[${processed + 1}/${questionsNeedingDistractors.length}] ${question.text.substring(0, 60)}...`);
        console.log(`   Category: ${question.category?.name || 'N/A'}`);
        console.log(`   Current: ${currentCount} distractors, Need: ${neededCount} more`);

        // Try to find distractors from similar questions
        let newDistractors = await findDistractorsFromCategory(prisma, question as any, neededCount);

        // If not enough found, use fallbacks
        if (newDistractors.length < neededCount) {
          const stillNeeded = neededCount - newDistractors.length;
          console.log(`   ⚠️  Only found ${newDistractors.length} from category, using ${stillNeeded} fallbacks`);

          const fallbacks = await generateFallbackDistractors(question as any, stillNeeded);
          newDistractors = [...newDistractors, ...fallbacks];
          usedFallback++;
        } else {
          usedCategory++;
        }

        console.log(`   Generated: ${newDistractors.join(', ')}`);

        // Find the next available order numbers
        const existingOrders = question.distractors.map((d: any) => d.order);
        const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : 0;

        // Add distractors to database
        const distractorsToCreate = newDistractors.map((text, index) => ({
          questionId: question.id,
          distractorText: text,
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

      // Progress indicator every 50 questions
      if (processed % 50 === 0) {
        console.log(`\n📊 Progress: ${processed}/${questionsNeedingDistractors.length} (${((processed / questionsNeedingDistractors.length) * 100).toFixed(1)}%)\n`);
      }
    }

    console.log('\n========================================');
    console.log('📊 Final Statistics:');
    console.log(`   Processed: ${processed}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total distractors added: ${totalDistractorsAdded}`);
    console.log(`   From category: ${usedCategory}`);
    console.log(`   From fallback: ${usedFallback}`);
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
    const percentage = ((perfect / updatedQuestions.length) * 100).toFixed(1);

    console.log(`✅ Questions with 4 distractors: ${perfect} / ${updatedQuestions.length} (${percentage}%)`);
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
  addMissingDistractorsAuto()
    .then((result) => {
      console.log('✅ Distractor generation complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { addMissingDistractorsAuto };

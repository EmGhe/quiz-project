/**
 * Ingestion Script: QuizzAPI.fr
 *
 * Fetches 100 questions from QuizzAPI.fr and imports them into the database
 * Creates facts, questions, accepted answers, and 4 distractors per question
 *
 * Usage: npx tsx scripts/ingest/quizzapi-import.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category mapping QuizzAPI → Database
const CATEGORY_MAPPING: Record<string, string> = {
  'tv_cinema': 'cinema',
  'art_litterature': 'litterature',
  'sport': 'sport',
  'histoire': 'histoire',
  'geographie': 'geographie',
  'science': 'geographie', // Fallback to existing category
  'musique': 'geographie', // Fallback to existing category
  'culture_generale': 'geographie', // Fallback to existing category
  'jeux_videos': 'geographie', // Fallback to existing category
  'actu_politique': 'histoire', // Fallback to existing category
};

// Difficulty mapping
const DIFFICULTY_MAPPING: Record<string, string> = {
  'facile': 'facile',
  'normal': 'moyen',
  'difficile': 'difficile',
};

interface QuizzAPIQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  badAnswers: string[];
}

interface QuizzAPIResponse {
  count: number;
  quizzes: QuizzAPIQuestion[];
}

function getLevenshteinThreshold(answer: string): number {
  if (answer.length <= 4) return 1;
  if (answer.length <= 8) return 2;
  return 3;
}

async function fetchQuizzAPIQuestions(limit: number = 100): Promise<QuizzAPIQuestion[]> {
  console.log(`📡 Fetching ${limit} questions from QuizzAPI.fr...`);

  const response = await fetch(`https://quizzapi.fr/api/v2/quiz?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`QuizzAPI request failed: ${response.status} ${response.statusText}`);
  }

  const data: QuizzAPIResponse = await response.json();
  console.log(`✅ Fetched ${data.count} questions\n`);

  return data.quizzes;
}

/**
 * Generate a 4th distractor based on patterns from existing ones
 */
async function generateFourthDistractor(
  question: string,
  correctAnswer: string,
  existingDistractors: string[],
  category: string
): Promise<string> {
  // Predefined distractor pools by category type
  const DISTRACTOR_POOLS: Record<string, string[]> = {
    cinema: [
      'Steven Spielberg',
      'Christopher Nolan',
      'Martin Scorsese',
      'Quentin Tarantino',
      'Francis Ford Coppola',
      'Alfred Hitchcock',
      'Stanley Kubrick',
      'Ridley Scott',
      'James Cameron',
      'Tim Burton',
    ],
    geographie: [
      'Paris',
      'Londres',
      'Berlin',
      'Madrid',
      'Rome',
      'Tokyo',
      'New York',
      'Sydney',
      'Le Caire',
      'Pékin',
    ],
    histoire: [
      'Napoléon Bonaparte',
      'Jules César',
      'Alexandre le Grand',
      'Charlemagne',
      'Louis XIV',
      'Cléopâtre',
      'Jeanne d\'Arc',
      'Charles de Gaulle',
      'Winston Churchill',
      'George Washington',
    ],
    sport: [
      'Zinédine Zidane',
      'Lionel Messi',
      'Cristiano Ronaldo',
      'Pelé',
      'Diego Maradona',
      'Michael Jordan',
      'Usain Bolt',
      'Roger Federer',
      'Rafael Nadal',
      'Serena Williams',
    ],
    litterature: [
      'Victor Hugo',
      'Marcel Proust',
      'Albert Camus',
      'Jean-Paul Sartre',
      'Molière',
      'Gustave Flaubert',
      'Émile Zola',
      'Alexandre Dumas',
      'Honoré de Balzac',
      'Charles Baudelaire',
    ],
  };

  const pool = DISTRACTOR_POOLS[category] || DISTRACTOR_POOLS['geographie'];

  // Filter out correct answer and existing distractors
  const availableDistractors = pool.filter(
    (d) =>
      d !== correctAnswer &&
      !existingDistractors.includes(d) &&
      !existingDistractors.some((ed) => ed.toLowerCase().includes(d.toLowerCase()))
  );

  if (availableDistractors.length > 0) {
    // Pick a random one
    return availableDistractors[Math.floor(Math.random() * availableDistractors.length)];
  }

  // Fallback: modify one of the existing distractors slightly
  const template = existingDistractors[0];

  // Try to detect patterns
  if (/\d{4}/.test(correctAnswer)) {
    // Year-based
    const year = parseInt(correctAnswer.match(/\d{4}/)?.[0] || '2000');
    const offset = Math.floor(Math.random() * 20) - 10;
    return `${year + offset}`;
  } else if (/\d+/.test(template)) {
    // Number-based
    const num = parseInt(template.match(/\d+/)?.[0] || '10');
    return template.replace(/\d+/, `${num + Math.floor(Math.random() * 5) - 2}`);
  } else {
    // Generic fallback
    return `${template} (variante)`;
  }
}

async function ensureQuizzAPISource() {
  const source = await prisma.source.upsert({
    where: { name: 'QuizzAPI.fr' },
    update: {},
    create: {
      name: 'QuizzAPI.fr',
      type: 'api',
      url: 'https://quizzapi.fr',
      reliability: 4,
      description: 'API collaborative de questions de quiz en français',
    },
  });
  return source;
}

async function main() {
  console.log('\n========================================');
  console.log('📥 Importing questions from QuizzAPI.fr');
  console.log('========================================\n');

  try {
    // Step 1: Ensure source exists
    console.log('Step 1: Setting up QuizzAPI source...');
    const source = await ensureQuizzAPISource();
    console.log(`✅ Source ready: ${source.name}\n`);

    // Step 2: Fetch questions
    const apiQuestions = await fetchQuizzAPIQuestions(100);

    // Step 3: Get all categories
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.slug, c]));

    let stats = {
      factsCreated: 0,
      factsSkipped: 0,
      questionsCreated: 0,
      questionsSkipped: 0,
      distractorsCreated: 0,
    };

    console.log('Step 3: Processing questions...\n');

    for (const [index, apiQuestion] of apiQuestions.entries()) {
      const progress = `[${index + 1}/${apiQuestions.length}]`;

      // Map category
      const categorySlug = CATEGORY_MAPPING[apiQuestion.category] || 'geographie';
      const category = categoryMap.get(categorySlug);

      if (!category) {
        console.log(`${progress} ⏭️  Skipped: Category ${categorySlug} not found`);
        continue;
      }

      // Step 3.1: Create Fact (correct RDF structure)
      const factSubject = apiQuestion.answer; // Answer is the subject
      const factProperty = 'description'; // Always "description"
      const factObject = apiQuestion.question; // Question is the object

      let fact;
      try {
        fact = await prisma.fact.upsert({
          where: {
            subject_property_object: {
              subject: factSubject,
              property: factProperty,
              object: factObject,
            },
          },
          update: {},
          create: {
            subject: factSubject,
            property: factProperty,
            object: factObject,
            sourceId: source.id,
            sourceReference: apiQuestion.id,
            categoryId: category.id,
            tags: [apiQuestion.category],
            interestScore: 7,
            data: {
              originalCategory: apiQuestion.category,
              originalDifficulty: apiQuestion.difficulty,
              badAnswers: apiQuestion.badAnswers,
            },
          },
        });

        if (fact.createdAt.getTime() === fact.updatedAt.getTime()) {
          stats.factsCreated++;
        } else {
          stats.factsSkipped++;
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation - fact already exists
          fact = await prisma.fact.findFirst({
            where: {
              subject: factSubject,
              property: factProperty,
              object: factObject,
            },
          });
          stats.factsSkipped++;
        } else {
          throw error;
        }
      }

      if (!fact) {
        console.log(`${progress} ❌ Failed to create/find fact`);
        continue;
      }

      // Step 3.2: Create Question
      const questionText = apiQuestion.question;
      const difficulty = DIFFICULTY_MAPPING[apiQuestion.difficulty] || 'moyen';

      let question;
      try {
        question = await prisma.question.upsert({
          where: { text: questionText },
          update: {},
          create: {
            factId: fact.id,
            text: questionText,
            questionType: 'texte',
            difficulty,
            categoryId: category.id,
            status: 'publie',
            enabledForDaily: true,
            enabledForMcq: true,
            mediaSourceUrl: 'https://quizzapi.fr',
          },
        });

        if (question.createdAt.getTime() === question.updatedAt.getTime()) {
          stats.questionsCreated++;
          console.log(`${progress} ✅ Question created: ${questionText.substring(0, 60)}...`);
        } else {
          stats.questionsSkipped++;
          console.log(`${progress} ⏭️  Question skipped (already exists)`);
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          stats.questionsSkipped++;
          console.log(`${progress} ⏭️  Question skipped (duplicate)`);
          continue;
        }
        throw error;
      }

      // Step 3.3: Create Accepted Answer
      const existingAnswers = await prisma.acceptedAnswer.findMany({
        where: { questionId: question.id },
      });

      if (existingAnswers.length === 0) {
        await prisma.acceptedAnswer.create({
          data: {
            questionId: question.id,
            answer: apiQuestion.answer,
            isPrimary: true,
            variantType: 'exacte',
            levenshteinThreshold: getLevenshteinThreshold(apiQuestion.answer),
          },
        });
      }

      // Step 3.4: Create 4 Distractors
      const existingDistractors = await prisma.distractor.findMany({
        where: { questionId: question.id },
      });

      if (existingDistractors.length === 0) {
        // Get 3 existing distractors from API
        const threeDistractors = apiQuestion.badAnswers.slice(0, 3);

        // Generate 4th distractor
        let fourthDistractor: string;
        try {
          fourthDistractor = await generateFourthDistractor(
            apiQuestion.question,
            apiQuestion.answer,
            threeDistractors,
            categorySlug
          );
        } catch (error) {
          console.warn(`${progress} ⚠️  Using fallback for 4th distractor`);
          // Fallback: use the 4th from API if exists, or duplicate one
          fourthDistractor = apiQuestion.badAnswers[3] || threeDistractors[0];
        }

        const allDistractors = [...threeDistractors, fourthDistractor];

        for (let i = 0; i < 4; i++) {
          await prisma.distractor.create({
            data: {
              questionId: question.id,
              distractorText: allDistractors[i],
              plausibilityScore: i < 3 ? 85 : 80, // 4th is slightly less reliable
              order: i + 1,
            },
          });
          stats.distractorsCreated++;
        }
      }
    }

    console.log('\n========================================');
    console.log('📊 Import Summary');
    console.log('========================================');
    console.log(`Facts created:       ${stats.factsCreated}`);
    console.log(`Facts skipped:       ${stats.factsSkipped}`);
    console.log(`Questions created:   ${stats.questionsCreated}`);
    console.log(`Questions skipped:   ${stats.questionsSkipped}`);
    console.log(`Distractors created: ${stats.distractorsCreated}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

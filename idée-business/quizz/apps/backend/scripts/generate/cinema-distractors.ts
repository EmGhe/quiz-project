import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎭 Generating cinema distractors...\n');

  // Get all cinema questions
  const questions = await prisma.question.findMany({
    where: {
      category: {
        slug: {
          in: ['cinema-films', 'cinema-acteurs', 'cinema-realisateurs', 'cinema-personnages', 'cinema-repliques'],
        },
      },
    },
    include: {
      acceptedAnswers: true,
      category: true,
      fact: true,
    },
  });

  console.log(`Found ${questions.length} cinema questions\n`);

  // Get all cinema facts for distractors
  const allFilms = await prisma.fact.findMany({
    where: { category: { slug: 'cinema-films' } },
  });

  const allActors = await prisma.fact.findMany({
    where: { category: { slug: 'cinema-acteurs' } },
  });

  const allCharacters = await prisma.fact.findMany({
    where: { category: { slug: 'cinema-personnages' } },
  });

  let totalDistractors = 0;

  for (const question of questions) {
    const correctAnswer = question.acceptedAnswers.find((a) => a.isPrimary)?.answer;
    if (!correctAnswer) continue;

    const categorySlug = question.category?.slug;
    let distractors: { text: string; score: number }[] = [];

    // Film directors
    if (categorySlug === 'cinema-films' && question.text.includes('Qui a réalisé')) {
      // Get other directors
      const directors = allFilms
        .map((f) => f.object)
        .filter((d) => d !== correctAnswer)
        .slice(0, 10);

      distractors = directors.map((d) => ({
        text: d,
        score: 85,
      }));
    }

    // Films with actors
    else if (categorySlug === 'cinema-acteurs' && question.text.includes('Quel acteur joue dans')) {
      // Get other actors
      const actors = allActors
        .map((f) => f.subject)
        .filter((a) => a !== correctAnswer)
        .slice(0, 10);

      distractors = actors.map((a) => ({
        text: a,
        score: 80,
      }));
    }

    // Characters
    else if (categorySlug === 'cinema-personnages') {
      if (question.text.includes('Quel personnage joue')) {
        // Get other characters from same or similar films
        const characters = allCharacters
          .map((f) => f.subject)
          .filter((c) => c !== correctAnswer)
          .slice(0, 10);

        distractors = characters.map((c) => ({
          text: c,
          score: 75,
        }));
      } else if (question.text.includes('Dans quel film apparaît')) {
        // Get other films
        const films = allFilms
          .map((f) => f.subject)
          .filter((film) => film !== correctAnswer)
          .slice(0, 10);

        distractors = films.map((f) => ({
          text: f,
          score: 80,
        }));
      }
    }

    // Quotes
    else if (categorySlug === 'cinema-repliques') {
      // Get other films
      const films = allFilms
        .map((f) => f.subject)
        .filter((f) => f !== correctAnswer)
        .slice(0, 10);

      distractors = films.map((f) => ({
        text: f,
        score: 85,
      }));
    }

    // Shuffle and take 3
    const shuffled = distractors.sort(() => Math.random() - 0.5).slice(0, 3);

    for (let i = 0; i < shuffled.length; i++) {
      const distractor = shuffled[i];

      await prisma.distractor.upsert({
        where: {
          questionId_order: {
            questionId: question.id,
            order: i + 1,
          },
        },
        update: {
          distractorText: distractor.text,
          plausibilityScore: distractor.score,
        },
        create: {
          questionId: question.id,
          distractorText: distractor.text,
          plausibilityScore: distractor.score,
          order: i + 1,
        },
      });
      totalDistractors++;
    }
  }

  console.log(`✅ Total distractors created: ${totalDistractors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

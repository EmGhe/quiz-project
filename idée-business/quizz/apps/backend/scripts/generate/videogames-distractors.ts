import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating video games question distractors...\n');

  const gameCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: 'jeux-video-'
      }
    }
  });

  console.log(`Found ${gameCategories.length} video game categories\n`);

  let totalDistractors = 0;

  for (const category of gameCategories) {
    console.log(`Processing ${category.name}...`);

    const questions = await prisma.question.findMany({
      where: {
        categoryId: category.id,
      },
      include: {
        acceptedAnswers: true,
        fact: true,
      },
    });

    if (questions.length === 0) {
      console.log(`  No questions found`);
      continue;
    }

    const allFacts = await prisma.fact.findMany({
      where: {
        categoryId: category.id,
      },
    });

    for (const question of questions) {
      const correctAnswer = question.acceptedAnswers[0]?.answer;
      if (!correctAnswer) continue;

      const existingDistractors = await prisma.distractor.count({
        where: { questionId: question.id }
      });
      if (existingDistractors > 0) {
        continue;
      }

      const potentialDistractors = allFacts
        .filter(f => {
          if (f.id === question.factId) return false;

          const factValues = [f.subject, f.object].map(v => v.toLowerCase());
          const correctLower = correctAnswer.toLowerCase();

          return !factValues.some(v =>
            v === correctLower ||
            correctLower.includes(v) ||
            v.includes(correctLower)
          );
        });

      const shuffled = potentialDistractors.sort(() => Math.random() - 0.5);
      const selectedDistractors = shuffled.slice(0, 3).map(f => {
        // For studio/franchise questions, prefer subjects (names)
        // For character questions, prefer game names
        if (question.text.includes('personnage')) {
          return f.object; // game name
        }
        return f.subject; // studio/franchise/character name
      });

      while (selectedDistractors.length < 3) {
        const generic = getGenericDistractor(category.slug, selectedDistractors, correctAnswer);
        if (generic && !selectedDistractors.includes(generic)) {
          selectedDistractors.push(generic);
        } else {
          break;
        }
      }

      for (let i = 0; i < selectedDistractors.length; i++) {
        await prisma.distractor.create({
          data: {
            questionId: question.id,
            distractorText: selectedDistractors[i],
            order: i + 1,
          },
        });
        totalDistractors++;
      }
    }

    console.log(`  ✅ ${questions.length} questions processed`);
  }

  console.log(`\n✅ Generated ${totalDistractors} distractors`);
}

function getGenericDistractor(categorySlug: string, existingDistractors: string[], correctAnswer: string): string | null {
  const genericDistractors: Record<string, string[]> = {
    'jeux-video-franchises': [
      'Overwatch', 'League of Legends', 'Valorant', 'Counter-Strike',
      'Apex Legends', 'Warcraft', 'StarCraft', 'Diablo'
    ],
    'jeux-video-personnages': [
      'Bowser', 'Peach', 'Luigi', 'Yoshi', 'Donkey Kong',
      'Crash Bandicoot', 'Spyro', 'Rayman', 'Cloud Strife'
    ],
    'jeux-video-studios': [
      'Blizzard', 'Valve', 'Epic Games', 'Square Enix',
      'Capcom', 'Konami', 'Bethesda', 'EA'
    ],
  };

  const pool = genericDistractors[categorySlug] || [];
  const available = pool.filter(d =>
    !existingDistractors.includes(d) &&
    d.toLowerCase() !== correctAnswer.toLowerCase()
  );

  return available.length > 0 ? available[0] : null;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

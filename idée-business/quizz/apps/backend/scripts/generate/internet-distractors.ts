import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating internet culture question distractors...\n');

  const internetCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: 'internet-'
      }
    }
  });

  console.log(`Found ${internetCategories.length} internet culture categories\n`);

  let totalDistractors = 0;

  for (const category of internetCategories) {
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
      const selectedDistractors = shuffled.slice(0, 3).map(f => f.subject);

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
    'internet-youtubeurs-fr': [
      'Tibo InShape', 'Rémi Gaillard', 'Mr Poulpe', 'SEB',
      'Poisson Fecond', 'Antoine Daniel', 'Étienne (e-penser)', 'Linguisticae'
    ],
    'internet-streamers-fr': [
      'Solary', 'Locklear', 'Siphano', 'Doigby',
      'Baghera Jones', 'Ponce', 'Kameto', 'Alphacast'
    ],
    'internet-evenements': [
      'Twitch Rivals', 'Game One Music Show', 'Webedia Next'
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

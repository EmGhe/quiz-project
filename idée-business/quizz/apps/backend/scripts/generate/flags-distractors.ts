import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating flag question distractors...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'geographie-drapeaux' },
  });

  if (!category) {
    throw new Error('Category geographie-drapeaux not found');
  }

  // Get all flag questions with their facts
  const questions = await prisma.question.findMany({
    where: {
      categoryId: category.id,
      questionType: 'image',
    },
    include: {
      fact: true,
      acceptedAnswers: true,
    },
  });

  console.log(`Found ${questions.length} flag questions\n`);

  // Get all flag facts for distractor pool
  const allFacts = await prisma.fact.findMany({
    where: {
      categoryId: category.id,
      property: 'drapeau',
    },
  });

  let totalDistractors = 0;

  for (const question of questions) {
    const correctCountry = question.acceptedAnswers[0]?.answer;
    if (!correctCountry) continue;

    const correctFact = question.fact;
    const correctContinent = (correctFact.data as any)?.continent;

    // Get potential distractors (exclude correct answer)
    const potentialDistractors = allFacts.filter(f => f.subject !== correctCountry);

    // Prioritize same continent
    const sameContinentDistractors = potentialDistractors.filter(
      f => (f.data as any)?.continent === correctContinent
    );
    const otherDistractors = potentialDistractors.filter(
      f => (f.data as any)?.continent !== correctContinent
    );

    // Select 3 distractors: prefer same continent
    const selectedDistractors: string[] = [];

    // Take up to 2 from same continent
    const shuffledSameContinent = sameContinentDistractors.sort(() => Math.random() - 0.5);
    selectedDistractors.push(...shuffledSameContinent.slice(0, 2).map(f => f.subject));

    // Fill remaining with other continents
    const needed = 3 - selectedDistractors.length;
    if (needed > 0) {
      const shuffledOthers = otherDistractors.sort(() => Math.random() - 0.5);
      selectedDistractors.push(...shuffledOthers.slice(0, needed).map(f => f.subject));
    }

    // Create distractors
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

  console.log(`✅ Generated ${totalDistractors} distractors for ${questions.length} questions`);
  console.log(`   Average: ${(totalDistractors / questions.length).toFixed(1)} distractors per question`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

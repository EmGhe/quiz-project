import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍽️  Generating gastronomie distractors...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'gastronomie-plats-monde' },
    include: {
      questions: {
        where: { status: 'publie' },
        include: {
          fact: true,
          distractors: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const questions = category.questions;
  console.log(`Found ${questions.length} questions\n`);

  // Get all facts for distractor pool
  const allFacts = await prisma.fact.findMany({
    where: { categoryId: category.id },
  });

  let created = 0;
  let skipped = 0;

  for (const question of questions) {
    // Skip if already has distractors
    if (question.distractors.length > 0) {
      skipped++;
      continue;
    }

    const correctAnswer = (question.fact.data as any)?.answer || question.fact.object;
    const country = (question.fact.data as any)?.country;

    // Get distractors (other dishes, prioritize same country)
    const sameCountryFacts = allFacts.filter(
      (f) => {
        const factAnswer = (f.data as any)?.answer || f.object;
        return factAnswer !== correctAnswer && (f.data as any)?.country === country;
      }
    );

    const otherFacts = allFacts.filter(
      (f) => {
        const factAnswer = (f.data as any)?.answer || f.object;
        return factAnswer !== correctAnswer && (f.data as any)?.country !== country;
      }
    );

    // Pick 2 from same country, 1 from other countries
    const distractors: string[] = [];

    // Add same country (up to 2)
    for (let i = 0; i < Math.min(2, sameCountryFacts.length); i++) {
      const answer = (sameCountryFacts[i].data as any)?.answer || sameCountryFacts[i].object;
      distractors.push(answer);
    }

    // Fill remaining with other countries
    const needed = 3 - distractors.length;
    for (let i = 0; i < Math.min(needed, otherFacts.length); i++) {
      const answer = (otherFacts[i].data as any)?.answer || otherFacts[i].object;
      distractors.push(answer);
    }

    // Shuffle distractors
    const shuffled = distractors.sort(() => Math.random() - 0.5);

    // Create distractors
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: shuffled[i],
          order: i + 1,
          plausibilityScore: 80,
        },
      });
    }

    // Enable for MCQ if we have 3+ distractors
    if (shuffled.length >= 3) {
      await prisma.question.update({
        where: { id: question.id },
        data: { enabledForMcq: true },
      });
    }

    created++;
    console.log(`✅ ${question.text.substring(0, 60)}... (${shuffled.length} distractors)`);
  }

  console.log(`\n✅ ${created} questions updated with distractors, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

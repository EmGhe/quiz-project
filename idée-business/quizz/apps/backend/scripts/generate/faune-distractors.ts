import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🦁 Generating faune distractors...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'faune-animaux' },
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

    // Get distractors (other animals)
    const otherFacts = allFacts.filter(
      (f) => {
        const factAnswer = (f.data as any)?.answer || f.object;
        return factAnswer !== correctAnswer;
      }
    );

    // Shuffle and pick 3
    const shuffled = otherFacts.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3).map((f) => (f.data as any)?.answer || f.object);

    // Create distractors
    for (let i = 0; i < distractors.length; i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: distractors[i],
          order: i + 1,
          plausibilityScore: 80,
        },
      });
    }

    // Enable for MCQ if we have 3 distractors
    if (distractors.length >= 3) {
      await prisma.question.update({
        where: { id: question.id },
        data: { enabledForMcq: true },
      });
    }

    created++;
    console.log(`✅ ${question.text.substring(0, 60)}... (${distractors.length} distractors)`);
  }

  console.log(`\n✅ ${created} questions updated with distractors, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns to identify questions to DELETE
const PATTERNS_TO_DELETE = [
  // Large/approximate numbers
  /Quelle est (la|l') (taille|altitude|population|distance|superficie|hauteur|profondeur|longueur|largeur|poids|masse)/i,
  /Combien mesure/i,
  /Quelle quantité/i,

  // Mathematical formulas
  /Quelle est la formule de/i,
  /Quelle est l'équation/i,
  /Quelle formule/i,
];

async function main() {
  console.log('🔍 Searching for questions to delete (large numbers & formulas)...\n');

  // Get all published questions
  const allQuestions = await prisma.question.findMany({
    where: { status: 'publie' },
    include: {
      acceptedAnswers: true,
      category: true,
    }
  });

  const questionsToDelete = [];

  for (const question of allQuestions) {
    let shouldDelete = false;

    // Check if question text matches patterns to delete
    for (const pattern of PATTERNS_TO_DELETE) {
      if (pattern.test(question.text)) {
        shouldDelete = true;
        break;
      }
    }

    // Check if primary answer is a very large number (>3000, excluding years 1000-2100)
    if (!shouldDelete) {
      const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary);
      if (primaryAnswer) {
        const answer = primaryAnswer.answer.trim();
        const numericValue = parseInt(answer);

        // Delete if it's a pure number > 3000 (likely altitude, population, etc.)
        // Years (1000-2100) are OK
        if (!isNaN(numericValue) && numericValue > 3000) {
          shouldDelete = true;
        }
      }
    }

    if (shouldDelete) {
      const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary);
      questionsToDelete.push(question);
      console.log(`❌ ${question.category.name}: ${question.text} → ${primaryAnswer?.answer}`);
    }
  }

  console.log(`\n📊 Found ${questionsToDelete.length} questions to delete\n`);

  if (questionsToDelete.length === 0) {
    console.log('✅ No questions to delete');
    return;
  }

  // Group by category for summary
  const byCategory = questionsToDelete.reduce((acc, q) => {
    const catName = q.category.name;
    if (!acc[catName]) acc[catName] = 0;
    acc[catName]++;
    return acc;
  }, {} as Record<string, number>);

  console.log('Summary by category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} questions`);
  });

  console.log('\n⚠️  Deleting in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete questions
  let deletedCount = 0;
  for (const question of questionsToDelete) {
    // Delete related records first
    await prisma.distractor.deleteMany({ where: { questionId: question.id } });
    await prisma.acceptedAnswer.deleteMany({ where: { questionId: question.id } });
    await prisma.dailyQuestion.deleteMany({ where: { questionId: question.id } });
    await prisma.questionMetadata.deleteMany({ where: { questionId: question.id } });

    // Delete question
    await prisma.question.delete({ where: { id: question.id } });
    deletedCount++;
  }

  console.log(`\n✅ Deleted ${deletedCount} questions`);

  // Show updated counts
  const remainingByCategory = await prisma.question.groupBy({
    by: ['categoryId'],
    where: { status: 'publie' },
    _count: true,
  });

  console.log('\n📊 Remaining questions by category:');
  for (const group of remainingByCategory) {
    const category = await prisma.category.findUnique({
      where: { id: group.categoryId! }
    });
    console.log(`  ${category?.name}: ${group._count} questions`);
  }

  const total = remainingByCategory.reduce((sum, g) => sum + g._count, 0);
  console.log(`\n  TOTAL: ${total} questions`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

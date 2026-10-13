import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns to identify numeric questions
const NUMERIC_PATTERNS = [
  /^Combien de (planètes|côtés|os|muscles)/i,
  /^Combien (font|y a-t-il)/i,
  /Quelle est la (taille|altitude|population|distance|superficie|hauteur|profondeur|longueur|largeur)/i,
  /Quel est le (nombre|total|montant|prix|coût)/i,
  /En quelle année/i,
  /Combien mesure/i,
  /Quelle quantité/i,
];

async function main() {
  console.log('🧹 Searching for numeric questions to delete...\n');

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
    let isNumeric = false;

    // Check if question text matches numeric patterns
    for (const pattern of NUMERIC_PATTERNS) {
      if (pattern.test(question.text)) {
        isNumeric = true;
        break;
      }
    }

    // Check if primary answer is a number
    const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary);
    if (primaryAnswer) {
      const answer = primaryAnswer.answer.trim();
      // Check if answer is purely numeric or contains only digits
      if (/^\d+$/.test(answer)) {
        isNumeric = true;
      }
    }

    if (isNumeric) {
      questionsToDelete.push(question);
      console.log(`❌ ${question.category.name}: ${question.text} → ${primaryAnswer?.answer}`);
    }
  }

  console.log(`\n📊 Found ${questionsToDelete.length} numeric questions to delete\n`);

  if (questionsToDelete.length === 0) {
    console.log('✅ No numeric questions found');
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

  console.log(`\n✅ Deleted ${deletedCount} numeric questions`);

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

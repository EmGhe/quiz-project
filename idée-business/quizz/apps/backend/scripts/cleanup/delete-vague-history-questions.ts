import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns for vague questions to DELETE
const VAGUE_PATTERNS = [
  /^Qui était /i,  // "Qui était Napoléon ?" → trop ouvert
  /^Quel événement a eu lieu en /i,  // "Quel événement en 1944 ?" → plusieurs événements
];

// Patterns to KEEP (specific questions)
const SPECIFIC_PATTERNS = [
  /^Qui a (peint|écrit|composé|découvert|inventé)/i,  // Questions spécifiques
  /^Quel était le surnom de/i,  // Surnom = réponse unique
  /^En quelle année/i,  // Année = réponse unique
  /^Dans quel domaine/i,  // Domaine = acceptable (réponse unique)
];

async function main() {
  console.log('🔍 Searching for vague history questions to delete...\n');

  // Get all history questions
  const allQuestions = await prisma.question.findMany({
    where: {
      status: 'publie',
      category: {
        slug: {
          startsWith: 'histoire'
        }
      }
    },
    include: {
      acceptedAnswers: true,
      category: true,
    }
  });

  const questionsToDelete = [];

  for (const question of allQuestions) {
    let isVague = false;

    // Check if it's a specific question (KEEP)
    let isSpecific = false;
    for (const pattern of SPECIFIC_PATTERNS) {
      if (pattern.test(question.text)) {
        isSpecific = true;
        break;
      }
    }

    // If it's specific, skip
    if (isSpecific) {
      continue;
    }

    // Check if it matches vague patterns
    for (const pattern of VAGUE_PATTERNS) {
      if (pattern.test(question.text)) {
        isVague = true;
        break;
      }
    }

    if (isVague) {
      const primaryAnswer = question.acceptedAnswers.find(a => a.isPrimary);
      questionsToDelete.push(question);
      console.log(`❌ ${question.category.name}: ${question.text} → ${primaryAnswer?.answer}`);
    }
  }

  console.log(`\n📊 Found ${questionsToDelete.length} vague questions to delete\n`);

  if (questionsToDelete.length === 0) {
    console.log('✅ No vague questions found');
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

  console.log(`\n✅ Deleted ${deletedCount} vague questions`);

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

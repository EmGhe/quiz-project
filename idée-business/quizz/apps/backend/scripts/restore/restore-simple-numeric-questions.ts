import { PrismaClient } from '@prisma/client';
import { getLevenshteinThreshold } from '../utils/question-templates';

const prisma = new PrismaClient();

// Questions to restore
const QUESTIONS_TO_RESTORE = [
  // Histoire - années
  {
    categorySlug: 'histoire',
    text: 'En quelle année la Tour Eiffel a-t-elle été construite ?',
    answer: '1889',
    difficulty: 'moyen',
    factSubject: 'Tour Eiffel',
  },
  {
    categorySlug: 'histoire',
    text: 'En quelle année a eu lieu la Révolution française ?',
    answer: '1789',
    difficulty: 'facile',
    factSubject: 'Révolution française',
  },

  // Sciences - Astronomie
  {
    categorySlug: 'sciences-astronomie',
    text: 'Combien de planètes y a-t-il dans le système solaire ?',
    answer: '8',
    difficulty: 'facile',
    factSubject: 'Système solaire',
  },

  // Sciences - Mathématiques (côtés)
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Triangle ?',
    answer: '3',
    difficulty: 'facile',
    factSubject: 'Triangle',
  },
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Carré ?',
    answer: '4',
    difficulty: 'facile',
    factSubject: 'Carré',
  },
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Rectangle ?',
    answer: '4',
    difficulty: 'facile',
    factSubject: 'Rectangle',
  },
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Pentagone ?',
    answer: '5',
    difficulty: 'moyen',
    factSubject: 'Pentagone',
  },
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Hexagone ?',
    answer: '6',
    difficulty: 'moyen',
    factSubject: 'Hexagone',
  },
  {
    categorySlug: 'sciences-mathematiques',
    text: 'Combien de côtés a un Octogone ?',
    answer: '8',
    difficulty: 'moyen',
    factSubject: 'Octogone',
  },
];

async function main() {
  console.log('♻️  Restoring simple numeric questions...\n');

  let restoredCount = 0;

  for (const q of QUESTIONS_TO_RESTORE) {
    // Check if question already exists
    const existing = await prisma.question.findFirst({
      where: { text: q.text }
    });

    if (existing) {
      console.log(`⏭️  Skipped: ${q.text} (already exists)`);
      continue;
    }

    // Get category
    const category = await prisma.category.findUnique({
      where: { slug: q.categorySlug }
    });

    if (!category) {
      console.log(`❌ Category not found: ${q.categorySlug}`);
      continue;
    }

    // Find or create fact
    let fact = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: q.factSubject,
      }
    });

    if (!fact) {
      // Create a simple fact
      const source = await prisma.source.findFirst({
        where: { name: { contains: 'manual' } }
      });

      if (!source) {
        console.log(`❌ No source found for ${q.factSubject}`);
        continue;
      }

      fact = await prisma.fact.create({
        data: {
          subject: q.factSubject,
          property: 'answer',
          object: q.answer,
          categoryId: category.id,
          sourceId: source.id,
          sourceReference: 'Manual',
          interestScore: 7,
        }
      });
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        text: q.text,
        difficulty: q.difficulty,
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        qualityScore: 85,
      }
    });

    // Create accepted answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: q.answer,
        isPrimary: true,
        variantType: 'canonical',
        levenshteinThreshold: getLevenshteinThreshold(q.answer),
      }
    });

    // Create simple distractors for numeric answers
    const distractors = [];
    const answerNum = parseInt(q.answer);

    if (!isNaN(answerNum)) {
      // Generate nearby numbers as distractors
      const nearby = [answerNum - 2, answerNum - 1, answerNum + 1, answerNum + 2];
      const validDistractors = nearby.filter(n => n > 0 && n !== answerNum);

      for (let i = 0; i < Math.min(4, validDistractors.length); i++) {
        await prisma.distractor.create({
          data: {
            questionId: question.id,
            distractorText: validDistractors[i].toString(),
            plausibilityScore: 80,
            order: i + 1,
          }
        });
      }
    }

    restoredCount++;
    console.log(`✅ Restored: ${q.text} → ${q.answer}`);
  }

  console.log(`\n✅ Restored ${restoredCount} questions`);

  // Show updated counts
  const remainingByCategory = await prisma.question.groupBy({
    by: ['categoryId'],
    where: { status: 'publie' },
    _count: true,
  });

  console.log('\n📊 Questions by category:');
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

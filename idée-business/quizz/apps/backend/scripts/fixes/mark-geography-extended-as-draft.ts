import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Marking geography extended questions as draft (MCQ only)...\n');

  // Get océans and rivières categories
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['geographie-oceans', 'geographie-rivieres']
      }
    }
  });

  const categoryIds = categories.map(c => c.id);

  // Find all published questions in these categories
  const questions = await prisma.question.findMany({
    where: {
      categoryId: {
        in: categoryIds
      },
      status: 'publie'
    },
    include: {
      category: true,
    }
  });

  console.log(`Found ${questions.length} questions to mark as draft:\n`);

  const byCategory = questions.reduce((acc, q) => {
    const catName = q.category.name;
    if (!acc[catName]) acc[catName] = 0;
    acc[catName]++;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} questions`);
  });

  console.log('\n⚠️  Updating in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Update to draft status
  const result = await prisma.question.updateMany({
    where: {
      categoryId: {
        in: categoryIds
      },
      status: 'publie'
    },
    data: {
      status: 'brouillon'
    }
  });

  console.log(`\n✅ Updated ${result.count} questions to "brouillon" status`);
  console.log(`\nℹ️  Ces questions seront utilisées plus tard en mode MCQ`);

  const totalPublished = await prisma.question.count({ where: { status: 'publie' } });
  console.log(`\n📊 Total published questions: ${totalPublished}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

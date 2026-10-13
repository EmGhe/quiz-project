import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📚 Moving book questions from Cinéma to Littérature...\n');

  // Get literature categories
  const litteratureFr = await prisma.category.findUnique({
    where: { slug: 'litterature-francaise' }
  });

  const litteratureInt = await prisma.category.findUnique({
    where: { slug: 'litterature-internationale' }
  });

  if (!litteratureFr || !litteratureInt) {
    throw new Error('Literature categories not found');
  }

  // Get all cinema questions
  const cinemaQuestions = await prisma.question.findMany({
    where: {
      category: { slug: 'cinema-films' }
    },
    include: { fact: true }
  });

  // Filter book questions
  const bookQuestions = cinemaQuestions.filter(q =>
    q.text.includes('Quel livre') || q.text.includes('Qui a écrit le livre')
  );

  console.log(`Found ${bookQuestions.length} book questions in Cinéma category\n`);

  // French authors (to determine category)
  const frenchAuthors = [
    'Victor Hugo', 'Albert Camus', 'Antoine de Saint-Exupéry',
    'Émile Zola', 'Gustave Flaubert', 'Alexandre Dumas', 'Molière',
    'Marcel Proust', 'Jean-Paul Sartre', 'Honoré de Balzac', 'Jules Verne'
  ];

  let movedToFr = 0;
  let movedToInt = 0;

  for (const question of bookQuestions) {
    // Determine if French or International based on fact data or question text
    const factData = question.fact.data as any;
    const author = factData?.author;

    let targetCategory = litteratureInt.id;

    // Check if French author
    if (author && frenchAuthors.some(fa => author.includes(fa))) {
      targetCategory = litteratureFr.id;
      movedToFr++;
    } else {
      movedToInt++;
    }

    // Update question category
    await prisma.question.update({
      where: { id: question.id },
      data: { categoryId: targetCategory }
    });

    // Update fact category
    await prisma.fact.update({
      where: { id: question.factId },
      data: { categoryId: targetCategory }
    });

    const catName = targetCategory === litteratureFr.id ? 'FR' : 'INT';
    console.log(`✅ Moved: ${question.text.substring(0, 60)}... → Littérature ${catName}`);
  }

  console.log(`\n✅ ${movedToFr} questions → Littérature Française`);
  console.log(`✅ ${movedToInt} questions → Littérature Internationale`);
  console.log(`✅ Total: ${bookQuestions.length} questions moved`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

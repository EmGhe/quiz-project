import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getLevenshteinThreshold(answer: string): number {
  if (answer.length <= 5) return 1;
  if (answer.length <= 10) return 2;
  return 3;
}

async function main() {
  console.log('📸 Generating visual cinema questions...\n');

  // Get actors with images (~27 questions = 50% of 55)
  const actorFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-acteurs' },
      property: 'joue dans',
      data: {
        path: ['imageUrl'],
        not: null,
      },
    },
    include: { category: true },
  });

  console.log(`Found ${actorFacts.length} actors with images`);

  // Get directors with images (~13 questions = 50% of 25)
  const directorFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-films' },
      property: 'réalisé par',
      data: {
        path: ['directorImageUrl'],
        not: null,
      },
    },
    include: { category: true },
  });

  console.log(`Found ${directorFacts.length} directors with images`);

  // Get category for realisateurs
  const realisateursCategory = await prisma.category.findUnique({
    where: { slug: 'cinema-realisateurs' },
  });

  if (!realisateursCategory) {
    throw new Error('cinema-realisateurs category not found');
  }

  let totalQuestions = 0;
  let actorCounter = 0;

  // Generate actor questions: "Qui est cet acteur ?" / "Qui est cette actrice ?"
  const processedActors = new Set<string>();

  for (const fact of actorFacts) {
    const actorName = fact.subject;
    const imageUrl = (fact.data as any)?.imageUrl;

    if (!imageUrl || processedActors.has(actorName)) continue;
    processedActors.add(actorName);
    actorCounter++;

    // Determine gender based on common patterns (simplification)
    const isFemale = actorName.includes('Audrey') || actorName.includes('Uma') ||
                     actorName.includes('Kate') || actorName.includes('Carrie') ||
                     actorName.includes('Robin') || actorName.includes('Marion') ||
                     actorName.includes('Bérénice') || actorName.includes('Valérie') ||
                     actorName.includes('Monica') || actorName.includes('Milla') ||
                     actorName.includes('Nicoletta') || actorName.includes('Rumi');

    const questionText = isFemale ? `Qui est cette actrice ? [${actorCounter}]` : `Qui est cet acteur ? [${actorCounter}]`;
    const answer = actorName;

    await prisma.question.create({
      data: {
        factId: fact.id,
        text: questionText,
        questionType: 'image',
        mediaUrl: imageUrl,
        difficulty: 'moyen',
        categoryId: fact.categoryId!,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            {
              answer,
              isPrimary: true,
              variantType: 'exacte',
              levenshteinThreshold: getLevenshteinThreshold(answer),
            },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ ${processedActors.size} visual actor questions created`);

  // Generate director questions: "Qui est ce réalisateur ?"
  const processedDirectors = new Set<string>();
  let directorCounter = 0;

  for (const fact of directorFacts) {
    const directorName = fact.object;
    const imageUrl = (fact.data as any)?.directorImageUrl;

    if (!imageUrl || processedDirectors.has(directorName)) continue;
    processedDirectors.add(directorName);
    directorCounter++;

    const questionText = `Qui est ce réalisateur ? [${directorCounter}]`;
    const answer = directorName;

    await prisma.question.create({
      data: {
        factId: fact.id,
        text: questionText,
        questionType: 'image',
        mediaUrl: imageUrl,
        difficulty: 'moyen',
        categoryId: realisateursCategory.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            {
              answer,
              isPrimary: true,
              variantType: 'exacte',
              levenshteinThreshold: getLevenshteinThreshold(answer),
            },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ ${processedDirectors.size} visual director questions created`);

  // Character visual questions would require character images, skipping for now
  // as we don't have character images (only actor images)

  console.log(`\n✅ Total visual questions generated: ${totalQuestions}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getLevenshteinThreshold(answer: string): number {
  if (answer.length <= 5) return 1;
  if (answer.length <= 10) return 2;
  return 3;
}

async function main() {
  console.log('🎬 Generating cinema questions...\n');

  // Get all cinema facts
  const filmFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-films' },
      property: 'réalisé par',
    },
    include: { category: true },
  });

  const actorFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-acteurs' },
      property: 'joue dans',
    },
    include: { category: true },
  });

  const characterFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-personnages' },
      property: 'personnage de',
    },
    include: { category: true },
  });

  const quoteFacts = await prisma.fact.findMany({
    where: {
      category: { slug: 'cinema-repliques' },
      property: 'réplique de',
    },
    include: { category: true },
  });

  let totalQuestions = 0;

  // Films: "Qui a réalisé X ?"
  for (const fact of filmFacts) {
    const questionText = `Qui a réalisé ${fact.subject} ?`;
    const answer = fact.object;

    await prisma.question.upsert({
      where: { text: questionText },
      update: {},
      create: {
        factId: fact.id,
        text: questionText,
        questionType: 'texte',
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
  console.log(`✅ ${filmFacts.length} film → director questions created`);

  // Acteurs: "Quel acteur joue [personnage] dans [film] ?"
  for (const fact of actorFacts) {
    const actorName = fact.subject;
    const film = fact.object;
    const character = (fact.data as any)?.character;

    if (character) {
      const questionText = `Quel acteur joue ${character} dans ${film} ?`;
      const answer = actorName;

      await prisma.question.upsert({
        where: { text: questionText },
        update: {},
        create: {
          factId: fact.id,
          text: questionText,
          questionType: 'texte',
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
  }
  console.log(`✅ ${actorFacts.length} actor → character questions created`);

  // Personnages: "Quel personnage joue X dans Y ?" et "Dans quel film apparaît X ?"
  for (const fact of characterFacts) {
    const character = fact.subject;
    const film = fact.object;
    const actorName = (fact.data as any)?.actor;

    if (actorName) {
      // "Quel personnage joue [acteur] dans [film] ?"
      const questionText = `Quel personnage joue ${actorName} dans ${film} ?`;
      const answer = character;

      await prisma.question.upsert({
        where: { text: questionText },
        update: {},
        create: {
          factId: fact.id,
          text: questionText,
          questionType: 'texte',
          difficulty: 'difficile',
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

    // "Dans quel film apparaît [personnage] ?"
    const questionText2 = `Dans quel film apparaît le personnage ${character} ?`;
    const answer2 = film;

    await prisma.question.upsert({
      where: { text: questionText2 },
      update: {},
      create: {
        factId: fact.id,
        text: questionText2,
        questionType: 'texte',
        difficulty: 'facile',
        categoryId: fact.categoryId!,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            {
              answer: answer2,
              isPrimary: true,
              variantType: 'exacte',
              levenshteinThreshold: getLevenshteinThreshold(answer2),
            },
          ],
        },
      },
    });
    totalQuestions++;
  }
  console.log(`✅ ${characterFacts.length * 2} character questions created`);

  // Répliques: "De quel film provient cette réplique : X ?"
  for (const fact of quoteFacts) {
    const quote = fact.subject;
    const film = fact.object;

    const questionText = `De quel film provient cette réplique : "${quote}" ?`;
    const answer = film;

    await prisma.question.upsert({
      where: { text: questionText },
      update: {},
      create: {
        factId: fact.id,
        text: questionText,
        questionType: 'texte',
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
  console.log(`✅ ${quoteFacts.length} quote questions created`);

  console.log(`\n✅ Total questions generated: ${totalQuestions}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

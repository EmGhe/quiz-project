import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a source
  const source = await prisma.source.upsert({
    where: { id: 'test-source-1' },
    update: {},
    create: {
      id: 'test-source-1',
      name: 'Test Source',
      type: 'manuel',
      reliability: 5,
    },
  });

  // Create a category
  const category = await prisma.category.upsert({
    where: { slug: 'histoire' },
    update: {},
    create: {
      name: 'Histoire',
      slug: 'histoire',
      description: 'Questions d\'histoire',
    },
  });

  // Create facts and questions
  const questionsData = [
    { fact: 'La Tour Eiffel a été construite en 1889', question: 'En quelle année la Tour Eiffel a-t-elle été construite ?', answer: '1889' },
    { fact: 'Paris est la capitale de la France', question: 'Quelle est la capitale de la France ?', answer: 'Paris' },
    { fact: 'La Révolution française a eu lieu en 1789', question: 'En quelle année a eu lieu la Révolution française ?', answer: '1789' },
    { fact: 'Napoléon Bonaparte est né en Corse', question: 'Où est né Napoléon Bonaparte ?', answer: 'Corse' },
    { fact: 'Le Louvre est le plus grand musée de France', question: 'Quel est le plus grand musée de France ?', answer: 'Le Louvre' },
    { fact: 'La France compte 67 millions d\'habitants', question: 'Combien d\'habitants compte la France ?', answer: '67 millions' },
    { fact: 'Le Mont Blanc culmine à 4809 mètres', question: 'Quelle est l\'altitude du Mont Blanc ?', answer: '4809' },
    { fact: 'Louis XIV est le Roi Soleil', question: 'Quel roi est surnommé le Roi Soleil ?', answer: 'Louis XIV' },
    { fact: 'La Marseillaise est l\'hymne national français', question: 'Quel est l\'hymne national français ?', answer: 'La Marseillaise' },
    { fact: 'La France a 5 départements d\'outre-mer', question: 'Combien de départements d\'outre-mer compte la France ?', answer: '5' },
    { fact: 'Victor Hugo a écrit Les Misérables', question: 'Qui a écrit Les Misérables ?', answer: 'Victor Hugo' },
    { fact: 'Versailles se trouve près de Paris', question: 'Où se trouve le château de Versailles ?', answer: 'Versailles' },
  ];

  for (const data of questionsData) {
    const fact = await prisma.fact.create({
      data: {
        subject: data.fact.split(' ')[0],
        property: 'description',
        object: data.fact,
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    const question = await prisma.question.create({
      data: {
        factId: fact.id,
        text: data.question,
        status: 'publie',
        categoryId: category.id,
        acceptedAnswers: {
          create: [
            { answer: data.answer, isPrimary: true },
          ],
        },
      },
    });

    console.log(`Created question: ${question.text}`);
  }

  console.log('✅ Seeded 12 questions');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

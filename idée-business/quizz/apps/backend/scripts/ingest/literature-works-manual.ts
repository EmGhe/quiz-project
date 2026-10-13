import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 20 questions: "Quelle œuvre a été créée par [auteur] ?"
const LITERATURE_WORKS = [
  { author: 'Victor Hugo', work: 'Les Misérables', distractors: ['Germinal', 'Madame Bovary', 'Le Père Goriot'] },
  { author: 'Albert Camus', work: 'L\'Étranger', distractors: ['La Peste', 'La Nausée', 'Le Mythe de Sisyphe'] },
  { author: 'Molière', work: 'Le Malade imaginaire', distractors: ['Le Cid', 'Phèdre', 'Andromaque'] },
  { author: 'Alexandre Dumas', work: 'Les Trois Mousquetaires', distractors: ['Le Comte de Monte-Cristo', 'La Tulipe noire', 'Le Vicomte de Bragelonne'] },
  { author: 'Jules Verne', work: 'Vingt mille lieues sous les mers', distractors: ['Le Tour du monde en quatre-vingts jours', 'Voyage au centre de la Terre', 'De la Terre à la Lune'] },
  { author: 'Gustave Flaubert', work: 'Madame Bovary', distractors: ['Germinal', 'Bel-Ami', 'Le Rouge et le Noir'] },
  { author: 'Émile Zola', work: 'Germinal', distractors: ['L\'Assommoir', 'Nana', 'Au Bonheur des Dames'] },
  { author: 'Marcel Proust', work: 'Du côté de chez Swann', distractors: ['À la recherche du temps perdu', 'Les Fleurs du mal', 'Le Spleen de Paris'] },
  { author: 'Jean-Paul Sartre', work: 'La Nausée', distractors: ['L\'Être et le Néant', 'Les Mains sales', 'Huis clos'] },
  { author: 'Honoré de Balzac', work: 'Le Père Goriot', distractors: ['Eugénie Grandet', 'La Peau de chagrin', 'Illusions perdues'] },

  // International
  { author: 'William Shakespeare', work: 'Roméo et Juliette', distractors: ['Hamlet', 'Macbeth', 'Othello'] },
  { author: 'Fiodor Dostoïevski', work: 'Crime et Châtiment', distractors: ['Les Frères Karamazov', 'L\'Idiot', 'Les Possédés'] },
  { author: 'Gabriel García Márquez', work: 'Cent ans de solitude', distractors: ['L\'Amour aux temps du choléra', 'Chronique d\'une mort annoncée', 'Pas de lettre pour le colonel'] },
  { author: 'George Orwell', work: '1984', distractors: ['La Ferme des animaux', 'Le Meilleur des mondes', 'Fahrenheit 451'] },
  { author: 'J.R.R. Tolkien', work: 'Le Seigneur des Anneaux', distractors: ['Le Hobbit', 'Le Silmarillion', 'Les Enfants de Húrin'] },
  { author: 'Franz Kafka', work: 'La Métamorphose', distractors: ['Le Procès', 'Le Château', 'Amérika'] },
  { author: 'Ernest Hemingway', work: 'Le Vieil Homme et la Mer', distractors: ['Pour qui sonne le glas', 'L\'Adieu aux armes', 'Paris est une fête'] },
  { author: 'Miguel de Cervantes', work: 'Don Quichotte', distractors: ['Les Nouvelles exemplaires', 'Galatée', 'Persiles et Sigismonde'] },
  { author: 'Jane Austen', work: 'Orgueil et Préjugés', distractors: ['Raison et Sentiments', 'Emma', 'Persuasion'] },
  { author: 'Virginia Woolf', work: 'Mrs Dalloway', distractors: ['La Promenade au phare', 'Orlando', 'Les Vagues'] },
];

async function main() {
  console.log('📚 Ingesting literature works facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Literature Works' },
    update: {},
    create: { name: 'Manual - Literature Works', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'litterature-francaise' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of LITERATURE_WORKS) {
    const existing = await prisma.fact.findFirst({
      where: { subject: item.author, property: 'literature_work' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.author,
        property: 'literature_work',
        object: item.work,
        data: { author: item.author, work: item.work, distractors: item.distractors },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.author} → ${item.work}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

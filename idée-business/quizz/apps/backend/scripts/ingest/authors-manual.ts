import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 17 - Qui a écrit/réalisé (30 questions)
const AUTHORS = [
  // Réalisateurs (15)
  { work: 'Inception', author: 'Christopher Nolan', type: 'réalisé' },
  { work: 'Pulp Fiction', author: 'Quentin Tarantino', type: 'réalisé' },
  { work: 'Le Parrain', author: 'Francis Ford Coppola', type: 'réalisé' },
  { work: 'Titanic', author: 'James Cameron', type: 'réalisé' },
  { work: 'Intouchables', author: 'Olivier Nakache et Éric Toledano', type: 'réalisé' },
  { work: 'Amélie Poulain', author: 'Jean-Pierre Jeunet', type: 'réalisé' },
  { work: 'La Liste de Schindler', author: 'Steven Spielberg', type: 'réalisé' },
  { work: 'Le Seigneur des Anneaux', author: 'Peter Jackson', type: 'réalisé' },
  { work: 'Star Wars', author: 'George Lucas', type: 'réalisé' },
  { work: 'Matrix', author: 'Lana et Lilly Wachowski', type: 'réalisé' },
  { work: 'Taxi Driver', author: 'Martin Scorsese', type: 'réalisé' },
  { work: 'Les Infiltrés', author: 'Martin Scorsese', type: 'réalisé' },
  { work: 'Interstellar', author: 'Christopher Nolan', type: 'réalisé' },
  { work: 'La La Land', author: 'Damien Chazelle', type: 'réalisé' },
  { work: 'Parasite', author: 'Bong Joon-ho', type: 'réalisé' },

  // Auteurs (15)
  { work: 'Les Misérables', author: 'Victor Hugo', type: 'écrit' },
  { work: 'L\'Étranger', author: 'Albert Camus', type: 'écrit' },
  { work: '1984', author: 'George Orwell', type: 'écrit' },
  { work: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', type: 'écrit' },
  { work: 'Crime et Châtiment', author: 'Fiodor Dostoïevski', type: 'écrit' },
  { work: 'Harry Potter', author: 'J.K. Rowling', type: 'écrit' },
  { work: 'Le Seigneur des Anneaux', author: 'J.R.R. Tolkien', type: 'écrit' },
  { work: 'Germinal', author: 'Émile Zola', type: 'écrit' },
  { work: 'Madame Bovary', author: 'Gustave Flaubert', type: 'écrit' },
  { work: 'Le Comte de Monte-Cristo', author: 'Alexandre Dumas', type: 'écrit' },
  { work: 'Roméo et Juliette', author: 'William Shakespeare', type: 'écrit' },
  { work: 'Hamlet', author: 'William Shakespeare', type: 'écrit' },
  { work: 'Don Quichotte', author: 'Miguel de Cervantes', type: 'écrit' },
  { work: 'Cent ans de solitude', author: 'Gabriel García Márquez', type: 'écrit' },
  { work: 'La Métamorphose', author: 'Franz Kafka', type: 'écrit' },
];

async function main() {
  console.log('🎬 Ingesting authors facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Authors' },
    update: {},
    create: { name: 'Manual - Authors', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'cinema-films' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of AUTHORS) {
    const existing = await prisma.fact.findFirst({
      where: { subject: item.work, property: `author_${item.type}` },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.work,
        property: `author_${item.type}`,
        object: item.author,
        data: { work: item.work, author: item.author, type: item.type },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.work} → ${item.author}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

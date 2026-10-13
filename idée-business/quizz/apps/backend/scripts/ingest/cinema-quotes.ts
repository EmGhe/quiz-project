import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Répliques célèbres de films
const FAMOUS_QUOTES = [
  // Films français
  {
    quote: 'Vous avez deux heures',
    film: 'Intouchables',
    origin: 'french',
  },
  {
    quote: 'C\'est quand qu\'on va où ?',
    film: 'Les Visiteurs',
    origin: 'french',
  },
  {
    quote: 'Il est où le champagne ?',
    film: 'OSS 117: Le Caire, nid d\'espions',
    origin: 'french',
  },
  {
    quote: 'Jusqu\'ici tout va bien',
    film: 'La Haine',
    origin: 'french',
  },
  {
    quote: 'C\'est une bonne situation ça, scribe ?',
    film: 'Astérix et Obélix: Mission Cléopâtre',
    origin: 'french',
  },
  {
    quote: 'Je suis con',
    film: 'Le Dîner de cons',
    origin: 'french',
  },
  {
    quote: 'Tu veux ma photo ?',
    film: 'Taxi',
    origin: 'french',
  },

  // Films hollywoodiens
  {
    quote: 'Que la Force soit avec toi',
    film: 'Star Wars, épisode IV: Un nouvel espoir',
    origin: 'hollywood',
  },
  {
    quote: 'Je vais lui faire une offre qu\'il ne pourra pas refuser',
    film: 'Le Parrain',
    origin: 'hollywood',
  },
  {
    quote: 'Say what again',
    film: 'Pulp Fiction',
    origin: 'hollywood',
  },
  {
    quote: 'La vie, c\'est comme une boîte de chocolats',
    film: 'Forrest Gump',
    origin: 'hollywood',
  },
  {
    quote: 'Why so serious?',
    film: 'The Dark Knight',
    origin: 'hollywood',
  },
  {
    quote: 'I\'m the king of the world',
    film: 'Titanic',
    origin: 'hollywood',
  },
  {
    quote: 'Je connais le kung-fu',
    film: 'Matrix',
    origin: 'hollywood',
  },
  {
    quote: 'La première règle du Fight Club est : il est interdit de parler du Fight Club',
    film: 'Fight Club',
    origin: 'hollywood',
  },
  {
    quote: 'We need to go deeper',
    film: 'Inception',
    origin: 'hollywood',
  },
  {
    quote: 'My name is Maximus Decimus Meridius',
    film: 'Gladiator',
    origin: 'hollywood',
  },

  // Films internationaux
  {
    quote: 'Respect',
    film: 'Parasite',
    origin: 'international',
  },
  {
    quote: 'Buongiorno, principessa',
    film: 'La Vita è bella',
    origin: 'international',
  },
  {
    quote: 'Oh Dae-su, you will understand when you listen to my story',
    film: 'Oldboy',
    origin: 'international',
  },
];

async function main() {
  console.log('🎭 Creating famous movie quotes...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manuel - Répliques Cinéma' },
    update: {},
    create: {
      name: 'Manuel - Répliques Cinéma',
      type: 'manuel',
      reliability: 5,
      description: 'Répliques célèbres de films (curation manuelle)',
    },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'cinema-repliques' },
  });

  if (!category) {
    throw new Error('Cinema quotes category not found. Run create-cinema-categories.ts first.');
  }

  let totalQuotes = 0;

  for (const quoteData of FAMOUS_QUOTES) {
    await prisma.fact.upsert({
      where: {
        subject_property_object: {
          subject: quoteData.quote,
          property: 'réplique de',
          object: quoteData.film,
        },
      },
      update: {},
      create: {
        subject: quoteData.quote,
        property: 'réplique de',
        object: quoteData.film,
        sourceId: source.id,
        categoryId: category.id,
        tags: [quoteData.origin, 'cinéma', 'réplique'],
      },
    });
    totalQuotes++;
    console.log(`  ✅ "${quoteData.quote.substring(0, 50)}..." → ${quoteData.film}`);
  }

  console.log(`\n✅ Total quotes created: ${totalQuotes}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

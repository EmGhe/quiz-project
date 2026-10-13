import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Major historical events
const HISTORICAL_EVENTS = [
  // French History
  { event: 'Révolution française', year: 1789, country: 'France', type: 'Révolution' },
  { event: 'Prise de la Bastille', year: 1789, date: '14 juillet 1789', country: 'France', type: 'Révolution' },
  { event: 'Sacre de Napoléon', year: 1804, country: 'France', type: 'Couronnement' },
  { event: 'Bataille de Waterloo', year: 1815, country: 'Belgique', type: 'Bataille' },
  { event: 'Seconde République française', year: 1848, country: 'France', type: 'Régime' },
  { event: 'Commune de Paris', year: 1871, country: 'France', type: 'Insurrection' },
  { event: 'Affaire Dreyfus', year: 1894, country: 'France', type: 'Affaire judiciaire' },
  { event: 'Armistice de 1918', year: 1918, date: '11 novembre 1918', country: 'France', type: 'Traité' },
  { event: 'Libération de Paris', year: 1944, date: '25 août 1944', country: 'France', type: 'Libération' },
  { event: 'Mai 68', year: 1968, country: 'France', type: 'Mouvement social' },

  // World Wars
  { event: 'Première Guerre mondiale', yearStart: 1914, yearEnd: 1918, type: 'Guerre' },
  { event: 'Seconde Guerre mondiale', yearStart: 1939, yearEnd: 1945, type: 'Guerre' },
  { event: 'Débarquement en Normandie', year: 1944, date: '6 juin 1944', country: 'France', type: 'Bataille' },
  { event: 'Bombardement de Hiroshima', year: 1945, date: '6 août 1945', country: 'Japon', type: 'Bombardement' },

  // Discoveries & Exploration
  { event: 'Découverte de l\'Amérique', year: 1492, discoverer: 'Christophe Colomb', type: 'Découverte' },
  { event: 'Premier homme sur la Lune', year: 1969, date: '21 juillet 1969', astronaut: 'Neil Armstrong', type: 'Exploration' },

  // Modern History
  { event: 'Chute du mur de Berlin', year: 1989, date: '9 novembre 1989', country: 'Allemagne', type: 'Événement' },
  { event: 'Traité de Maastricht', year: 1992, type: 'Traité', subject: 'Union européenne' },
  { event: 'Attentat du 11 septembre', year: 2001, date: '11 septembre 2001', country: 'États-Unis', type: 'Attentat' },

  // French Monuments
  { event: 'Construction de la Tour Eiffel', year: 1889, country: 'France', architect: 'Gustave Eiffel' },
  { event: 'Construction de Versailles', yearStart: 1661, country: 'France', king: 'Louis XIV' },

  // Revolutions
  { event: 'Révolution américaine', yearStart: 1775, yearEnd: 1783, country: 'États-Unis', type: 'Révolution' },
  { event: 'Révolution russe', year: 1917, country: 'Russie', type: 'Révolution' },
  { event: 'Révolution industrielle', yearStart: 1760, yearEnd: 1840, country: 'Royaume-Uni', type: 'Révolution' },

  // Ancient History
  { event: 'Bataille d\'Alésia', year: -52, victor: 'Jules César', defeated: 'Vercingétorix', type: 'Bataille' },
  { event: 'Chute de l\'Empire romain d\'Occident', year: 476, type: 'Chute d\'empire' },

  // Middle Ages
  { event: 'Bataille de Hastings', year: 1066, country: 'Angleterre', type: 'Bataille' },
  { event: 'Guerre de Cent Ans', yearStart: 1337, yearEnd: 1453, countries: 'France et Angleterre', type: 'Guerre' },
  { event: 'Prise de Constantinople', year: 1453, country: 'Turquie', type: 'Siège' },

  // Renaissance
  { event: 'Invention de l\'imprimerie', year: 1450, inventor: 'Gutenberg', type: 'Invention' },
  { event: 'Réforme protestante', year: 1517, person: 'Martin Luther', type: 'Mouvement religieux' },
];

async function main() {
  console.log('📜 Starting historical events ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'histoire-evenements' }
  });

  if (!category) {
    throw new Error('Category Histoire - Événements not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-history' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-history',
        url: 'https://fr.wikipedia.org/wiki/Histoire',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const eventData of HISTORICAL_EVENTS) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: eventData.event,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${eventData.event} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    const year = eventData.year || eventData.yearStart;
    await prisma.fact.create({
      data: {
        subject: eventData.event,
        property: 'année',
        object: year ? year.toString() : 'unknown',
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Historical Events',
        data: eventData,
        interestScore: 8,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${eventData.event} (${year || 'periode'})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${HISTORICAL_EVENTS.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

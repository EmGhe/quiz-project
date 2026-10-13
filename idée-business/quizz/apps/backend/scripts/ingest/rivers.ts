import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Major world rivers
const RIVERS_DATA = [
  // European rivers
  { name: 'Seine', country: 'France', flows: 'Paris', ocean: 'Manche' },
  { name: 'Loire', country: 'France', flows: 'Nantes', ocean: 'Atlantique' },
  { name: 'Rhône', country: 'France', flows: 'Lyon', ocean: 'Méditerranée' },
  { name: 'Garonne', country: 'France', flows: 'Bordeaux', ocean: 'Atlantique' },
  { name: 'Rhin', country: 'Allemagne', flows: 'Cologne', ocean: 'Mer du Nord' },
  { name: 'Danube', country: 'Allemagne', flows: 'Budapest', ocean: 'Mer Noire' },
  { name: 'Tamise', country: 'Royaume-Uni', flows: 'Londres', ocean: 'Mer du Nord' },
  { name: 'Tibre', country: 'Italie', flows: 'Rome', ocean: 'Méditerranée' },
  { name: 'Volga', country: 'Russie', flows: 'Moscou', ocean: 'Mer Caspienne' },

  // African rivers
  { name: 'Nil', country: 'Égypte', flows: 'Le Caire', ocean: 'Méditerranée' },
  { name: 'Congo', country: 'République démocratique du Congo', ocean: 'Atlantique' },
  { name: 'Niger', country: 'Niger', ocean: 'Atlantique' },

  // American rivers
  { name: 'Amazone', country: 'Brésil', ocean: 'Atlantique' },
  { name: 'Mississippi', country: 'États-Unis', flows: 'La Nouvelle-Orléans', ocean: 'Golfe du Mexique' },
  { name: 'Saint-Laurent', country: 'Canada', flows: 'Montréal', ocean: 'Atlantique' },

  // Asian rivers
  { name: 'Yangtsé', country: 'Chine', flows: 'Shanghai', ocean: 'Pacifique' },
  { name: 'Gange', country: 'Inde', ocean: 'Golfe du Bengale' },
  { name: 'Mékong', country: 'Vietnam', ocean: 'Pacifique' },
  { name: 'Euphrate', country: 'Irak', ocean: 'Golfe Persique' },
  { name: 'Tigre', country: 'Irak', ocean: 'Golfe Persique' },
];

async function main() {
  console.log('🏞️  Starting rivers ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'geographie-rivieres' }
  });

  if (!category) {
    throw new Error('Category Géographie - Rivières not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-rivers' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-rivers',
        url: 'https://fr.wikipedia.org/wiki/Liste_de_fleuves',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const river of RIVERS_DATA) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: river.name,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${river.name} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    await prisma.fact.create({
      data: {
        subject: river.name,
        property: 'traverse',
        object: river.country,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'World Rivers',
        data: river,
        interestScore: 7,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${river.name} (${river.country})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${RIVERS_DATA.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

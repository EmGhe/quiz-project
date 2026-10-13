import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Oceans and major seas
const OCEANS_DATA = [
  // 5 Oceans
  { name: 'Océan Pacifique', type: 'Océan', location: 'Entre Asie et Amérique' },
  { name: 'Océan Atlantique', type: 'Océan', location: 'Entre Europe/Afrique et Amérique' },
  { name: 'Océan Indien', type: 'Océan', location: 'Entre Afrique, Asie et Océanie' },
  { name: 'Océan Arctique', type: 'Océan', location: 'Pôle Nord' },
  { name: 'Océan Austral', type: 'Océan', location: 'Autour de l\'Antarctique' },

  // Major Seas
  { name: 'Mer Méditerranée', type: 'Mer', bordeCountries: ['France', 'Espagne', 'Italie', 'Grèce', 'Turquie', 'Égypte'] },
  { name: 'Mer Rouge', type: 'Mer', bordeCountries: ['Égypte', 'Arabie Saoudite'] },
  { name: 'Mer Noire', type: 'Mer', bordeCountries: ['Turquie', 'Bulgarie', 'Roumanie', 'Ukraine', 'Russie'] },
  { name: 'Mer du Nord', type: 'Mer', bordeCountries: ['Royaume-Uni', 'Norvège', 'Danemark', 'Allemagne', 'Pays-Bas', 'Belgique', 'France'] },
  { name: 'Mer Baltique', type: 'Mer', bordeCountries: ['Suède', 'Finlande', 'Russie', 'Estonie', 'Lettonie', 'Lituanie', 'Pologne', 'Allemagne', 'Danemark'] },
  { name: 'Mer Caspienne', type: 'Mer', bordeCountries: ['Russie', 'Kazakhstan', 'Turkménistan', 'Iran', 'Azerbaïdjan'] },
  { name: 'Mer des Caraïbes', type: 'Mer', location: 'Amérique centrale' },
  { name: 'Mer de Chine', type: 'Mer', bordeCountries: ['Chine', 'Vietnam', 'Philippines'] },
  { name: 'Mer d\'Arabie', type: 'Mer', location: 'Entre Arabie et Inde' },
  { name: 'Mer Morte', type: 'Mer', bordeCountries: ['Israël', 'Jordanie'], special: 'Point le plus bas sur Terre' },
];

async function main() {
  console.log('🌊 Starting oceans ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'geographie-oceans' }
  });

  if (!category) {
    throw new Error('Category Géographie - Océans not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-oceans' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-oceans',
        url: 'https://fr.wikipedia.org/wiki/Océan',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const ocean of OCEANS_DATA) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: ocean.name,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${ocean.name} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    await prisma.fact.create({
      data: {
        subject: ocean.name,
        property: 'type',
        object: ocean.type,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Oceans and Seas',
        data: ocean,
        interestScore: 7,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${ocean.name} (${ocean.type})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${OCEANS_DATA.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual facts about solar system planets
const PLANETS = [
  { planetNameFr: 'Mercure', planetNameEn: 'Mercury', order: 1, distanceFromSunAU: 0.39 },
  { planetNameFr: 'Vénus', planetNameEn: 'Venus', order: 2, distanceFromSunAU: 0.72 },
  { planetNameFr: 'Terre', planetNameEn: 'Earth', order: 3, distanceFromSunAU: 1.0 },
  { planetNameFr: 'Mars', planetNameEn: 'Mars', order: 4, distanceFromSunAU: 1.52 },
  { planetNameFr: 'Jupiter', planetNameEn: 'Jupiter', order: 5, distanceFromSunAU: 5.20 },
  { planetNameFr: 'Saturne', planetNameEn: 'Saturn', order: 6, distanceFromSunAU: 9.54 },
  { planetNameFr: 'Uranus', planetNameEn: 'Uranus', order: 7, distanceFromSunAU: 19.19 },
  { planetNameFr: 'Neptune', planetNameEn: 'Neptune', order: 8, distanceFromSunAU: 30.07 },
];

async function main() {
  console.log('🌍 Starting planets ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'sciences-astronomie' }
  });

  if (!category) {
    throw new Error('Category Sciences - Astronomie not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-planets' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-planets',
        url: 'https://en.wikipedia.org/wiki/Solar_System',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const planet of PLANETS) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: planet.planetNameFr,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${planet.planetNameFr} (already exists)`);
      continue;
    }

    // Create fact (RDF structure: subject-property-object)
    await prisma.fact.create({
      data: {
        subject: planet.planetNameFr,
        property: 'est la planète numéro',
        object: planet.order.toString(),
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Solar System',
        data: planet,
        interestScore: 8,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${planet.planetNameFr} (#${planet.order}, ${planet.distanceFromSunAU} AU)`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${PLANETS.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

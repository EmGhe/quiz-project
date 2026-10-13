import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual facts - first 20 chemical elements
const CHEMICAL_ELEMENTS = [
  { elementNameFr: 'Hydrogène', elementNameEn: 'Hydrogen', symbol: 'H', atomicNumber: 1 },
  { elementNameFr: 'Hélium', elementNameEn: 'Helium', symbol: 'He', atomicNumber: 2 },
  { elementNameFr: 'Lithium', elementNameEn: 'Lithium', symbol: 'Li', atomicNumber: 3 },
  { elementNameFr: 'Béryllium', elementNameEn: 'Beryllium', symbol: 'Be', atomicNumber: 4 },
  { elementNameFr: 'Bore', elementNameEn: 'Boron', symbol: 'B', atomicNumber: 5 },
  { elementNameFr: 'Carbone', elementNameEn: 'Carbon', symbol: 'C', atomicNumber: 6 },
  { elementNameFr: 'Azote', elementNameEn: 'Nitrogen', symbol: 'N', atomicNumber: 7 },
  { elementNameFr: 'Oxygène', elementNameEn: 'Oxygen', symbol: 'O', atomicNumber: 8 },
  { elementNameFr: 'Fluor', elementNameEn: 'Fluorine', symbol: 'F', atomicNumber: 9 },
  { elementNameFr: 'Néon', elementNameEn: 'Neon', symbol: 'Ne', atomicNumber: 10 },
  { elementNameFr: 'Sodium', elementNameEn: 'Sodium', symbol: 'Na', atomicNumber: 11 },
  { elementNameFr: 'Magnésium', elementNameEn: 'Magnesium', symbol: 'Mg', atomicNumber: 12 },
  { elementNameFr: 'Aluminium', elementNameEn: 'Aluminum', symbol: 'Al', atomicNumber: 13 },
  { elementNameFr: 'Silicium', elementNameEn: 'Silicon', symbol: 'Si', atomicNumber: 14 },
  { elementNameFr: 'Phosphore', elementNameEn: 'Phosphorus', symbol: 'P', atomicNumber: 15 },
  { elementNameFr: 'Soufre', elementNameEn: 'Sulfur', symbol: 'S', atomicNumber: 16 },
  { elementNameFr: 'Chlore', elementNameEn: 'Chlorine', symbol: 'Cl', atomicNumber: 17 },
  { elementNameFr: 'Argon', elementNameEn: 'Argon', symbol: 'Ar', atomicNumber: 18 },
  { elementNameFr: 'Potassium', elementNameEn: 'Potassium', symbol: 'K', atomicNumber: 19 },
  { elementNameFr: 'Calcium', elementNameEn: 'Calcium', symbol: 'Ca', atomicNumber: 20 },
];

async function main() {
  console.log('🧪 Starting chemical elements ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'sciences-chimie' }
  });

  if (!category) {
    throw new Error('Category Sciences - Chimie not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-chemical-elements' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-chemical-elements',
        url: 'https://en.wikipedia.org/wiki/Periodic_table',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const element of CHEMICAL_ELEMENTS) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: element.elementNameFr,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${element.elementNameFr} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    await prisma.fact.create({
      data: {
        subject: element.elementNameFr,
        property: 'a pour symbole chimique',
        object: element.symbol,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Periodic Table',
        data: element,
        interestScore: 7,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${element.elementNameFr} (${element.symbol}, Z=${element.atomicNumber})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${CHEMICAL_ELEMENTS.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

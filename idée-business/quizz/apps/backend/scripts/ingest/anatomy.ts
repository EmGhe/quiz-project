import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual facts about human anatomy
const ANATOMY_FACTS = [
  { organ: 'Cœur', function: 'pomper le sang', location: 'thorax', system: 'cardiovasculaire' },
  { organ: 'Poumons', function: 'respirer', location: 'thorax', system: 'respiratoire' },
  { organ: 'Foie', function: 'filtrer le sang', location: 'abdomen', system: 'digestif' },
  { organ: 'Estomac', function: 'digérer les aliments', location: 'abdomen', system: 'digestif' },
  { organ: 'Cerveau', function: 'contrôler le corps', location: 'crâne', system: 'nerveux' },
  { organ: 'Reins', function: 'filtrer le sang', location: 'abdomen', system: 'urinaire' },
  { organ: 'Intestin grêle', function: 'absorber les nutriments', location: 'abdomen', system: 'digestif' },
  { organ: 'Pancréas', function: 'produire l\'insuline', location: 'abdomen', system: 'digestif' },
  { organ: 'Rate', function: 'filtrer le sang', location: 'abdomen', system: 'immunitaire' },
  { organ: 'Vessie', function: 'stocker l\'urine', location: 'bassin', system: 'urinaire' },
  { organ: 'Peau', function: 'protéger le corps', location: 'corps entier', system: 'tégumentaire' },
  { organ: 'Os', count: 206, fact: 'nombre d\'os dans le corps humain adulte' },
  { organ: 'Muscles', count: 600, fact: 'nombre approximatif de muscles dans le corps humain' },
  { organ: 'Artères', function: 'transporter le sang oxygéné', system: 'cardiovasculaire' },
  { organ: 'Veines', function: 'ramener le sang au cœur', system: 'cardiovasculaire' },
];

async function main() {
  console.log('🫀 Starting anatomy facts ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'sciences-anatomie' }
  });

  if (!category) {
    throw new Error('Category Sciences - Anatomie not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-anatomy' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-anatomy',
        url: 'https://en.wikipedia.org/wiki/Human_anatomy',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const anatomyFact of ANATOMY_FACTS) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: anatomyFact.organ,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${anatomyFact.organ} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    const property = anatomyFact.function ? anatomyFact.function : (anatomyFact.count ? 'nombre' : 'organe');
    const object = anatomyFact.location || anatomyFact.count?.toString() || anatomyFact.system || '';

    await prisma.fact.create({
      data: {
        subject: anatomyFact.organ,
        property,
        object,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Human Anatomy',
        data: anatomyFact,
        interestScore: 6,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${anatomyFact.organ}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${ANATOMY_FACTS.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

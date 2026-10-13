import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Geography Extended categories...\n');

  // Check if Géographie parent exists
  const geoCategory = await prisma.category.findFirst({
    where: { name: 'Géographie' }
  });

  if (!geoCategory) {
    console.log('❌ Géographie parent category not found');
    return;
  }

  console.log('✅ Parent category exists: Géographie');

  // Create subcategories
  const categories = [
    {
      name: 'Géographie - Océans',
      slug: 'geographie-oceans',
      description: 'Océans, mers, géographie maritime',
    },
    {
      name: 'Géographie - Rivières',
      slug: 'geographie-rivieres',
      description: 'Fleuves, rivières, cours d\'eau',
    },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug }
    });

    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Created: ${cat.name}`);
    } else {
      console.log(`⏭️  Already exists: ${cat.name}`);
    }
  }

  console.log('\n✅ All Geography Extended categories ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 Creating flags category...\n');

  // Get or create parent Geography category
  let geoCategory = await prisma.category.findUnique({
    where: { slug: 'geographie' },
  });

  if (!geoCategory) {
    geoCategory = await prisma.category.create({
      data: {
        name: 'Géographie',
        slug: 'geographie',
      },
    });
    console.log('✅ Created parent category: Géographie');
  } else {
    console.log('✅ Parent category exists: Géographie');
  }

  // Create Drapeaux subcategory
  const flagsCategory = await prisma.category.upsert({
    where: { slug: 'geographie-drapeaux' },
    update: {},
    create: {
      name: 'Géographie - Drapeaux',
      slug: 'geographie-drapeaux',
    },
  });

  console.log('✅ Created category: Géographie - Drapeaux');
  console.log(`   ID: ${flagsCategory.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

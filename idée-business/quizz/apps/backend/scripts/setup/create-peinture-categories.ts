import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PEINTURE_CATEGORIES = [
  { name: 'Peinture - Peintres', slug: 'peinture-peintres' },
];

async function main() {
  console.log('🎨 Creating peinture categories...\n');

  for (const category of PEINTURE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { name: category.name, slug: category.slug },
    });
    console.log(`✅ ${category.name}`);
  }

  console.log(`\n✅ ${PEINTURE_CATEGORIES.length} peinture categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

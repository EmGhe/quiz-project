import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SIGLES_CATEGORIES = [
  { name: 'Sigles', slug: 'sigles' },
];

async function main() {
  console.log('🔤 Creating sigles categories...\n');

  for (const category of SIGLES_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { name: category.name, slug: category.slug },
    });
    console.log(`✅ ${category.name}`);
  }

  console.log(`\n✅ ${SIGLES_CATEGORIES.length} sigles categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

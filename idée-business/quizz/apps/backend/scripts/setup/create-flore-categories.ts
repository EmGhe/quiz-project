import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FLORE_CATEGORIES = [
  { name: 'Flore - Plantes', slug: 'flore-plantes' },
];

async function main() {
  console.log('🌺 Creating flore categories...\n');

  for (const category of FLORE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        name: category.name,
        slug: category.slug,
      },
    });
    console.log(`✅ ${category.name}`);
  }

  console.log(`\n✅ ${FLORE_CATEGORIES.length} flore categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

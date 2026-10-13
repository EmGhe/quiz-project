import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GASTRONOMIE_CATEGORIES = [
  { name: 'Gastronomie - Plats du Monde', slug: 'gastronomie-plats-monde' },
];

async function main() {
  console.log('🍽️  Creating gastronomie categories...\n');

  for (const category of GASTRONOMIE_CATEGORIES) {
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

  console.log(`\n✅ ${GASTRONOMIE_CATEGORIES.length} gastronomie categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

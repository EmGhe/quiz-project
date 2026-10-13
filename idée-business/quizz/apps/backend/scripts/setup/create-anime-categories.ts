import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ANIME_CATEGORIES = [
  { name: 'Animation Japonaise', slug: 'animation-japonaise' },
];

async function main() {
  console.log('🎌 Creating anime categories...\n');

  for (const category of ANIME_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { name: category.name, slug: category.slug },
    });
    console.log(`✅ ${category.name}`);
  }

  console.log(`\n✅ ${ANIME_CATEGORIES.length} anime categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

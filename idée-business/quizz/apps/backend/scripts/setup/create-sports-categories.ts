import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPORTS_CATEGORIES = [
  { name: 'Sports - Football', slug: 'sports-football' },
  { name: 'Sports - Tennis', slug: 'sports-tennis' },
  { name: 'Sports - NBA', slug: 'sports-nba' },
  { name: 'Sports - Rugby', slug: 'sports-rugby' },
  { name: 'Sports - UFC', slug: 'sports-ufc' },
  { name: 'Sports - Handball', slug: 'sports-handball' },
  { name: 'Sports - Ultra Trail', slug: 'sports-ultra-trail' },
  { name: 'Sports - F1', slug: 'sports-f1' },
];

async function main() {
  console.log('⚽ Creating sports categories...\n');

  for (const category of SPORTS_CATEGORIES) {
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

  console.log(`\n✅ ${SPORTS_CATEGORIES.length} sports categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FAUNE_CATEGORIES = [
  { name: 'Faune - Animaux', slug: 'faune-animaux' },
];

async function main() {
  console.log('🦁 Creating faune categories...\n');

  for (const category of FAUNE_CATEGORIES) {
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

  console.log(`\n✅ ${FAUNE_CATEGORIES.length} faune categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

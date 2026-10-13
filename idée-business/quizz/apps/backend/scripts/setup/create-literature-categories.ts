import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LITERATURE_CATEGORIES = [
  { name: 'Littérature - Française', slug: 'litterature-francaise' },
  { name: 'Littérature - Internationale', slug: 'litterature-internationale' },
];

async function main() {
  console.log('📚 Creating literature categories...\n');

  for (const category of LITERATURE_CATEGORIES) {
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

  console.log(`\n✅ ${LITERATURE_CATEGORIES.length} literature categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

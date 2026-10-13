import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MUSIC_CATEGORIES = [
  { name: 'Musique - Artistes français', slug: 'musique-artistes-francais' },
  { name: 'Musique - Artistes internationaux', slug: 'musique-artistes-internationaux' },
  { name: 'Musique - Albums', slug: 'musique-albums' },
];

async function main() {
  console.log('🎵 Creating music categories...\n');

  for (const category of MUSIC_CATEGORIES) {
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

  console.log(`\n✅ ${MUSIC_CATEGORIES.length} music categories created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

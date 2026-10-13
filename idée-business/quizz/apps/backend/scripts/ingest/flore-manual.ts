import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FLORE_FACTS = [
  {
    entity: 'rose',
    answer: 'rose',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Rosa_cv.JPG',
  },
  {
    entity: 'tournesol',
    answer: 'tournesol',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Sunflower_sky_backdrop.jpg',
  },
  {
    entity: 'lavande',
    answer: 'lavande',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Lavender02.jpg',
  },
  {
    entity: 'tulipe',
    answer: 'tulipe',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Tulipa_gesneriana_001.JPG',
  },
  {
    entity: 'orchidée',
    answer: 'orchidée',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Orchid_Phalaenopsis_hybrid.jpg',
  },
];

async function main() {
  console.log('🌺 Ingesting flore facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Flore' },
    update: {},
    create: {
      name: 'Manual - Flore',
      type: 'manuel',
      reliability: 5,
    },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'flore-plantes' },
  });

  if (!category) {
    throw new Error('Category flore-plantes not found');
  }

  let created = 0;
  let skipped = 0;

  for (const fact of FLORE_FACTS) {
    const existing = await prisma.fact.findFirst({
      where: {
        subject: fact.entity,
        property: 'flore_photo',
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.fact.create({
      data: {
        subject: fact.entity,
        property: 'flore_photo',
        object: fact.answer,
        data: {
          answer: fact.answer,
          mediaUrl: fact.mediaUrl,
        },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${fact.answer}`);
  }

  console.log(`\n✅ ${created} facts created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

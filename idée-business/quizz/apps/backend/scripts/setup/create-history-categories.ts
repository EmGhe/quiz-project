import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating History categories...\n');

  // Check if Histoire parent exists, if not create it
  let histoireCategory = await prisma.category.findFirst({
    where: { name: 'Histoire' }
  });

  if (!histoireCategory) {
    histoireCategory = await prisma.category.create({
      data: {
        name: 'Histoire',
        slug: 'histoire',
        description: 'Questions historiques : événements, personnages, dates',
      }
    });
    console.log('✅ Created parent category: Histoire');
  } else {
    console.log('✅ Parent category exists: Histoire');
  }

  // Create subcategories with labels
  const categories = [
    {
      name: 'Histoire - Événements',
      slug: 'histoire-evenements',
      description: 'Événements historiques majeurs, guerres, révolutions, traités',
    },
    {
      name: 'Histoire - Personnages',
      slug: 'histoire-personnages',
      description: 'Personnages historiques, rois, présidents, scientifiques',
    },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug }
    });

    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Created: ${cat.name}`);
    } else {
      console.log(`⏭️  Already exists: ${cat.name}`);
    }
  }

  console.log('\n✅ All History categories ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

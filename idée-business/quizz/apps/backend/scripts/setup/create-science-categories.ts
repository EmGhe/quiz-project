import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Science categories...\n');

  // Get or create Sciences parent category
  let sciencesCategory = await prisma.category.findFirst({
    where: { name: 'Sciences' }
  });

  if (!sciencesCategory) {
    sciencesCategory = await prisma.category.create({
      data: {
        name: 'Sciences',
        slug: 'sciences',
        description: 'Questions scientifiques : astronomie, chimie, anatomie, mathématiques',
      }
    });
    console.log('✅ Created parent category: Sciences');
  } else {
    console.log('✅ Parent category exists: Sciences');
  }

  // Create subcategories with labels
  const categories = [
    {
      name: 'Sciences - Astronomie',
      slug: 'sciences-astronomie',
      description: 'Planètes, système solaire, astronomie',
    },
    {
      name: 'Sciences - Chimie',
      slug: 'sciences-chimie',
      description: 'Éléments chimiques, symboles, tableau périodique',
    },
    {
      name: 'Sciences - Anatomie',
      slug: 'sciences-anatomie',
      description: 'Corps humain, organes, anatomie',
    },
    {
      name: 'Sciences - Mathématiques',
      slug: 'sciences-mathematiques',
      description: 'Calculs, géométrie, nombres',
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

  console.log('\n✅ All Science categories ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

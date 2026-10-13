import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Cinema categories...\n');

  // Check if Cinéma parent exists, if not create it
  let cinemaCategory = await prisma.category.findFirst({
    where: { name: 'Cinéma' }
  });

  if (!cinemaCategory) {
    cinemaCategory = await prisma.category.create({
      data: {
        name: 'Cinéma',
        slug: 'cinema',
        description: 'Questions cinéma : films, acteurs, réalisateurs, personnages, répliques',
      }
    });
    console.log('✅ Created parent category: Cinéma');
  } else {
    console.log('✅ Parent category exists: Cinéma');
  }

  // Create subcategories with labels
  const categories = [
    {
      name: 'Cinéma - Films',
      slug: 'cinema-films',
      description: 'Questions sur les films (réalisateurs, acteurs)',
    },
    {
      name: 'Cinéma - Acteurs',
      slug: 'cinema-acteurs',
      description: 'Questions sur les acteurs et leurs rôles',
    },
    {
      name: 'Cinéma - Réalisateurs',
      slug: 'cinema-realisateurs',
      description: 'Questions sur les réalisateurs et leur filmographie',
    },
    {
      name: 'Cinéma - Personnages',
      slug: 'cinema-personnages',
      description: 'Questions sur les personnages de films',
    },
    {
      name: 'Cinéma - Répliques',
      slug: 'cinema-repliques',
      description: 'Répliques célèbres de films',
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

  console.log('\n✅ All Cinema categories ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

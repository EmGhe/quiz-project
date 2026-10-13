import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CountryFlag {
  country: string;
  flagUrl: string;
  continent: string;
}

const FLAGS: CountryFlag[] = [
  // Europe
  { country: 'France', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg', continent: 'Europe' },
  { country: 'Allemagne', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg', continent: 'Europe' },
  { country: 'Royaume-Uni', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Flag_of_the_United_Kingdom_%281-2%29.svg', continent: 'Europe' },
  { country: 'Espagne', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg', continent: 'Europe' },
  { country: 'Italie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg', continent: 'Europe' },
  { country: 'Portugal', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg', continent: 'Europe' },
  { country: 'Pays-Bas', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg', continent: 'Europe' },
  { country: 'Belgique', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Belgium.svg', continent: 'Europe' },
  { country: 'Suisse', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg', continent: 'Europe' },
  { country: 'Suède', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Sweden.svg', continent: 'Europe' },
  { country: 'Norvège', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg', continent: 'Europe' },
  { country: 'Danemark', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg', continent: 'Europe' },
  { country: 'Grèce', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg', continent: 'Europe' },
  { country: 'Pologne', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Flag_of_Poland.svg', continent: 'Europe' },
  { country: 'Russie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg', continent: 'Europe' },
  { country: 'Irlande', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg', continent: 'Europe' },

  // North America
  { country: 'États-Unis', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg', continent: 'Amérique du Nord' },
  { country: 'Canada', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg', continent: 'Amérique du Nord' },
  { country: 'Mexique', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg', continent: 'Amérique du Nord' },

  // South America
  { country: 'Brésil', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg', continent: 'Amérique du Sud' },
  { country: 'Argentine', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg', continent: 'Amérique du Sud' },
  { country: 'Chili', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg', continent: 'Amérique du Sud' },
  { country: 'Colombie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg', continent: 'Amérique du Sud' },
  { country: 'Pérou', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg', continent: 'Amérique du Sud' },

  // Asia
  { country: 'Chine', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg', continent: 'Asie' },
  { country: 'Japon', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg', continent: 'Asie' },
  { country: 'Corée du Sud', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg', continent: 'Asie' },
  { country: 'Inde', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_India.svg', continent: 'Asie' },
  { country: 'Thaïlande', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg', continent: 'Asie' },
  { country: 'Arabie Saoudite', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg', continent: 'Asie' },
  { country: 'Israël', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Israel.svg', continent: 'Asie' },
  { country: 'Turquie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg', continent: 'Asie' },
  { country: 'Vietnam', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg', continent: 'Asie' },
  { country: 'Pakistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg', continent: 'Asie' },
  { country: 'Bangladesh', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg', continent: 'Asie' },

  // Africa
  { country: 'Afrique du Sud', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg', continent: 'Afrique' },
  { country: 'Égypte', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Egypt.svg', continent: 'Afrique' },
  { country: 'Maroc', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg', continent: 'Afrique' },
  { country: 'Algérie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg', continent: 'Afrique' },
  { country: 'Tunisie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg', continent: 'Afrique' },
  { country: 'Nigeria', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg', continent: 'Afrique' },
  { country: 'Kenya', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg', continent: 'Afrique' },
  { country: 'Éthiopie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_Ethiopia.svg', continent: 'Afrique' },

  // Oceania
  { country: 'Australie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_Australia_%28converted%29.svg', continent: 'Océanie' },
  { country: 'Nouvelle-Zélande', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg', continent: 'Océanie' },

  // Additional recognizable countries
  { country: 'Ukraine', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg', continent: 'Europe' },
  { country: 'Autriche', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg', continent: 'Europe' },
  { country: 'Singapour', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Singapore.svg', continent: 'Asie' },
  { country: 'Malaisie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Flag_of_Malaysia.svg', continent: 'Asie' },
  { country: 'Indonésie', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Indonesia.svg', continent: 'Asie' },
];

async function main() {
  console.log('🏁 Ingesting country flag data...\n');

  // Create or find source
  const source = await prisma.source.upsert({
    where: { name: 'Manuel - Drapeaux' },
    update: {},
    create: {
      name: 'Manuel - Drapeaux',
      type: 'manuel',
      reliability: 5,
      description: 'Drapeaux de pays depuis Wikimedia Commons (données vérifiées manuellement)',
    },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'geographie-drapeaux' },
  });

  if (!category) {
    throw new Error('Category geographie-drapeaux not found. Run create-flags-category.ts first.');
  }

  let created = 0;

  for (const flag of FLAGS) {
    await prisma.fact.create({
      data: {
        categoryId: category.id,
        sourceId: source.id,
        subject: flag.country,
        property: 'drapeau',
        object: 'flag-image',
        tags: ['géographie', 'drapeau', flag.continent.toLowerCase()],
        data: {
          flagUrl: flag.flagUrl,
          continent: flag.continent,
        },
      },
    });
    created++;
  }

  console.log(`✅ Created ${created} flag facts`);
  console.log(`\nBreakdown by continent:`);

  const continents = FLAGS.reduce((acc, flag) => {
    acc[flag.continent] = (acc[flag.continent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(continents).forEach(([continent, count]) => {
    console.log(`   ${continent}: ${count} flags`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

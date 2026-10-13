import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GASTRONOMIE_FACTS = [
  // France
  {
    entity: 'croissant',
    description: 'Viennoiserie reconnaissable à sa forme de lune et à sa pâte feuilletée au beurre, emblématique du petit-déjeuner en France',
    answer: 'croissant',
    country: 'France',
  },
  {
    entity: 'baguette',
    description: 'Pain long et croustillant à la mie alvéolée, symbole de la boulangerie française',
    answer: 'baguette',
    country: 'France',
  },
  {
    entity: 'croissant aux amandes',
    description: 'Viennoiserie garnie de crème frangipane et recouverte d\'amandes effilées, souvent réalisée avec des croissants de la veille',
    answer: 'croissant aux amandes',
    country: 'France',
  },
  {
    entity: 'éclair',
    description: 'Pâtisserie oblongue en pâte à choux fourrée de crème pâtissière et glacée au chocolat ou au café',
    answer: 'éclair',
    country: 'France',
  },

  // Italie
  {
    entity: 'panettone',
    description: 'Brioche italienne traditionnellement dégustée à Noël, se distinguant par sa forme haute et bombée et contenant généralement des raisins secs et des fruits confits',
    answer: 'panettone',
    country: 'Italie',
  },
  {
    entity: 'tiramisu',
    description: 'Dessert italien composé de biscuits imbibés de café, de mascarpone et saupoudré de cacao',
    answer: 'tiramisu',
    country: 'Italie',
  },
  {
    entity: 'risotto',
    description: 'Plat de riz crémeux cuit progressivement dans un bouillon, spécialité du nord de l\'Italie',
    answer: 'risotto',
    country: 'Italie',
  },
  {
    entity: 'osso buco',
    description: 'Plat milanais à base de jarret de veau braisé avec légumes, vin blanc et bouillon, traditionnellement servi avec du risotto',
    answer: 'osso buco',
    country: 'Italie',
  },

  // Espagne
  {
    entity: 'paella',
    description: 'Plat espagnol à base de riz safrané cuit dans une large poêle avec fruits de mer, viande ou légumes, originaire de Valence',
    answer: 'paella',
    country: 'Espagne',
  },
  {
    entity: 'gazpacho',
    description: 'Soupe froide espagnole à base de tomates, poivrons, concombres et oignons mixés, typique d\'Andalousie',
    answer: 'gazpacho',
    country: 'Espagne',
  },
  {
    entity: 'churros',
    description: 'Beignets allongés et striés frits dans l\'huile, souvent servis avec du chocolat chaud en Espagne',
    answer: 'churros',
    country: 'Espagne',
  },

  // Grèce
  {
    entity: 'moussaka',
    description: 'Gratin grec composé de couches d\'aubergines, viande hachée et sauce béchamel',
    answer: 'moussaka',
    country: 'Grèce',
  },

  // Japon
  {
    entity: 'sushi',
    description: 'Plat japonais composé de riz vinaigré accompagné de poisson cru, légumes ou fruits de mer',
    answer: 'sushi',
    country: 'Japon',
  },
  {
    entity: 'ramen',
    description: 'Soupe japonaise de nouilles servie dans un bouillon à base de viande ou de poisson, garnie de diverses garnitures',
    answer: 'ramen',
    country: 'Japon',
  },
  {
    entity: 'tempura',
    description: 'Technique japonaise de friture légère de fruits de mer et légumes enrobés d\'une pâte à base de farine',
    answer: 'tempura',
    country: 'Japon',
  },

  // Inde
  {
    entity: 'naan',
    description: 'Pain plat indien cuit au four tandoor, souvent servi avec des currys',
    answer: 'naan',
    country: 'Inde',
  },
  {
    entity: 'tandoori',
    description: 'Méthode de cuisson indienne où la viande marinée aux épices est cuite dans un four en terre cuite (tandoor)',
    answer: 'tandoori',
    country: 'Inde',
  },

  // Moyen-Orient
  {
    entity: 'houmous',
    description: 'Purée de pois chiches mixés avec tahini, citron et ail, spécialité du Moyen-Orient',
    answer: 'houmous',
    country: 'Moyen-Orient',
  },
  {
    entity: 'falafel',
    description: 'Boulettes de pois chiches ou fèves broyées et épicées, frites, typiques du Moyen-Orient',
    answer: 'falafel',
    country: 'Moyen-Orient',
  },

  // Mexique
  {
    entity: 'guacamole',
    description: 'Préparation mexicaine à base d\'avocat écrasé, citron vert, oignon et coriandre',
    answer: 'guacamole',
    country: 'Mexique',
  },
];

async function main() {
  console.log('🍽️  Ingesting gastronomie facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Gastronomie' },
    update: {},
    create: {
      name: 'Manual - Gastronomie',
      type: 'manuel',
      reliability: 5,
    },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'gastronomie-plats-monde' },
  });

  if (!category) {
    throw new Error('Category gastronomie-plats-monde not found. Run create-gastronomie-categories.ts first');
  }

  let created = 0;
  let skipped = 0;

  for (const fact of GASTRONOMIE_FACTS) {
    const existing = await prisma.fact.findFirst({
      where: {
        subject: fact.entity,
        property: 'gastronomie_description',
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.fact.create({
      data: {
        subject: fact.entity,
        property: 'gastronomie_description',
        object: fact.answer,
        data: {
          description: fact.description,
          country: fact.country,
          answer: fact.answer,
        },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${fact.answer} (${fact.country})`);
  }

  console.log(`\n✅ ${created} facts created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

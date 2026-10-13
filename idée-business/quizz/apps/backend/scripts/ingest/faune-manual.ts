import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FAUNE_FACTS = [
  // Photos (15 animaux)
  {
    entity: 'lion',
    answer: 'lion',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Lion_waiting_in_Namibia.jpg',
  },
  {
    entity: 'éléphant',
    answer: 'éléphant',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/African_Bush_Elephant.jpg',
  },
  {
    entity: 'girafe',
    answer: 'girafe',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Giraffe_standing.jpg',
  },
  {
    entity: 'zèbre',
    answer: 'zèbre',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Plains_Zebra_Equus_quagga.jpg',
  },
  {
    entity: 'tigre',
    answer: 'tigre',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Walking_tiger_female.jpg',
  },
  {
    entity: 'panda',
    answer: 'panda',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Grosser_Panda.JPG',
  },
  {
    entity: 'kangourou',
    answer: 'kangourou',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Kangaroo_and_joey03.jpg',
  },
  {
    entity: 'koala',
    answer: 'koala',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Koala_climbing_tree.jpg',
  },
  {
    entity: 'ours polaire',
    answer: 'ours polaire',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Polar_Bear_-_Alaska.jpg',
  },
  {
    entity: 'manchot',
    answer: 'manchot',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Emperor_Penguin_Manchot_empereur.jpg',
  },
  {
    entity: 'dauphin',
    answer: 'dauphin',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Tursiops_truncatus_01.jpg',
  },
  {
    entity: 'loup',
    answer: 'loup',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Kolm%C3%A5rden_Wolf.jpg',
  },
  {
    entity: 'renard',
    answer: 'renard',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Kitsu.jpg',
  },
  {
    entity: 'aigle',
    answer: 'aigle',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Golden_Eagle_in_flight_-_5.jpg',
  },
  {
    entity: 'flamant rose',
    answer: 'flamant rose',
    type: 'photo',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Flamingos_Laguna_Colorada.jpg',
  },

  // Descriptions (10 animaux)
  {
    entity: 'dromadaire',
    answer: 'dromadaire',
    type: 'description',
    description: 'Quel animal mammifère, adapté aux milieux désertiques, possède une seule bosse sur le dos qui lui permet de stocker des réserves de graisse et peut survivre plusieurs jours sans boire',
  },
  {
    entity: 'chameau',
    answer: 'chameau',
    type: 'description',
    description: 'Quel mammifère des régions désertiques d\'Asie centrale possède deux bosses sur le dos, contrairement à son cousin africain qui n\'en a qu\'une',
  },
  {
    entity: 'crocodile',
    answer: 'crocodile',
    type: 'description',
    description: 'Quel reptile aquatique carnivore, reconnaissable à son museau allongé et ses puissantes mâchoires, vit dans les fleuves et marécages des régions tropicales',
  },
  {
    entity: 'hippopotame',
    answer: 'hippopotame',
    type: 'description',
    description: 'Quel mammifère semi-aquatique massif d\'Afrique, au corps cylindrique et aux courtes pattes, passe la majeure partie de sa journée immergé dans l\'eau pour se protéger du soleil',
  },
  {
    entity: 'rhinocéros',
    answer: 'rhinocéros',
    type: 'description',
    description: 'Quel grand mammifère herbivore africain ou asiatique, caractérisé par une peau épaisse et une ou deux cornes sur le museau, est menacé d\'extinction à cause du braconnage',
  },
  {
    entity: 'baleine',
    answer: 'baleine',
    type: 'description',
    description: 'Quel mammifère marin de grande taille, dont certaines espèces peuvent atteindre 30 mètres de longueur, se nourrit principalement de plancton et de petits poissons grâce à ses fanons',
  },
  {
    entity: 'requin',
    answer: 'requin',
    type: 'description',
    description: 'Quel poisson cartilagineux prédateur, doté de plusieurs rangées de dents acérées qui se renouvellent constamment, joue un rôle crucial dans l\'équilibre des écosystèmes marins',
  },
  {
    entity: 'paresseux',
    answer: 'paresseux',
    type: 'description',
    description: 'Quel mammifère arboricole d\'Amérique du Sud, célèbre pour sa lenteur extrême et son mode de vie suspendu aux branches, dort jusqu\'à 20 heures par jour',
  },
  {
    entity: 'caméléon',
    answer: 'caméléon',
    type: 'description',
    description: 'Quel reptile est capable de changer de couleur pour communiquer et se camoufler, possède des yeux qui bougent indépendamment l\'un de l\'autre et capture ses proies grâce à sa langue extensible',
  },
  {
    entity: 'colibri',
    answer: 'colibri',
    type: 'description',
    description: 'Quel minuscule oiseau, capable de voler en arrière et de faire du surplace grâce à ses battements d\'ailes ultrarapides (jusqu\'à 80 par seconde), se nourrit du nectar des fleurs',
  },
];

async function main() {
  console.log('🦁 Ingesting faune facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Faune' },
    update: {},
    create: {
      name: 'Manual - Faune',
      type: 'manuel',
      reliability: 5,
    },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'faune-animaux' },
  });

  if (!category) {
    throw new Error('Category faune-animaux not found. Run create-faune-categories.ts first');
  }

  let created = 0;
  let skipped = 0;

  for (const fact of FAUNE_FACTS) {
    const existing = await prisma.fact.findFirst({
      where: {
        subject: fact.entity,
        property: fact.type === 'photo' ? 'faune_photo' : 'faune_description',
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.fact.create({
      data: {
        subject: fact.entity,
        property: fact.type === 'photo' ? 'faune_photo' : 'faune_description',
        object: fact.answer,
        data: {
          answer: fact.answer,
          type: fact.type,
          mediaUrl: fact.mediaUrl,
          description: fact.description,
        },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${fact.answer} (${fact.type})`);
  }

  console.log(`\n✅ ${created} facts created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

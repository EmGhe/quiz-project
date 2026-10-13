import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données sports - Phase 6 (échantillon de 50 questions)
const SPORTS_DATA = {
  football: [
    {
      subject: 'France',
      property: 'vainqueur Coupe du Monde',
      object: '2018',
      data: { competition: 'Coupe du Monde', lieu: 'Russie' },
    },
    {
      subject: 'Kylian Mbappé',
      property: 'surnom',
      object: 'Kyky',
      data: {
        description: 'Attaquant français, champion du monde 2018, connu pour sa vitesse exceptionnelle',
        poste: 'Attaquant',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Kylian_Mbapp%C3%A9_2018.jpg'
      },
    },
    {
      subject: 'Cristiano Ronaldo',
      property: 'surnom',
      object: 'CR7',
      data: {
        description: 'Attaquant portugais, considéré comme l\'un des meilleurs joueurs de tous les temps',
        numero: '7'
      },
    },
    {
      subject: 'Lionel Messi',
      property: 'surnom',
      object: 'La Pulga',
      data: {
        description: 'Attaquant argentin, champion du monde 2022, surnommé "La Puce" en espagnol',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg'
      },
    },
    {
      subject: 'Zinédine Zidane',
      property: 'surnom',
      object: 'Zizou',
      data: {
        description: 'Meneur de jeu français, champion du monde 1998 et 2006, légendaire numéro 10',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Zinedine_Zidane_by_Tasnim_03.jpg'
      },
    },
    {
      subject: 'Parc des Princes',
      property: 'stade de',
      object: 'Paris Saint-Germain',
      data: { ville: 'Paris', capacité: 'environ 48000' },
    },
    {
      subject: 'Camp Nou',
      property: 'stade de',
      object: 'FC Barcelone',
      data: { ville: 'Barcelone', pays: 'Espagne' },
    },
    {
      subject: 'Old Trafford',
      property: 'stade de',
      object: 'Manchester United',
      data: { ville: 'Manchester', pays: 'Angleterre' },
    },
  ],

  tennis: [
    {
      subject: 'Roland-Garros',
      property: 'surface',
      object: 'Terre battue',
      data: { lieu: 'Paris', competition: 'Grand Chelem' },
    },
    {
      subject: 'Wimbledon',
      property: 'surface',
      object: 'Gazon',
      data: { lieu: 'Londres', competition: 'Grand Chelem' },
    },
    {
      subject: 'Yannick Noah',
      property: 'victoire Grand Chelem',
      object: 'Roland-Garros 1983',
      data: {
        description: 'Dernier français à avoir remporté Roland-Garros en simple messieurs',
        nationalité: 'France'
      },
    },
    {
      subject: 'Roger Federer',
      property: 'surnom',
      object: 'RF',
      data: {
        description: 'Joueur suisse, considéré comme l\'un des plus grands de tous les temps',
        nationalité: 'Suisse'
      },
    },
    {
      subject: 'Rafael Nadal',
      property: 'surnom',
      object: 'Rafa',
      data: {
        description: 'Joueur espagnol, surnommé le "Roi de la terre battue"',
        nationalité: 'Espagne',
        surface_favorite: 'Terre battue'
      },
    },
  ],

  nba: [
    {
      subject: 'Michael Jordan',
      property: 'surnom',
      object: 'His Airness',
      data: {
        description: 'Légende des Chicago Bulls, considéré comme le meilleur joueur de basket de tous les temps',
        equipe: 'Chicago Bulls',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Michael_Jordan_in_2014.jpg'
      },
    },
    {
      subject: 'LeBron James',
      property: 'surnom',
      object: 'King James',
      data: {
        description: 'Ailier polyvalent, champion NBA avec trois franchises différentes',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/LeBron_James_%2851959977144%29_%28cropped2%29.jpg'
      },
    },
    {
      subject: 'Los Angeles Lakers',
      property: 'ville',
      object: 'Los Angeles',
      data: { conference: 'Ouest', état: 'Californie' },
    },
    {
      subject: 'Boston Celtics',
      property: 'ville',
      object: 'Boston',
      data: { conference: 'Est', état: 'Massachusetts' },
    },
    {
      subject: 'Tony Parker',
      property: 'nationalité',
      object: 'France',
      data: {
        description: 'Meneur français, champion NBA avec les San Antonio Spurs',
        equipe: 'San Antonio Spurs',
        poste: 'Meneur'
      },
    },
  ],

  rugby: [
    {
      subject: 'Tournoi des 6 Nations',
      property: 'participants',
      object: '6 équipes européennes',
      data: { pays: ['France', 'Angleterre', 'Irlande', 'Écosse', 'Pays de Galles', 'Italie'] },
    },
    {
      subject: 'France',
      property: 'surnom équipe rugby',
      object: 'XV de France',
      data: { sport: 'Rugby', couleur: 'Bleu' },
    },
    {
      subject: 'Nouvelle-Zélande',
      property: 'surnom équipe rugby',
      object: 'All Blacks',
      data: { sport: 'Rugby', couleur: 'Noir', danse: 'Haka' },
    },
    {
      subject: 'Stade de France',
      property: 'stade rugby',
      object: 'XV de France',
      data: { ville: 'Saint-Denis', capacité: 'environ 80000' },
    },
    {
      subject: 'Antoine Dupont',
      property: 'poste',
      object: 'Demi de mêlée',
      data: {
        description: 'Capitaine du XV de France, considéré comme l\'un des meilleurs joueurs au monde',
        nationalité: 'France'
      },
    },
  ],

  ufc: [
    {
      subject: 'Ciryl Gane',
      property: 'surnom',
      object: 'Bon Gamin',
      data: {
        description: 'Combattant français de MMA, ancien champion intérimaire des poids lourds UFC',
        nationalité: 'France',
        division: 'Poids lourds'
      },
    },
    {
      subject: 'Conor McGregor',
      property: 'surnom',
      object: 'The Notorious',
      data: {
        description: 'Combattant irlandais, ancien champion dans deux catégories différentes',
        nationalité: 'Irlande'
      },
    },
    {
      subject: 'Khabib Nurmagomedov',
      property: 'surnom',
      object: 'The Eagle',
      data: {
        description: 'Combattant russe invaincu, ancien champion des poids légers',
        nationalité: 'Russie',
        record: 'Invaincu'
      },
    },
  ],

  handball: [
    {
      subject: 'France',
      property: 'équipe handball',
      object: 'Les Experts',
      data: {
        description: 'Équipe masculine française de handball, multiple championne du monde et olympique',
        surnom: 'Les Experts'
      },
    },
    {
      subject: 'Nikola Karabatic',
      property: 'poste',
      object: 'Arrière/Pivot',
      data: {
        description: 'Handballeur français, légende du handball mondial, triple champion olympique',
        nationalité: 'France'
      },
    },
  ],

  ultratrail: [
    {
      subject: 'Kilian Jornet',
      property: 'nationalité',
      object: 'Espagne',
      data: {
        description: 'Coureur de trail et ski-alpinisme espagnol, légende vivante de l\'ultra-trail',
        spécialité: 'Trail, ski-alpinisme'
      },
    },
    {
      subject: 'François d\'Haene',
      property: 'nationalité',
      object: 'France',
      data: {
        description: 'Coureur français, quintuple vainqueur de l\'UTMB',
        victoires: 'UTMB'
      },
    },
    {
      subject: 'UTMB',
      property: 'lieu',
      object: 'Chamonix',
      data: {
        description: 'Ultra-Trail du Mont-Blanc, l\'une des courses d\'ultra-trail les plus prestigieuses au monde',
        pays: 'France'
      },
    },
  ],

  f1: [
    {
      subject: 'Lewis Hamilton',
      property: 'nationalité',
      object: 'Royaume-Uni',
      data: {
        description: 'Pilote britannique, multiple champion du monde de Formule 1',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Lewis_Hamilton_2016_Malaysia_2.jpg'
      },
    },
    {
      subject: 'Max Verstappen',
      property: 'nationalité',
      object: 'Pays-Bas',
      data: {
        description: 'Pilote néerlandais, multiple champion du monde de Formule 1',
        écurie: 'Red Bull Racing'
      },
    },
    {
      subject: 'Ferrari',
      property: 'pays',
      object: 'Italie',
      data: {
        description: 'Écurie italienne la plus ancienne et emblématique de la Formule 1',
        couleur: 'Rouge'
      },
    },
    {
      subject: 'Circuit de Monaco',
      property: 'lieu',
      object: 'Monte-Carlo',
      data: {
        description: 'Circuit urbain le plus prestigieux de Formule 1',
        type: 'Circuit urbain',
        pays: 'Monaco'
      },
    },
    {
      subject: 'Pierre Gasly',
      property: 'nationalité',
      object: 'France',
      data: {
        description: 'Pilote français de Formule 1, vainqueur du GP d\'Italie 2020',
      },
    },
  ],
};

async function main() {
  console.log('⚽ Ingesting sports data...\n');

  // Create or find source
  const source = await prisma.source.upsert({
    where: { name: 'Manuel - Sports' },
    update: {},
    create: {
      name: 'Manuel - Sports',
      type: 'manuel',
      reliability: 5,
      description: 'Données sportives vérifiées manuellement (Football, Tennis, NBA, Rugby, UFC, Handball, Ultra Trail, F1)',
    },
  });

  // Get categories
  const categories = {
    football: await prisma.category.findUnique({ where: { slug: 'sports-football' } }),
    tennis: await prisma.category.findUnique({ where: { slug: 'sports-tennis' } }),
    nba: await prisma.category.findUnique({ where: { slug: 'sports-nba' } }),
    rugby: await prisma.category.findUnique({ where: { slug: 'sports-rugby' } }),
    ufc: await prisma.category.findUnique({ where: { slug: 'sports-ufc' } }),
    handball: await prisma.category.findUnique({ where: { slug: 'sports-handball' } }),
    ultratrail: await prisma.category.findUnique({ where: { slug: 'sports-ultra-trail' } }),
    f1: await prisma.category.findUnique({ where: { slug: 'sports-f1' } }),
  };

  if (Object.values(categories).some(c => !c)) {
    throw new Error('Some sports categories not found. Run create-sports-categories.ts first.');
  }

  let totalFacts = 0;

  // Process each sport
  for (const [sport, facts] of Object.entries(SPORTS_DATA)) {
    console.log(`\nProcessing ${sport}...`);
    const category = categories[sport as keyof typeof categories];

    if (!category) {
      console.log(`❌ Category not found for ${sport}`);
      continue;
    }

    for (const factData of facts) {
      await prisma.fact.upsert({
        where: {
          subject_property_object: {
            subject: factData.subject,
            property: factData.property,
            object: factData.object,
          },
        },
        update: {},
        create: {
          subject: factData.subject,
          property: factData.property,
          object: factData.object,
          sourceId: source.id,
          categoryId: category.id,
          tags: ['sports', sport],
          data: factData.data || {},
        },
      });
      totalFacts++;
    }

    console.log(`  ✅ ${facts.length} facts`);
  }

  console.log(`\n✅ Total: ${totalFacts} sports facts created`);
  console.log('\nBreakdown by sport:');
  Object.entries(SPORTS_DATA).forEach(([sport, facts]) => {
    console.log(`   ${sport}: ${facts.length} facts`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URLs d'images pour acteurs (Wikipedia Commons)
const ACTOR_IMAGES = {
  // Acteurs français
  'Omar Sy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Omar_Sy_Cannes_2018.jpg/800px-Omar_Sy_Cannes_2018.jpg',
  'François Cluzet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Fran%C3%A7ois_Cluzet_Cannes_2017.jpg/800px-Fran%C3%A7ois_Cluzet_Cannes_2017.jpg',
  'Audrey Tautou': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Audrey_Tautou_Cannes_2017.jpg/800px-Audrey_Tautou_Cannes_2017.jpg',
  'Jean Dujardin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Jean_Dujardin_Cannes_2011.jpg/800px-Jean_Dujardin_Cannes_2011.jpg',
  'Vincent Cassel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Vincent_Cassel_Cannes_2018.jpg/800px-Vincent_Cassel_Cannes_2018.jpg',
  'Jean Reno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Jean_Reno_Cannes_2016.jpg/800px-Jean_Reno_Cannes_2016.jpg',
  'Christian Clavier': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Christian_Clavier_Cannes_2016.jpg/800px-Christian_Clavier_Cannes_2016.jpg',
  'Gérard Depardieu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/G%C3%A9rard_Depardieu_Cannes_2015.jpg/800px-G%C3%A9rard_Depardieu_Cannes_2015.jpg',
  'Gérard Jugnot': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Gerard_Jugnot_Cannes_2013.jpg/800px-Gerard_Jugnot_Cannes_2013.jpg',
  'Samy Naceri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Samy_Naceri_2014.jpg/800px-Samy_Naceri_2014.jpg',

  // Acteurs hollywoodiens
  'Mark Hamill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Mark_Hamill_2019.jpg/800px-Mark_Hamill_2019.jpg',
  'Harrison Ford': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Harrison_Ford_by_Gage_Skidmore_3.jpg/800px-Harrison_Ford_by_Gage_Skidmore_3.jpg',
  'Marlon Brando': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Marlon_Brando_publicity_for_One-Eyed_Jacks.png/800px-Marlon_Brando_publicity_for_One-Eyed_Jacks.png',
  'Al Pacino': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Al_Pacino.jpg/800px-Al_Pacino.jpg',
  'John Travolta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/John_Travolta_Cannes_2018.jpg/800px-John_Travolta_Cannes_2018.jpg',
  'Samuel L. Jackson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/SamuelLJackson.jpg/800px-SamuelLJackson.jpg',
  'Tom Hanks': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Tom_Hanks_TIFF_2019.jpg/800px-Tom_Hanks_TIFF_2019.jpg',
  'Christian Bale': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Christian_Bale-7837.jpg/800px-Christian_Bale-7837.jpg',
  'Leonardo DiCaprio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Leonardo_Dicaprio_Cannes_2019.jpg/800px-Leonardo_Dicaprio_Cannes_2019.jpg',
  'Keanu Reeves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Reuni%C3%A3o_com_o_ator_norte-americano_Keanu_Reeves_%2846806576944%29_%28cropped%29.jpg/800px-Reuni%C3%A3o_com_o_ator_norte-americano_Keanu_Reeves_%2846806576944%29_%28cropped%29.jpg',
  'Brad Pitt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Brad_Pitt_2019_by_Glenn_Francis.jpg/800px-Brad_Pitt_2019_by_Glenn_Francis.jpg',
  'Russell Crowe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Russell_Crowe_2016.jpg/800px-Russell_Crowe_2016.jpg',
  'Bruce Willis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Bruce_Willis_by_Gage_Skidmore_3.jpg/800px-Bruce_Willis_by_Gage_Skidmore_3.jpg',
};

// URLs d'images pour réalisateurs
const DIRECTOR_IMAGES = {
  // Réalisateurs français
  'Olivier Nakache et Éric Toledano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Olivier_Nakache_et_%C3%89ric_Toledano_Cannes_2019.jpg/800px-Olivier_Nakache_et_%C3%89ric_Toledano_Cannes_2019.jpg',
  'Jean-Pierre Jeunet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Jean-Pierre_Jeunet_2016.jpg/800px-Jean-Pierre_Jeunet_2016.jpg',
  'Michel Hazanavicius': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Michel_Hazanavicius_Cannes_2017.jpg/800px-Michel_Hazanavicius_Cannes_2017.jpg',
  'Mathieu Kassovitz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Mathieu_Kassovitz_Cannes_2015.jpg/800px-Mathieu_Kassovitz_Cannes_2015.jpg',
  'Jean-Marie Poiré': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Jean-Marie_Poir%C3%A9_2014.jpg/800px-Jean-Marie_Poir%C3%A9_2014.jpg',
  'Luc Besson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Luc_Besson_2014.jpg/800px-Luc_Besson_2014.jpg',

  // Réalisateurs hollywoodiens
  'George Lucas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/George_Lucas_cropped_2009.jpg/800px-George_Lucas_cropped_2009.jpg',
  'Francis Ford Coppola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Francis_Ford_Coppola_2011_CC.jpg/800px-Francis_Ford_Coppola_2011_CC.jpg',
  'Quentin Tarantino': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Quentin_Tarantino_by_Gage_Skidmore.jpg/800px-Quentin_Tarantino_by_Gage_Skidmore.jpg',
  'Robert Zemeckis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Robert_Zemeckis_2019.jpg/800px-Robert_Zemeckis_2019.jpg',
  'Christopher Nolan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Christopher_Nolan_Cannes_2018.jpg/800px-Christopher_Nolan_Cannes_2018.jpg',
  'James Cameron': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/James_Cameron_by_Gage_Skidmore.jpg/800px-James_Cameron_by_Gage_Skidmore.jpg',
  'Lana et Lilly Wachowski': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Lana_Wachowski_2016.jpg/800px-Lana_Wachowski_2016.jpg',
  'Ridley Scott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Ridley_Scott_by_Gage_Skidmore.jpg/800px-Ridley_Scott_by_Gage_Skidmore.jpg',

  // Réalisateurs internationaux
  'Bong Joon-ho': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Bong_Joon-ho_2019_%28cropped%29.jpg/800px-Bong_Joon-ho_2019_%28cropped%29.jpg',
  'Hayao Miyazaki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Hayao_Miyazaki.jpg/800px-Hayao_Miyazaki.jpg',
  'Roberto Benigni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Roberto_Benigni_Cannes_2016.jpg/800px-Roberto_Benigni_Cannes_2016.jpg',
};

async function main() {
  console.log('📸 Adding image URLs to cinema facts...\n');

  const source = await prisma.source.findUnique({
    where: { name: 'Manuel - Cinéma' },
  });

  if (!source) {
    throw new Error('Source not found');
  }

  let totalUpdated = 0;

  // Update actor facts with images
  console.log('Updating actor images...');
  for (const [actorName, imageUrl] of Object.entries(ACTOR_IMAGES)) {
    const facts = await prisma.fact.findMany({
      where: {
        subject: actorName,
        property: 'joue dans',
      },
    });

    for (const fact of facts) {
      await prisma.fact.update({
        where: { id: fact.id },
        data: {
          data: {
            ...(fact.data as any),
            imageUrl,
          },
        },
      });
      totalUpdated++;
    }

    if (facts.length > 0) {
      console.log(`  ✅ ${actorName}: ${facts.length} facts updated`);
    }
  }

  // Update director facts with images
  console.log('\nUpdating director images...');
  for (const [directorName, imageUrl] of Object.entries(DIRECTOR_IMAGES)) {
    const facts = await prisma.fact.findMany({
      where: {
        object: directorName,
        property: 'réalisé par',
      },
    });

    for (const fact of facts) {
      await prisma.fact.update({
        where: { id: fact.id },
        data: {
          data: {
            ...(fact.data as any),
            directorImageUrl: imageUrl,
          },
        },
      });
      totalUpdated++;
    }

    if (facts.length > 0) {
      console.log(`  ✅ ${directorName}: ${facts.length} facts updated`);
    }
  }

  console.log(`\n✅ Total facts updated with images: ${totalUpdated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

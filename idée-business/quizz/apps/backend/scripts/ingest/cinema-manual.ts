import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données cinéma manuelles (vérifiées)
const CINEMA_DATA = {
  // Films français
  french: [
    {
      film: 'Intouchables',
      director: 'Olivier Nakache et Éric Toledano',
      actors: [
        { name: 'Omar Sy', character: 'Driss' },
        { name: 'François Cluzet', character: 'Philippe' },
      ],
    },
    {
      film: 'Le Fabuleux Destin d\'Amélie Poulain',
      director: 'Jean-Pierre Jeunet',
      actors: [
        { name: 'Audrey Tautou', character: 'Amélie Poulain' },
        { name: 'Mathieu Kassovitz', character: 'Nino Quincampoix' },
      ],
    },
    {
      film: 'OSS 117: Le Caire, nid d\'espions',
      director: 'Michel Hazanavicius',
      actors: [
        { name: 'Jean Dujardin', character: 'Hubert Bonisseur de La Bath' },
        { name: 'Bérénice Bejo', character: 'Larmina El Akmar Betouche' },
      ],
    },
    {
      film: 'La Haine',
      director: 'Mathieu Kassovitz',
      actors: [
        { name: 'Vincent Cassel', character: 'Vinz' },
        { name: 'Hubert Koundé', character: 'Hubert' },
        { name: 'Saïd Taghmaoui', character: 'Saïd' },
      ],
    },
    {
      film: 'Les Visiteurs',
      director: 'Jean-Marie Poiré',
      actors: [
        { name: 'Jean Reno', character: 'Comte Godefroy de Montmirail' },
        { name: 'Christian Clavier', character: 'Jacquouille la Fripouille' },
        { name: 'Valérie Lemercier', character: 'Béatrice de Montmirail' },
      ],
    },
    {
      film: 'Le Dîner de cons',
      director: 'Francis Veber',
      actors: [
        { name: 'Thierry Lhermitte', character: 'Pierre Brochant' },
        { name: 'Jacques Villeret', character: 'François Pignon' },
      ],
    },
    {
      film: 'Les Choristes',
      director: 'Christophe Barratier',
      actors: [
        { name: 'Gérard Jugnot', character: 'Clément Mathieu' },
        { name: 'François Berléand', character: 'Rachin' },
      ],
    },
    {
      film: 'Taxi',
      director: 'Gérard Pirès',
      actors: [
        { name: 'Samy Naceri', character: 'Daniel Morales' },
        { name: 'Frédéric Diefenthal', character: 'Émilien Coutant-Kerbalec' },
      ],
    },
    {
      film: 'Astérix et Obélix: Mission Cléopâtre',
      director: 'Alain Chabat',
      actors: [
        { name: 'Gérard Depardieu', character: 'Obélix' },
        { name: 'Christian Clavier', character: 'Astérix' },
        { name: 'Jamel Debbouze', character: 'Numérobis' },
        { name: 'Monica Bellucci', character: 'Cléopâtre' },
      ],
    },
    {
      film: 'Le Cinquième Élément',
      director: 'Luc Besson',
      actors: [
        { name: 'Bruce Willis', character: 'Korben Dallas' },
        { name: 'Milla Jovovich', character: 'Leeloo' },
        { name: 'Gary Oldman', character: 'Zorg' },
      ],
    },
  ],

  // Films hollywoodiens
  hollywood: [
    {
      film: 'Star Wars, épisode IV: Un nouvel espoir',
      director: 'George Lucas',
      actors: [
        { name: 'Mark Hamill', character: 'Luke Skywalker' },
        { name: 'Harrison Ford', character: 'Han Solo' },
        { name: 'Carrie Fisher', character: 'Princesse Leia' },
      ],
    },
    {
      film: 'Le Parrain',
      director: 'Francis Ford Coppola',
      actors: [
        { name: 'Marlon Brando', character: 'Don Vito Corleone' },
        { name: 'Al Pacino', character: 'Michael Corleone' },
      ],
    },
    {
      film: 'Pulp Fiction',
      director: 'Quentin Tarantino',
      actors: [
        { name: 'John Travolta', character: 'Vincent Vega' },
        { name: 'Samuel L. Jackson', character: 'Jules Winnfield' },
        { name: 'Uma Thurman', character: 'Mia Wallace' },
      ],
    },
    {
      film: 'Forrest Gump',
      director: 'Robert Zemeckis',
      actors: [
        { name: 'Tom Hanks', character: 'Forrest Gump' },
        { name: 'Robin Wright', character: 'Jenny Curran' },
      ],
    },
    {
      film: 'The Dark Knight',
      director: 'Christopher Nolan',
      actors: [
        { name: 'Christian Bale', character: 'Bruce Wayne / Batman' },
        { name: 'Heath Ledger', character: 'Joker' },
      ],
    },
    {
      film: 'Titanic',
      director: 'James Cameron',
      actors: [
        { name: 'Leonardo DiCaprio', character: 'Jack Dawson' },
        { name: 'Kate Winslet', character: 'Rose DeWitt Bukater' },
      ],
    },
    {
      film: 'Matrix',
      director: 'Lana et Lilly Wachowski',
      actors: [
        { name: 'Keanu Reeves', character: 'Neo' },
        { name: 'Laurence Fishburne', character: 'Morpheus' },
        { name: 'Carrie-Anne Moss', character: 'Trinity' },
      ],
    },
    {
      film: 'Fight Club',
      director: 'David Fincher',
      actors: [
        { name: 'Brad Pitt', character: 'Tyler Durden' },
        { name: 'Edward Norton', character: 'Le Narrateur' },
      ],
    },
    {
      film: 'Inception',
      director: 'Christopher Nolan',
      actors: [
        { name: 'Leonardo DiCaprio', character: 'Dom Cobb' },
        { name: 'Marion Cotillard', character: 'Mal' },
      ],
    },
    {
      film: 'Gladiator',
      director: 'Ridley Scott',
      actors: [
        { name: 'Russell Crowe', character: 'Maximus' },
        { name: 'Joaquin Phoenix', character: 'Commodus' },
      ],
    },
  ],

  // Films internationaux
  international: [
    {
      film: 'Parasite',
      director: 'Bong Joon-ho',
      actors: [
        { name: 'Song Kang-ho', character: 'Kim Ki-taek' },
        { name: 'Lee Sun-kyun', character: 'Park Dong-ik' },
      ],
    },
    {
      film: 'Le Voyage de Chihiro',
      director: 'Hayao Miyazaki',
      actors: [
        { name: 'Rumi Hiiragi', character: 'Chihiro' },
      ],
    },
    {
      film: 'La Vita è bella',
      director: 'Roberto Benigni',
      actors: [
        { name: 'Roberto Benigni', character: 'Guido Orefice' },
        { name: 'Nicoletta Braschi', character: 'Dora' },
      ],
    },
    {
      film: 'Oldboy',
      director: 'Park Chan-wook',
      actors: [
        { name: 'Choi Min-sik', character: 'Oh Dae-su' },
      ],
    },
    {
      film: 'Princesse Mononoké',
      director: 'Hayao Miyazaki',
      actors: [
        { name: 'Yōji Matsuda', character: 'Ashitaka' },
      ],
    },
  ],
};

async function main() {
  console.log('🎬 Creating cinema facts (manual data)...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manuel - Cinéma' },
    update: {},
    create: {
      name: 'Manuel - Cinéma',
      type: 'manuel',
      reliability: 5,
      description: 'Films, acteurs, réalisateurs (données vérifiées manuellement)',
    },
  });

  const categories = {
    films: await prisma.category.findUnique({ where: { slug: 'cinema-films' } }),
    acteurs: await prisma.category.findUnique({ where: { slug: 'cinema-acteurs' } }),
    realisateurs: await prisma.category.findUnique({ where: { slug: 'cinema-realisateurs' } }),
    personnages: await prisma.category.findUnique({ where: { slug: 'cinema-personnages' } }),
  };

  if (!categories.films || !categories.acteurs || !categories.realisateurs || !categories.personnages) {
    throw new Error('Cinema categories not found. Run create-cinema-categories.ts first.');
  }

  let totalFacts = 0;

  // Process all film categories
  for (const [origin, films] of Object.entries(CINEMA_DATA)) {
    console.log(`\nProcessing ${origin} films...`);

    for (const filmData of films) {
      console.log(`  ${filmData.film}...`);

      // Film -> Director fact
      await prisma.fact.upsert({
        where: {
          subject_property_object: {
            subject: filmData.film,
            property: 'réalisé par',
            object: filmData.director,
          },
        },
        update: {},
        create: {
          subject: filmData.film,
          property: 'réalisé par',
          object: filmData.director,
          sourceId: source.id,
          categoryId: categories.films!.id,
          tags: [origin, 'cinéma', 'film'],
        },
      });
      totalFacts++;

      // Actor facts
      for (const actor of filmData.actors) {
        // Actor -> Film fact
        await prisma.fact.upsert({
          where: {
            subject_property_object: {
              subject: actor.name,
              property: 'joue dans',
              object: filmData.film,
            },
          },
          update: {},
          create: {
            subject: actor.name,
            property: 'joue dans',
            object: filmData.film,
            sourceId: source.id,
            categoryId: categories.acteurs!.id,
            tags: [origin, 'cinéma', 'acteur'],
            data: { character: actor.character },
          },
        });
        totalFacts++;

        // Character -> Film fact
        await prisma.fact.upsert({
          where: {
            subject_property_object: {
              subject: actor.character,
              property: 'personnage de',
              object: filmData.film,
            },
          },
          update: {},
          create: {
            subject: actor.character,
            property: 'personnage de',
            object: filmData.film,
            sourceId: source.id,
            categoryId: categories.personnages!.id,
            tags: [origin, 'cinéma', 'personnage'],
            data: { actor: actor.name },
          },
        });
        totalFacts++;
      }
    }
  }

  console.log(`\n✅ Total facts created: ${totalFacts}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

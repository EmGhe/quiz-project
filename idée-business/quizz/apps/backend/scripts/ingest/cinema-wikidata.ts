import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Films sélectionnés avec leurs IDs Wikidata
// Format: { id, title, origin }
const SELECTED_FILMS = [
  // Films français (40%)
  { id: 'Q223374', title: 'Intouchables', origin: 'FR' },
  { id: 'Q189881', title: 'Le Fabuleux Destin d\'Amélie Poulain', origin: 'FR' },
  { id: 'Q1196948', title: 'OSS 117: Le Caire, nid d\'espions', origin: 'FR' },
  { id: 'Q1196950', title: 'OSS 117: Rio ne répond plus', origin: 'FR' },
  { id: 'Q1196225', title: 'La Haine', origin: 'FR' },
  { id: 'Q1196948', title: 'Les Visiteurs', origin: 'FR' },
  { id: 'Q1196949', title: 'Les Bronzés', origin: 'FR' },
  { id: 'Q47075', title: 'La Grande Vadrouille', origin: 'FR' },
  { id: 'Q1196947', title: 'Le Dîner de cons', origin: 'FR' },
  { id: 'Q1196946', title: 'Les Choristes', origin: 'FR' },
  { id: 'Q47075', title: 'La Vie est belle', origin: 'FR' },
  { id: 'Q1196945', title: 'Taxi', origin: 'FR' },
  { id: 'Q1196944', title: 'Astérix et Obélix: Mission Cléopâtre', origin: 'FR' },
  { id: 'Q156098', title: 'Le Cinquième Élément', origin: 'FR' },
  { id: 'Q47075', title: 'Lucy', origin: 'FR' },
  { id: 'Q47075', title: 'Taken', origin: 'FR' },

  // Films hollywoodiens (40%)
  { id: 'Q18002', title: 'Star Wars, épisode IV: Un nouvel espoir', origin: 'US' },
  { id: 'Q47703', title: 'Le Parrain', origin: 'US' },
  { id: 'Q104137', title: 'Pulp Fiction', origin: 'US' },
  { id: 'Q109331', title: 'Forrest Gump', origin: 'US' },
  { id: 'Q166262', title: 'The Dark Knight', origin: 'US' },
  { id: 'Q190050', title: 'Titanic', origin: 'US' },
  { id: 'Q102448', title: 'Matrix', origin: 'US' },
  { id: 'Q180098', title: 'Fight Club', origin: 'US' },
  { id: 'Q47703', title: 'Le Seigneur des anneaux: La Communauté de l\'anneau', origin: 'US' },
  { id: 'Q190050', title: 'Inception', origin: 'US' },
  { id: 'Q102448', title: 'Jurassic Park', origin: 'US' },
  { id: 'Q180098', title: 'Avatar', origin: 'US' },
  { id: 'Q47703', title: 'Retour vers le futur', origin: 'US' },
  { id: 'Q190050', title: 'Gladiator', origin: 'US' },
  { id: 'Q102448', title: 'Pirates des Caraïbes: La Malédiction du Black Pearl', origin: 'US' },
  { id: 'Q180098', title: 'Harry Potter à l\'école des sorciers', origin: 'US' },

  // Films internationaux (20%)
  { id: 'Q61448040', title: 'Parasite', origin: 'KR' },
  { id: 'Q245025', title: 'Le Voyage de Chihiro', origin: 'JP' },
  { id: 'Q19053', title: 'La Vita è bella', origin: 'IT' },
  { id: 'Q484048', title: 'Oldboy', origin: 'KR' },
  { id: 'Q245025', title: 'Princesse Mononoké', origin: 'JP' },
  { id: 'Q19053', title: 'Le Tombeau des lucioles', origin: 'JP' },
  { id: 'Q484048', title: 'Your Name', origin: 'JP' },
  { id: 'Q245025', title: 'La Cité de Dieu', origin: 'BR' },
];

interface WikidataMovie {
  filmId: string;
  filmLabel: string;
  directorId?: string;
  directorLabel?: string;
  actorId?: string;
  actorLabel?: string;
  characterLabel?: string;
}

async function fetchMovieData(wikidataId: string): Promise<WikidataMovie[]> {
  const query = `
    SELECT DISTINCT ?film ?filmLabel ?director ?directorLabel ?actor ?actorLabel ?characterLabel WHERE {
      BIND(wd:${wikidataId} AS ?film)
      OPTIONAL { ?film wdt:P57 ?director. }
      OPTIONAL {
        ?film p:P161 ?statement.
        ?statement ps:P161 ?actor.
        OPTIONAL { ?statement pq:P453 ?character. }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    }
    LIMIT 10
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data.results.bindings.map((binding: any) => ({
      filmId: wikidataId,
      filmLabel: binding.filmLabel?.value || '',
      directorId: binding.director?.value?.split('/').pop(),
      directorLabel: binding.directorLabel?.value,
      actorId: binding.actor?.value?.split('/').pop(),
      actorLabel: binding.actorLabel?.value,
      characterLabel: binding.characterLabel?.value,
    }));
  } catch (error) {
    console.error(`Error fetching data for ${wikidataId}:`, error);
    return [];
  }
}

async function main() {
  console.log('🎬 Fetching cinema data from Wikidata...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Wikidata - Cinéma' },
    update: {},
    create: {
      name: 'Wikidata - Cinéma',
      type: 'wikidata',
      url: 'https://www.wikidata.org',
      reliability: 5,
      description: 'Films, acteurs, réalisateurs depuis Wikidata',
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

  for (const film of SELECTED_FILMS) {
    console.log(`Fetching: ${film.title} (${film.id})...`);

    const movieData = await fetchMovieData(film.id);

    if (movieData.length === 0) {
      console.log(`  ⚠️  No data found for ${film.title}`);
      continue;
    }

    const firstResult = movieData[0];

    // Create film fact (with director)
    if (firstResult.directorLabel) {
      await prisma.fact.upsert({
        where: {
          subject_property_object: {
            subject: firstResult.filmLabel,
            property: 'réalisateur',
            object: firstResult.directorLabel,
          },
        },
        update: {},
        create: {
          subject: firstResult.filmLabel,
          property: 'réalisateur',
          object: firstResult.directorLabel,
          sourceId: source.id,
          sourceReference: film.id,
          categoryId: categories.films!.id,
          tags: [film.origin, 'cinéma', 'film'],
          data: {
            directorId: firstResult.directorId,
            filmId: film.id,
          },
        },
      });
      totalFacts++;
    }

    // Create actor facts
    const uniqueActors = new Map();
    for (const data of movieData) {
      if (data.actorLabel && !uniqueActors.has(data.actorLabel)) {
        uniqueActors.set(data.actorLabel, data);
      }
    }

    for (const [actorLabel, data] of uniqueActors.entries()) {
      await prisma.fact.upsert({
        where: {
          subject_property_object: {
            subject: actorLabel,
            property: 'joue dans',
            object: firstResult.filmLabel,
          },
        },
        update: {},
        create: {
          subject: actorLabel,
          property: 'joue dans',
          object: firstResult.filmLabel,
          sourceId: source.id,
          sourceReference: data.actorId,
          categoryId: categories.acteurs!.id,
          tags: [film.origin, 'cinéma', 'acteur'],
          data: {
            actorId: data.actorId,
            filmId: film.id,
            characterLabel: data.characterLabel,
          },
        },
      });
      totalFacts++;

      // Create character fact if available
      if (data.characterLabel) {
        await prisma.fact.upsert({
          where: {
            subject_property_object: {
              subject: data.characterLabel,
              property: 'personnage de',
              object: firstResult.filmLabel,
            },
          },
          update: {},
          create: {
            subject: data.characterLabel,
            property: 'personnage de',
            object: firstResult.filmLabel,
            sourceId: source.id,
            sourceReference: film.id,
            categoryId: categories.personnages!.id,
            tags: [film.origin, 'cinéma', 'personnage'],
            data: {
              actorId: data.actorId,
              actorLabel: actorLabel,
              filmId: film.id,
            },
          },
        });
        totalFacts++;
      }
    }

    console.log(`  ✅ ${uniqueActors.size} facts created`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Total facts created: ${totalFacts}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

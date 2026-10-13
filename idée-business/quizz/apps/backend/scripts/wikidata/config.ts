/**
 * Wikidata Integration Configuration
 */

export const WIKIDATA_CONFIG = {
  // SPARQL endpoint for Wikidata queries
  SPARQL_ENDPOINT: 'https://query.wikidata.org/sparql',

  // User agent for requests (Wikidata requires this)
  USER_AGENT: 'QuizPlatform/1.0 (https://github.com/yourproject; contact@example.com)',

  // Rate limiting (ms between requests)
  REQUEST_DELAY: 1000, // 1 second between requests

  // Timeout for requests
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
};

/**
 * Wikidata Property IDs (commonly used)
 */
export const WIKIDATA_PROPERTIES = {
  INSTANCE_OF: 'P31',           // instance of
  COUNTRY: 'P17',               // country
  CAPITAL: 'P36',               // capital
  POPULATION: 'P1082',          // population
  COORDINATE_LOCATION: 'P625',  // coordinate location
  CONTINENT: 'P30',             // continent
  FLAG_IMAGE: 'P41',            // flag image
  OFFICIAL_LANGUAGE: 'P37',     // official language
  HEAD_OF_GOVERNMENT: 'P6',     // head of government
  DIRECTOR: 'P57',              // director (films)
  CAST_MEMBER: 'P161',          // cast member
  AWARD_RECEIVED: 'P166',       // award received
  CHEMICAL_SYMBOL: 'P246',      // element symbol
  INCEPTION: 'P571',            // inception/founding date
};

/**
 * Wikidata Entity IDs (commonly used)
 */
export const WIKIDATA_ENTITIES = {
  COUNTRY: 'Q6256',                    // country
  SOVEREIGN_STATE: 'Q3624078',         // sovereign state
  CAPITAL: 'Q5119',                    // capital
  CITY: 'Q515',                        // city
  PLANET: 'Q634',                      // planet
  CHEMICAL_ELEMENT: 'Q11344',          // chemical element
  FILM: 'Q11424',                      // film
  ACADEMY_AWARD_BEST_PICTURE: 'Q102427', // Academy Award for Best Picture
  OCEAN: 'Q9430',                      // ocean
  SEA: 'Q165',                         // sea
  RIVER: 'Q4022',                      // river
  MOUNTAIN: 'Q8502',                   // mountain
};

/**
 * Geographic regions for content distribution
 */
export const GEO_REGIONS = {
  FRANCE: 'france',
  EUROPE: 'europe',
  NORTH_AMERICA: 'amerique_nord',
  REST_OF_WORLD: 'reste_monde',
} as const;

/**
 * Difficulty levels
 */
export const DIFFICULTY = {
  EASY: 'facile',
  MEDIUM: 'moyen',
  HARD: 'difficile',
} as const;

/**
 * Question types
 */
export const QUESTION_TYPES = {
  TEXT: 'texte',
  IMAGE: 'image',
  MAP: 'carte',
} as const;

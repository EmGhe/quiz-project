/**
 * Pre-built SPARQL queries for Wikidata
 */

import { WIKIDATA_PROPERTIES as P, WIKIDATA_ENTITIES as E } from './config';

/**
 * Query to get all countries with their capitals
 * Returns: country name (FR + EN), capital name (FR + EN), country entity ID, capital entity ID, continent
 */
export const QUERY_COUNTRIES_CAPITALS = `
SELECT DISTINCT
  ?country ?countryLabel ?countryLabelEn
  ?capital ?capitalLabel ?capitalLabelEn
  ?continent ?continentLabel
  ?population
WHERE {
  # Get sovereign states
  ?country wdt:${P.INSTANCE_OF} wd:${E.SOVEREIGN_STATE};
           wdt:${P.CAPITAL} ?capital.

  # Get continent
  OPTIONAL { ?country wdt:${P.CONTINENT} ?continent. }

  # Get capital population (for sorting by importance)
  OPTIONAL { ?capital wdt:${P.POPULATION} ?population. }

  # Get French labels
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?country rdfs:label ?countryLabel.
    ?capital rdfs:label ?capitalLabel.
    ?continent rdfs:label ?continentLabel.
  }

  # Get English labels
  OPTIONAL {
    ?country rdfs:label ?countryLabelEn.
    FILTER(LANG(?countryLabelEn) = "en")
  }

  OPTIONAL {
    ?capital rdfs:label ?capitalLabelEn.
    FILTER(LANG(?capitalLabelEn) = "en")
  }
}
ORDER BY DESC(?population)
LIMIT 300
`;

/**
 * Query to get major world oceans
 */
export const QUERY_OCEANS = `
SELECT DISTINCT
  ?ocean ?oceanLabel ?oceanLabelEn
  ?area
WHERE {
  ?ocean wdt:${P.INSTANCE_OF} wd:${E.OCEAN}.

  OPTIONAL { ?ocean wdt:P2046 ?area. }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?ocean rdfs:label ?oceanLabel.
  }

  OPTIONAL {
    ?ocean rdfs:label ?oceanLabelEn.
    FILTER(LANG(?oceanLabelEn) = "en")
  }
}
ORDER BY DESC(?area)
LIMIT 10
`;

/**
 * Query to get planets of the solar system
 */
export const QUERY_PLANETS = `
SELECT DISTINCT
  ?planet ?planetLabel ?planetLabelEn
  ?distanceFromSun
WHERE {
  ?planet wdt:${P.INSTANCE_OF} wd:${E.PLANET};
          wdt:P2583 ?distanceFromSun.

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?planet rdfs:label ?planetLabel.
  }

  OPTIONAL {
    ?planet rdfs:label ?planetLabelEn.
    FILTER(LANG(?planetLabelEn) = "en")
  }
}
ORDER BY ?distanceFromSun
LIMIT 10
`;

/**
 * Query to get chemical elements with their symbols
 */
export const QUERY_CHEMICAL_ELEMENTS = `
SELECT DISTINCT
  ?element ?elementLabel ?elementLabelEn
  ?symbol
  ?atomicNumber
WHERE {
  ?element wdt:${P.INSTANCE_OF} wd:${E.CHEMICAL_ELEMENT};
           wdt:${P.CHEMICAL_SYMBOL} ?symbol;
           wdt:P1086 ?atomicNumber.

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?element rdfs:label ?elementLabel.
  }

  OPTIONAL {
    ?element rdfs:label ?elementLabelEn.
    FILTER(LANG(?elementLabelEn) = "en")
  }
}
ORDER BY ?atomicNumber
LIMIT 118
`;

/**
 * Query to get Academy Award Best Picture winners
 */
export const QUERY_OSCAR_BEST_PICTURE = `
SELECT DISTINCT
  ?film ?filmLabel ?filmLabelEn
  ?director ?directorLabel
  ?year
WHERE {
  ?film wdt:${P.AWARD_RECEIVED} wd:${E.ACADEMY_AWARD_BEST_PICTURE};
        wdt:${P.DIRECTOR} ?director;
        wdt:${P.INCEPTION} ?date.

  BIND(YEAR(?date) AS ?year)

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?film rdfs:label ?filmLabel.
    ?director rdfs:label ?directorLabel.
  }

  OPTIONAL {
    ?film rdfs:label ?filmLabelEn.
    FILTER(LANG(?filmLabelEn) = "en")
  }

  FILTER(?year >= 1990)
}
ORDER BY DESC(?year)
LIMIT 50
`;

/**
 * Query to get country flags
 */
export const QUERY_COUNTRY_FLAGS = `
SELECT DISTINCT
  ?country ?countryLabel ?countryLabelEn
  ?flag
WHERE {
  ?country wdt:${P.INSTANCE_OF} wd:${E.SOVEREIGN_STATE};
           wdt:${P.FLAG_IMAGE} ?flag.

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?country rdfs:label ?countryLabel.
  }

  OPTIONAL {
    ?country rdfs:label ?countryLabelEn.
    FILTER(LANG(?countryLabelEn) = "en")
  }
}
LIMIT 200
`;

/**
 * Query to get major rivers
 */
export const QUERY_MAJOR_RIVERS = `
SELECT DISTINCT
  ?river ?riverLabel ?riverLabelEn
  ?country ?countryLabel
  ?length
WHERE {
  ?river wdt:${P.INSTANCE_OF} wd:${E.RIVER};
         wdt:${P.COUNTRY} ?country;
         wdt:P2043 ?length.

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?river rdfs:label ?riverLabel.
    ?country rdfs:label ?countryLabel.
  }

  OPTIONAL {
    ?river rdfs:label ?riverLabelEn.
    FILTER(LANG(?riverLabelEn) = "en")
  }

  FILTER(?length > 200)
}
ORDER BY DESC(?length)
LIMIT 100
`;

/**
 * Query to get major cities of a country (not capitals)
 * Used for generating trap distractors
 */
export function buildMajorCitiesQuery(countryEntityId: string): string {
  return `
SELECT DISTINCT
  ?city ?cityLabel ?cityLabelEn
  ?population
WHERE {
  # Get cities of the country
  ?city wdt:${P.INSTANCE_OF} wd:${E.CITY};
        wdt:${P.COUNTRY} wd:${countryEntityId};
        wdt:${P.POPULATION} ?population.

  # Exclude if it's a capital
  FILTER NOT EXISTS {
    ?anyCountry wdt:${P.CAPITAL} ?city.
  }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "fr".
    ?city rdfs:label ?cityLabel.
  }

  OPTIONAL {
    ?city rdfs:label ?cityLabelEn.
    FILTER(LANG(?cityLabelEn) = "en")
  }

  # Only cities with significant population
  FILTER(?population > 100000)
}
ORDER BY DESC(?population)
LIMIT 20
`;
}

/**
 * Build a custom SPARQL query
 */
export function buildCustomQuery(config: {
  select: string[];
  where: string[];
  optional?: string[];
  filter?: string[];
  orderBy?: string;
  limit?: number;
}): string {
  const { select, where, optional = [], filter = [], orderBy, limit } = config;

  let query = `SELECT DISTINCT ${select.join(' ')}\nWHERE {\n`;

  // Main WHERE clauses
  where.forEach((clause) => {
    query += `  ${clause}\n`;
  });

  // Optional clauses
  optional.forEach((clause) => {
    query += `  OPTIONAL { ${clause} }\n`;
  });

  // Filters
  filter.forEach((clause) => {
    query += `  FILTER(${clause})\n`;
  });

  query += `}\n`;

  // Order by
  if (orderBy) {
    query += `ORDER BY ${orderBy}\n`;
  }

  // Limit
  if (limit) {
    query += `LIMIT ${limit}\n`;
  }

  return query;
}

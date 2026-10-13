/**
 * Geographic region mapping utilities
 */

import { GEO_REGIONS } from '../wikidata/config';

/**
 * Map continent name to geographic region
 * Based on strategy: 35% France, 25% Europe, 20% North America, 20% Rest of World
 */
export function mapContinentToRegion(
  continent: string | undefined,
  countryLabel: string
): string {
  if (!continent) {
    // Try to infer from country name if continent is missing
    if (isFrenchCountry(countryLabel)) {
      return GEO_REGIONS.FRANCE;
    }
    return GEO_REGIONS.REST_OF_WORLD;
  }

  const continentLower = continent.toLowerCase();

  // France specifically
  if (isFrenchCountry(countryLabel)) {
    return GEO_REGIONS.FRANCE;
  }

  // Europe (excluding France)
  if (continentLower.includes('europe')) {
    return GEO_REGIONS.EUROPE;
  }

  // North America
  if (
    continentLower.includes('amérique du nord') ||
    continentLower.includes('north america')
  ) {
    return GEO_REGIONS.NORTH_AMERICA;
  }

  // Rest of world (Asia, Africa, South America, Oceania, etc.)
  return GEO_REGIONS.REST_OF_WORLD;
}

/**
 * Check if country is France
 */
function isFrenchCountry(countryLabel: string): boolean {
  const label = countryLabel.toLowerCase();
  return label === 'france' || label === 'république française';
}

/**
 * Determine interest score based on population and region
 */
export function calculateInterestScore(
  population: number | undefined,
  region: string,
  countryLabel: string
): number {
  let score = 5; // Base score

  // Boost for France
  if (region === GEO_REGIONS.FRANCE) {
    score += 3;
  }

  // Boost for Europe
  if (region === GEO_REGIONS.EUROPE) {
    score += 2;
  }

  // Boost for North America
  if (region === GEO_REGIONS.NORTH_AMERICA) {
    score += 1;
  }

  // Boost for large populations (more well-known)
  if (population) {
    if (population > 10_000_000) {
      score += 2;
    } else if (population > 5_000_000) {
      score += 1;
    }
  }

  // Boost for well-known countries
  const wellKnownCountries = [
    'états-unis',
    'royaume-uni',
    'allemagne',
    'italie',
    'espagne',
    'japon',
    'chine',
    'inde',
    'brésil',
    'canada',
    'australie',
    'mexique',
    'argentine',
  ];

  if (wellKnownCountries.some((name) => countryLabel.toLowerCase().includes(name))) {
    score += 1;
  }

  return Math.min(score, 10); // Cap at 10
}

/**
 * Get tags for a capital fact
 */
export function getCapitalTags(
  countryLabel: string,
  capitalLabel: string,
  continent: string | undefined
): string[] {
  const tags = ['capitale', 'ville', 'géographie'];

  if (continent) {
    tags.push(continent.toLowerCase());
  }

  // Add country as tag
  tags.push(countryLabel.toLowerCase());

  return tags;
}

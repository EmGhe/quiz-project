/**
 * Distractor generation utilities for MCQ questions
 */

import { getPrismaClient } from './db';
import { rateLimitedQuery, parseResults } from '../wikidata/sparql-client';
import { buildMajorCitiesQuery } from '../wikidata/queries';

interface DistractorCandidate {
  text: string;
  wikidataId: string;
  score: number;
  region?: string;
  population?: number;
}

/**
 * Generate distractors for a capital question
 * Strategy:
 * - 1 distractor = major city from same country (trap!)
 * - 3 distractors = capitals from other countries (same/nearby regions)
 */
export async function generateCapitalDistractors(
  correctAnswer: string,
  factData: any,
  count: number = 4
): Promise<DistractorCandidate[]> {
  const prisma = getPrismaClient();

  const continent = factData?.continent;
  const capitalEntityId = factData?.capitalEntityId;
  const countryEntityId = factData?.countryEntityId;
  const countryName = factData?.countryNameFr || factData?.countryLabel;

  const distractors: DistractorCandidate[] = [];

  // Strategy 1: Get 1 major city from the SAME country (not a capital)
  if (countryEntityId) {
    try {
      const majorCitiesQuery = buildMajorCitiesQuery(countryEntityId);
      const citiesResults = await rateLimitedQuery(majorCitiesQuery);

      if (citiesResults.length > 0) {
        const parsed = parseResults(citiesResults);
        const cityData = parsed[0]; // Take the largest city

        if (cityData && cityData.cityLabel && cityData.cityLabel !== correctAnswer) {
          distractors.push({
            text: cityData.cityLabel,
            wikidataId: cityData.city?.split('/').pop() || '',
            score: 100, // High score - this is a trap distractor!
            population: cityData.population ? parseInt(cityData.population) : undefined,
          });

          console.log(`  ✓ Added trap distractor: ${cityData.cityLabel} (same country: ${countryName})`);
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not fetch major cities for ${countryName}:`, error);
      // Continue without trap distractor if query fails
    }
  }

  // Strategy 2: Get capitals from OTHER countries (fill remaining slots)
  const remainingCount = count - distractors.length;

  if (remainingCount > 0) {
    const allCapitalFacts = await prisma.fact.findMany({
      where: {
        property: 'est la capitale de',
        active: true,
        NOT: {
          subject: correctAnswer, // Exclude the correct answer
        },
      },
      orderBy: {
        interestScore: 'desc',
      },
    });

    // Score and filter candidates
    const capitalCandidates: DistractorCandidate[] = allCapitalFacts.map((fact) => {
      const factData = fact.data as any;
      const score = calculateDistractorScore(
        continent,
        factData?.continent,
        fact.geoRegion,
        factData?.population
      );

      return {
        text: fact.subject,
        wikidataId: factData?.capitalEntityId || '',
        score,
        region: fact.geoRegion ?? undefined,
        population: factData?.population,
      };
    });

    // Sort by score (descending) and take top N
    capitalCandidates.sort((a, b) => b.score - a.score);

    // Add capital distractors
    const selectedCapitals = selectDiverseDistractors(capitalCandidates, remainingCount);
    distractors.push(...selectedCapitals);
  }

  return distractors;
}

/**
 * Generate distractors for a country question
 * Strategy: Use other countries from same or nearby regions
 */
export async function generateCountryDistractors(
  correctAnswer: string,
  factData: any,
  count: number = 4
): Promise<DistractorCandidate[]> {
  const prisma = getPrismaClient();

  const continent = factData?.continent;
  const countryEntityId = factData?.countryEntityId;

  // Get all capital facts (object = country name)
  const allCapitalFacts = await prisma.fact.findMany({
    where: {
      property: 'est la capitale de',
      active: true,
      NOT: {
        object: correctAnswer, // Exclude the correct answer
      },
    },
    orderBy: {
      interestScore: 'desc',
    },
  });

  // Score and filter candidates
  const candidates: DistractorCandidate[] = allCapitalFacts.map((fact) => {
    const factData = fact.data as any;
    const score = calculateDistractorScore(
      continent,
      factData?.continent,
      fact.geoRegion,
      factData?.population
    );

    return {
      text: fact.object,
      wikidataId: factData?.countryEntityId || '',
      score,
      region: fact.geoRegion ?? undefined,
      population: factData?.population,
    };
  });

  // Sort by score and remove duplicates (some countries appear multiple times)
  const uniqueCandidates = removeDuplicateDistractors(candidates);
  uniqueCandidates.sort((a, b) => b.score - a.score);

  return selectDiverseDistractors(uniqueCandidates, count);
}

/**
 * Calculate plausibility score for a distractor
 */
function calculateDistractorScore(
  targetContinent: string | null | undefined,
  candidateContinent: string | null | undefined,
  candidateRegion: string | null | undefined,
  candidatePopulation: number | null | undefined
): number {
  let score = 50; // Base score

  // Boost for same continent (more plausible)
  if (targetContinent && candidateContinent) {
    if (targetContinent.toLowerCase() === candidateContinent.toLowerCase()) {
      score += 40;
    } else {
      // Different continent = less plausible
      score -= 20;
    }
  }

  // Boost for well-known places (higher population)
  if (candidatePopulation) {
    if (candidatePopulation > 5_000_000) {
      score += 10; // Well-known
    } else if (candidatePopulation < 500_000) {
      score -= 10; // Obscure, less plausible
    }
  }

  // Boost for certain regions (more recognizable)
  if (candidateRegion === 'europe' || candidateRegion === 'amerique_nord') {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Remove duplicate distractors (same text)
 */
function removeDuplicateDistractors(
  candidates: DistractorCandidate[]
): DistractorCandidate[] {
  const seen = new Set<string>();
  const unique: DistractorCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique;
}

/**
 * Select diverse distractors to avoid repetition
 * Mix high-score and medium-score candidates
 */
function selectDiverseDistractors(
  candidates: DistractorCandidate[],
  count: number
): DistractorCandidate[] {
  if (candidates.length <= count) {
    return candidates;
  }

  const selected: DistractorCandidate[] = [];

  // Take top 60% from high scores
  const highScoreCount = Math.ceil(count * 0.6);
  selected.push(...candidates.slice(0, highScoreCount));

  // Take remaining from next tier (add variety)
  const remainingCount = count - highScoreCount;
  const midTierStart = highScoreCount;
  const midTierEnd = Math.min(midTierStart + remainingCount * 3, candidates.length);
  const midTier = candidates.slice(midTierStart, midTierEnd);

  // Randomly select from mid tier
  while (selected.length < count && midTier.length > 0) {
    const randomIndex = Math.floor(Math.random() * midTier.length);
    selected.push(midTier.splice(randomIndex, 1)[0]);
  }

  return selected;
}

/**
 * Validate that distractors are unique and not the correct answer
 */
export function validateDistractors(
  distractors: DistractorCandidate[],
  correctAnswer: string
): boolean {
  // Check no duplicates
  const texts = distractors.map((d) => d.text.toLowerCase());
  const uniqueTexts = new Set(texts);
  if (texts.length !== uniqueTexts.size) {
    return false;
  }

  // Check none match correct answer
  if (texts.includes(correctAnswer.toLowerCase())) {
    return false;
  }

  return true;
}

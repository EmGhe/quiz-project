/**
 * Question templates for generating questions from facts
 */

import { DIFFICULTY, QUESTION_TYPES } from '../wikidata/config';

export interface QuestionTemplate {
  template: string;
  answerField: 'subject' | 'object';
  difficulty: string;
  difficultyScore: number;
}

/**
 * Templates for capital questions
 */
export const CAPITAL_TEMPLATES: QuestionTemplate[] = [
  {
    template: 'Quelle est la capitale de {object} ?',
    answerField: 'subject',
    difficulty: DIFFICULTY.EASY,
    difficultyScore: 20,
  },
  {
    template: 'Quelle ville est la capitale de {object} ?',
    answerField: 'subject',
    difficulty: DIFFICULTY.EASY,
    difficultyScore: 25,
  },
  {
    template: 'Dans quel pays se trouve {subject} ?',
    answerField: 'object',
    difficulty: DIFFICULTY.MEDIUM,
    difficultyScore: 50,
  },
  {
    template: '{subject} est la capitale de quel pays ?',
    answerField: 'object',
    difficulty: DIFFICULTY.MEDIUM,
    difficultyScore: 55,
  },
];

/**
 * Generate question text from template
 */
export function generateQuestionText(
  template: string,
  subject: string,
  object: string
): string {
  return template.replace('{subject}', subject).replace('{object}', object);
}

/**
 * Get answer from fact based on template
 */
export function getAnswerFromFact(
  answerField: 'subject' | 'object',
  subject: string,
  object: string
): string {
  return answerField === 'subject' ? subject : object;
}

/**
 * Generate accepted answer variants for a capital
 */
export function generateCapitalVariants(capitalName: string): string[] {
  const variants = [capitalName];

  // Add common variations
  const normalized = capitalName.toLowerCase();

  // Remove accents version (if different)
  const withoutAccents = removeAccents(capitalName);
  if (withoutAccents !== capitalName) {
    variants.push(withoutAccents);
  }

  // Add lowercase version
  if (!variants.includes(normalized)) {
    variants.push(normalized);
  }

  return [...new Set(variants)]; // Remove duplicates
}

/**
 * Generate accepted answer variants for a country
 */
export function generateCountryVariants(
  countryName: string,
  countryNameEn?: string
): string[] {
  const variants = [countryName];

  // Add English version if available and different
  if (countryNameEn && countryNameEn !== countryName) {
    variants.push(countryNameEn);
  }

  // Remove accents version
  const withoutAccents = removeAccents(countryName);
  if (withoutAccents !== countryName) {
    variants.push(withoutAccents);
  }

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    'États-Unis': ['USA', 'Etats-Unis', 'États Unis', 'Etats Unis'],
    'Royaume-Uni': ['UK', 'Royaume Uni', 'Grande-Bretagne'],
    'République démocratique du Congo': ['RDC', 'Congo-Kinshasa'],
    'République du Congo': ['Congo-Brazzaville'],
    'Émirats arabes unis': ['EAU', 'Emirats arabes unis'],
    'Corée du Sud': ['Coree du Sud'],
    'Corée du Nord': ['Coree du Nord'],
  };

  for (const [fullName, abbrevs] of Object.entries(abbreviations)) {
    if (countryName.includes(fullName)) {
      variants.push(...abbrevs);
    }
  }

  return [...new Set(variants)]; // Remove duplicates
}

/**
 * Remove accents from string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Calculate quality score based on various factors
 */
export function calculateQuestionQuality(
  interestScore: number,
  templateDifficulty: string
): number {
  let quality = 70; // Base quality

  // Boost for higher interest facts
  quality += interestScore * 2;

  // Adjust for difficulty
  if (templateDifficulty === DIFFICULTY.EASY) {
    quality += 5; // Easy questions are good for onboarding
  } else if (templateDifficulty === DIFFICULTY.MEDIUM) {
    quality += 10; // Medium questions are ideal
  }

  return Math.min(quality, 100);
}

/**
 * Determine Levenshtein threshold based on answer length
 */
export function getLevenshteinThreshold(answer: string): number {
  const length = answer.length;

  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

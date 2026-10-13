import { Injectable } from '@nestjs/common';

interface AcceptedAnswer {
  answer: string;
  levenshteinThreshold: number;
}

@Injectable()
export class AnswerValidatorService {
  /**
   * Validate if user answer matches accepted answers
   * Uses fuzzy matching with Levenshtein distance
   */
  validateAnswer(
    userAnswer: string,
    acceptedAnswers: AcceptedAnswer[]
  ): boolean {
    if (!userAnswer || acceptedAnswers.length === 0) {
      return false;
    }

    // Normalize user answer
    const normalized = this.normalizeAnswer(userAnswer);

    for (const accepted of acceptedAnswers) {
      const normalizedAccepted = this.normalizeAnswer(accepted.answer);

      // Exact match after normalization
      if (normalized === normalizedAccepted) {
        return true;
      }

      // Fuzzy match with Levenshtein distance
      const distance = this.levenshteinDistance(normalized, normalizedAccepted);
      const threshold = accepted.levenshteinThreshold || 2;

      if (distance <= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize answer for comparison
   * - Remove accents
   * - Lowercase
   * - Trim spaces
   * - Remove punctuation
   * - Remove common articles (le, la, les, l', un, une, des)
   */
  private normalizeAnswer(answer: string): string {
    let normalized = answer.toLowerCase().trim();

    // Remove accents
    normalized = normalized.normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Remove punctuation
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');

    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Remove common French articles at the start
    const articles = ['le ', 'la ', 'les ', "l'", 'un ', 'une ', 'des '];
    for (const article of articles) {
      if (normalized.startsWith(article)) {
        normalized = normalized.substring(article.length);
        break;
      }
    }

    return normalized;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * (minimum number of single-character edits needed)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create matrix
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }
}

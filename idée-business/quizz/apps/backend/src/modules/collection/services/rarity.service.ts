import { Injectable } from '@nestjs/common';

@Injectable()
export class RarityService {
  /**
   * Normalize pageviews to 0-100 scale using logarithmic scale
   * Thresholds: 0 → 0, 1k → ~25, 10k → ~50, 100k → ~75, 1M+ → ~95
   */
  calculatePageviewsScore(pageviews: number): number {
    if (pageviews <= 0) return 0;

    // Log scale: score = 25 * log10(pageviews / 100)
    // 100 → 0, 1k → 25, 10k → 50, 100k → 75, 1M → 100
    const score = 25 * Math.log10(pageviews / 100);

    // Clamp to [0, 100]
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normalize wiki text length to 0-100 scale using linear scale
   * Thresholds: 0 → 0, 1k → ~20, 5k → ~40, 20k → ~60, 50k+ → ~90
   */
  calculateWikiLengthScore(length: number): number {
    if (length <= 0) return 0;

    // Linear scale with diminishing returns
    // 0-1k: 0-20 (20 points per 1k)
    // 1k-5k: 20-40 (5 points per 1k)
    // 5k-20k: 40-60 (1.33 points per 1k)
    // 20k-50k: 60-90 (1 point per 1k)
    // 50k+: 90-100 (0.2 points per 1k)

    let score = 0;
    if (length <= 1000) {
      score = (length / 1000) * 20;
    } else if (length <= 5000) {
      score = 20 + ((length - 1000) / 4000) * 20;
    } else if (length <= 20000) {
      score = 40 + ((length - 5000) / 15000) * 20;
    } else if (length <= 50000) {
      score = 60 + ((length - 20000) / 30000) * 30;
    } else {
      score = 90 + Math.min(10, (length - 50000) / 50000 * 10);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate composite rarity score: 40% popularity + 60% depth
   * Returns value in [0, 100]
   */
  calculateRarityScore(pageviews: number, wikiLength: number): number {
    const pageviewsScore = this.calculatePageviewsScore(pageviews);
    const wikiLengthScore = this.calculateWikiLengthScore(wikiLength);

    return 0.4 * pageviewsScore + 0.6 * wikiLengthScore;
  }

  /**
   * Map rarity score [0-100] to tier
   */
  scoreToRarity(score: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (score >= 90) return 'legendary';
    if (score >= 70) return 'epic';
    if (score >= 50) return 'rare';
    if (score >= 30) return 'uncommon';
    return 'common';
  }
}

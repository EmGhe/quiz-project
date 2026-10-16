import { Test, TestingModule } from '@nestjs/testing';
import { RarityService } from './rarity.service';

describe('RarityService', () => {
  let service: RarityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RarityService],
    }).compile();

    service = module.get<RarityService>(RarityService);
  });

  describe('calculatePageviewsScore', () => {
    it('should return 0 for 0 pageviews', () => {
      expect(service.calculatePageviewsScore(0)).toBe(0);
    });

    it('should return ~25 for 1k pageviews', () => {
      const score = service.calculatePageviewsScore(1000);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should return ~50 for 10k pageviews', () => {
      const score = service.calculatePageviewsScore(10000);
      expect(score).toBeGreaterThanOrEqual(45);
      expect(score).toBeLessThanOrEqual(55);
    });

    it('should return ~75 for 100k pageviews', () => {
      const score = service.calculatePageviewsScore(100000);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(80);
    });

    it('should return ~95 for 1M+ pageviews', () => {
      const score = service.calculatePageviewsScore(1000000);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateWikiLengthScore', () => {
    it('should return 0 for 0 length', () => {
      expect(service.calculateWikiLengthScore(0)).toBe(0);
    });

    it('should return ~20 for 1k chars', () => {
      const score = service.calculateWikiLengthScore(1000);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should return ~40 for 5k chars', () => {
      const score = service.calculateWikiLengthScore(5000);
      expect(score).toBeGreaterThanOrEqual(35);
      expect(score).toBeLessThanOrEqual(45);
    });

    it('should return ~60 for 20k chars', () => {
      const score = service.calculateWikiLengthScore(20000);
      expect(score).toBeGreaterThanOrEqual(55);
      expect(score).toBeLessThanOrEqual(65);
    });

    it('should return ~90 for 50k+ chars', () => {
      const score = service.calculateWikiLengthScore(50000);
      expect(score).toBeGreaterThanOrEqual(85);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRarityScore', () => {
    it('should calculate 40% pageviews + 60% wikiLength', () => {
      // pageviews 1M → ~95, wikiLength 50k → ~90
      // Expected: 0.4 * 95 + 0.6 * 90 = 38 + 54 = 92
      const score = service.calculateRarityScore(1000000, 50000);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(95);
    });

    it('should handle 0 pageviews gracefully', () => {
      const score = service.calculateRarityScore(0, 5000);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should handle 0 wiki length gracefully', () => {
      const score = service.calculateRarityScore(10000, 0);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should handle both 0 gracefully', () => {
      const score = service.calculateRarityScore(0, 0);
      expect(score).toBe(0);
    });
  });

  describe('scoreToRarity', () => {
    it('should map 0-29 to common', () => {
      expect(service.scoreToRarity(0)).toBe('common');
      expect(service.scoreToRarity(15)).toBe('common');
      expect(service.scoreToRarity(29)).toBe('common');
    });

    it('should map 30-49 to uncommon', () => {
      expect(service.scoreToRarity(30)).toBe('uncommon');
      expect(service.scoreToRarity(40)).toBe('uncommon');
      expect(service.scoreToRarity(49)).toBe('uncommon');
    });

    it('should map 50-69 to rare', () => {
      expect(service.scoreToRarity(50)).toBe('rare');
      expect(service.scoreToRarity(60)).toBe('rare');
      expect(service.scoreToRarity(69)).toBe('rare');
    });

    it('should map 70-89 to epic', () => {
      expect(service.scoreToRarity(70)).toBe('epic');
      expect(service.scoreToRarity(80)).toBe('epic');
      expect(service.scoreToRarity(89)).toBe('epic');
    });

    it('should map 90-100 to legendary', () => {
      expect(service.scoreToRarity(90)).toBe('legendary');
      expect(service.scoreToRarity(95)).toBe('legendary');
      expect(service.scoreToRarity(100)).toBe('legendary');
    });
  });
});

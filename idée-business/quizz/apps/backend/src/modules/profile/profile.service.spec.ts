import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProfileService - calculateDailyStats', () => {
  let service: ProfileService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProfileService, PrismaService],
    }).compile();

    service = module.get(ProfileService);
    prisma = module.get(PrismaService);
  });

  it('should calculate daily stats from UserStreak and submissions', async () => {
    const userId = 'test-user-1';

    // Mock UserStreak
    jest.spyOn(prisma.userStreak, 'findUnique').mockResolvedValue({
      id: '1',
      userId,
      currentStreak: 7,
      longestStreak: 15,
      lastDailyDate: '2026-10-26',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock DailySubmission count and average
    jest.spyOn(prisma.dailySubmission, 'count').mockResolvedValue(32);
    jest.spyOn(prisma.dailySubmission, 'aggregate').mockResolvedValue({
      _count: null,
      _avg: { correctCount: 8.5 },
      _sum: null,
      _min: null,
      _max: null,
    } as any);

    // Mock GoldTransaction sum
    jest.spyOn(prisma.goldTransaction, 'aggregate').mockResolvedValue({
      _count: null,
      _avg: null,
      _sum: { amount: 1450 },
      _min: null,
      _max: null,
    } as any);

    const stats = await service['calculateDailyStats'](userId);

    expect(stats).toEqual({
      currentStreak: 7,
      longestStreak: 15,
      totalDailyCompleted: 32,
      averageSuccessRate: 85,
      totalGoldEarned: 1450,
    });
  });
});

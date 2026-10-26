import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyStats, PvPStats, CollectionStats, ShowcaseCard } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  private async calculateDailyStats(userId: string): Promise<DailyStats> {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    const totalCompleted = await this.prisma.dailySubmission.count({
      where: { userId },
    });

    const avgCorrect = await this.prisma.dailySubmission.aggregate({
      where: { userId },
      _avg: { correctCount: true },
    });

    const goldSum = await this.prisma.goldTransaction.aggregate({
      where: { userId, reason: 'daily_completion' },
      _sum: { amount: true },
    });

    return {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      totalDailyCompleted: totalCompleted,
      averageSuccessRate: avgCorrect._avg.correctCount
        ? Math.round((avgCorrect._avg.correctCount / 10) * 100)
        : 0,
      totalGoldEarned: goldSum._sum.amount || 0,
    };
  }

  private async calculatePvPStats(userId: string): Promise<PvPStats> {
    const elo = await this.prisma.userElo.findUnique({
      where: { userId },
    });

    if (!elo) {
      return {
        currentRank: 'Bronze',
        currentDivision: 3,
        currentElo: 1200,
        totalVictories: 0,
        totalDefeats: 0,
        winrate: 0,
        currentWinStreak: 0,
      };
    }

    const winrate = elo.totalMatches > 0
      ? Math.round((elo.wins / elo.totalMatches) * 100)
      : 0;

    return {
      currentRank: elo.rank,
      currentDivision: elo.division,
      currentElo: elo.elo,
      totalVictories: elo.wins,
      totalDefeats: elo.losses,
      winrate,
      currentWinStreak: elo.winStreak,
    };
  }

  private async calculateCollectionStats(userId: string): Promise<CollectionStats> {
    const totalCards = await this.prisma.userCard.count({
      where: { userId },
    });

    const byRarity = await this.prisma.userCard.groupBy({
      by: ['rarity'],
      where: { userId },
      _count: { rarity: true },
    });

    const favoriteCount = await this.prisma.userCard.count({
      where: { userId, isFavorite: true },
    });

    const rarityMap = byRarity.reduce((acc, item) => {
      acc[item.rarity] = item._count.rarity;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCards,
      commonCount: rarityMap['common'] || 0,
      rareCount: rarityMap['rare'] || 0,
      epicCount: rarityMap['epic'] || 0,
      legendaryCount: rarityMap['legendary'] || 0,
      favoriteCount,
    };
  }

  private async getShowcaseCards(userId: string): Promise<ShowcaseCard[]> {
    const userCards = await this.prisma.userCard.findMany({
      where: { userId, isFavorite: true },
      orderBy: { obtainedAt: 'desc' },
      take: 10,
      include: {
        card: {
          include: {
            entity: true,
          },
        },
      },
    });

    return userCards.map(uc => ({
      id: uc.card.id,
      imageUrl: uc.card.imageUrl,
      rarity: uc.rarity,
      entityLabel: uc.card.entity.label,
    }));
  }
}

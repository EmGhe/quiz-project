import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum GoldTransactionReason {
  // Daily
  DAILY_COMPLETION = 'daily_completion', // Score exact du Daily
  DAILY_PERFECT_STREAK = 'daily_perfect_streak', // Bonus pour streak parfait

  // PvP
  PVP_VICTORY = 'pvp_victory',
  PVP_DEFEAT = 'pvp_defeat',

  // Collection
  ALBUM_COMPLETION = 'album_completion',
  PACK_PURCHASE = 'pack_purchase',

  // Système
  ADMIN_GRANT = 'admin_grant',
  ADMIN_REMOVE = 'admin_remove',
}

export interface GoldTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  metadata?: any;
  createdAt: Date;
}

@Injectable()
export class GoldService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajoute du Gold à un utilisateur
   * Utilise une transaction atomique pour éviter les race conditions
   */
  async addGold(
    userId: string,
    amount: number,
    reason: GoldTransactionReason,
    metadata?: any
  ): Promise<{ newBalance: number; transaction: GoldTransaction }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Mettre à jour le solde
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gold: {
            increment: amount,
          },
        },
        select: { gold: true },
      });

      // Créer la transaction
      const transaction = await tx.goldTransaction.create({
        data: {
          userId,
          amount,
          reason,
          metadata,
        },
      });

      return {
        newBalance: user.gold,
        transaction,
      };
    });
  }

  /**
   * Retire du Gold à un utilisateur
   * Vérifie que l'utilisateur a assez de Gold
   */
  async removeGold(
    userId: string,
    amount: number,
    reason: GoldTransactionReason,
    metadata?: any
  ): Promise<{ newBalance: number; transaction: GoldTransaction }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Vérifier le solde actuel
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { gold: true },
      });

      if (!currentUser) {
        throw new BadRequestException('User not found');
      }

      if (currentUser.gold < amount) {
        throw new BadRequestException(
          `Insufficient gold. Current: ${currentUser.gold}, Required: ${amount}`
        );
      }

      // Mettre à jour le solde
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gold: {
            decrement: amount,
          },
        },
        select: { gold: true },
      });

      // Créer la transaction (montant négatif)
      const transaction = await tx.goldTransaction.create({
        data: {
          userId,
          amount: -amount,
          reason,
          metadata,
        },
      });

      return {
        newBalance: user.gold,
        transaction,
      };
    });
  }

  /**
   * Récompense Gold pour complétion du Daily
   * Montant = Score exact du Daily
   *
   * Calcul du score (rappel):
   * - Bonne réponse : +200 points
   * - Bonus temps : de 0 à 200 points selon vitesse
   * - Question skippée : temps = 25s (temps max) → bonus temps = 0
   *
   * Exemple:
   * - 10 questions, toutes correctes, temps moyen 5s → score ≈ 3500 → +3500 Gold
   * - 7 bonnes, 3 skips, temps moyen 10s → score ≈ 1900 → +1900 Gold
   */
  async rewardDailyCompletion(
    userId: string,
    dailyScore: number,
    metadata?: {
      dailyId?: string;
      questionsCorrect?: number;
      totalQuestions?: number;
      averageTime?: number;
    }
  ): Promise<{ goldAwarded: number; newBalance: number }> {
    // Le montant de Gold = score exact
    const goldAmount = Math.round(dailyScore);

    const result = await this.addGold(
      userId,
      goldAmount,
      GoldTransactionReason.DAILY_COMPLETION,
      {
        ...metadata,
        scoreEarned: dailyScore,
      }
    );

    return {
      goldAwarded: goldAmount,
      newBalance: result.newBalance,
    };
  }

  /**
   * Bonus Gold pour streak (one-time rewards)
   * Paliers : 5, 10, 20, 30, 50, 75, 100 jours
   */
  async rewardStreakMilestone(
    userId: string,
    streakLevel: number
  ): Promise<{ goldAwarded: number }> {
    // Bonus selon palier
    let bonusAmount = 0;

    if (streakLevel === 5) bonusAmount = 10;
    else if (streakLevel === 10) bonusAmount = 25;
    else if (streakLevel === 20) bonusAmount = 60;
    else if (streakLevel === 30) bonusAmount = 100;
    else if (streakLevel === 50) bonusAmount = 200;
    else if (streakLevel === 75) bonusAmount = 350;
    else if (streakLevel === 100) bonusAmount = 500;

    if (bonusAmount === 0) {
      throw new BadRequestException(`Invalid streak level: ${streakLevel}`);
    }

    await this.addGold(userId, bonusAmount, GoldTransactionReason.DAILY_PERFECT_STREAK, {
      streakLevel,
    });

    return { goldAwarded: bonusAmount };
  }

  /**
   * Récompense Gold pour victoire PvP
   */
  async rewardPvPVictory(
    userId: string,
    eloGained: number,
    metadata?: any
  ): Promise<{ goldAwarded: number }> {
    // Montant basé sur ELO gagné (min 20, max 100)
    const goldAmount = Math.min(100, Math.max(20, Math.round(eloGained * 1.5)));

    await this.addGold(userId, goldAmount, GoldTransactionReason.PVP_VICTORY, {
      eloGained,
      ...metadata,
    });

    return { goldAwarded: goldAmount };
  }

  /**
   * Récompense Gold pour défaite PvP (participation)
   */
  async rewardPvPDefeat(userId: string, metadata?: any): Promise<{ goldAwarded: number }> {
    const goldAmount = 10; // Petit montant pour encourager participation

    await this.addGold(userId, goldAmount, GoldTransactionReason.PVP_DEFEAT, metadata);

    return { goldAwarded: goldAmount };
  }

  /**
   * Récupère le solde Gold d'un utilisateur
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gold: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.gold;
  }

  /**
   * Récupère l'historique des transactions Gold
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<GoldTransaction[]> {
    const transactions = await this.prisma.goldTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  }

  /**
   * Récupère les statistiques Gold d'un utilisateur
   */
  async getGoldStats(userId: string) {
    const transactions = await this.prisma.goldTransaction.findMany({
      where: { userId },
    });

    const earned = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const spent = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const earnedByReason = transactions
      .filter((t) => t.amount > 0)
      .reduce((acc, t) => {
        acc[t.reason] = (acc[t.reason] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      currentBalance: await this.getBalance(userId),
      totalEarned: earned,
      totalSpent: spent,
      earnedByReason,
      transactionCount: transactions.length,
    };
  }
}

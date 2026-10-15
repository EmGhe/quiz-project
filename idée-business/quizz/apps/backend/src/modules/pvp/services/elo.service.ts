import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface EloUpdateResult {
  winner: {
    oldElo: number;
    newElo: number;
    change: number;
  };
  loser: {
    oldElo: number;
    newElo: number;
    change: number;
  };
}

export interface RankInfo {
  rank: string;
  division: number;
}

@Injectable()
export class EloService {
  private readonly K_FACTOR = 32; // Standard K-factor for ELO

  private readonly RANK_THRESHOLDS: Record<string, number> = {
    Bronze: 0,
    Silver: 1000,
    Gold: 1200,
    Platinum: 1400,
    Diamond: 1600,
    Master: 1800,
    Grandmaster: 2000,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate ELO change based on rating difference
   * Formula: ΔElo = K * (Actual - Expected)
   * Expected = 1 / (1 + 10^((OpponentElo - PlayerElo) / 400))
   */
  calculateEloChange(
    winnerElo: number,
    loserElo: number,
  ): { winnerChange: number; loserChange: number } {
    // Expected scores
    const expectedWinner =
      1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 - expectedWinner;

    // Winner gets 1 (won), Loser gets 0 (lost)
    const winnerChange = Math.round(this.K_FACTOR * (1 - expectedWinner));
    const loserChange = Math.round(this.K_FACTOR * (0 - expectedLoser));

    return { winnerChange, loserChange };
  }

  /**
   * Calculate rank and division from ELO
   * Division 3 = lowest, Division 1 = highest within rank
   */
  calculateRank(elo: number): RankInfo {
    let rank = 'Bronze';
    let division = 3;

    // Find rank
    const ranks = Object.keys(this.RANK_THRESHOLDS).reverse();
    for (const r of ranks) {
      if (elo >= this.RANK_THRESHOLDS[r]) {
        rank = r;
        break;
      }
    }

    // Calculate division within rank
    if (rank !== 'Grandmaster') {
      const rankIndex = Object.keys(this.RANK_THRESHOLDS).indexOf(rank);
      const nextRank = Object.keys(this.RANK_THRESHOLDS)[rankIndex + 1];
      const currentThreshold = this.RANK_THRESHOLDS[rank];
      const nextThreshold = nextRank
        ? this.RANK_THRESHOLDS[nextRank]
        : Infinity;

      const rangeSize = nextThreshold - currentThreshold;
      const progress = elo - currentThreshold;
      const divisionProgress = progress / rangeSize;

      if (divisionProgress < 0.33) {
        division = 3;
      } else if (divisionProgress < 0.67) {
        division = 2;
      } else {
        division = 1;
      }
    } else {
      division = 1; // Grandmaster has no divisions
    }

    return { rank, division };
  }

  /**
   * Update ELO for both players atomically
   * Uses transaction to prevent race conditions
   */
  async updateElo(
    winnerId: string,
    loserId: string,
    matchId: string,
  ): Promise<EloUpdateResult> {
    return await this.prisma.$transaction(async (tx) => {
      // Lock rows for update
      const [winnerEloRecord, loserEloRecord] = await Promise.all([
        tx.userElo.findUnique({
          where: { userId: winnerId },
          // Note: Prisma doesn't support SELECT FOR UPDATE directly
          // but transaction provides isolation
        }),
        tx.userElo.findUnique({
          where: { userId: loserId },
        }),
      ]);

      if (!winnerEloRecord || !loserEloRecord) {
        throw new Error('ELO records not found');
      }

      const oldWinnerElo = winnerEloRecord.elo;
      const oldLoserElo = loserEloRecord.elo;

      // Calculate changes
      const { winnerChange, loserChange } = this.calculateEloChange(
        oldWinnerElo,
        oldLoserElo,
      );

      const newWinnerElo = oldWinnerElo + winnerChange;
      const newLoserElo = Math.max(0, oldLoserElo + loserChange); // ELO cannot go below 0

      // Calculate new ranks
      const winnerRank = this.calculateRank(newWinnerElo);
      const loserRank = this.calculateRank(newLoserElo);

      // Update winner
      const updatedWinner = await tx.userElo.update({
        where: { userId: winnerId },
        data: {
          elo: newWinnerElo,
          rank: winnerRank.rank,
          division: winnerRank.division,
          wins: { increment: 1 },
          totalMatches: { increment: 1 },
          winStreak: { increment: 1 },
          highestElo: Math.max(winnerEloRecord.highestElo, newWinnerElo),
          placementMatches:
            winnerEloRecord.placementMatches < 5
              ? { increment: 1 }
              : winnerEloRecord.placementMatches,
        },
      });

      // Update loser
      const updatedLoser = await tx.userElo.update({
        where: { userId: loserId },
        data: {
          elo: newLoserElo,
          rank: loserRank.rank,
          division: loserRank.division,
          losses: { increment: 1 },
          totalMatches: { increment: 1 },
          winStreak: 0, // Break streak
          placementMatches:
            loserEloRecord.placementMatches < 5
              ? { increment: 1 }
              : loserEloRecord.placementMatches,
        },
      });

      // Create ELO history records
      await Promise.all([
        tx.eloHistory.create({
          data: {
            userEloId: updatedWinner.id,
            matchId,
            oldElo: oldWinnerElo,
            newElo: newWinnerElo,
            change: winnerChange,
          },
        }),
        tx.eloHistory.create({
          data: {
            userEloId: updatedLoser.id,
            matchId,
            oldElo: oldLoserElo,
            newElo: newLoserElo,
            change: loserChange,
          },
        }),
      ]);

      return {
        winner: {
          oldElo: oldWinnerElo,
          newElo: newWinnerElo,
          change: winnerChange,
        },
        loser: {
          oldElo: oldLoserElo,
          newElo: newLoserElo,
          change: loserChange,
        },
      };
    });
  }

  /**
   * Initialize ELO for a new user
   */
  async initializeElo(userId: string, seasonId?: string): Promise<void> {
    const existing = await this.prisma.userElo.findUnique({
      where: { userId },
    });

    if (existing) {
      return; // Already initialized
    }

    await this.prisma.userElo.create({
      data: {
        userId,
        seasonId,
        elo: 1200, // Starting ELO
        rank: 'Bronze',
        division: 3,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PvpGateway } from '../gateways/pvp.gateway';
import { EloService } from './elo.service';

@Injectable()
export class MatchService {
  private readonly BAN_TIMEOUT = 10000; // 10 seconds per player
  private banTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private pvpGateway: PvpGateway,
    private eloService: EloService,
  ) {}

  /**
   * Start category ban phase
   */
  async startCategoryBanPhase(matchId: string): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'category_ban') {
      return;
    }

    // Player 1 bans first
    this.pvpGateway.sendToMatch(matchId, 'ban:turn', {
      playerId: match.player1Id,
      timeLimit: this.BAN_TIMEOUT,
    });

    // Set timeout for player 1
    const timer = setTimeout(() => {
      this.handleBanTimeout(matchId, match.player1Id, 1);
    }, this.BAN_TIMEOUT);

    this.banTimers.set(`${matchId}:1`, timer);
  }

  /**
   * Handle category ban from player
   */
  async submitCategoryBan(
    matchId: string,
    playerId: string,
    categoryId: string,
  ): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'category_ban') {
      return;
    }

    const isPlayer1 = match.player1Id === playerId;
    const isPlayer2 = match.player2Id === playerId;

    if (!isPlayer1 && !isPlayer2) {
      return; // Not a player in this match
    }

    // Update match with banned category
    if (isPlayer1 && match.player1BannedCat.length === 0) {
      await this.prisma.pvpMatch.update({
        where: { id: matchId },
        data: {
          player1BannedCat: [categoryId],
        },
      });

      // Clear timer
      const timer = this.banTimers.get(`${matchId}:1`);
      if (timer) clearTimeout(timer);

      // Player 2's turn
      this.pvpGateway.sendToMatch(matchId, 'ban:turn', {
        playerId: match.player2Id,
        timeLimit: this.BAN_TIMEOUT,
      });

      const timer2 = setTimeout(() => {
        this.handleBanTimeout(matchId, match.player2Id, 2);
      }, this.BAN_TIMEOUT);

      this.banTimers.set(`${matchId}:2`, timer2);
    } else if (isPlayer2 && match.player2BannedCat.length === 0) {
      await this.prisma.pvpMatch.update({
        where: { id: matchId },
        data: {
          player2BannedCat: [categoryId],
        },
      });

      // Clear timer
      const timer = this.banTimers.get(`${matchId}:2`);
      if (timer) clearTimeout(timer);

      // Start match
      await this.startMatch(matchId);
    }
  }

  /**
   * Handle ban timeout (auto-skip)
   */
  private async handleBanTimeout(
    matchId: string,
    playerId: string,
    playerNum: number,
  ) {
    // Auto-ban a random category
    const categories = await this.prisma.category.findMany({
      take: 10,
    });

    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    await this.submitCategoryBan(matchId, playerId, randomCategory.id);
  }

  /**
   * Start the match (after bans)
   */
  private async startMatch(matchId: string): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) return;

    // Get 10 questions excluding banned categories
    const bannedCategories = [
      ...match.player1BannedCat,
      ...match.player2BannedCat,
    ];

    const questions = await this.prisma.question.findMany({
      where: {
        status: 'publie',
        enabledForMcq: true,
        categoryId: {
          notIn: bannedCategories,
        },
      },
      take: 10,
      orderBy: {
        // Random selection (simple approach)
        createdAt: 'desc',
      },
    });

    if (questions.length < 10) {
      // Not enough questions, cancel match
      await this.cancelMatch(matchId, 'Not enough questions');
      return;
    }

    // Update match
    await this.prisma.pvpMatch.update({
      where: { id: matchId },
      data: {
        status: 'in_progress',
        questionIds: questions.map((q) => q.id),
        startedAt: new Date(),
      },
    });

    // Send questions to players
    this.pvpGateway.sendToMatch(matchId, 'match:start', {
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        mediaUrl: q.mediaUrl,
        // MCQ: include distractors (to be fetched separately)
      })),
    });
  }

  /**
   * Submit answer
   */
  async submitAnswer(
    matchId: string,
    playerId: string,
    questionId: string,
    answer: string,
    timeMs: number,
  ): Promise<void> {
    // Validate answer (check against acceptedAnswers or distractors)
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        acceptedAnswers: true,
        distractors: true,
      },
    });

    if (!question) return;

    const isCorrect = question.acceptedAnswers.some(
      (a) => a.answer.toLowerCase() === answer.toLowerCase(),
    );

    // Update player score (implementation depends on scoring logic)
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) return;

    const isPlayer1 = match.player1Id === playerId;

    if (isCorrect) {
      const points = this.calculatePoints(timeMs);

      if (isPlayer1) {
        await this.prisma.pvpMatch.update({
          where: { id: matchId },
          data: {
            player1Score: { increment: points },
            player1Time: { increment: timeMs },
          },
        });
      } else {
        await this.prisma.pvpMatch.update({
          where: { id: matchId },
          data: {
            player2Score: { increment: points },
            player2Time: { increment: timeMs },
          },
        });
      }
    }

    // Notify match of progress
    this.pvpGateway.sendToMatch(matchId, 'match:progress', {
      playerId,
      questionId,
      isCorrect,
    });

    // Check if match complete (both players answered all 10)
    // (Implementation needed: track answered questions per player)
  }

  /**
   * Calculate points based on time (faster = more points)
   */
  private calculatePoints(timeMs: number): number {
    const basePoints = 100;
    const maxTime = 30000; // 30 seconds
    const timeBonus = Math.max(0, maxTime - timeMs) / maxTime;
    return Math.round(basePoints * (1 + timeBonus));
  }

  /**
   * Complete match and update ELO
   */
  async completeMatch(matchId: string): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'in_progress') {
      return;
    }

    // Determine winner
    let winnerId: string;
    let loserId: string;

    if (match.player1Score > match.player2Score) {
      winnerId = match.player1Id;
      loserId = match.player2Id;
    } else if (match.player2Score > match.player1Score) {
      winnerId = match.player2Id;
      loserId = match.player1Id;
    } else {
      // Tie: faster player wins
      if (match.player1Time < match.player2Time) {
        winnerId = match.player1Id;
        loserId = match.player2Id;
      } else {
        winnerId = match.player2Id;
        loserId = match.player1Id;
      }
    }

    // Update ELO
    const eloUpdate = await this.eloService.updateElo(
      winnerId,
      loserId,
      matchId,
    );

    // Update match
    await this.prisma.pvpMatch.update({
      where: { id: matchId },
      data: {
        status: 'completed',
        winnerId,
        player1EloChange:
          winnerId === match.player1Id
            ? eloUpdate.winner.change
            : eloUpdate.loser.change,
        player2EloChange:
          winnerId === match.player2Id
            ? eloUpdate.winner.change
            : eloUpdate.loser.change,
        completedAt: new Date(),
      },
    });

    // Send results
    this.pvpGateway.sendToMatch(matchId, 'match:complete', {
      winnerId,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      player1Time: match.player1Time,
      player2Time: match.player2Time,
      eloChanges: {
        [match.player1Id]:
          winnerId === match.player1Id
            ? eloUpdate.winner.change
            : eloUpdate.loser.change,
        [match.player2Id]:
          winnerId === match.player2Id
            ? eloUpdate.winner.change
            : eloUpdate.loser.change,
      },
    });

    // Clean up rooms
    this.pvpGateway.leaveMatchRoom(match.player1Id, matchId);
    this.pvpGateway.leaveMatchRoom(match.player2Id, matchId);
  }

  /**
   * Cancel match
   */
  private async cancelMatch(matchId: string, reason: string): Promise<void> {
    await this.prisma.pvpMatch.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
      },
    });

    this.pvpGateway.sendToMatch(matchId, 'match:cancelled', { reason });
  }
}

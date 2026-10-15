import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PvpGateway } from '../gateways/pvp.gateway';
import { EloService } from './elo.service';

@Injectable()
export class MatchService {
  constructor(
    private prisma: PrismaService,
    private pvpGateway: PvpGateway,
    private eloService: EloService,
  ) {}

  /**
   * Start the match - selects questions and notifies players
   * Note: Category ban phase removed (stand by for future implementation)
   */
  async startMatch(matchId: string): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) return;

    // Get 10 random questions (no ban filtering for now)
    const questions = await this.prisma.question.findMany({
      where: {
        status: 'publie',
        enabledForMcq: true,
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

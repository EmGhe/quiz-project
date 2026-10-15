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
    try {
      console.log(`[Match] Starting match ${matchId}...`);

      const match = await this.prisma.pvpMatch.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        console.error(`[Match] Match ${matchId} not found`);
        return;
      }

      console.log(`[Match] Fetching questions...`);

      // Get 10 random questions with varied categories
      // Using raw SQL for true random selection across categories
      const questionIds = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT id
        FROM questions
        WHERE status = 'publie'
          AND "enabledForMcq" = true
        ORDER BY RANDOM()
        LIMIT 10
      `;

      const questions = await this.prisma.question.findMany({
        where: {
          id: { in: questionIds.map((q) => q.id) },
        },
        include: {
          acceptedAnswers: true,
          distractors: {
            orderBy: { order: 'asc' },
          },
        },
      });

      console.log(`[Match] Found ${questions.length} questions`);

      if (questions.length < 10) {
        // Not enough questions, cancel match
        console.error(`[Match] Not enough questions: ${questions.length}/10`);
        await this.cancelMatch(matchId, 'Not enough questions');
        return;
      }

      // Validate that all questions have distractors
      const invalidQuestions = questions.filter((q) => q.distractors.length < 4);
      if (invalidQuestions.length > 0) {
        console.error(
          `[Match] Invalid questions without enough distractors: ${invalidQuestions.map((q) => q.id).join(', ')}`,
        );
        await this.cancelMatch(matchId, 'Invalid questions');
        return;
      }

      console.log(`[Match] All questions valid, preparing choices...`);

      console.log(`[Match] Updating match status to in_progress...`);

      // Update match
      await this.prisma.pvpMatch.update({
        where: { id: matchId },
        data: {
          status: 'in_progress',
          questionIds: questions.map((q) => q.id),
          startedAt: new Date(),
        },
      });

      console.log(`[Match] Preparing questions with shuffled choices...`);

      // Prepare questions with shuffled choices
      const questionsWithChoices = questions.map((q) => {
      const correctAnswer = q.acceptedAnswers.find((a) => a.isPrimary)?.answer || q.acceptedAnswers[0]?.answer;

      if (!correctAnswer) {
        throw new Error(`Question ${q.id} has no accepted answer`);
      }

      const distractorTexts = q.distractors.map((d) => d.distractorText);
      const allChoices = [correctAnswer, ...distractorTexts];

      // Shuffle choices
      const shuffledChoices = this.shuffleArray([...allChoices]);

        return {
          id: q.id,
          text: q.text,
          questionType: q.questionType,
          mediaUrl: q.mediaUrl,
          choices: shuffledChoices,
          correctAnswer, // Stored server-side for validation, not sent to client
        };
      });

      console.log(`[Match] Questions prepared (${questionsWithChoices.length}), storing metadata...`);

      // Store questions data for later validation
      await this.prisma.pvpMatch.update({
        where: { id: matchId },
        data: {
          // Store as JSON for question validation
          metadata: {
            questions: questionsWithChoices,
          } as any,
        },
      });

      console.log(`[Match] Metadata stored successfully`);

      console.log(`[Match] Sending questions to players...`);

      // Send questions to players (without correctAnswer)
      this.pvpGateway.sendToMatch(matchId, 'match:start', {
        questions: questionsWithChoices.map(({ correctAnswer, ...rest }) => rest),
      });

      console.log(`[Match] Questions sent, starting first question timer in 3 seconds...`);

      // Start first question timer (wait 3s for players to navigate and mount components)
      setTimeout(() => this.startQuestionTimer(matchId, 0), 3000);

      console.log(`[Match] Match ${matchId} started successfully`);
    } catch (error) {
      console.error(`[Match] Error starting match ${matchId}:`, error);
      await this.cancelMatch(matchId, 'Server error');
    }
  }

  /**
   * Start timer for a specific question
   */
  private async startQuestionTimer(matchId: string, questionIndex: number): Promise<void> {
    console.log(`[Match] Starting question ${questionIndex} timer for match ${matchId}`);

    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'in_progress') {
      console.log(`[Match] Match ${matchId} not found or not in progress, skipping question timer`);
      return;
    }

    // Notify players that question started
    this.pvpGateway.sendToMatch(matchId, 'match:question_start', {
      questionIndex,
      timerMs: 10000,
    });

    console.log(`[Match] Question ${questionIndex} timer started, will end in 10s`);

    // After 10 seconds, reveal answers and move to next question
    setTimeout(() => this.endQuestionTimer(matchId, questionIndex), 10000);
  }

  /**
   * End timer for a specific question - reveal answers and progress
   */
  private async endQuestionTimer(matchId: string, questionIndex: number): Promise<void> {
    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'in_progress') return;

    const metadata = match.metadata as any;
    const questions = metadata?.questions || [];
    const currentQuestion = questions[questionIndex];

    if (!currentQuestion) return;

    // Get player answers for this question (stored in metadata)
    const playerAnswers = metadata?.playerAnswers || {};
    const player1Answer = playerAnswers[match.player1Id]?.[questionIndex];
    const player2Answer = playerAnswers[match.player2Id]?.[questionIndex];

    console.log('[MatchService] 📋 Retrieved answers from metadata:', {
      questionIndex,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Answer,
      player2Answer,
      allPlayerAnswers: playerAnswers,
    });

    const questionEndData = {
      questionIndex,
      correctAnswer: currentQuestion.correctAnswer,
      player1Answer: player1Answer?.choice || null,
      player1Time: player1Answer?.timeMs || null,
      player1Correct: player1Answer?.choice === currentQuestion.correctAnswer,
      player2Answer: player2Answer?.choice || null,
      player2Time: player2Answer?.timeMs || null,
      player2Correct: player2Answer?.choice === currentQuestion.correctAnswer,
    };

    console.log('[MatchService] 📤 Sending question_end event:', questionEndData);

    // Send revelation to both players
    this.pvpGateway.sendToMatch(matchId, 'match:question_end', questionEndData);

    // Move to next question or complete match
    if (questionIndex < 9) {
      // Next question after 3 seconds (revelation time)
      setTimeout(() => this.startQuestionTimer(matchId, questionIndex + 1), 3000);
    } else {
      // Match complete after 3 seconds
      setTimeout(() => this.completeMatch(matchId), 3000);
    }
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Submit answer
   */
  async submitAnswer(
    matchId: string,
    playerId: string,
    questionIndex: number,
    choice: string,
    timeMs: number,
  ): Promise<void> {
    console.log('[MatchService] 📥 submitAnswer called:', {
      matchId,
      playerId,
      questionIndex,
      choice,
      timeMs,
    });

    // Validate time (must be <= 10 seconds)
    if (timeMs > 10000) {
      console.warn(`[MatchService] ⏱️ Player ${playerId} submitted answer after timeout: ${timeMs}ms`);
      return;
    }

    const match = await this.prisma.pvpMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      console.error('[MatchService] ❌ Match not found:', matchId);
      return;
    }

    if (match.status !== 'in_progress') {
      console.error('[MatchService] ❌ Match not in_progress:', match.status);
      return;
    }

    const metadata = (match.metadata as any) || {};
    const questions = metadata.questions || [];
    const currentQuestion = questions[questionIndex];

    if (!currentQuestion) {
      console.error(`[MatchService] ❌ Question ${questionIndex} not found in match ${matchId}`);
      return;
    }

    console.log('[MatchService] ✅ Question found:', {
      questionIndex,
      correctAnswer: currentQuestion.correctAnswer,
      playerChoice: choice,
      isCorrect: choice === currentQuestion.correctAnswer,
    });

    // Store player answer in metadata
    if (!metadata.playerAnswers) {
      metadata.playerAnswers = {};
    }
    if (!metadata.playerAnswers[playerId]) {
      metadata.playerAnswers[playerId] = {};
    }

    metadata.playerAnswers[playerId][questionIndex] = {
      choice,
      timeMs,
      timestamp: new Date().toISOString(),
    };

    console.log('[MatchService] 💾 Answer stored in metadata:', {
      playerId,
      questionIndex,
      choice,
      timeMs,
    });

    // Check if answer is correct
    const isCorrect = choice === currentQuestion.correctAnswer;

    // Calculate points if correct
    let points = 0;
    if (isCorrect) {
      points = this.calculatePoints(timeMs);
    }

    console.log('[MatchService] 🎯 Answer validation:', {
      isCorrect,
      points,
      timeMs,
    });

    // Update score and time
    const isPlayer1 = match.player1Id === playerId;

    console.log('[MatchService] 📊 Updating DB scores:', {
      isPlayer1,
      scoreIncrement: points,
      timeIncrement: timeMs,
    });

    await this.prisma.pvpMatch.update({
      where: { id: matchId },
      data: {
        metadata: metadata as any,
        ...(isPlayer1
          ? {
              player1Score: { increment: points },
              player1Time: { increment: timeMs },
            }
          : {
              player2Score: { increment: points },
              player2Time: { increment: timeMs },
            }),
      },
    });

    console.log('[MatchService] ✅ DB updated successfully');

    // Notify that player answered (but don't reveal if correct yet)
    this.pvpGateway.sendToMatch(matchId, 'match:player_answered', {
      playerId,
      questionIndex,
    });

    console.log('[MatchService] ✅ Notified match room that player answered');
  }

  /**
   * Calculate points based on time (faster = more points)
   */
  private calculatePoints(timeMs: number): number {
    const basePoints = 100;
    const maxTime = 10000; // 10 seconds
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

    const player1EloChange =
      winnerId === match.player1Id
        ? eloUpdate.winner.change
        : eloUpdate.loser.change;
    const player2EloChange =
      winnerId === match.player2Id
        ? eloUpdate.winner.change
        : eloUpdate.loser.change;

    // Update match
    await this.prisma.pvpMatch.update({
      where: { id: matchId },
      data: {
        status: 'completed',
        winnerId,
        player1EloChange,
        player2EloChange,
        completedAt: new Date(),
      },
    });

    // Send results to both players
    const results = {
      matchId,
      winnerId,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      player1Time: match.player1Time,
      player2Time: match.player2Time,
      eloChanges: {
        [match.player1Id]: player1EloChange,
        [match.player2Id]: player2EloChange,
      },
    };

    this.pvpGateway.sendToMatch(matchId, 'match:complete', results);

    // Clean up rooms
    setTimeout(() => {
      this.pvpGateway.leaveMatchRoom(match.player1Id, matchId);
      this.pvpGateway.leaveMatchRoom(match.player2Id, matchId);
    }, 5000); // Wait 5s before cleanup
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

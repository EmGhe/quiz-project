import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnswerValidatorService } from './answer-validator.service';
import { ReportQuestionDto } from './dto/report-question.dto';
import { GoldService } from '../gold/gold.service';

@Injectable()
export class DailyService {
  constructor(
    private prisma: PrismaService,
    private answerValidator: AnswerValidatorService,
    private goldService: GoldService,
  ) {}

  private getTodayDateUTC(): string {
    return new Date().toISOString().split('T')[0];
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyIfNeeded() {
    const today = this.getTodayDateUTC();
    const existing = await this.prisma.daily.findUnique({
      where: { date: today },
    });

    if (existing) return;

    const lastDaily = await this.prisma.daily.findFirst({
      orderBy: { dailyNumber: 'desc' },
    });

    const dailyNumber = (lastDaily?.dailyNumber || 0) + 1;

    // Get all categories with their published questions
    const categories = await this.prisma.category.findMany({
      where: {
        questions: {
          some: {
            status: 'publie',
            enabledForDaily: true
          }
        }
      },
      include: {
        questions: {
          where: {
            status: 'publie',
            enabledForDaily: true
          },
          select: { id: true }
        }
      }
    });

    const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);

    if (totalQuestions < 10) {
      throw new Error('Not enough published questions for daily');
    }

    // Balanced selection strategy:
    // - Minimum 2 questions per category (if category has ≥20 questions)
    // - Minimum 1 question per category (if category has ≥10 questions)
    // - Rest distributed proportionally
    const TARGET_QUESTIONS = 10;
    const selectedQuestions = [];

    // Calculate distribution
    const distribution = categories.map(cat => {
      const count = cat.questions.length;
      let minQuestions = 0;

      if (count >= 20) minQuestions = 2;
      else if (count >= 10) minQuestions = 1;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalQuestions: count,
        minQuestions,
        allocatedQuestions: minQuestions,
      };
    });

    // Calculate remaining slots after minimum allocation
    const allocatedMin = distribution.reduce((sum, d) => sum + d.minQuestions, 0);

    // If we allocated more than target (too many categories), reduce allocations
    if (allocatedMin > TARGET_QUESTIONS) {
      // Sort by total questions descending (prioritize bigger categories)
      const sorted = distribution.map((d, index) => ({ ...d, originalIndex: index }))
        .sort((a, b) => b.totalQuestions - a.totalQuestions);

      // Reset all allocations
      distribution.forEach(d => d.allocatedQuestions = 0);

      // Allocate 1 question to top categories until we reach target
      for (let i = 0; i < Math.min(TARGET_QUESTIONS, sorted.length); i++) {
        distribution[sorted[i].originalIndex].allocatedQuestions = 1;
      }
    } else {
      const remainingSlots = TARGET_QUESTIONS - allocatedMin;

      // Distribute remaining slots proportionally
      if (remainingSlots > 0) {
        const proportionalDistribution = distribution.map((d, index) => ({
          ...d,
          originalIndex: index,
          proportion: d.totalQuestions / totalQuestions,
        }));

        // Sort by proportion descending
        proportionalDistribution.sort((a, b) => b.proportion - a.proportion);

        // Allocate remaining slots
        for (let i = 0; i < remainingSlots; i++) {
          const idx = i % proportionalDistribution.length;
          proportionalDistribution[idx].allocatedQuestions++;
        }

        // Update distribution using original indexes
        proportionalDistribution.forEach((pd) => {
          distribution[pd.originalIndex].allocatedQuestions = pd.allocatedQuestions;
        });
      }
    }

    // Get recently used questions from last 7 dailies to avoid repetition
    const recentDailies = await this.prisma.daily.findMany({
      take: 7,
      orderBy: { dailyNumber: 'desc' },
      include: {
        questions: {
          select: { questionId: true },
        },
      },
    });

    const recentlyUsedQuestionIds = new Set(
      recentDailies.flatMap(d => d.questions.map(q => q.questionId))
    );

    console.log(`  🚫 Excluding ${recentlyUsedQuestionIds.size} recently used questions (last 7 dailies)`);

    // Select questions from each category
    for (const dist of distribution) {
      if (dist.allocatedQuestions === 0) continue;

      const categoryQuestions = await this.prisma.question.findMany({
        where: {
          categoryId: dist.categoryId,
          status: 'publie',
          enabledForDaily: true,
          // Exclude recently used questions
          id: { notIn: Array.from(recentlyUsedQuestionIds) },
        },
        include: { acceptedAnswers: true },
      });

      // If not enough fresh questions, allow reusing some
      if (categoryQuestions.length < dist.allocatedQuestions) {
        console.log(`  ⚠️  ${dist.categoryName}: Not enough fresh questions (${categoryQuestions.length}/${dist.allocatedQuestions}), allowing some repeats`);

        const allCategoryQuestions = await this.prisma.question.findMany({
          where: {
            categoryId: dist.categoryId,
            status: 'publie',
            enabledForDaily: true,
          },
          include: { acceptedAnswers: true },
        });

        // Shuffle and take allocated amount
        const shuffled = allCategoryQuestions.sort(() => Math.random() - 0.5);
        selectedQuestions.push(...shuffled.slice(0, dist.allocatedQuestions));
      } else {
        // Shuffle and take allocated amount
        const shuffled = categoryQuestions.sort(() => Math.random() - 0.5);
        selectedQuestions.push(...shuffled.slice(0, dist.allocatedQuestions));
      }

      console.log(`  ${dist.categoryName}: ${dist.allocatedQuestions} questions (${categoryQuestions.length} available after exclusion)`);
    }

    // Final shuffle to mix categories
    const shuffled = selectedQuestions.sort(() => Math.random() - 0.5);

    const daily = await this.prisma.daily.create({
      data: {
        dailyNumber,
        date: today,
        questions: {
          create: shuffled.map((q, idx) => ({
            questionId: q.id,
            order: idx + 1,
          })),
        },
      },
    });

    console.log(`✅ Generated Daily #${dailyNumber} for ${today}`);
    return daily;
  }

  async getTodaysDaily(userId: string) {
    const today = this.getTodayDateUTC();

    let daily = await this.prisma.daily.findUnique({
      where: { date: today },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: { acceptedAnswers: true },
            },
          },
        },
      },
    });

    if (!daily) {
      await this.generateDailyIfNeeded();
      daily = await this.prisma.daily.findUnique({
        where: { date: today },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: { acceptedAnswers: true },
              },
            },
          },
        },
      });

      if (!daily) {
        throw new Error('Failed to generate daily');
      }
    }

    // Check if user already submitted
    const submission = await this.prisma.dailySubmission.findUnique({
      where: {
        userId_dailyId: { userId, dailyId: daily.id },
      },
    });

    return {
      dailyNumber: daily.dailyNumber,
      date: daily.date,
      alreadyCompleted: !!submission,
      submission: submission || null,
      questions: daily.questions.map((dq) => ({
        questionId: dq.question.id,
        text: dq.question.text,
        questionType: dq.question.questionType,
        mediaUrl: dq.question.mediaUrl,
        order: dq.order,
        acceptedAnswers: dq.question.acceptedAnswers,
      })),
      serverTimestamp: Date.now(),
    };
  }

  async submitDaily(userId: string, answers: Array<{questionId: string; answer: string; timeMs: number}>) {
    const today = this.getTodayDateUTC();
    const daily = await this.prisma.daily.findUnique({
      where: { date: today },
      include: {
        questions: {
          include: {
            question: {
              include: { acceptedAnswers: true },
            },
          },
        },
      },
    });

    if (!daily) {
      throw new Error('No daily available');
    }

    // Check if already submitted
    const existing = await this.prisma.dailySubmission.findUnique({
      where: {
        userId_dailyId: { userId, dailyId: daily.id },
      },
    });

    if (existing) {
      throw new Error('Daily already completed');
    }

    // Validate and score answers
    const questionMap = new Map(
      daily.questions.map((dq) => [dq.question.id, dq.question])
    );

    let totalScore = 0;
    let correctCount = 0;
    let consecutiveCorrect = 0;
    const answersData = [];

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      // Validate time (max 25 seconds = 25000ms)
      if (ans.timeMs > 25000 || ans.timeMs < 0) {
        throw new Error(`Invalid time for question ${ans.questionId}`);
      }

      // Use advanced answer validation (Levenshtein, normalization, etc.)
      const correct = this.answerValidator.validateAnswer(
        ans.answer,
        question.acceptedAnswers.map((a) => ({
          answer: a.answer,
          levenshteinThreshold: a.levenshteinThreshold,
        }))
      );

      let pointsEarned = 0;

      if (correct) {
        correctCount++;
        consecutiveCorrect++;

        // Base points: 100
        let basePoints = 100;

        // Speed bonus
        if (ans.timeMs <= 3000) basePoints += 100;
        else if (ans.timeMs <= 7000) basePoints += 90;
        else if (ans.timeMs <= 11000) basePoints += 80;
        else if (ans.timeMs <= 15000) basePoints += 70;
        else if (ans.timeMs <= 19000) basePoints += 60;
        else if (ans.timeMs <= 22000) basePoints += 50;
        else basePoints += 40;

        // Multiplier based on streak
        let multiplier = 1.0;
        if (consecutiveCorrect === 2) multiplier = 1.1;
        else if (consecutiveCorrect === 3) multiplier = 1.2;
        else if (consecutiveCorrect === 4) multiplier = 1.3;
        else if (consecutiveCorrect >= 5) multiplier = 1.5;

        pointsEarned = Math.floor(basePoints * multiplier);
        totalScore += pointsEarned;
      } else {
        consecutiveCorrect = 0;
      }

      answersData.push({
        questionId: ans.questionId,
        answer: ans.answer,
        correct,
        timeMs: ans.timeMs,
        pointsEarned,
      });
    }

    const totalTime = answers.reduce((sum, a) => sum + a.timeMs, 0);

    // Create submission
    const submission = await this.prisma.dailySubmission.create({
      data: {
        userId,
        dailyId: daily.id,
        score: totalScore,
        totalTime,
        correctCount,
        answersData,
      },
    });

    // Calculate Gold reward
    // Formula: For each correct answer: 3 Gold + time bonus (0 to 2 Gold)
    // Time bonus = max(0, (25 - timeSeconds) / 25) × 2
    let totalGold = 0;
    for (const ans of answersData) {
      if (ans.correct) {
        const baseGold = 3;
        const timeSeconds = ans.timeMs / 1000;
        const timeBonus = Math.max(0, (25 - timeSeconds) / 25) * 2;
        totalGold += baseGold + timeBonus;
      }
    }

    // Round to nearest integer
    totalGold = Math.round(totalGold);

    // Reward Gold
    await this.goldService.rewardDailyCompletion(userId, totalGold, {
      dailyId: daily.id,
      questionsCorrect: correctCount,
      totalQuestions: answers.length,
    });

    // Update streak
    await this.updateStreak(userId, today);

    return {
      submission,
      dailyNumber: daily.dailyNumber,
      goldAwarded: totalGold,
    };
  }

  private async updateStreak(userId: string, todayDate: string) {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastDailyDate: todayDate,
        },
      });
      // Check for streak milestone (first day = level 1, no bonus)
      return;
    }

    if (streak.lastDailyDate === todayDate) {
      // Already updated today
      return;
    }

    const lastDate = streak.lastDailyDate
      ? new Date(streak.lastDailyDate)
      : null;
    const today = new Date(todayDate);

    let newStreak = 1;

    if (lastDate) {
      const daysDiff = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        newStreak = streak.currentStreak + 1;
      }
    }

    const longestStreak = Math.max(streak.longestStreak, newStreak);

    await this.prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastDailyDate: todayDate,
      },
    });

    // Check for streak milestones (5, 10, 20, 30, 50, 75, 100)
    const milestones = [5, 10, 20, 30, 50, 75, 100];
    for (const milestone of milestones) {
      if (newStreak === milestone) {
        // Check if already rewarded
        const existingReward = await this.prisma.streakReward.findUnique({
          where: {
            userId_streakLevel: {
              userId,
              streakLevel: milestone,
            },
          },
        });

        if (!existingReward) {
          // Reward the streak milestone
          const { goldAwarded } = await this.goldService.rewardStreakMilestone(
            userId,
            milestone
          );

          // Record the reward
          await this.prisma.streakReward.create({
            data: {
              userId,
              streakLevel: milestone,
              rewardGold: goldAwarded,
            },
          });

          console.log(`🎉 User ${userId} reached streak ${milestone}! Rewarded ${goldAwarded} Gold`);
        }
        break; // Only one milestone per day
      }
    }
  }

  async getLeaderboard(dailyId: string, limit: number = 100) {
    const submissions = await this.prisma.dailySubmission.findMany({
      where: { dailyId },
      orderBy: [{ score: 'desc' }, { totalTime: 'asc' }],
      take: limit,
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return submissions.map((s, idx) => ({
      rank: idx + 1,
      userId: s.user.id,
      username: s.user.username,
      score: s.score,
      totalTime: s.totalTime,
      correctCount: s.correctCount,
    }));
  }

  async reportQuestion(userId: string, dto: ReportQuestionDto) {
    // Get or create question metadata
    let metadata = await this.prisma.questionMetadata.findUnique({
      where: { questionId: dto.questionId },
    });

    if (!metadata) {
      metadata = await this.prisma.questionMetadata.create({
        data: {
          questionId: dto.questionId,
          userReports: [],
        },
      });
    }

    // Add report to user_reports JSON
    const reports = (metadata.userReports as any[]) || [];
    reports.push({
      userId,
      reason: dto.reason,
      comment: dto.comment || null,
      timestamp: new Date().toISOString(),
    });

    // Update metadata
    await this.prisma.questionMetadata.update({
      where: { questionId: dto.questionId },
      data: {
        userReports: reports,
        reportCount: reports.length,
      },
    });

    return { success: true, message: 'Question reported successfully' };
  }
}

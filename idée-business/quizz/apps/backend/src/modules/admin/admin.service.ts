import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const [totalQuestions, publishedQuestions, draftQuestions, archivedQuestions] =
      await Promise.all([
        this.prisma.question.count(),
        this.prisma.question.count({ where: { status: 'publie' } }),
        this.prisma.question.count({ where: { status: 'brouillon' } }),
        this.prisma.question.count({ where: { status: 'archive' } }),
      ]);

    // Stats by category
    const categoryStats = await this.prisma.question.groupBy({
      by: ['categoryId'],
      where: { status: 'publie' },
      _count: true,
      _avg: {
        successRate: true,
      },
    });

    const categoriesWithNames = await Promise.all(
      categoryStats.map(async (stat) => {
        const category = await this.prisma.category.findUnique({
          where: { id: stat.categoryId || '' },
        });
        return {
          category: category?.name || 'Unknown',
          count: stat._count,
          avgSuccessRate: stat._avg.successRate
            ? Number(stat._avg.successRate.toFixed(1))
            : null,
        };
      })
    );

    // Questions with low success rate
    const lowSuccessQuestions = await this.prisma.question.count({
      where: {
        status: 'publie',
        successRate: { lt: 10 },
      },
    });

    // Questions with high success rate (too easy)
    const highSuccessQuestions = await this.prisma.question.count({
      where: {
        status: 'publie',
        successRate: { gt: 95 },
      },
    });

    return {
      total: totalQuestions,
      published: publishedQuestions,
      draft: draftQuestions,
      archived: archivedQuestions,
      byCategory: categoriesWithNames,
      alerts: {
        lowSuccess: lowSuccessQuestions,
        highSuccess: highSuccessQuestions,
      },
    };
  }

  /**
   * Get paginated questions with filters
   */
  async getQuestions(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    difficulty?: string;
    search?: string;
    enabledForDaily?: boolean;
    enabledForMcq?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.category) {
      where.categoryId = params.category;
    }

    if (params.difficulty) {
      where.difficulty = params.difficulty;
    }

    if (params.search) {
      where.text = { contains: params.search, mode: 'insensitive' };
    }

    if (params.enabledForDaily !== undefined) {
      where.enabledForDaily = params.enabledForDaily;
    }

    if (params.enabledForMcq !== undefined) {
      where.enabledForMcq = params.enabledForMcq;
    }

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          acceptedAnswers: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              acceptedAnswers: true,
              distractors: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single question details
   */
  async getQuestion(id: string) {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        category: true,
        fact: {
          include: {
            source: true,
          },
        },
        acceptedAnswers: true,
        distractors: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Update question
   */
  async updateQuestion(
    id: string,
    data: {
      text?: string;
      difficulty?: string;
      status?: string;
      categoryId?: string;
      enabledForDaily?: boolean;
      enabledForMcq?: boolean;
    }
  ) {
    return this.prisma.question.update({
      where: { id },
      data,
    });
  }

  /**
   * Add accepted answer variant
   */
  async addAnswerVariant(
    questionId: string,
    answer: string,
    levenshteinThreshold: number = 2
  ) {
    return this.prisma.acceptedAnswer.create({
      data: {
        questionId,
        answer,
        isPrimary: false,
        variantType: 'orthographe',
        levenshteinThreshold,
      },
    });
  }

  /**
   * Delete accepted answer variant
   */
  async deleteAnswerVariant(id: string) {
    return this.prisma.acceptedAnswer.delete({
      where: { id },
    });
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }
}

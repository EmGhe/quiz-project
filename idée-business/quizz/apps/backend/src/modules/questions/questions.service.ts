import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginatedResponse } from '@/common/interfaces';
import { Question } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Question>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        skip,
        take: limit,
        where: { status: 'publie' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where: { status: 'publie' } }),
    ]);

    return { data, total, page, limit };
  }
}

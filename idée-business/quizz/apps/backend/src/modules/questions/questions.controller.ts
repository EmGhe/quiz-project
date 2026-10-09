import { Controller, Get, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { ApiResponse, PaginatedResponse } from '@/common/interfaces';
import { Question } from '@prisma/client';

@Controller('api/questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<ApiResponse<PaginatedResponse<Question>>> {
    const result = await this.questionsService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { success: true, data: result };
  }
}

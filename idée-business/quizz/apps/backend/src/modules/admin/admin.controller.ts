import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AdminGuard } from '@/common/guards/admin.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('questions')
  async getQuestions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('enabledForDaily') enabledForDaily?: string,
    @Query('enabledForMcq') enabledForMcq?: string
  ) {
    return this.adminService.getQuestions({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      category,
      difficulty,
      search,
      enabledForDaily: enabledForDaily === 'true' ? true : undefined,
      enabledForMcq: enabledForMcq === 'true' ? true : undefined,
    });
  }

  @Get('questions/:id')
  async getQuestion(@Param('id') id: string) {
    return this.adminService.getQuestion(id);
  }

  @Patch('questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body()
    data: {
      text?: string;
      difficulty?: string;
      status?: string;
      categoryId?: string;
      enabledForDaily?: boolean;
      enabledForMcq?: boolean;
    }
  ) {
    return this.adminService.updateQuestion(id, data);
  }

  @Post('questions/:id/answers')
  async addAnswerVariant(
    @Param('id') id: string,
    @Body() data: { answer: string; levenshteinThreshold?: number }
  ) {
    return this.adminService.addAnswerVariant(
      id,
      data.answer,
      data.levenshteinThreshold
    );
  }

  @Delete('answers/:id')
  async deleteAnswerVariant(@Param('id') id: string) {
    return this.adminService.deleteAnswerVariant(id);
  }

  @Get('categories')
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Get('reported-questions')
  async getReportedQuestions(
    @Query('limit') limit?: string,
    @Query('minReports') minReports?: string,
  ) {
    return this.adminService.getReportedQuestions({
      limit: limit ? parseInt(limit) : 50,
      minReports: minReports ? parseInt(minReports) : 1,
    });
  }

  @Post('reported-questions/:questionId/resolve')
  async resolveReport(
    @Param('questionId') questionId: string,
    @Body('action') action: 'dismiss' | 'archive' | 'fix',
  ) {
    return this.adminService.resolveReport(questionId, action);
  }
}

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DailyService } from './daily.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SubmitDailyDto } from './dto/submit-daily.dto';

@Controller('api/daily')
@UseGuards(JwtAuthGuard)
export class DailyController {
  constructor(private dailyService: DailyService) {}

  @Get('today')
  async getToday(@CurrentUser() userId: string) {
    return this.dailyService.getTodaysDaily(userId);
  }

  @Post('submit')
  async submit(
    @CurrentUser() userId: string,
    @Body() dto: SubmitDailyDto,
  ) {
    return this.dailyService.submitDaily(userId, dto.answers);
  }

  @Get('leaderboard')
  async leaderboard() {
    const today = new Date().toISOString().split('T')[0];
    const daily = await this.dailyService['prisma'].daily.findUnique({
      where: { date: today },
    });

    if (!daily) {
      return { leaderboard: [] };
    }

    const leaderboard = await this.dailyService.getLeaderboard(daily.id);
    return { leaderboard };
  }
}

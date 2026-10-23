import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyService } from './daily.service';
import { DailyController } from './daily.controller';
import { AnswerValidatorService } from './answer-validator.service';
import { AuthModule } from '../auth/auth.module';
import { GoldModule } from '../gold/gold.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, GoldModule],
  controllers: [DailyController],
  providers: [DailyService, AnswerValidatorService],
})
export class DailyModule {}

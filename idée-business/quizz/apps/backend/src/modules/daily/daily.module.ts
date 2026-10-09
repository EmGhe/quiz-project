import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyService } from './daily.service';
import { DailyController } from './daily.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  controllers: [DailyController],
  providers: [DailyService],
})
export class DailyModule {}

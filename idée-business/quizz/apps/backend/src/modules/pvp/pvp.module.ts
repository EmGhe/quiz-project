import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EloService } from './services/elo.service';

@Module({
  imports: [PrismaModule],
  providers: [EloService],
  exports: [EloService],
})
export class PvpModule {}

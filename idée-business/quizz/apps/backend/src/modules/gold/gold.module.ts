import { Module } from '@nestjs/common';
import { GoldService } from './gold.service';
import { GoldController } from './gold.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GoldController],
  providers: [GoldService],
  exports: [GoldService], // Exporter pour utilisation dans autres modules (Daily, PvP, etc.)
})
export class GoldModule {}

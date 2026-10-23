import { Module } from '@nestjs/common';
import { FragmentService } from './fragment.service';
import { FragmentController } from './fragment.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FragmentController],
  providers: [FragmentService],
  exports: [FragmentService],
})
export class FragmentModule {}

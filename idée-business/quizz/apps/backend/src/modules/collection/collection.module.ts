import { Module } from '@nestjs/common';
import { RarityService } from './services/rarity.service';
import { CardsService } from './services/cards.service';
import { AlbumsService } from './services/albums.service';
import { CardsController } from './controllers/cards.controller';
import { AlbumsController } from './controllers/albums.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CardsController, AlbumsController],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}

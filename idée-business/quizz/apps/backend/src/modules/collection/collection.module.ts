import { Module } from '@nestjs/common';
import { RarityService } from './services/rarity.service';
import { CardsService } from './services/cards.service';
import { AlbumsService } from './services/albums.service';
import { CardsController } from './controllers/cards.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}

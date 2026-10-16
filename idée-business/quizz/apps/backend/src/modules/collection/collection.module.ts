import { Module } from '@nestjs/common';
import { RarityService } from './services/rarity.service';
import { CardsService } from './services/cards.service';
import { AlbumsService } from './services/albums.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}

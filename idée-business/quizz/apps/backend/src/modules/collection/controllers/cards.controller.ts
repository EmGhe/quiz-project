import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { CardsService } from '../services/cards.service';
import { FindCardsQueryDto } from '../dto/card.dto';

@Controller('api/cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get()
  async findAll(@Query() query: FindCardsQueryDto) {
    return this.cardsService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.cardsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const card = await this.cardsService.findOne(id);
    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
    return card;
  }
}

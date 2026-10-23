import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { CardsService } from '../services/cards.service';
import { FindCardsQueryDto } from '../dto/card.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('api/cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get()
  async findAll(
    @Query() query: FindCardsQueryDto,
    @CurrentUser() userId?: string,
  ) {
    return this.cardsService.findAll({
      ...query,
      userId,
    });
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

  @Patch(':cardId/favorite')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(
    @Param('cardId') cardId: string,
    @CurrentUser() userId: string,
  ) {
    return this.cardsService.toggleFavorite(userId, cardId);
  }
}

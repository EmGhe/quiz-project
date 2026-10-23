import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async findAll(@CurrentUser() userId: string) {
    return this.tagsService.findAllByUser(userId);
  }

  @Post()
  async create(@Body() dto: CreateTagDto, @CurrentUser() userId: string) {
    return this.tagsService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() userId: string,
  ) {
    return this.tagsService.update(userId, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() userId: string) {
    await this.tagsService.delete(userId, id);
  }

  @Post(':tagId/cards/:cardId')
  async addToCard(
    @Param('tagId') tagId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() userId: string,
  ) {
    return this.tagsService.addToCard(userId, tagId, cardId);
  }

  @Delete(':tagId/cards/:cardId')
  async removeFromCard(
    @Param('tagId') tagId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() userId: string,
  ) {
    await this.tagsService.removeFromCard(userId, tagId, cardId);
  }

  @Get('cards/:cardId')
  async findCardTags(
    @Param('cardId') cardId: string,
    @CurrentUser() userId: string,
  ) {
    return this.tagsService.findCardTags(userId, cardId);
  }
}

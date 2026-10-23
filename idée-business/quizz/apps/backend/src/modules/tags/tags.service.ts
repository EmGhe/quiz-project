import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Tag, CardTag } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTagDto): Promise<Tag> {
    try {
      return await this.prisma.tag.create({
        data: {
          userId,
          label: dto.label,
          color: dto.color,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Tu as déjà une étiquette avec ce nom');
      }
      throw error;
    }
  }

  async findAllByUser(userId: string): Promise<TagDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { cardTags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      userId: tag.userId,
      label: tag.label,
      color: tag.color,
      cardCount: tag._count.cardTags,
      createdAt: tag.createdAt.toISOString(),
    }));
  }

  async update(userId: string, tagId: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });

    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    return await this.prisma.tag.update({
      where: { id: tagId },
      data: dto,
    });
  }

  async delete(userId: string, tagId: string): Promise<void> {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });

    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    await this.prisma.tag.delete({ where: { id: tagId } });
  }

  async addToCard(userId: string, tagId: string, cardId: string): Promise<CardTag> {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    const userCard = await this.prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });
    if (!userCard) {
      throw new ForbiddenException('Tu ne possèdes pas cette carte');
    }

    const currentTagCount = await this.prisma.cardTag.count({
      where: { userId, cardId },
    });
    if (currentTagCount >= 4) {
      throw new BadRequestException('Maximum 4 étiquettes par carte');
    }

    try {
      return await this.prisma.cardTag.create({
        data: { userId, cardId, tagId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Cette étiquette est déjà posée sur cette carte');
      }
      throw error;
    }
  }

  async removeFromCard(userId: string, tagId: string, cardId: string): Promise<void> {
    const cardTag = await this.prisma.cardTag.findFirst({
      where: { userId, cardId, tagId },
    });

    if (!cardTag) {
      throw new NotFoundException('Association introuvable');
    }

    await this.prisma.cardTag.delete({ where: { id: cardTag.id } });
  }

  async findCardTags(userId: string, cardId: string): Promise<Tag[]> {
    const cardTags = await this.prisma.cardTag.findMany({
      where: { userId, cardId },
      include: { tag: true },
    });

    return cardTags.map((ct) => ct.tag);
  }
}

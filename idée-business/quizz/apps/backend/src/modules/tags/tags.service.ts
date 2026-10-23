import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Tag } from '@prisma/client';
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
}

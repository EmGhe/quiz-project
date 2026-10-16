import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    albumId?: string;
    rarity?: string;
    search?: string;
  }) {
    const where: any = {
      active: true,
    };

    if (filters.rarity) {
      where.rarity = filters.rarity;
    }

    if (filters.search) {
      where.entity = {
        label: {
          contains: filters.search,
          mode: 'insensitive',
        },
      };
    }

    if (filters.albumId) {
      where.albums = {
        some: {
          albumId: filters.albumId,
        },
      };
    }

    return this.prisma.card.findMany({
      where,
      include: {
        entity: true,
        albums: {
          include: {
            album: true,
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
      include: {
        entity: true,
        albums: {
          include: {
            album: true,
          },
        },
      },
    });
  }

  async getStats() {
    const cards = await this.prisma.card.findMany({
      where: { active: true },
      include: {
        albums: {
          include: {
            album: true,
          },
        },
      },
    });

    const total = cards.length;
    const byRarity: Record<string, number> = {};
    const byAlbum: Record<string, number> = {};

    cards.forEach((card) => {
      // Count by rarity
      byRarity[card.rarity] = (byRarity[card.rarity] || 0) + 1;

      // Count by album
      card.albums.forEach((cardAlbum) => {
        const albumName = cardAlbum.album.name;
        byAlbum[albumName] = (byAlbum[albumName] || 0) + 1;
      });
    });

    return { total, byRarity, byAlbum };
  }
}

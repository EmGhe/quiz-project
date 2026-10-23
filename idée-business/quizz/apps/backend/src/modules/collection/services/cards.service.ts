import { Injectable, NotFoundException } from '@nestjs/common';
import { UserCard } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    albumId?: string;
    rarity?: string;
    search?: string;
    tagId?: string;
    userId?: string;
  }) {
    // Si pas de userId, retourner tableau vide (collection = cartes possédées)
    if (!filters.userId) {
      return [];
    }

    const where: any = {
      userId: filters.userId,
      card: {
        active: true,
      },
    };

    if (filters.rarity) {
      where.rarity = filters.rarity;
    }

    if (filters.search) {
      where.card = {
        ...where.card,
        entity: {
          label: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      };
    }

    if (filters.albumId) {
      where.card = {
        ...where.card,
        albums: {
          some: {
            albumId: filters.albumId,
          },
        },
      };
    }

    if (filters.tagId) {
      where.card = {
        ...where.card,
        cardTags: {
          some: {
            tagId: filters.tagId,
            userId: filters.userId,
          },
        },
      };
    }

    // Récupérer les UserCards avec les infos de Card
    const userCards = await this.prisma.userCard.findMany({
      where,
      include: {
        card: {
          include: {
            entity: true,
            albums: {
              include: {
                album: true,
              },
            },
          },
        },
      },
      orderBy: [
        { obtainedAt: 'desc' },
      ],
    });

    // Transformer pour matcher l'ancien format attendu par le frontend
    return userCards.map((uc) => ({
      ...uc.card,
      rarity: uc.rarity, // Utiliser la rareté de UserCard (peut avoir évolué)
      isFavorite: uc.isFavorite,
      obtainedAt: uc.obtainedAt,
    }));
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

  async getStats(userId?: string) {
    // Si pas d'userId, retourner des stats vides
    if (!userId) {
      return { total: 0, byRarity: {}, byAlbum: {} };
    }

    const userCards = await this.prisma.userCard.findMany({
      where: { userId },
      include: {
        card: {
          include: {
            albums: {
              include: {
                album: true,
              },
            },
          },
        },
      },
    });

    const total = userCards.length;
    const byRarity: Record<string, number> = {};
    const byAlbum: Record<string, number> = {};

    userCards.forEach((userCard) => {
      // Count by current rarity (peut avoir évolué)
      byRarity[userCard.rarity] = (byRarity[userCard.rarity] || 0) + 1;

      // Count by album
      userCard.card.albums.forEach((cardAlbum) => {
        const albumName = cardAlbum.album.name;
        byAlbum[albumName] = (byAlbum[albumName] || 0) + 1;
      });
    });

    return { total, byRarity, byAlbum };
  }

  async toggleFavorite(userId: string, cardId: string): Promise<UserCard> {
    const userCard = await this.prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    if (!userCard) {
      throw new NotFoundException('Tu ne possèdes pas cette carte');
    }

    return await this.prisma.userCard.update({
      where: { id: userCard.id },
      data: { isFavorite: !userCard.isFavorite },
    });
  }
}

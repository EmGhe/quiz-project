import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AlbumsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const albums = await this.prisma.album.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        cards: {
          include: {
            card: true,
          },
        },
      },
    });

    // Add card count to each album
    return albums.map((album) => ({
      ...album,
      cardCount: album.cards.length,
    }));
  }

  async findBySlug(slug: string) {
    return this.prisma.album.findUnique({
      where: { slug },
      include: {
        cards: {
          include: {
            card: {
              include: {
                entity: true,
              },
            },
          },
        },
      },
    });
  }
}

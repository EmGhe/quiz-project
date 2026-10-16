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
    // TODO: implement in Task 4
    return [];
  }

  async findOne(id: string) {
    // TODO: implement in Task 4
    return null;
  }

  async getStats() {
    // TODO: implement in Task 4
    return { total: 0, byRarity: {}, byAlbum: {} };
  }
}

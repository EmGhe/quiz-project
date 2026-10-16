import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AlbumsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // TODO: implement in Task 5
    return [];
  }

  async findBySlug(slug: string) {
    // TODO: implement in Task 5
    return null;
  }
}

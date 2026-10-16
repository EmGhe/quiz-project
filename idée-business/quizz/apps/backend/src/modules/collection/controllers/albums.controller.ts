import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AlbumsService } from '../services/albums.service';

@Controller('api/albums')
export class AlbumsController {
  constructor(private albumsService: AlbumsService) {}

  @Get()
  async findAll() {
    return this.albumsService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const album = await this.albumsService.findBySlug(slug);
    if (!album) {
      throw new NotFoundException(`Album with slug ${slug} not found`);
    }
    return album;
  }
}

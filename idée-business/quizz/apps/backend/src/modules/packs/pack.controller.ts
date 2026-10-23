import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { PackService } from './pack.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PackType } from '@prisma/client';

@Controller('packs')
@UseGuards(JwtAuthGuard)
export class PackController {
  constructor(private readonly packService: PackService) {}

  /**
   * Récupérer toutes les configs de packs (boutique)
   */
  @Get('configs')
  async getPackConfigs() {
    return await this.packService.getAllPackConfigs();
  }

  /**
   * Récupérer les packs de l'utilisateur
   * Query param: ?opened=true/false (optionnel)
   */
  @Get('my-packs')
  async getMyPacks(@CurrentUser() userId: string, @Query('opened') opened?: string) {
    const openedFilter = opened === 'true' ? true : opened === 'false' ? false : undefined;
    return await this.packService.getUserPacks(userId, openedFilter);
  }

  /**
   * Récupérer le pity counter pour un type de pack
   */
  @Get('pity/:packType')
  async getPityCounter(@CurrentUser() userId: string, @Param('packType') packType: PackType) {
    return await this.packService.getPityCounter(userId, packType);
  }

  /**
   * Acheter un pack
   */
  @Post('purchase/:packType')
  async purchasePack(@CurrentUser() userId: string, @Param('packType') packType: PackType) {
    return await this.packService.purchasePack(userId, packType);
  }

  /**
   * Ouvrir un pack
   */
  @Post('open/:packId')
  async openPack(@CurrentUser() userId: string, @Param('packId') packId: string) {
    return await this.packService.openPack(userId, packId);
  }
}

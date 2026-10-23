import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { FragmentService } from './fragment.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('fragments')
@UseGuards(JwtAuthGuard)
export class FragmentController {
  constructor(private readonly fragmentService: FragmentService) {}

  /**
   * Récupérer le solde fragments de l'utilisateur courant
   */
  @Get('balance')
  async getBalance(@CurrentUser() userId: string) {
    const balance = await this.fragmentService.getBalance(userId);
    return { fragments: balance };
  }

  /**
   * Récupérer l'historique des transactions fragments
   */
  @Get('history')
  async getHistory(@CurrentUser() userId: string) {
    const transactions = await this.fragmentService.getTransactionHistory(userId);
    return { transactions };
  }

  /**
   * Récupérer les statistiques fragments
   */
  @Get('stats')
  async getStats(@CurrentUser() userId: string) {
    const stats = await this.fragmentService.getFragmentStats(userId);
    return stats;
  }

  /**
   * Récupérer les coûts d'amélioration (static data pour UI)
   */
  @Get('upgrade-costs')
  getUpgradeCosts() {
    return this.fragmentService.getUpgradeCosts();
  }

  /**
   * Récupérer les valeurs de destruction (static data pour UI)
   */
  @Get('destruction-values')
  getDestructionValues() {
    return this.fragmentService.getDestructionValues();
  }

  /**
   * Détruire une carte pour obtenir des fragments
   */
  @Delete('cards/:userCardId')
  async destroyCard(@CurrentUser() userId: string, @Param('userCardId') userCardId: string) {
    return await this.fragmentService.destroyCard(userId, userCardId);
  }

  /**
   * Améliorer une carte en dépensant des fragments
   */
  @Post('cards/:userCardId/upgrade')
  async upgradeCard(@CurrentUser() userId: string, @Param('userCardId') userCardId: string) {
    return await this.fragmentService.upgradeCard(userId, userCardId);
  }
}

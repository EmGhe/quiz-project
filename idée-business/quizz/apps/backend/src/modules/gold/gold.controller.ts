import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GoldService } from './gold.service';

@Controller('gold')
@UseGuards(JwtAuthGuard)
export class GoldController {
  constructor(private goldService: GoldService) {}

  /**
   * GET /gold/balance
   * Récupère le solde Gold de l'utilisateur connecté
   */
  @Get('balance')
  async getBalance(@CurrentUser() userId: string) {
    const balance = await this.goldService.getBalance(userId);

    return {
      gold: balance,
    };
  }

  /**
   * GET /gold/transactions
   * Récupère l'historique des transactions Gold
   */
  @Get('transactions')
  async getTransactions(@CurrentUser() userId: string) {
    const transactions = await this.goldService.getTransactionHistory(userId, 50);

    return {
      transactions,
    };
  }

  /**
   * GET /gold/stats
   * Récupère les statistiques Gold de l'utilisateur
   */
  @Get('stats')
  async getStats(@CurrentUser() userId: string) {
    const stats = await this.goldService.getGoldStats(userId);

    return stats;
  }
}

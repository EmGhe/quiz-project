import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
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
  async getBalance(@Req() req: any) {
    const balance = await this.goldService.getBalance(req.user.userId);

    return {
      gold: balance,
    };
  }

  /**
   * GET /gold/transactions
   * Récupère l'historique des transactions Gold
   */
  @Get('transactions')
  async getTransactions(@Req() req: any) {
    const transactions = await this.goldService.getTransactionHistory(req.user.userId, 50);

    return {
      transactions,
    };
  }

  /**
   * GET /gold/stats
   * Récupère les statistiques Gold de l'utilisateur
   */
  @Get('stats')
  async getStats(@Req() req: any) {
    const stats = await this.goldService.getGoldStats(req.user.userId);

    return stats;
  }
}

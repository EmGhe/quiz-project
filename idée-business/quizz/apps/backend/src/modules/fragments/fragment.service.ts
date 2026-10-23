import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DESTRUCTION_VALUES = {
  common: 10,
  rare: 35,
  epic: 120,
  legendary: 400,
};

const UPGRADE_COSTS = {
  common_to_rare: 30,
  rare_to_epic: 100,
  epic_to_legendary: 300,
};

@Injectable()
export class FragmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Détruire une carte pour obtenir des fragments
   * Protection : ne peut pas détruire une carte favorite
   */
  async destroyCard(
    userId: string,
    userCardId: string
  ): Promise<{
    fragments: number;
    newBalance: number;
    cardDestroyed: {
      cardId: string;
      rarity: string;
    };
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Récupérer la carte
      const userCard = await tx.userCard.findFirst({
        where: {
          id: userCardId,
          userId,
        },
        include: {
          card: {
            include: {
              entity: true,
            },
          },
        },
      });

      if (!userCard) {
        throw new NotFoundException('Card not found in your collection');
      }

      // Protection : carte favorite
      if (userCard.isFavorite) {
        throw new BadRequestException(
          'Cannot destroy a favorite card. Remove it from favorites first.'
        );
      }

      // Calculer fragments obtenus
      const fragments = DESTRUCTION_VALUES[userCard.rarity as keyof typeof DESTRUCTION_VALUES];

      if (!fragments) {
        throw new BadRequestException('Invalid card rarity');
      }

      // Supprimer la carte de la collection
      await tx.userCard.delete({
        where: { id: userCardId },
      });

      // Ajouter fragments à l'utilisateur
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          fragments: {
            increment: fragments,
          },
        },
        select: { fragments: true },
      });

      // Logger la transaction
      await tx.fragmentTransaction.create({
        data: {
          userId,
          amount: fragments,
          reason: 'card_destruction',
          metadata: {
            cardId: userCard.cardId,
            rarity: userCard.rarity,
            entityName: userCard.card.entity.label,
          },
        },
      });

      return {
        fragments,
        newBalance: user.fragments,
        cardDestroyed: {
          cardId: userCard.cardId,
          rarity: userCard.rarity,
        },
      };
    });
  }

  /**
   * Améliorer une carte en dépensant des fragments
   */
  async upgradeCard(
    userId: string,
    userCardId: string
  ): Promise<{
    newRarity: string;
    fragmentsSpent: number;
    newBalance: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      const userCard = await tx.userCard.findFirst({
        where: {
          id: userCardId,
          userId,
        },
      });

      if (!userCard) {
        throw new NotFoundException('Card not found in your collection');
      }

      // Déterminer nouvelle rareté et coût
      const currentRarity = userCard.rarity;
      let newRarity: string;
      let cost: number;

      if (currentRarity === 'common') {
        newRarity = 'rare';
        cost = UPGRADE_COSTS.common_to_rare;
      } else if (currentRarity === 'rare') {
        newRarity = 'epic';
        cost = UPGRADE_COSTS.rare_to_epic;
      } else if (currentRarity === 'epic') {
        newRarity = 'legendary';
        cost = UPGRADE_COSTS.epic_to_legendary;
      } else {
        throw new BadRequestException('Card is already at maximum rarity (Legendary)');
      }

      // Vérifier solde fragments
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { fragments: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.fragments < cost) {
        throw new BadRequestException(
          `Insufficient fragments. Need ${cost}, have ${user.fragments}`
        );
      }

      // Dépenser fragments
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          fragments: {
            decrement: cost,
          },
        },
        select: { fragments: true },
      });

      // Améliorer la carte
      await tx.userCard.update({
        where: { id: userCardId },
        data: {
          rarity: newRarity,
          upgradedAt: new Date(),
        },
      });

      // Logger la transaction
      await tx.fragmentTransaction.create({
        data: {
          userId,
          amount: -cost,
          reason: 'card_upgrade',
          metadata: {
            cardId: userCard.cardId,
            fromRarity: currentRarity,
            toRarity: newRarity,
          },
        },
      });

      return {
        newRarity,
        fragmentsSpent: cost,
        newBalance: updatedUser.fragments,
      };
    });
  }

  /**
   * Récupérer le solde fragments d'un utilisateur
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fragments: true },
    });

    return user?.fragments || 0;
  }

  /**
   * Récupérer l'historique des transactions fragments
   */
  async getTransactionHistory(userId: string, limit: number = 50) {
    const transactions = await this.prisma.fragmentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  }

  /**
   * Statistiques fragments
   */
  async getFragmentStats(userId: string) {
    const transactions = await this.prisma.fragmentTransaction.findMany({
      where: { userId },
    });

    const earned = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const cardsDestroyed = transactions.filter((t) => t.reason === 'card_destruction').length;
    const cardsUpgraded = transactions.filter((t) => t.reason === 'card_upgrade').length;

    return {
      currentBalance: await this.getBalance(userId),
      totalEarned: earned,
      totalSpent: spent,
      cardsDestroyed,
      cardsUpgraded,
      transactionCount: transactions.length,
    };
  }

  /**
   * Récupérer les coûts d'amélioration pour UI
   */
  getUpgradeCosts() {
    return {
      commonToRare: UPGRADE_COSTS.common_to_rare,
      rareToEpic: UPGRADE_COSTS.rare_to_epic,
      epicToLegendary: UPGRADE_COSTS.epic_to_legendary,
    };
  }

  /**
   * Récupérer les valeurs de destruction pour UI
   */
  getDestructionValues() {
    return {
      common: DESTRUCTION_VALUES.common,
      rare: DESTRUCTION_VALUES.rare,
      epic: DESTRUCTION_VALUES.epic,
      legendary: DESTRUCTION_VALUES.legendary,
    };
  }
}

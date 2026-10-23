import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PackType } from '@prisma/client';

export interface PackCard {
  cardId: string;
  rarity: string;
}

interface PackConfig {
  type: PackType;
  cost: number;
  cardCount: number;
  commonChance: number;
  rareChance: number;
  epicChance: number;
  legendaryChance: number;
  minRares: number;
  minEpics: number;
  epicPityCount: number;
  legendaryPityCount: number;
}

@Injectable()
export class PackService {
  constructor(private prisma: PrismaService) {}

  /**
   * Acheter un pack (dépense Gold, crée un pack non ouvert)
   */
  async purchasePack(
    userId: string,
    packType: PackType
  ): Promise<{
    packId: string;
    cost: number;
    remainingGold: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Récupérer la config du pack
      const config = await tx.packConfig.findUnique({
        where: { type: packType },
      });

      if (!config) {
        throw new NotFoundException(`Pack config not found for type ${packType}`);
      }

      // Vérifier le solde Gold
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { gold: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.gold < config.cost) {
        throw new BadRequestException(
          `Insufficient gold. Need ${config.cost}, have ${user.gold}`
        );
      }

      // Dépenser Gold
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          gold: {
            decrement: config.cost,
          },
        },
        select: { gold: true },
      });

      // Créer transaction Gold
      await tx.goldTransaction.create({
        data: {
          userId,
          amount: -config.cost,
          reason: 'pack_purchase',
          metadata: {
            packType,
          },
        },
      });

      // Créer le pack (non ouvert)
      const pack = await tx.pack.create({
        data: {
          userId,
          type: packType,
          cost: config.cost,
          opened: false,
        },
      });

      return {
        packId: pack.id,
        cost: config.cost,
        remainingGold: updatedUser.gold,
      };
    });
  }

  /**
   * Ouvrir un pack (génère les cartes avec RNG + pity system)
   */
  async openPack(
    userId: string,
    packId: string
  ): Promise<{
    cards: PackCard[];
    pityTriggered: {
      epic: boolean;
      legendary: boolean;
    };
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Récupérer le pack
      const pack = await tx.pack.findFirst({
        where: {
          id: packId,
          userId,
        },
      });

      if (!pack) {
        throw new NotFoundException('Pack not found');
      }

      if (pack.opened) {
        throw new BadRequestException('Pack already opened');
      }

      // Récupérer la config
      const config = await tx.packConfig.findUnique({
        where: { type: pack.type },
      });

      if (!config) {
        throw new NotFoundException('Pack config not found');
      }

      // Récupérer ou créer le pity counter
      let pityCounter = await tx.userPityCounter.findUnique({
        where: {
          userId_packType: {
            userId,
            packType: pack.type,
          },
        },
      });

      if (!pityCounter) {
        pityCounter = await tx.userPityCounter.create({
          data: {
            userId,
            packType: pack.type,
            packsOpenedSinceLegendary: 0,
            packsOpenedSinceEpic: 0,
          },
        });
      }

      // Générer les cartes avec RNG + pity
      const { cards, pityTriggered } = await this.generatePackCards(config, pityCounter, tx);

      // Mettre à jour le pity counter
      const newEpicCount = pityTriggered.epic ? 0 : pityCounter.packsOpenedSinceEpic + 1;
      const newLegendaryCount = pityTriggered.legendary
        ? 0
        : pityCounter.packsOpenedSinceLegendary + 1;

      await tx.userPityCounter.update({
        where: { id: pityCounter.id },
        data: {
          packsOpenedSinceEpic: newEpicCount,
          packsOpenedSinceLegendary: newLegendaryCount,
        },
      });

      // Ajouter les cartes à la collection de l'utilisateur
      for (const card of cards) {
        // Vérifier si l'utilisateur a déjà cette carte
        const existingCard = await tx.userCard.findUnique({
          where: {
            userId_cardId: {
              userId,
              cardId: card.cardId,
            },
          },
        });

        // Si la carte existe déjà, on ne fait rien (1 seule instance par carte)
        // La logique de "doublon" sera gérée côté frontend (message "already owned")
        if (!existingCard) {
          await tx.userCard.create({
            data: {
              userId,
              cardId: card.cardId,
              rarity: card.rarity,
              baseRarity: card.rarity,
            },
          });
        }
      }

      // Marquer le pack comme ouvert
      await tx.pack.update({
        where: { id: packId },
        data: {
          opened: true,
          openedAt: new Date(),
          cards: cards as any, // JSON des cartes obtenues
        },
      });

      return {
        cards,
        pityTriggered,
      };
    });
  }

  /**
   * Génère les cartes d'un pack avec RNG + pity system
   */
  private async generatePackCards(
    config: PackConfig,
    pityCounter: any,
    tx: any
  ): Promise<{
    cards: PackCard[];
    pityTriggered: { epic: boolean; legendary: boolean };
  }> {
    const cards: PackCard[] = [];
    let pityTriggered = { epic: false, legendary: false };

    // Récupérer toutes les cartes disponibles par rareté
    const cardsByRarity = {
      common: await tx.card.findMany({ where: { rarity: 'common', active: true } }),
      rare: await tx.card.findMany({ where: { rarity: 'rare', active: true } }),
      epic: await tx.card.findMany({ where: { rarity: 'epic', active: true } }),
      legendary: await tx.card.findMany({ where: { rarity: 'legendary', active: true } }),
    };

    // Vérifier pity system avant génération
    const shouldTriggerEpicPity =
      config.epicPityCount > 0 && pityCounter.packsOpenedSinceEpic + 1 >= config.epicPityCount;

    const shouldTriggerLegendaryPity =
      config.legendaryPityCount > 0 &&
      pityCounter.packsOpenedSinceLegendary + 1 >= config.legendaryPityCount;

    // Si pity Legendary trigger, une carte sera forcée Legendary
    if (shouldTriggerLegendaryPity) {
      pityTriggered.legendary = true;
      const card = this.getRandomCard(cardsByRarity.legendary);
      cards.push({ cardId: card.id, rarity: 'legendary' });
    }

    // Si pity Epic trigger (et pas déjà Legendary), une carte sera forcée Epic
    if (shouldTriggerEpicPity && !shouldTriggerLegendaryPity) {
      pityTriggered.epic = true;
      const card = this.getRandomCard(cardsByRarity.epic);
      cards.push({ cardId: card.id, rarity: 'epic' });
    }

    // Générer les cartes restantes avec RNG
    const remainingCards = config.cardCount - cards.length;

    for (let i = 0; i < remainingCards; i++) {
      const rarity = this.rollRarity(config);
      const card = this.getRandomCard(cardsByRarity[rarity]);

      // Tracker si Epic ou Legendary apparaît naturellement
      if (rarity === 'epic' && !pityTriggered.epic) {
        pityTriggered.epic = true;
      }
      if (rarity === 'legendary' && !pityTriggered.legendary) {
        pityTriggered.legendary = true;
      }

      cards.push({ cardId: card.id, rarity });
    }

    // Appliquer les garanties minimales (minRares, minEpics)
    this.enforceMinimumGuarantees(cards, config, cardsByRarity);

    return { cards, pityTriggered };
  }

  /**
   * RNG pour déterminer la rareté d'une carte
   */
  private rollRarity(config: PackConfig): 'common' | 'rare' | 'epic' | 'legendary' {
    const roll = Math.random() * 100; // 0-100

    let cumulative = 0;

    // Legendary (ex: 0.5%)
    cumulative += config.legendaryChance;
    if (roll < cumulative) return 'legendary';

    // Epic (ex: 6.5%)
    cumulative += config.epicChance;
    if (roll < cumulative) return 'epic';

    // Rare (ex: 28%)
    cumulative += config.rareChance;
    if (roll < cumulative) return 'rare';

    // Common (reste, ex: 65%)
    return 'common';
  }

  /**
   * Garanties minimales (ex: au moins 1 Rare par pack Bronze)
   */
  private enforceMinimumGuarantees(
    cards: PackCard[],
    config: PackConfig,
    cardsByRarity: any
  ): void {
    // Compter les raretés actuelles
    const counts = {
      common: cards.filter((c) => c.rarity === 'common').length,
      rare: cards.filter((c) => c.rarity === 'rare').length,
      epic: cards.filter((c) => c.rarity === 'epic').length,
      legendary: cards.filter((c) => c.rarity === 'legendary').length,
    };

    // Garantir minRares
    while (counts.rare < config.minRares && counts.common > 0) {
      // Remplacer une Common par une Rare
      const commonIndex = cards.findIndex((c) => c.rarity === 'common');
      const rareCard = this.getRandomCard(cardsByRarity.rare);
      cards[commonIndex] = { cardId: rareCard.id, rarity: 'rare' };
      counts.common--;
      counts.rare++;
    }

    // Garantir minEpics
    while (counts.epic < config.minEpics && counts.common > 0) {
      // Remplacer une Common par une Epic
      const commonIndex = cards.findIndex((c) => c.rarity === 'common');
      const epicCard = this.getRandomCard(cardsByRarity.epic);
      cards[commonIndex] = { cardId: epicCard.id, rarity: 'epic' };
      counts.common--;
      counts.epic++;
    }
  }

  /**
   * Sélectionne une carte aléatoire dans un pool
   */
  private getRandomCard(cards: any[]): any {
    if (cards.length === 0) {
      throw new Error('No cards available in this rarity pool');
    }
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
  }

  /**
   * Récupérer les packs d'un utilisateur
   */
  async getUserPacks(userId: string, opened?: boolean) {
    const where: any = { userId };
    if (opened !== undefined) {
      where.opened = opened;
    }

    return await this.prisma.pack.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupérer le pity counter d'un utilisateur pour un type de pack
   */
  async getPityCounter(userId: string, packType: PackType) {
    return await this.prisma.userPityCounter.findUnique({
      where: {
        userId_packType: {
          userId,
          packType,
        },
      },
    });
  }

  /**
   * Récupérer toutes les configs de packs (pour affichage boutique)
   */
  async getAllPackConfigs() {
    return await this.prisma.packConfig.findMany({
      orderBy: { cost: 'asc' },
    });
  }
}

import { apiClient } from './client';

export type PackType = 'BRONZE' | 'SILVER' | 'GOLD';

export interface PackConfig {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Pack {
  id: string;
  userId: string;
  type: PackType;
  cost: number;
  opened: boolean;
  cards?: PackCard[];
  openedAt?: string;
  createdAt: string;
}

export interface PackCard {
  cardId: string;
  rarity: string;
}

export interface PityCounter {
  id: string;
  userId: string;
  packType: PackType;
  packsOpenedSinceLegendary: number;
  packsOpenedSinceEpic: number;
}

export const packApi = {
  /**
   * Get all pack configurations (shop display)
   */
  async getConfigs(): Promise<PackConfig[]> {
    const response = await apiClient.get('/packs/configs');
    return response.data;
  },

  /**
   * Get user's packs (opened or unopened)
   */
  async getMyPacks(opened?: boolean): Promise<Pack[]> {
    const params = opened !== undefined ? { opened: opened.toString() } : {};
    const response = await apiClient.get('/packs/my-packs', { params });
    return response.data;
  },

  /**
   * Get pity counter for a pack type
   */
  async getPityCounter(packType: PackType): Promise<PityCounter | null> {
    const response = await apiClient.get(`/packs/pity/${packType}`);
    return response.data;
  },

  /**
   * Purchase a pack
   */
  async purchasePack(packType: PackType): Promise<{
    packId: string;
    cost: number;
    remainingGold: number;
  }> {
    const response = await apiClient.post(`/packs/purchase/${packType}`);
    return response.data;
  },

  /**
   * Open a pack
   */
  async openPack(packId: string): Promise<{
    cards: PackCard[];
    pityTriggered: {
      epic: boolean;
      legendary: boolean;
    };
  }> {
    const response = await apiClient.post(`/packs/open/${packId}`);
    return response.data;
  },
};

import { apiClient } from './client';

export interface FragmentTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  metadata?: any;
  createdAt: string;
}

export interface FragmentStats {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  cardsDestroyed: number;
  cardsUpgraded: number;
  transactionCount: number;
}

export interface UpgradeCosts {
  commonToRare: number;
  rareToEpic: number;
  epicToLegendary: number;
}

export interface DestructionValues {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

export const fragmentApi = {
  /**
   * Get current fragment balance
   */
  async getBalance(): Promise<number> {
    const response = await apiClient.get('/fragments/balance');
    return response.data.fragments;
  },

  /**
   * Get fragment transaction history
   */
  async getTransactions(): Promise<FragmentTransaction[]> {
    const response = await apiClient.get('/fragments/history');
    return response.data.transactions;
  },

  /**
   * Get fragment statistics
   */
  async getStats(): Promise<FragmentStats> {
    const response = await apiClient.get('/fragments/stats');
    return response.data;
  },

  /**
   * Get upgrade costs (static data)
   */
  async getUpgradeCosts(): Promise<UpgradeCosts> {
    const response = await apiClient.get('/fragments/upgrade-costs');
    return response.data;
  },

  /**
   * Get destruction values (static data)
   */
  async getDestructionValues(): Promise<DestructionValues> {
    const response = await apiClient.get('/fragments/destruction-values');
    return response.data;
  },

  /**
   * Destroy a card to get fragments
   */
  async destroyCard(userCardId: string): Promise<{
    fragments: number;
    newBalance: number;
    cardDestroyed: { cardId: string; rarity: string };
  }> {
    const response = await apiClient.delete(`/fragments/cards/${userCardId}`);
    return response.data;
  },

  /**
   * Upgrade a card by spending fragments
   */
  async upgradeCard(userCardId: string): Promise<{
    newRarity: string;
    fragmentsSpent: number;
    newBalance: number;
  }> {
    const response = await apiClient.post(`/fragments/cards/${userCardId}/upgrade`);
    return response.data;
  },
};

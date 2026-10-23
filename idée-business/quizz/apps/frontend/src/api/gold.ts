import { apiClient } from './client';

export interface GoldTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  metadata?: any;
  createdAt: string;
}

export interface GoldStats {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  earnedByReason: Record<string, number>;
  transactionCount: number;
}

export const goldApi = {
  /**
   * Get current gold balance
   */
  async getBalance(): Promise<number> {
    const response = await apiClient.get('/gold/balance');
    return response.data.gold;
  },

  /**
   * Get gold transaction history
   */
  async getTransactions(): Promise<GoldTransaction[]> {
    const response = await apiClient.get('/gold/transactions');
    return response.data.transactions;
  },

  /**
   * Get gold statistics
   */
  async getStats(): Promise<GoldStats> {
    const response = await apiClient.get('/gold/stats');
    return response.data;
  },
};

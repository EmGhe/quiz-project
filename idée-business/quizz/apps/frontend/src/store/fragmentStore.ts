import { create } from 'zustand';
import {
  fragmentApi,
  type FragmentTransaction,
  type FragmentStats,
  type UpgradeCosts,
  type DestructionValues,
} from '@/api/fragments';

interface FragmentStore {
  balance: number;
  transactions: FragmentTransaction[];
  stats: FragmentStats | null;
  upgradeCosts: UpgradeCosts | null;
  destructionValues: DestructionValues | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchUpgradeCosts: () => Promise<void>;
  fetchDestructionValues: () => Promise<void>;
  destroyCard: (userCardId: string) => Promise<{ fragments: number; rarity: string }>;
  upgradeCard: (userCardId: string) => Promise<{ newRarity: string; fragmentsSpent: number }>;
  updateBalance: (amount: number) => void; // Optimistic update
  reset: () => void;
}

export const useFragmentStore = create<FragmentStore>((set, _get) => ({
  balance: 0,
  transactions: [],
  stats: null,
  upgradeCosts: null,
  destructionValues: null,
  loading: false,
  error: null,

  fetchBalance: async () => {
    try {
      set({ loading: true, error: null });
      const balance = await fragmentApi.getBalance();
      set({ balance, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch fragment balance', loading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      const transactions = await fragmentApi.getTransactions();
      set({ transactions, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch transactions', loading: false });
    }
  },

  fetchStats: async () => {
    try {
      set({ loading: true, error: null });
      const stats = await fragmentApi.getStats();
      set({ stats, balance: stats.currentBalance, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch stats', loading: false });
    }
  },

  fetchUpgradeCosts: async () => {
    try {
      const upgradeCosts = await fragmentApi.getUpgradeCosts();
      set({ upgradeCosts });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch upgrade costs' });
    }
  },

  fetchDestructionValues: async () => {
    try {
      const destructionValues = await fragmentApi.getDestructionValues();
      set({ destructionValues });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch destruction values' });
    }
  },

  destroyCard: async (userCardId: string) => {
    try {
      set({ loading: true, error: null });
      const result = await fragmentApi.destroyCard(userCardId);
      set((_state) => ({
        balance: result.newBalance,
        loading: false,
      }));
      return {
        fragments: result.fragments,
        rarity: result.cardDestroyed.rarity,
      };
    } catch (error: any) {
      set({ error: error.message || 'Failed to destroy card', loading: false });
      throw error;
    }
  },

  upgradeCard: async (userCardId: string) => {
    try {
      set({ loading: true, error: null });
      const result = await fragmentApi.upgradeCard(userCardId);
      set((_state) => ({
        balance: result.newBalance,
        loading: false,
      }));
      return {
        newRarity: result.newRarity,
        fragmentsSpent: result.fragmentsSpent,
      };
    } catch (error: any) {
      set({ error: error.message || 'Failed to upgrade card', loading: false });
      throw error;
    }
  },

  updateBalance: (amount: number) => {
    set((state) => ({ balance: state.balance + amount }));
  },

  reset: () => {
    set({
      balance: 0,
      transactions: [],
      stats: null,
      upgradeCosts: null,
      destructionValues: null,
      loading: false,
      error: null,
    });
  },
}));

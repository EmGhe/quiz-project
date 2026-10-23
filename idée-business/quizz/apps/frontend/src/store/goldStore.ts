import { create } from 'zustand';
import { goldApi, type GoldTransaction, type GoldStats } from '@/api/gold';

interface GoldStore {
  balance: number;
  transactions: GoldTransaction[];
  stats: GoldStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchStats: () => Promise<void>;
  updateBalance: (amount: number) => void; // Optimistic update
  reset: () => void;
}

export const useGoldStore = create<GoldStore>((set, get) => ({
  balance: 0,
  transactions: [],
  stats: null,
  loading: false,
  error: null,

  fetchBalance: async () => {
    try {
      set({ loading: true, error: null });
      const balance = await goldApi.getBalance();
      set({ balance, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch gold balance', loading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      const transactions = await goldApi.getTransactions();
      set({ transactions, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch transactions', loading: false });
    }
  },

  fetchStats: async () => {
    try {
      set({ loading: true, error: null });
      const stats = await goldApi.getStats();
      set({ stats, balance: stats.currentBalance, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch stats', loading: false });
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
      loading: false,
      error: null,
    });
  },
}));

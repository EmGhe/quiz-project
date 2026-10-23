import { create } from 'zustand';
import {
  packApi,
  type PackConfig,
  type Pack,
  type PackType,
  type PackCard,
  type PityCounter,
} from '@/api/packs';

interface PackStore {
  configs: PackConfig[];
  myPacks: Pack[];
  unopenedPacks: Pack[];
  pityCounters: Record<PackType, PityCounter | null>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchConfigs: () => Promise<void>;
  fetchMyPacks: () => Promise<void>;
  fetchUnopenedPacks: () => Promise<void>;
  fetchPityCounter: (packType: PackType) => Promise<void>;
  purchasePack: (packType: PackType) => Promise<{ packId: string; cost: number }>;
  openPack: (
    packId: string
  ) => Promise<{ cards: PackCard[]; pityTriggered: { epic: boolean; legendary: boolean } }>;
  reset: () => void;
}

export const usePackStore = create<PackStore>((set, _get) => ({
  configs: [],
  myPacks: [],
  unopenedPacks: [],
  pityCounters: {
    BRONZE: null,
    SILVER: null,
    GOLD: null,
  },
  loading: false,
  error: null,

  fetchConfigs: async () => {
    try {
      set({ loading: true, error: null });
      const configs = await packApi.getConfigs();
      set({ configs, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pack configs', loading: false });
    }
  },

  fetchMyPacks: async () => {
    try {
      set({ loading: true, error: null });
      const myPacks = await packApi.getMyPacks();
      set({ myPacks, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch packs', loading: false });
    }
  },

  fetchUnopenedPacks: async () => {
    try {
      set({ loading: true, error: null });
      const unopenedPacks = await packApi.getMyPacks(false);
      set({ unopenedPacks, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch unopened packs', loading: false });
    }
  },

  fetchPityCounter: async (packType: PackType) => {
    try {
      const counter = await packApi.getPityCounter(packType);
      set((state) => ({
        pityCounters: {
          ...state.pityCounters,
          [packType]: counter,
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pity counter' });
    }
  },

  purchasePack: async (packType: PackType) => {
    try {
      set({ loading: true, error: null });
      const result = await packApi.purchasePack(packType);

      // Refresh unopened packs
      const unopenedPacks = await packApi.getMyPacks(false);
      set({ unopenedPacks, loading: false });

      return { packId: result.packId, cost: result.cost };
    } catch (error: any) {
      set({ error: error.message || 'Failed to purchase pack', loading: false });
      throw error;
    }
  },

  openPack: async (packId: string) => {
    try {
      set({ loading: true, error: null });
      const result = await packApi.openPack(packId);

      // Refresh packs after opening
      const unopenedPacks = await packApi.getMyPacks(false);
      set({ unopenedPacks, loading: false });

      return result;
    } catch (error: any) {
      set({ error: error.message || 'Failed to open pack', loading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      configs: [],
      myPacks: [],
      unopenedPacks: [],
      pityCounters: {
        BRONZE: null,
        SILVER: null,
        GOLD: null,
      },
      loading: false,
      error: null,
    });
  },
}));

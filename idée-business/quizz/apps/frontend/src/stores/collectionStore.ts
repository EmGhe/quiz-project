import { create } from 'zustand';
import { Card, Album, CardStats } from '../types/collection';
import { collectionApi } from '../services/collection.api';

interface CollectionStore {
  // Data
  cards: Card[];
  albums: Album[];
  stats: CardStats | null;
  loading: boolean;
  error: string | null;

  // Filters
  filters: {
    albumId: string | null;
    rarity: string | null;
    search: string;
    tagId: string | null;
  };

  // Actions
  setFilter: (key: keyof CollectionStore['filters'], value: any) => void;
  clearFilters: () => void;
  fetchCards: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  // Initial state
  cards: [],
  albums: [],
  stats: null,
  loading: false,
  error: null,

  filters: {
    albumId: null,
    rarity: null,
    search: '',
    tagId: null,
  },

  // Set filter
  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
    // Re-fetch cards with new filters
    get().fetchCards();
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: {
        albumId: null,
        rarity: null,
        search: '',
        tagId: null,
      },
    });
    get().fetchCards();
  },

  // Fetch cards with filters
  fetchCards: async () => {
    set({ loading: true, error: null });
    try {
      const { albumId, rarity, search } = get().filters;
      const cards = await collectionApi.getCards({
        albumId: albumId || undefined,
        rarity: rarity || undefined,
        search: search || undefined,
      });
      set({ cards, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch albums
  fetchAlbums: async () => {
    try {
      const albums = await collectionApi.getAlbums();
      set({ albums });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const stats = await collectionApi.getStats();
      set({ stats });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Fetch all data
  fetchAll: async () => {
    await Promise.all([
      get().fetchCards(),
      get().fetchAlbums(),
      get().fetchStats(),
    ]);
  },
}));

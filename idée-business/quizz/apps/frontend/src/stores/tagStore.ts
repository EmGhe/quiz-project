import { create } from 'zustand';
import { Tag } from '../types/tag';
import { tagsApi } from '../services/tags.api';

interface TagStore {
  tags: Tag[];
  cardTags: Record<string, Tag[]>;
  loading: boolean;
  error: string | null;

  fetchUserTags: () => Promise<void>;
  fetchCardTags: (cardId: string) => Promise<void>;
  createTag: (label: string, color: string) => Promise<Tag>;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  addTagToCard: (tagId: string, cardId: string) => Promise<void>;
  removeTagFromCard: (tagId: string, cardId: string) => Promise<void>;
  getCardTags: (cardId: string) => Tag[];
  canAddTagToCard: (cardId: string) => boolean;
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  cardTags: {},
  loading: false,
  error: null,

  fetchUserTags: async () => {
    set({ loading: true, error: null });
    try {
      const response = await tagsApi.getUserTags();
      set({ tags: response.data, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement des étiquettes', loading: false });
    }
  },

  fetchCardTags: async (cardId: string) => {
    try {
      const response = await tagsApi.getCardTags(cardId);
      set((state) => ({
        cardTags: { ...state.cardTags, [cardId]: response.data },
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des étiquettes de la carte', error);
    }
  },

  createTag: async (label: string, color: string) => {
    const response = await tagsApi.createTag({ label, color });
    set((state) => ({ tags: [...state.tags, response.data] }));
    return response.data;
  },

  updateTag: async (tagId: string, updates: Partial<Tag>) => {
    const response = await tagsApi.updateTag(tagId, updates);
    set((state) => ({
      tags: state.tags.map((t) => (t.id === tagId ? response.data : t)),
    }));
  },

  deleteTag: async (tagId: string) => {
    await tagsApi.deleteTag(tagId);
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== tagId),
      cardTags: Object.fromEntries(
        Object.entries(state.cardTags).map(([cardId, tags]) => [
          cardId,
          tags.filter((t) => t.id !== tagId),
        ]),
      ),
    }));
  },

  addTagToCard: async (tagId: string, cardId: string) => {
    await tagsApi.addTagToCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  removeTagFromCard: async (tagId: string, cardId: string) => {
    await tagsApi.removeTagFromCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  getCardTags: (cardId: string) => {
    return get().cardTags[cardId] || [];
  },

  canAddTagToCard: (cardId: string) => {
    const tags = get().getCardTags(cardId);
    return tags.length < 4;
  },
}));

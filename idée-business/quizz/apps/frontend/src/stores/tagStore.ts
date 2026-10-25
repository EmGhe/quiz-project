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
  getTagsWithCardCount: () => (Tag & { cardCount: number })[];
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
    set({ loading: true, error: null });
    try {
      const response = await tagsApi.createTag({ label, color });
      set((state) => ({ tags: [...state.tags, response.data], loading: false }));
      return response.data;
    } catch (error) {
      set({ error: 'Erreur lors de la création de l\'étiquette', loading: false });
      throw error;
    }
  },

  updateTag: async (tagId: string, updates: Partial<Tag>) => {
    set({ loading: true, error: null });
    try {
      const response = await tagsApi.updateTag(tagId, updates);
      set((state) => ({
        tags: state.tags.map((t) => (t.id === tagId ? response.data : t)),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour de l\'étiquette', loading: false });
      throw error;
    }
  },

  deleteTag: async (tagId: string) => {
    set({ loading: true, error: null });
    try {
      await tagsApi.deleteTag(tagId);
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== tagId),
        cardTags: Object.fromEntries(
          Object.entries(state.cardTags).map(([cardId, tags]) => [
            cardId,
            tags.filter((t) => t.id !== tagId),
          ]),
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Erreur lors de la suppression de l\'étiquette', loading: false });
      throw error;
    }
  },

  addTagToCard: async (tagId: string, cardId: string) => {
    if (!get().canAddTagToCard(cardId)) {
      const error = 'Cette carte a atteint le nombre maximal d\'étiquettes (4)';
      set({ error });
      throw new Error(error);
    }
    set({ loading: true, error: null });
    try {
      await tagsApi.addTagToCard(tagId, cardId);
      await get().fetchCardTags(cardId);
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erreur lors de l\'ajout de l\'étiquette à la carte', loading: false });
      throw error;
    }
  },

  removeTagFromCard: async (tagId: string, cardId: string) => {
    set({ loading: true, error: null });
    try {
      await tagsApi.removeTagFromCard(tagId, cardId);
      await get().fetchCardTags(cardId);
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erreur lors de la suppression de l\'étiquette de la carte', loading: false });
      throw error;
    }
  },

  getCardTags: (cardId: string) => {
    return get().cardTags[cardId] || [];
  },

  canAddTagToCard: (cardId: string) => {
    const tags = get().getCardTags(cardId);
    return tags.length < 4;
  },

  getTagsWithCardCount: () => {
    const state = get();
    const tagCounts = new Map<string, number>();

    Object.values(state.cardTags).forEach((tags) => {
      tags.forEach((tag) => {
        tagCounts.set(tag.id, (tagCounts.get(tag.id) || 0) + 1);
      });
    });

    return state.tags
      .map((tag) => ({
        ...tag,
        cardCount: tagCounts.get(tag.id) || 0,
      }))
      .filter((tag) => tag.cardCount > 0);
  },
}));

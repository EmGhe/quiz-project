import { apiClient } from '../api/client';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag';

export const tagsApi = {
  getUserTags: () => apiClient.get<Tag[]>('/api/tags'),

  createTag: (data: CreateTagDto) => apiClient.post<Tag>('/api/tags', data),

  updateTag: (tagId: string, data: UpdateTagDto) =>
    apiClient.patch<Tag>(`/api/tags/${tagId}`, data),

  deleteTag: (tagId: string) => apiClient.delete(`/api/tags/${tagId}`),

  addTagToCard: (tagId: string, cardId: string) =>
    apiClient.post(`/api/tags/${tagId}/cards/${cardId}`),

  removeTagFromCard: (tagId: string, cardId: string) =>
    apiClient.delete(`/api/tags/${tagId}/cards/${cardId}`),

  getCardTags: (cardId: string) => apiClient.get<Tag[]>(`/api/tags/cards/${cardId}`),
};

export const cardsApi = {
  toggleFavorite: (cardId: string) =>
    apiClient.patch(`/api/cards/${cardId}/favorite`),
};

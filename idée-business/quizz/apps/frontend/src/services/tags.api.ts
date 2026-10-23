import axios from 'axios';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag';

export const tagsApi = {
  getUserTags: () => axios.get<Tag[]>('/api/tags'),

  createTag: (data: CreateTagDto) => axios.post<Tag>('/api/tags', data),

  updateTag: (tagId: string, data: UpdateTagDto) =>
    axios.patch<Tag>(`/api/tags/${tagId}`, data),

  deleteTag: (tagId: string) => axios.delete(`/api/tags/${tagId}`),

  addTagToCard: (tagId: string, cardId: string) =>
    axios.post(`/api/tags/${tagId}/cards/${cardId}`),

  removeTagFromCard: (tagId: string, cardId: string) =>
    axios.delete(`/api/tags/${tagId}/cards/${cardId}`),

  getCardTags: (cardId: string) => axios.get<Tag[]>(`/api/tags/cards/${cardId}`),
};

export const cardsApi = {
  toggleFavorite: (cardId: string) =>
    axios.patch(`/api/cards/${cardId}/favorite`),
};

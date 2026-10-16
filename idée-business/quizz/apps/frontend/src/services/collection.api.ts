import { apiClient } from './apiClient';
import { Card, Album, CardStats, FindCardsParams } from '../types/collection';

export const collectionApi = {
  /**
   * Get all cards with optional filters
   */
  async getCards(params?: FindCardsParams): Promise<Card[]> {
    const response = await apiClient.get<Card[]>('/cards', { params });
    return response.data;
  },

  /**
   * Get single card by ID
   */
  async getCard(id: string): Promise<Card> {
    const response = await apiClient.get<Card>(`/cards/${id}`);
    return response.data;
  },

  /**
   * Get card statistics
   */
  async getStats(): Promise<CardStats> {
    const response = await apiClient.get<CardStats>('/cards/stats');
    return response.data;
  },

  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    const response = await apiClient.get<Album[]>('/albums');
    return response.data;
  },

  /**
   * Get single album by slug
   */
  async getAlbum(slug: string): Promise<Album> {
    const response = await apiClient.get<Album>(`/albums/${slug}`);
    return response.data;
  },
};

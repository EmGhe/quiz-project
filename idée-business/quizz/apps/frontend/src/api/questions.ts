import { apiClient } from './client';
import { ApiResponse, PaginatedResponse, Question } from '@/types/api';

export const questionsApi = {
  async getAll(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Question>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Question>>>(
      '/api/questions',
      { params: { page, limit } },
    );
    return response.data.data!;
  },
};

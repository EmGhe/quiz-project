import { apiClient } from './client';

export const adminApi = {
  async getStats() {
    const response = await apiClient.get('/api/admin/stats');
    return response.data;
  },

  async getQuestions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    difficulty?: string;
    search?: string;
    enabledForDaily?: boolean;
    enabledForMcq?: boolean;
  }) {
    const response = await apiClient.get('/api/admin/questions', { params });
    return response.data;
  },

  async getQuestion(id: string) {
    const response = await apiClient.get(`/api/admin/questions/${id}`);
    return response.data;
  },

  async updateQuestion(
    id: string,
    data: {
      text?: string;
      difficulty?: string;
      status?: string;
      categoryId?: string;
      enabledForDaily?: boolean;
      enabledForMcq?: boolean;
    }
  ) {
    const response = await apiClient.patch(`/api/admin/questions/${id}`, data);
    return response.data;
  },

  async addAnswerVariant(
    questionId: string,
    answer: string,
    levenshteinThreshold?: number
  ) {
    const response = await apiClient.post(`/api/admin/questions/${questionId}/answers`, {
      answer,
      levenshteinThreshold,
    });
    return response.data;
  },

  async deleteAnswerVariant(id: string) {
    const response = await apiClient.delete(`/api/admin/answers/${id}`);
    return response.data;
  },

  async getCategories() {
    const response = await apiClient.get('/api/admin/categories');
    return response.data;
  },

  async getReportedQuestions(params?: { limit?: number; minReports?: number }) {
    const response = await apiClient.get('/api/admin/reported-questions', { params });
    return response.data;
  },

  async resolveReport(questionId: string, action: 'dismiss' | 'archive' | 'fix') {
    const response = await apiClient.post(`/api/admin/reported-questions/${questionId}/resolve`, { action });
    return response.data;
  },

  async updatePrimaryAnswer(questionId: string, answer: string) {
    const response = await apiClient.patch(`/api/admin/questions/${questionId}/primary-answer`, { answer });
    return response.data;
  },

  async addDistractor(questionId: string, text: string, order?: number) {
    const response = await apiClient.post(`/api/admin/questions/${questionId}/distractors`, { text, order });
    return response.data;
  },

  async updateDistractor(distractorId: string, text: string) {
    const response = await apiClient.patch(`/api/admin/distractors/${distractorId}`, { text });
    return response.data;
  },

  async deleteDistractor(distractorId: string) {
    const response = await apiClient.delete(`/api/admin/distractors/${distractorId}`);
    return response.data;
  },
};

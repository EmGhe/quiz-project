import { apiClient } from './client';
import type { Daily, AnswerSubmission, SubmitDailyResponse } from '@/types/daily';

export const dailyApi = {
  async getToday(): Promise<Daily> {
    const response = await apiClient.get('/api/daily/today');
    return response.data;
  },

  async submit(answers: AnswerSubmission[]): Promise<SubmitDailyResponse> {
    const response = await apiClient.post('/api/daily/submit', { answers });
    return response.data;
  },

  async getLeaderboard(): Promise<any> {
    const response = await apiClient.get('/api/daily/leaderboard');
    return response.data;
  },
};

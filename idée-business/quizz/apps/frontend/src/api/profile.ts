import { apiClient } from './client';
import { CompleteProfile, UpdateProfileData, UserProfile } from '../types/profile';

export const profileApi = {
  getProfile: async (): Promise<CompleteProfile> => {
    const response = await apiClient.get('/api/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const response = await apiClient.patch('/api/profile', data);
    return response.data;
  },
};

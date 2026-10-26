import axios from 'axios';
import { CompleteProfile, UpdateProfileData, UserProfile } from '../types/profile';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const profileApi = {
  getProfile: async (): Promise<CompleteProfile> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`${API_URL}/profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

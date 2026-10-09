import { apiClient } from './client';
import type { User } from '@/types/user';

export const authApi = {
  async register(username: string, email: string, password: string): Promise<User> {
    const response = await apiClient.post('/api/auth/register', {
      username,
      email,
      password,
    });
    return response.data.user;
  },

  async login(usernameOrEmail: string, password: string): Promise<User> {
    const response = await apiClient.post('/api/auth/login', {
      usernameOrEmail,
      password,
    });
    return response.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  async me(): Promise<any> {
    const response = await apiClient.get('/api/auth/me');
    return response.data; // Returns { user, streak }
  },
};

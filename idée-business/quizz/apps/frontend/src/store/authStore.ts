import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { User } from '@/types/user';

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  login: async (usernameOrEmail, password) => {
    const user = await authApi.login(usernameOrEmail, password);
    set({ user, loading: false });
  },

  register: async (username, email, password) => {
    const user = await authApi.register(username, email, password);
    set({ user, loading: false });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const user = await authApi.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));

import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { User, UserStreak } from '@/types/user';

interface AuthStore {
  user: User | null;
  streak: UserStreak | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  streak: null,
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
    set({ user: null, streak: null });
  },

  checkAuth: async () => {
    try {
      const data = await authApi.me();
      set({ user: data.user, streak: data.streak, loading: false });
    } catch {
      set({ user: null, streak: null, loading: false });
    }
  },
}));

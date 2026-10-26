import { create } from 'zustand';
import { profileApi } from '../api/profile';
import {
  UserProfile,
  DailyStats,
  PvPStats,
  CollectionStats,
  ShowcaseCard,
  UpdateProfileData,
} from '../types/profile';

interface ProfileState {
  profile: UserProfile | null;
  dailyStats: DailyStats | null;
  pvpStats: PvPStats | null;
  collectionStats: CollectionStats | null;
  showcaseCards: ShowcaseCard[];
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  dailyStats: null,
  pvpStats: null,
  collectionStats: null,
  showcaseCards: [],
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const data = await profileApi.getProfile();
      set({
        profile: data.profile,
        dailyStats: data.dailyStats,
        pvpStats: data.pvpStats,
        collectionStats: data.collectionStats,
        showcaseCards: data.showcaseCards,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Erreur lors du chargement du profil',
        loading: false,
      });
    }
  },

  updateProfile: async (data: UpdateProfileData) => {
    set({ loading: true, error: null });
    try {
      const updatedProfile = await profileApi.updateProfile(data);
      set({
        profile: updatedProfile,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Erreur lors de la mise à jour',
        loading: false,
      });
    }
  },
}));

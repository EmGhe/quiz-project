export interface DailyStats {
  currentStreak: number;
  longestStreak: number;
  totalDailyCompleted: number;
  averageSuccessRate: number;
  totalGoldEarned: number;
}

export interface PvPStats {
  currentRank: string;
  currentDivision: number;
  currentElo: number;
  totalVictories: number;
  totalDefeats: number;
  winrate: number;
  currentWinStreak: number;
}

export interface CollectionStats {
  totalCards: number;
  commonCount: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  favoriteCount: number;
}

export interface ShowcaseCard {
  id: string;
  imageUrl: string;
  rarity: string;
  entityLabel: string;
  description: string;
  wikipediaUrl: string | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  currentTitle: string;
}

export interface CompleteProfile {
  profile: UserProfile;
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
  showcaseCards: ShowcaseCard[];
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

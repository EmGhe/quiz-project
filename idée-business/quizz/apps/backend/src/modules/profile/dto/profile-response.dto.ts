export class DailyStats {
  currentStreak: number;
  longestStreak: number;
  totalDailyCompleted: number;
  averageSuccessRate: number;
  totalGoldEarned: number;
}

export class PvPStats {
  currentRank: string;
  currentDivision: number;
  currentElo: number;
  totalVictories: number;
  totalDefeats: number;
  winrate: number;
  currentWinStreak: number;
}

export class CollectionStats {
  totalCards: number;
  commonCount: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  favoriteCount: number;
}

export class ShowcaseCard {
  id: string;
  imageUrl: string;
  rarity: string;
  entityLabel: string;
  description: string;
  wikipediaUrl: string | null;
}

export class ProfileResponseDto {
  profile: {
    id: string;
    userId: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    currentTitle: string;
  };
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
  showcaseCards: ShowcaseCard[];
}

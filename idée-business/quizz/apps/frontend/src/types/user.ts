export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: string | null;
}

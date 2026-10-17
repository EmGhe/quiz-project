export type MatchStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled';

export interface PlayerProfile {
  id: string;
  username: string;
  elo: number;
  rank: string;
  division: number;
}

export interface PvpMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  status: MatchStatus;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  winnerId: string | null;
  questionIds: string[];
  startedAt: Date | null;
  completedAt: Date | null;
  player1?: PlayerProfile;
  player2?: PlayerProfile;
}

export interface MatchmakingStatus {
  inQueue: boolean;
  queueSize: number;
  estimatedWait: number;
  position?: number;
  waitTime?: number;
  eloRange?: number;
}

export interface MatchQuestion {
  id: string;
  text: string;
  questionType: 'texte' | 'image' | 'carte';
  mediaUrl: string | null;
  choices: string[]; // Shuffled: 1 correct answer + 4 distractors
}

export interface MatchResults {
  matchId: string;
  winnerId: string;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  player1CorrectAnswers?: number;
  player2CorrectAnswers?: number;
  eloChanges: Record<string, number>;
  abandoned?: boolean;
  abandonedBy?: string;
}

export interface AcceptedAnswer {
  id: string;
  questionId: string;
  answer: string;
  isPrimary: boolean;
  variantType: string | null;
  createdAt: string;
}

export interface DailyQuestion {
  questionId: string;
  text: string;
  questionType?: string; // 'texte' | 'image' | 'carte'
  mediaUrl?: string;
  order: number;
  acceptedAnswers: AcceptedAnswer[];
}

export interface DailySubmission {
  id: string;
  userId: string;
  dailyId: string;
  score: number;
  totalTime: number;
  correctCount: number;
  answersData: any[];
  submittedAt: string;
}

export interface Daily {
  dailyNumber: number;
  date: string;
  alreadyCompleted: boolean;
  submission: DailySubmission | null;
  questions: DailyQuestion[];
  serverTimestamp: number;
}

export interface AnswerSubmission {
  questionId: string;
  answer: string;
  timeMs: number;
}

export interface SubmitDailyResponse {
  submission: DailySubmission;
  dailyNumber: number;
}

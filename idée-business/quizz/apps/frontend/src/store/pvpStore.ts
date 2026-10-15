import { create } from 'zustand';
import type { MatchmakingStatus, PvpMatch, MatchQuestion, MatchResults } from '@/types/pvp';

interface PvpState {
  // Matchmaking
  matchmakingStatus: MatchmakingStatus;
  setMatchmakingStatus: (status: Partial<MatchmakingStatus>) => void;
  resetMatchmaking: () => void;

  // Current match
  currentMatch: PvpMatch | null;
  matchQuestions: MatchQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  questionTimes: Record<string, number>;

  setCurrentMatch: (match: PvpMatch | null) => void;
  setMatchQuestions: (questions: MatchQuestion[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  submitAnswer: (questionId: string, answer: string, timeMs: number) => void;

  // Match results
  matchResults: MatchResults | null;
  setMatchResults: (results: MatchResults | null) => void;

  // Reset all
  resetMatch: () => void;
}

const initialMatchmakingStatus: MatchmakingStatus = {
  inQueue: false,
  queueSize: 0,
  estimatedWait: 0,
};

export const usePvpStore = create<PvpState>((set) => ({
  // Matchmaking state
  matchmakingStatus: initialMatchmakingStatus,
  setMatchmakingStatus: (status) =>
    set((state) => ({
      matchmakingStatus: { ...state.matchmakingStatus, ...status },
    })),
  resetMatchmaking: () =>
    set({ matchmakingStatus: initialMatchmakingStatus }),

  // Match state
  currentMatch: null,
  matchQuestions: [],
  currentQuestionIndex: 0,
  answers: {},
  questionTimes: {},

  setCurrentMatch: (match) => set({ currentMatch: match }),
  setMatchQuestions: (questions) => set({ matchQuestions: questions }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  submitAnswer: (questionId, answer, timeMs) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
      questionTimes: { ...state.questionTimes, [questionId]: timeMs },
    })),

  // Results
  matchResults: null,
  setMatchResults: (results) => set({ matchResults: results }),

  // Reset
  resetMatch: () =>
    set({
      currentMatch: null,
      matchQuestions: [],
      currentQuestionIndex: 0,
      answers: {},
      questionTimes: {},
      matchResults: null,
    }),
}));

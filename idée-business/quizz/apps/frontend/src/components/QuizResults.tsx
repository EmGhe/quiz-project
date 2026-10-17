import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dailyApi } from '@/api/daily';
import type { DailySubmission, DailyQuestion } from '@/types/daily';
import ShareCard from './ShareCard';
import ReportQuestionModal from './ReportQuestionModal';

interface QuizResultsProps {
  submission: DailySubmission;
  dailyNumber: number;
  totalQuestions: number;
  questions: DailyQuestion[];
  currentStreak: number;
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  totalTime: number;
  correctCount: number;
}

export default function QuizResults({ submission, dailyNumber, totalQuestions, questions, currentStreak, onClose }: QuizResultsProps) {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);
  const [reportQuestionText, setReportQuestionText] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await dailyApi.getLeaderboard();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const userRank = leaderboard.find((entry) => entry.userId === submission.userId);
  const accuracy = ((submission.correctCount / totalQuestions) * 100).toFixed(1);
  const avgTimePerQuestion = (submission.totalTime / totalQuestions / 1000).toFixed(1);

  // Create map of questionId to question for easy lookup
  const questionMap = new Map(questions.map(q => [q.questionId, q]));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-8">
        {/* Results Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6 text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-4">
            Quiz Complete! 🎉
          </h1>
          <p className="text-gray-600">Daily Challenge #{dailyNumber}</p>
        </div>

        {/* Score Summary */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow-lg p-8 mb-6 text-white">
          <div className="text-center mb-6">
            <p className="text-lg opacity-90 mb-2">Your Score</p>
            <p className="text-6xl font-bold">{submission.score}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">Correct</p>
              <p className="text-2xl font-bold">{submission.correctCount}/{totalQuestions}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">Accuracy</p>
              <p className="text-2xl font-bold">{accuracy}%</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">Avg Time</p>
              <p className="text-2xl font-bold">{avgTimePerQuestion}s</p>
            </div>
          </div>
        </div>

        {/* Report Success Message */}
        {reportSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-center">
              ✅ Question signalée avec succès. Merci pour votre contribution !
            </p>
          </div>
        )}

        {/* Answer Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Answer Breakdown</h2>
          <div className="space-y-3">
            {submission.answersData.map((ans: any, idx: number) => {
              const question = questionMap.get(ans.questionId);
              const correctAnswer = question?.acceptedAnswers?.[0]?.answer || 'N/A';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    ans.correct
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="mb-2">
                        <span className={`font-bold ${ans.correct ? 'text-green-700' : 'text-red-700'}`}>
                          {ans.correct ? '✓' : '✗'}
                        </span>
                        <span className="ml-2 font-semibold text-gray-900">Question {idx + 1}: </span>
                        <span className="text-gray-700">{question?.text || 'Question text not available'}</span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        Your answer: <span className="font-medium">{ans.answer || '(no answer)'}</span>
                      </p>
                      {!ans.correct && (
                        <p className="text-gray-700 mt-1">
                          Correct answer: <span className="font-bold text-green-700">{correctAnswer}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{(ans.timeMs / 1000).toFixed(1)}s</p>
                      {ans.correct && (
                        <p className="text-green-700 font-bold">+{ans.pointsEarned} pts</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setReportQuestionId(ans.questionId);
                        setReportQuestionText(question?.text || 'Question text not available');
                        setShowReportModal(true);
                      }}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Signaler cette question
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Today's Leaderboard</h2>

          {loadingLeaderboard ? (
            <p className="text-gray-500 text-center py-4">Loading leaderboard...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No entries yet</p>
          ) : (
            <>
              {userRank && (
                <div className="bg-primary-50 border-2 border-primary-300 rounded-lg p-4 mb-4">
                  <p className="text-primary-700 font-bold">
                    Your Rank: #{userRank.rank}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Rank</th>
                      <th className="px-4 py-2 text-left">Player</th>
                      <th className="px-4 py-2 text-right">Score</th>
                      <th className="px-4 py-2 text-right">Correct</th>
                      <th className="px-4 py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 10).map((entry) => (
                      <tr
                        key={entry.userId}
                        className={`border-t ${
                          entry.userId === submission.userId
                            ? 'bg-primary-50 font-bold'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </td>
                        <td className="px-4 py-3">{entry.username}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600">
                          {entry.score}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.correctCount}/{totalQuestions}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {(entry.totalTime / 1000).toFixed(1)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Share Card */}
        <ShareCard
          dailyNumber={dailyNumber}
          score={submission.score}
          correctCount={submission.correctCount}
          totalQuestions={totalQuestions}
          currentStreak={currentStreak}
        />

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Back to Daily
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 font-medium"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Report Question Modal */}
      {showReportModal && reportQuestionId && (
        <ReportQuestionModal
          questionId={reportQuestionId}
          questionText={reportQuestionText}
          onClose={() => {
            setShowReportModal(false);
            setReportQuestionId(null);
            setReportQuestionText('');
          }}
          onSuccess={() => {
            setShowReportModal(false);
            setReportQuestionId(null);
            setReportQuestionText('');
            setReportSuccess(true);
            setTimeout(() => setReportSuccess(false), 5000);
          }}
        />
      )}
    </div>
  );
}

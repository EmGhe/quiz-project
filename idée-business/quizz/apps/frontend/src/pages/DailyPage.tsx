import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dailyApi } from '@/api/daily';
import type { Daily, AnswerSubmission, SubmitDailyResponse } from '@/types/daily';
import QuizResults from '@/components/QuizResults';

export default function DailyPage() {
  const { user, streak, logout } = useAuthStore();
  const navigate = useNavigate();

  const [daily, setDaily] = useState<Daily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitDailyResponse | null>(null);

  useEffect(() => {
    loadDaily();
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (!daily || daily.alreadyCompleted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto move to next or submit
          handleTimeUp();
          return 25; // Reset for next question
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, daily]);

  // Enter key handler for navigation
  useEffect(() => {
    if (!daily || daily.alreadyCompleted || showResults) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        if (currentQuestionIndex < daily.questions.length - 1) {
          // Not last question - go to next
          handleNext();
        } else {
          // Last question - submit
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestionIndex, daily, answers, showResults]);

  const loadDaily = async () => {
    try {
      setLoading(true);
      const data = await dailyApi.getToday();
      setDaily(data);
      setQuestionStartTime(Date.now());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load daily');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAnswerChange = (value: string) => {
    if (!daily) return;
    const currentQuestion = daily.questions[currentQuestionIndex];
    setAnswers({ ...answers, [currentQuestion.questionId]: value });
  };

  const recordQuestionTime = () => {
    if (!daily) return;
    const currentQuestion = daily.questions[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime;
    // Cap at 25000ms (25 seconds max per question)
    const cappedTime = Math.min(timeSpent, 25000);
    setQuestionTimes({ ...questionTimes, [currentQuestion.questionId]: cappedTime });
  };

  const handleTimeUp = () => {
    recordQuestionTime();
    if (!daily) return;

    if (currentQuestionIndex < daily.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
      setTimeLeft(25);
    } else {
      // Last question - auto submit
      handleSubmit();
    }
  };

  const handleNext = () => {
    recordQuestionTime();
    if (!daily) return;
    if (currentQuestionIndex < daily.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
      setTimeLeft(25);
    }
  };

  const handleSubmit = async () => {
    if (!daily) return;

    // Record time for current question before submitting
    recordQuestionTime();

    // Build submissions with actual recorded times (capped at 25000ms)
    const submissions: AnswerSubmission[] = daily.questions.map((q) => ({
      questionId: q.questionId,
      answer: answers[q.questionId] || '',
      timeMs: Math.min(questionTimes[q.questionId] || 25000, 25000), // Cap at 25s max
    }));

    try {
      const result = await dailyApi.submit(submissions);
      setSubmissionResult(result);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading daily quiz...</div>
      </div>
    );
  }

  if (showResults && submissionResult && daily) {
    return (
      <QuizResults
        submission={submissionResult.submission}
        dailyNumber={submissionResult.dailyNumber}
        totalQuestions={daily.questions.length}
        questions={daily.questions}
        onClose={() => {
          setShowResults(false);
          loadDaily();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadDaily}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!daily) return null;

  // If already completed, show completion message
  if (daily.alreadyCompleted && daily.submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-primary-600 mb-2">
                  Daily Challenge #{daily.dailyNumber}
                </h1>
                <p className="text-gray-600">Welcome, {user?.username}!</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Streak Display */}
          {streak && (
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-md p-6 mb-6 text-white">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    🔥 {streak.currentStreak}
                  </div>
                  <p className="text-sm opacity-90">Current Streak</p>
                  <p className="text-xs opacity-75 mt-1">
                    {streak.currentStreak === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div className="h-16 w-px bg-white opacity-30"></div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    🏆 {streak.longestStreak}
                  </div>
                  <p className="text-sm opacity-90">Longest Streak</p>
                  <p className="text-xs opacity-75 mt-1">
                    {streak.longestStreak === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              ✅ Already Completed!
            </h2>
            <p className="text-green-700 mb-6">
              You've already completed today's daily challenge.
            </p>
            <div className="bg-white rounded-lg p-6 inline-block">
              <p className="text-gray-600 mb-2">Your Score</p>
              <p className="text-4xl font-bold text-primary-600">
                {daily.submission.score}
              </p>
              <p className="text-gray-600 mt-2">
                {daily.submission.correctCount}/{daily.questions.length} correct
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = daily.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.questionId] || '';
  const progress = ((currentQuestionIndex + 1) / daily.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary-600 mb-2">
                Daily Challenge #{daily.dailyNumber}
              </h1>
              <p className="text-gray-600">Date: {daily.date}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Streak Display */}
        {streak && (
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-md p-6 mb-6 text-white">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  🔥 {streak.currentStreak}
                </div>
                <p className="text-sm opacity-90">Current Streak</p>
                <p className="text-xs opacity-75 mt-1">
                  {streak.currentStreak === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className="h-16 w-px bg-white opacity-30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  🏆 {streak.longestStreak}
                </div>
                <p className="text-sm opacity-90">Longest Streak</p>
                <p className="text-xs opacity-75 mt-1">
                  {streak.longestStreak === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {daily.questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex justify-center mb-4">
          <div className={`
            px-6 py-3 rounded-lg font-bold text-2xl
            ${timeLeft <= 5 ? 'bg-red-100 text-red-700 animate-pulse' :
              timeLeft <= 10 ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'}
          `}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="mb-6">
            <span className="text-sm text-gray-500">
              Question {currentQuestion.order}
            </span>
            <h2 className="text-2xl font-semibold mt-2">
              {currentQuestion.text}
            </h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer
            </label>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              placeholder="Type your answer here..."
              autoFocus
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          {currentQuestionIndex < daily.questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dailyApi } from '@/api/daily';
import type { Daily, AnswerSubmission } from '@/types/daily';

export default function DailyPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [daily, setDaily] = useState<Daily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  useEffect(() => {
    loadDaily();
  }, []);

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

  const handleNext = () => {
    if (!daily) return;
    if (currentQuestionIndex < daily.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    if (!daily) return;

    // TODO: Task 7 will add proper timing per question
    // For now, use placeholder timing
    const submissions: AnswerSubmission[] = daily.questions.map((q) => ({
      questionId: q.questionId,
      answer: answers[q.questionId] || '',
      timeMs: 5000, // Placeholder
    }));

    try {
      const result = await dailyApi.submit(submissions);
      console.log('Submitted!', result);
      // TODO: Task 8 will show results page
      alert(`Quiz submitted! Score: ${result.submission.score}`);
      loadDaily(); // Reload to show completion state
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
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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
  const allAnswered = daily.questions.every((q) => answers[q.questionId]?.trim());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            ← Previous
          </button>

          <div className="text-gray-600">
            {daily.questions.filter((q) => answers[q.questionId]?.trim()).length} / {daily.questions.length} answered
          </div>

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
              disabled={!allAnswered}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Submit Quiz
            </button>
          )}
        </div>

        {!allAnswered && currentQuestionIndex === daily.questions.length - 1 && (
          <p className="text-center text-orange-600 mt-4">
            Please answer all questions before submitting
          </p>
        )}
      </div>
    </div>
  );
}

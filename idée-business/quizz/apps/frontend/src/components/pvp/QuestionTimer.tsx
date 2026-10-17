interface QuestionTimerProps {
  timeLeft: number;
  matchPhase?: 'waiting' | 'ready' | 'playing';
}

export default function QuestionTimer({ timeLeft, matchPhase = 'playing' }: QuestionTimerProps) {
  const percentage = (timeLeft / 10) * 100;
  const isUrgent = timeLeft <= 3;

  // Show "Ready?" when waiting, "Go!" when ready
  if (matchPhase === 'waiting') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <span className="text-6xl font-bold text-purple-600 animate-pulse">
            Ready?
          </span>
        </div>
      </div>
    );
  }

  if (matchPhase === 'ready') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <span className="text-6xl font-bold text-green-600 animate-bounce">
            Go!
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-600">Temps restant</span>
        <span className={`text-3xl font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ease-linear ${
            isUrgent ? 'bg-red-500' : percentage > 50 ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

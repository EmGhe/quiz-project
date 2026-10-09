import { useState } from 'react';

interface ShareCardProps {
  dailyNumber: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  currentStreak: number;
}

export default function ShareCard({ dailyNumber, score, correctCount, totalQuestions, currentStreak }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const emoji = correctCount === totalQuestions ? '🏆' : correctCount >= 7 ? '🔥' : correctCount >= 5 ? '💪' : '📚';

    return `Quiz Game - Daily Challenge #${dailyNumber}

${emoji} Score: ${score} points
✓ ${correctCount}/${totalQuestions} correct
${currentStreak > 0 ? `🔥 ${currentStreak} day streak` : ''}

Peux-tu faire mieux ? 🎯`;
  };

  const handleCopyToClipboard = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareTwitter = () => {
    const text = generateShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const accuracy = ((correctCount / totalQuestions) * 100).toFixed(0);
  const emoji = correctCount === totalQuestions ? '🏆' : correctCount >= 7 ? '🔥' : correctCount >= 5 ? '💪' : '📚';

  return (
    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow-lg p-8 text-white">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">{emoji}</div>
        <h3 className="text-2xl font-bold mb-2">Daily Challenge #{dailyNumber}</h3>
        <p className="text-lg opacity-90">Partage ton score !</p>
      </div>

      {/* Score Display */}
      <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6 text-center">
        <p className="text-sm opacity-90 mb-2">Ton Score</p>
        <p className="text-5xl font-bold mb-4">{score}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold">{correctCount}/{totalQuestions}</p>
            <p className="text-sm opacity-75">Correct</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{accuracy}%</p>
            <p className="text-sm opacity-75">Précision</p>
          </div>
        </div>
        {currentStreak > 0 && (
          <div className="mt-4 pt-4 border-t border-white border-opacity-30">
            <p className="text-2xl font-bold">🔥 {currentStreak} jour{currentStreak > 1 ? 's' : ''}</p>
            <p className="text-sm opacity-75">Streak actuelle</p>
          </div>
        )}
      </div>

      {/* Share Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleCopyToClipboard}
          className="w-full bg-white text-primary-600 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
        >
          {copied ? '✓ Copié !' : '📋 Copier le texte'}
        </button>

        <button
          onClick={handleShareTwitter}
          className="w-full bg-blue-400 text-white py-3 rounded-lg font-semibold hover:bg-blue-500 transition-all"
        >
          🐦 Partager sur Twitter
        </button>
      </div>

      {/* Preview Text */}
      <div className="mt-6 bg-black bg-opacity-20 rounded-lg p-4">
        <p className="text-xs opacity-75 mb-2">Aperçu du texte:</p>
        <pre className="text-sm whitespace-pre-line">{generateShareText()}</pre>
      </div>
    </div>
  );
}

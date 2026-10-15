import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePvpStore } from '@/store/pvpStore';

export default function PvpResultsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    currentMatch,
    matchResults,
    resetMatch,
  } = usePvpStore();

  useEffect(() => {
    if (!user || !matchResults) {
      navigate('/pvp');
      return;
    }
  }, [user, matchResults]);

  if (!matchResults || !currentMatch) {
    return null;
  }

  const isPlayer1 = currentMatch.player1Id === user?.id;
  const isWinner = matchResults.winnerId === user?.id;
  const myScore = isPlayer1 ? matchResults.player1Score : matchResults.player2Score;
  const opponentScoreVal = isPlayer1 ? matchResults.player2Score : matchResults.player1Score;
  const myEloChange = matchResults.eloChanges[user!.id];

  const handleBackToMatchmaking = () => {
    resetMatch();
    navigate('/pvp');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        {/* Result banner */}
        <div className={`text-center mb-8 p-6 rounded-lg ${isWinner ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="text-6xl mb-4">{isWinner ? '🏆' : '😔'}</div>
          <h1 className={`text-4xl font-bold ${isWinner ? 'text-green-800' : 'text-red-800'}`}>
            {isWinner ? 'VICTOIRE !' : 'DÉFAITE'}
          </h1>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${isWinner ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-2">Vous</div>
            <div className="text-4xl font-bold text-gray-800 mb-2">{myScore}</div>
            <div className="text-sm text-gray-600">points</div>
          </div>
          <div className={`p-6 rounded-lg ${!isWinner ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-2">Adversaire</div>
            <div className="text-4xl font-bold text-gray-800 mb-2">{opponentScoreVal}</div>
            <div className="text-sm text-gray-600">points</div>
          </div>
        </div>

        {/* ELO change */}
        <div className="bg-purple-50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Changement ELO</div>
            <div className={`text-5xl font-bold ${myEloChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {myEloChange >= 0 ? '+' : ''}{myEloChange}
            </div>
          </div>
        </div>

        {/* Match stats */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Statistiques du match</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Temps total</div>
              <div className="text-xl font-bold text-gray-800">
                {formatTime(isPlayer1 ? matchResults.player1Time : matchResults.player2Time)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Questions réussies</div>
              <div className="text-xl font-bold text-gray-800">
                {Math.round((myScore / 200) * 10)}/10
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleBackToMatchmaking}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
          >
            Nouveau match
          </button>
          <button
            onClick={() => navigate('/daily')}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition"
          >
            Retour au menu
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

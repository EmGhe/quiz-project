import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePvpStore } from '@/store/pvpStore';
import { websocketService } from '@/services/websocket';

export default function PvpResultsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    currentMatch,
    matchResults,
    resetMatch,
  } = usePvpStore();

  // Rematch state
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchReceived, setRematchReceived] = useState(false);
  const [rematchTimeLeft, setRematchTimeLeft] = useState(10);

  useEffect(() => {
    if (!user || !matchResults) {
      navigate('/pvp');
      return;
    }
  }, [user, matchResults]);

  // Setup rematch event listeners
  useEffect(() => {
    const socket = websocketService.getSocket();
    if (!socket) return;

    const handleRematchRequest = () => {
      console.log('[Results] Received rematch request');
      setRematchReceived(true);
      setRematchTimeLeft(10);
    };

    const handleMatchCreated = (data: any) => {
      console.log('[Results] New match created for rematch:', data);
      // Reset all match state for fresh start
      const store = usePvpStore.getState();
      store.resetMatch();
      store.setCurrentMatch(data);
      // Navigate to new match
      navigate('/pvp/match');
    };

    const handleRematchDeclined = () => {
      console.log('[Results] Rematch declined');
      alert('Votre adversaire a refusé la revanche.');
      navigate('/pvp');
    };

    socket.on('rematch:request', handleRematchRequest);
    socket.on('match:created', handleMatchCreated);
    socket.on('rematch:declined', handleRematchDeclined);

    return () => {
      socket.off('rematch:request', handleRematchRequest);
      socket.off('match:created', handleMatchCreated);
      socket.off('rematch:declined', handleRematchDeclined);
    };
  }, [navigate]);

  // Rematch timeout countdown
  useEffect(() => {
    if (!rematchReceived) return;

    if (rematchTimeLeft <= 0) {
      // Auto-decline on timeout
      websocketService.declineRematch(currentMatch!.id);
      setRematchReceived(false);
      navigate('/pvp');
      return;
    }

    const timer = setInterval(() => {
      setRematchTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [rematchReceived, rematchTimeLeft, currentMatch, navigate]);

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

  const handleRematchRequest = () => {
    if (!currentMatch) return;

    const opponentId = currentMatch.player1Id === user?.id
      ? currentMatch.player2Id
      : currentMatch.player1Id;

    websocketService.requestRematch(currentMatch.id, opponentId);
    setRematchRequested(true);
  };

  const handleAcceptRematch = () => {
    if (!currentMatch) return;
    websocketService.acceptRematch(currentMatch.id);
    setRematchReceived(false);
  };

  const handleDeclineRematch = () => {
    if (!currentMatch) return;
    websocketService.declineRematch(currentMatch.id);
    setRematchReceived(false);
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
                {isPlayer1 ? matchResults.player1CorrectAnswers : matchResults.player2CorrectAnswers}/10
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleRematchRequest}
            disabled={rematchRequested}
            className={`flex-1 px-6 py-3 font-bold rounded-lg shadow-lg transform transition ${
              rematchRequested
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white hover:scale-105'
            }`}
          >
            {rematchRequested ? 'En attente...' : 'Revanche'}
          </button>
          <button
            onClick={handleBackToMatchmaking}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition"
          >
            Retour au menu
          </button>
        </div>

        {/* Rematch request popup */}
        {rematchReceived && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚔️</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Demande de revanche !
                </h2>
                <p className="text-gray-600">
                  Votre adversaire souhaite rejouer contre vous
                </p>
              </div>

              {/* Countdown timer */}
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Temps restant</div>
                  <div className="text-4xl font-bold text-purple-600">{rematchTimeLeft}s</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAcceptRematch}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
                >
                  Accepter
                </button>
                <button
                  onClick={handleDeclineRematch}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
                >
                  Refuser
                </button>
              </div>
            </div>
          </div>
        )}
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

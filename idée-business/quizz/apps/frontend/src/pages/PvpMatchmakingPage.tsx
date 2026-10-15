import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePvpStore } from '@/store/pvpStore';
import { websocketService } from '@/services/websocket';

export default function PvpMatchmakingPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    matchmakingStatus,
    setMatchmakingStatus,
    resetMatchmaking,
    setCurrentMatch,
    setMatchQuestions,
    resetMatch,
  } = usePvpStore();

  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Connect to WebSocket
    initializeWebSocket();

    return () => {
      // Clean up on unmount
      if (matchmakingStatus.inQueue) {
        websocketService.leaveQueue();
      }
      websocketService.disconnect();
      resetMatchmaking();
    };
  }, []);

  const initializeWebSocket = async () => {
    try {
      setConnecting(true);
      setConnected(false);

      // Connect to WebSocket (uses HTTP-only cookies for auth)
      const socket = websocketService.connect();

      // Handle connection events
      socket.on('connect', () => {
        console.log('[WebSocket] Connected successfully');
        setConnected(true);
        setConnecting(false);
        setError('');
      });

      socket.on('disconnect', () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
      });

      socket.on('connect_error', (err: any) => {
        console.error('[WebSocket] Connection error:', err);
        setError('Erreur de connexion WebSocket');
        setConnected(false);
        setConnecting(false);
      });

      // Listen to matchmaking events
      socket.on('matchmaking:joined', (data: { queueSize: number; estimatedWait: number }) => {
        console.log('[Matchmaking] Joined queue:', data);
        setMatchmakingStatus({
          inQueue: true,
          queueSize: data.queueSize,
          estimatedWait: data.estimatedWait,
        });
      });

      socket.on('matchmaking:left', () => {
        console.log('[Matchmaking] Left queue');
        resetMatchmaking();
      });

      socket.on('match:created', (data: any) => {
        console.log('[Match] Created:', data);
        setCurrentMatch(data);
        resetMatchmaking();
      });

      socket.on('match:start', (data: { questions: any[] }) => {
        console.log('[Match] Starting with questions:', data.questions);
        setMatchQuestions(data.questions);
        // Navigate to match page
        navigate('/pvp/match');
      });

      socket.on('match:cancelled', (data: { reason: string }) => {
        console.log('[Match] Cancelled:', data.reason);
        setError(`Match annulé: ${data.reason}`);
        resetMatch();
        resetMatchmaking();
      });
    } catch (err: any) {
      console.error('[WebSocket] Init error:', err);
      setError('Erreur de connexion au serveur');
      setConnecting(false);
      setConnected(false);
    }
  };

  const handleFindMatch = () => {
    if (!connected) {
      setError('Connexion WebSocket en cours... Patientez quelques secondes.');
      return;
    }

    setError('');
    websocketService.joinQueue();
  };

  const handleCancelSearch = () => {
    websocketService.leaveQueue();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (!user) {
    return null;
  }

  if (connecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connexion au serveur PvP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">PvP Matchmaking</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Bienvenue, {user.username}</span>
            <button
              onClick={() => navigate('/daily')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Daily
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Matchmaking card */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Affrontement PvP
              </h2>
              <p className="text-gray-600">
                Affronte d'autres joueurs dans un duel de connaissances !
              </p>
            </div>

            {!matchmakingStatus.inQueue ? (
              // Not in queue - show Find Match button
              <div className="text-center">
                <button
                  onClick={handleFindMatch}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white text-xl font-bold rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={!connected || connecting}
                >
                  {connecting ? '🔄 Connexion...' : connected ? '🎮 Trouver un adversaire' : '⏳ Connexion WebSocket...'}
                </button>

                {connected && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Connecté au serveur PvP
                  </div>
                )}

                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">10</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">30s</div>
                    <div className="text-sm text-gray-600">Par question</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">ELO</div>
                    <div className="text-sm text-gray-600">Classement</div>
                  </div>
                </div>
              </div>
            ) : (
              // In queue - show status
              <div className="text-center">
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mx-auto mb-4"></div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Recherche d'adversaire...
                  </h3>
                  <p className="text-gray-600">
                    Temps d'attente estimé: {formatTime(matchmakingStatus.estimatedWait)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {matchmakingStatus.queueSize}
                    </div>
                    <div className="text-sm text-gray-600">Joueurs en file</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {matchmakingStatus.position || '...'}
                    </div>
                    <div className="text-sm text-gray-600">Position</div>
                  </div>
                </div>

                <button
                  onClick={handleCancelSearch}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
                >
                  Annuler la recherche
                </button>
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="mt-8 bg-white bg-opacity-90 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Comment jouer ?
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">1️⃣</span>
                <span>Clique sur "Trouver un adversaire" pour rejoindre la file d'attente</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2️⃣</span>
                <span>Une fois l'adversaire trouvé, le match commence immédiatement</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3️⃣</span>
                <span>Réponds aux 10 questions le plus rapidement possible</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4️⃣</span>
                <span>Plus tu réponds vite, plus tu gagnes de points !</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">5️⃣</span>
                <span>Le joueur avec le meilleur score gagne et monte en ELO</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

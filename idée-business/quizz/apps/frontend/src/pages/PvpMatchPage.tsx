import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePvpStore } from '@/store/pvpStore';
import { websocketService } from '@/services/websocket';
import QuestionTimer from '@/components/pvp/QuestionTimer';
import MCQChoice from '@/components/pvp/MCQChoice';

export default function PvpMatchPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    currentMatch,
    matchQuestions,
    currentQuestionIndex,
    playerAnswer,
    opponentAnswered,
    setPlayerAnswer,
    setOpponentAnswered,
    resetPlayerAnswer,
    setCurrentQuestionIndex,
    playerScore,
    opponentScore,
  } = usePvpStore();

  const [timeLeft, setTimeLeft] = useState(10);
  const [matchPhase, setMatchPhase] = useState<'waiting' | 'ready' | 'playing'>('waiting');
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealData, setRevealData] = useState<any>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Check user and match
  useEffect(() => {
    if (!user || !currentMatch) {
      console.log('[Match] No user or match, redirecting to /pvp');
      navigate('/pvp');
      return;
    }
  }, [user, currentMatch, navigate]);

  // Wait for questions to load
  useEffect(() => {
    if (!currentMatch) return;

    if (matchQuestions.length === 0) {
      console.log('[Match] Waiting for questions to load...');
      const timeout = setTimeout(() => {
        if (matchQuestions.length === 0) {
          console.error('[Match] No questions received, redirecting');
          navigate('/pvp');
        }
      }, 3000);

      return () => clearTimeout(timeout);
    } else {
      console.log('[Match] Questions loaded:', matchQuestions.length);
    }
  }, [matchQuestions, currentMatch, navigate]);

  // Attach WebSocket event listeners ONCE on mount
  useEffect(() => {
    const socket = websocketService.getSocket();

    if (!socket) {
      console.error('[Match] WebSocket not connected');
      return;
    }

    console.log('[Match] Attaching WebSocket event listeners (once)');

    socket.on('match:question_start', handleQuestionStart);
    socket.on('match:question_end', handleQuestionEnd);
    socket.on('match:player_answered', handlePlayerAnswered);
    socket.on('match:complete', handleMatchComplete);
    socket.on('match:cancelled', handleMatchCancelled);

    // Cleanup on unmount: remove all listeners for these events
    return () => {
      console.log('[Match] Removing all match event listeners');
      socket.removeAllListeners('match:question_start');
      socket.removeAllListeners('match:question_end');
      socket.removeAllListeners('match:player_answered');
      socket.removeAllListeners('match:complete');
      socket.removeAllListeners('match:cancelled');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = attach once on mount, never re-attach

  const handleQuestionStart = (data: { questionIndex: number; timerMs: number }) => {
    console.log('[Match] Question start:', data);

    // Update question index in store
    setCurrentQuestionIndex(data.questionIndex);

    // Clear previous timer if exists
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    setTimeLeft(data.timerMs / 1000);
    setIsRevealing(false);
    setRevealData(null);
    resetPlayerAnswer();
    setOpponentAnswered(false);
    setQuestionStartTime(Date.now());

    // First question: show "Go!" then start timer
    if (data.questionIndex === 0) {
      setMatchPhase('ready');
      setTimeout(() => {
        setMatchPhase('playing');
        // Start countdown timer after "Go!" message
        const interval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(interval);
      }, 1000); // Show "Go!" for 1 second
    } else {
      // Subsequent questions: start timer immediately
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    }
  };

  const handleQuestionEnd = (data: any) => {
    console.log('[Match] Question end:', data);
    setIsRevealing(true);
    setRevealData(data);
    setTimeLeft(0);

    // Update scores based on reveal data
    const isPlayer1 = currentMatch!.player1Id === user?.id;
    const myNewScore = isPlayer1
      ? (playerScore + (data.player1Correct ? calculatePoints(data.player1Time) : 0))
      : (playerScore + (data.player2Correct ? calculatePoints(data.player2Time) : 0));
    const oppNewScore = isPlayer1
      ? (opponentScore + (data.player2Correct ? calculatePoints(data.player2Time) : 0))
      : (opponentScore + (data.player1Correct ? calculatePoints(data.player1Time) : 0));

    usePvpStore.getState().updateScores(myNewScore, oppNewScore);
  };

  const handlePlayerAnswered = (data: { playerId: string; questionIndex: number }) => {
    console.log('[Match] Player answered:', data);
    if (data.playerId !== user?.id) {
      setOpponentAnswered(true);
    }
  };

  const handleMatchComplete = (data: any) => {
    console.log('[Match] Complete:', data);

    // Store results in store
    usePvpStore.getState().setMatchResults({
      matchId: data.matchId,
      winnerId: data.winnerId,
      player1Score: data.player1Score,
      player2Score: data.player2Score,
      player1Time: data.player1Time,
      player2Time: data.player2Time,
      eloChanges: data.eloChanges,
    });

    // Navigate to results after 2 seconds
    setTimeout(() => {
      navigate('/pvp/results');
    }, 2000);
  };

  const handleMatchCancelled = (data: { reason: string }) => {
    console.log('[Match] Cancelled:', data.reason);
    alert(`Match annulé: ${data.reason}`);
    navigate('/pvp');
  };

  const handleChoiceClick = (choice: string) => {
    if (playerAnswer || isRevealing) return;

    const timeTaken = Date.now() - questionStartTime;

    setPlayerAnswer(choice);

    // Submit to backend
    websocketService.submitAnswer(
      currentMatch!.id,
      currentQuestionIndex,
      choice,
      timeTaken,
    );
  };

  if (!currentMatch) {
    return null;
  }

  if (matchQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du match...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = matchQuestions[currentQuestionIndex];
  const isPlayer1 = currentMatch.player1Id === user?.id;
  const myProfile = isPlayer1 ? currentMatch.player1 : currentMatch.player2;
  const opponentProfile = isPlayer1 ? currentMatch.player2 : currentMatch.player1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      {/* Header - Scores */}
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Player 1 */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {isPlayer1 ? 'VOUS' : 'ADV'}
              </div>
              <div>
                <div className="font-bold text-gray-800">
                  {myProfile?.username || user?.username}
                </div>
                <div className="text-xs text-gray-600">
                  {myProfile?.rank} {myProfile?.division} • {myProfile?.elo} ELO
                </div>
                <div className="text-2xl font-bold text-purple-600">{playerScore} pts</div>
              </div>
            </div>

            {/* Question progress */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Question</div>
              <div className="text-2xl font-bold text-gray-800">{currentQuestionIndex + 1}/10</div>
            </div>

            {/* Player 2 */}
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {!isPlayer1 ? 'VOUS' : 'ADV'}
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-800">
                  {opponentProfile?.username || 'Adversaire'}
                </div>
                <div className="text-xs text-gray-600">
                  {opponentProfile?.rank} {opponentProfile?.division} • {opponentProfile?.elo} ELO
                </div>
                <div className="text-2xl font-bold text-blue-600">{opponentScore} pts</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Timer */}
          <QuestionTimer timeLeft={timeLeft} matchPhase={matchPhase} />

          {/* Question card */}
          <div className="bg-white rounded-lg shadow-xl p-8 mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {currentQuestion.text}
              </h2>
              {currentQuestion.mediaUrl && (
                <img
                  src={currentQuestion.mediaUrl}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg mb-4"
                />
              )}
            </div>

            {/* MCQ Choices */}
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => (
                <MCQChoice
                  key={index}
                  choice={choice}
                  index={index}
                  isSelected={playerAnswer === choice}
                  isRevealing={isRevealing}
                  isCorrect={revealData?.correctAnswer === choice}
                  onClick={() => handleChoiceClick(choice)}
                  disabled={!!playerAnswer || isRevealing}
                />
              ))}
            </div>

            {/* Reveal phase - show points gained */}
            {isRevealing && revealData && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Résultats</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${revealData.player1Correct ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-bold">{isPlayer1 ? 'Vous' : 'Adversaire'}</div>
                    <div className="text-2xl font-bold">
                      {revealData.player1Correct ? `+${calculatePoints(revealData.player1Time)} pts` : '0 pts'}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${revealData.player2Correct ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-bold">{!isPlayer1 ? 'Vous' : 'Adversaire'}</div>
                    <div className="text-2xl font-bold">
                      {revealData.player2Correct ? `+${calculatePoints(revealData.player2Time)} pts` : '0 pts'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function calculatePoints(timeMs: number): number {
  if (!timeMs) return 0;
  const basePoints = 100;
  const maxTime = 10000;
  const timeBonus = Math.max(0, maxTime - timeMs) / maxTime;
  return Math.round(basePoints * (1 + timeBonus));
}

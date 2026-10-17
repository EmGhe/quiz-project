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
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);

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
    socket.on('match:abandoned', handleMatchAbandoned);

    // Cleanup on unmount: remove all listeners for these events
    return () => {
      console.log('[Match] Removing all match event listeners');
      socket.removeAllListeners('match:question_start');
      socket.removeAllListeners('match:question_end');
      socket.removeAllListeners('match:player_answered');
      socket.removeAllListeners('match:complete');
      socket.removeAllListeners('match:cancelled');
      socket.removeAllListeners('match:abandoned');
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
    // Use getState() to avoid stale closure capturing initial 0 values
    const currentScores = usePvpStore.getState();
    const isPlayer1 = currentMatch!.player1Id === user?.id;

    // Debug logs
    console.log('[Match] Current scores before update:', {
      playerScore: currentScores.playerScore,
      opponentScore: currentScores.opponentScore,
    });
    console.log('[Match] Calculating new scores:', {
      isPlayer1,
      player1Correct: data.player1Correct,
      player1Time: data.player1Time,
      player1Points: data.player1Correct ? calculatePoints(data.player1Time) : 0,
      player2Correct: data.player2Correct,
      player2Time: data.player2Time,
      player2Points: data.player2Correct ? calculatePoints(data.player2Time) : 0,
    });

    // Update correct answers counter
    const isMyAnswerCorrect = isPlayer1 ? data.player1Correct : data.player2Correct;
    console.log('[Match] Updating correct answers counter:', {
      isPlayer1,
      isMyAnswerCorrect,
      player1Correct: data.player1Correct,
      player2Correct: data.player2Correct,
    });
    if (isMyAnswerCorrect) {
      setCorrectAnswers((prev) => {
        const newCount = prev + 1;
        console.log('[Match] Correct answers updated:', prev, '->', newCount);
        return newCount;
      });
    }
    setTotalAnswered((prev) => prev + 1);

    const myNewScore = isPlayer1
      ? (currentScores.playerScore + (data.player1Correct ? calculatePoints(data.player1Time) : 0))
      : (currentScores.playerScore + (data.player2Correct ? calculatePoints(data.player2Time) : 0));
    const oppNewScore = isPlayer1
      ? (currentScores.opponentScore + (data.player2Correct ? calculatePoints(data.player2Time) : 0))
      : (currentScores.opponentScore + (data.player1Correct ? calculatePoints(data.player1Time) : 0));

    console.log('[Match] New scores:', { myNewScore, oppNewScore });
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
      player1CorrectAnswers: data.player1CorrectAnswers,
      player2CorrectAnswers: data.player2CorrectAnswers,
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

  const handleMatchAbandoned = (data: any) => {
    console.log('[Match] Abandoned:', data);

    // Store results (no scores, just ELO changes)
    usePvpStore.getState().setMatchResults({
      matchId: data.matchId,
      winnerId: data.winnerId,
      player1Score: 0,
      player2Score: 0,
      player1Time: 0,
      player2Time: 0,
      eloChanges: data.eloChanges,
      abandoned: true,
      abandonedBy: data.abandonedBy,
    });

    // Navigate to results immediately
    navigate('/pvp/results');
  };

  const handleAbandonClick = () => {
    if (!currentMatch) return;

    setShowAbandonDialog(true);
  };

  const confirmAbandon = () => {
    if (!currentMatch) return;

    console.log('[Match] User confirms abandon');
    websocketService.getSocket()?.emit('match:abandon', { matchId: currentMatch.id });
    setShowAbandonDialog(false);
  };

  const cancelAbandon = () => {
    setShowAbandonDialog(false);
  };

  const handleChoiceClick = (choice: string) => {
    if (playerAnswer || isRevealing) {
      console.log('[Match] Click ignored - already answered or revealing');
      return;
    }

    const timeTaken = Date.now() - questionStartTime;

    console.log('[Match] 🔍 DEBUG currentMatch:', currentMatch);
    console.log('[Match] 🔍 DEBUG currentMatch.id:', currentMatch?.id);

    console.log('[Match] ✅ Choice clicked:', {
      choice,
      matchId: currentMatch!.id,
      questionIndex: currentQuestionIndex,
      timeTaken,
    });

    setPlayerAnswer(choice);

    // Submit to backend
    console.log('[Match] 📤 Submitting answer to backend...');
    websocketService.submitAnswer(
      currentMatch!.id,
      currentQuestionIndex,
      choice,
      timeTaken,
    );
    console.log('[Match] ✅ Answer submitted');
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
                <div className="text-xs text-gray-600">Questions réussies: {correctAnswers}/10</div>
              </div>
            </div>

            {/* Question progress + Abandon button */}
            <div className="text-center flex flex-col gap-2">
              <div>
                <div className="text-sm text-gray-600">Question</div>
                <div className="text-2xl font-bold text-gray-800">{currentQuestionIndex + 1}/10</div>
              </div>
              <button
                onClick={handleAbandonClick}
                className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                Abandonner
              </button>
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
          </div>
        </div>
      </div>

      {/* Abandon Dialog */}
      {showAbandonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Abandonner le match ?
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir quitter la partie ? Vous risquez de perdre de l'ELO.
            </p>
            <div className="flex gap-4">
              <button
                onClick={cancelAbandon}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded transition-colors"
              >
                Non
              </button>
              <button
                onClick={confirmAbandon}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
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

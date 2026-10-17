# PVP Technical Guidelines

Documentation technique des learnings et bonnes pratiques découverts lors de l'implémentation du système PVP.

**Dernière mise à jour :** 2026-10-17

---

## Vue d'ensemble de l'architecture

### Stack technique

- **Backend :** NestJS 12 + Socket.io + Prisma + PostgreSQL
- **Frontend :** React 18 + Zustand + Socket.io-client
- **Transport :** WebSocket (Socket.io) avec authentification JWT

### Flux de données

```
Client 1                    Backend                     Client 2
   |                           |                            |
   |--[matchmaking:join]------>|                            |
   |                           |<---[matchmaking:join]------|
   |                           |                            |
   |                    [Matchmaking Service]               |
   |                     trouve un adversaire               |
   |                           |                            |
   |<----[match:created]-------|------[match:created]------>|
   |                           |                            |
   |                    [Match Service]                     |
   |                   charge 10 questions                  |
   |                           |                            |
   |<-----[match:start]--------|-------[match:start]------->|
   |                           |                            |
   |  Questions 0-9, boucle :  |                            |
   |<--[match:question_start]--|--[match:question_start]--->|
   |                           |                            |
   |--[answer:submit]--------->|                            |
   |                           |<------[answer:submit]------|
   |                           |                            |
   |                    Timer expire (10s)                  |
   |                           |                            |
   |<---[match:question_end]---|---[match:question_end]---->|
   |                           |                            |
   |                    Question suivante                   |
   |                           |                            |
   |  Après question 9 :       |                            |
   |<---[match:complete]-------|----[match:complete]------->|
```

---

## Bugs critiques rencontrés

### 1. Bug du Match ID (matchId vs id)

**Symptôme :** Les réponses n'étaient pas soumises au backend, les scores restaient à 0.

**Cause :** Incompatibilité entre le nom de propriété envoyé par le backend et celui attendu par le frontend.

**Backend :**
```typescript
// ❌ Mauvais
this.pvpGateway.sendToMatch(match.id, 'match:created', {
  matchId: match.id,  // Backend envoie "matchId"
  player1Id,
  player2Id,
  ...
});
```

**Frontend :**
```typescript
// Type attendu
export interface PvpMatch {
  id: string;  // Frontend attend "id"
  ...
}

// Résultat
currentMatch.id === undefined  // ❌
websocketService.submitAnswer(undefined, ...)  // ❌
```

**Solution :**
```typescript
// ✅ Correct
this.pvpGateway.sendToMatch(match.id, 'match:created', {
  id: match.id,  // Correspond au type frontend
  player1Id,
  player2Id,
  status: 'waiting',
  player1Score: 0,
  player2Score: 0,
  // ... tous les champs du type PvpMatch
});
```

**Leçon :** Toujours vérifier que les événements WebSocket correspondent exactement aux types TypeScript du frontend.

---

### 2. Bug de closure stale dans le calcul des scores

**Symptôme :** Les scores étaient calculés mais revenaient toujours à 0 après chaque question.

**Cause :** Les valeurs `playerScore` et `opponentScore` étaient capturées dans la closure au premier render (0).

**Code problématique :**
```typescript
const { playerScore, opponentScore } = usePvpStore();  // ❌ Capturé au render

const handleQuestionEnd = (data: any) => {
  // Ces valeurs sont TOUJOURS celles du premier render
  const myNewScore = playerScore + points;  // ❌ playerScore = 0 toujours
  const oppNewScore = opponentScore + points;  // ❌ opponentScore = 0 toujours
  
  usePvpStore.getState().updateScores(myNewScore, oppNewScore);
};
```

**Solution :**
```typescript
const handleQuestionEnd = (data: any) => {
  // ✅ Lire les valeurs fraîches à chaque appel
  const currentScores = usePvpStore.getState();
  const myNewScore = currentScores.playerScore + points;
  const oppNewScore = currentScores.opponentScore + points;
  
  usePvpStore.getState().updateScores(myNewScore, oppNewScore);
};
```

**Leçon :** Pour les valeurs qui changent dans le temps, toujours utiliser `getState()` dans les event handlers au lieu de destructurer au niveau du composant.

---

### 3. Bug du calcul des statistiques

**Symptôme :** "Questions réussies : 22/10" affiché en fin de match.

**Cause :** Calcul basé sur le score supposant 200 points par question, mais les points varient de 100 à 200.

**Code problématique :**
```typescript
// ❌ Suppose 200 points fixes par question
{Math.round((myScore / 200) * 10)}/10

// Si score = 2200 (11 bonnes réponses rapides)
// (2200 / 200) * 10 = 11
// Affiché en "22/10" (bug d'affichage supplémentaire)
```

**Solution :**

**Backend :**
```typescript
// Compter les vraies bonnes réponses
let player1CorrectAnswers = 0;
let player2CorrectAnswers = 0;

for (let i = 0; i < questions.length; i++) {
  const question = questions[i];
  const player1Answer = playerAnswers[match.player1Id]?.[i];
  const player2Answer = playerAnswers[match.player2Id]?.[i];

  if (player1Answer?.choice === question.correctAnswer) {
    player1CorrectAnswers++;
  }
  if (player2Answer?.choice === question.correctAnswer) {
    player2CorrectAnswers++;
  }
}

// Envoyer dans match:complete
const results = {
  player1CorrectAnswers,
  player2CorrectAnswers,
  ...
};
```

**Frontend :**
```typescript
// ✅ Utiliser les valeurs du backend
{isPlayer1 ? matchResults.player1CorrectAnswers : matchResults.player2CorrectAnswers}/10
```

**Leçon :** Ne jamais calculer des métriques importantes à partir d'autres métriques. Toujours compter directement depuis la source de vérité.

---

### 4. Bug de l'état stale lors du rematch

**Symptôme :** Flash de "Question 10/10" pendant une fraction de seconde lors de l'acceptation d'une revanche.

**Cause :** L'ancien match avait `currentQuestionIndex = 9`, et le nouveau match chargeait ses questions avec ce vieil index.

**Solution :**
```typescript
// ✅ Reset TOUT l'état avant de naviguer vers le nouveau match
const handleMatchCreated = (data: any) => {
  const store = usePvpStore.getState();
  store.resetMatch();  // ✅ Réinitialise TOUT (scores, index, questions, etc.)
  store.setCurrentMatch(data);
  navigate('/pvp/match');
};
```

**Leçon :** Lors d'une transition d'état majeure (nouveau match), toujours réinitialiser complètement l'état pour éviter les fuites.

---

## Système de rematch

### Architecture

**Flux :**
```
Player 1                    Gateway                     Player 2
   |                           |                            |
   |--[rematch:request]------->|                            |
   |                           |                            |
   |                  Store request + timeout               |
   |                           |                            |
   |                           |------[rematch:request]---->|
   |                           |                            |
   |                           |  Popup 10s s'affiche       |
   |                           |                            |
   |                           |<-----[rematch:accept]------|
   |                           |                            |
   |               Clear timeout + create match             |
   |                           |                            |
   |<----[match:created]-------|------[match:created]------>|
   |                           |                            |
   |  Nouveau match démarre    |    Nouveau match démarre   |
```

### Implémentation backend

```typescript
// Gateway: stockage des demandes en attente
private rematchRequests = new Map<string, {
  requesterId: string;
  opponentId: string;
  timeout: NodeJS.Timeout;
}>();

@SubscribeMessage('rematch:request')
async handleRematchRequest(client: Socket, data: { matchId: string; opponentId: string }) {
  // Auto-decline après 10s
  const timeout = setTimeout(() => {
    this.rematchRequests.delete(data.matchId);
    this.sendToUser(client.userId!, 'rematch:declined', {});
  }, 10000);

  this.rematchRequests.set(data.matchId, {
    requesterId: client.userId,
    opponentId: data.opponentId,
    timeout,
  });

  // Notifier l'adversaire
  this.sendToUser(data.opponentId, 'rematch:request', {
    matchId: data.matchId,
    requesterId: client.userId,
  });
}

@SubscribeMessage('rematch:accept')
async handleRematchAccept(client: Socket, data: { matchId: string }) {
  const request = this.rematchRequests.get(data.matchId);
  if (!request) return;

  clearTimeout(request.timeout);
  this.rematchRequests.delete(data.matchId);

  // Créer nouveau match (envoie automatiquement match:created)
  await this.matchmakingService.createMatch(
    request.requesterId,
    client.userId
  );
}
```

### Implémentation frontend

```typescript
// Popup avec countdown
const [rematchReceived, setRematchReceived] = useState(false);
const [rematchTimeLeft, setRematchTimeLeft] = useState(10);

useEffect(() => {
  if (!rematchReceived) return;

  if (rematchTimeLeft <= 0) {
    websocketService.declineRematch(currentMatch!.id);
    setRematchReceived(false);
    navigate('/pvp');
    return;
  }

  const timer = setInterval(() => {
    setRematchTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [rematchReceived, rematchTimeLeft]);
```

**Leçon :** Un système de timeout nécessite une gestion côté serveur ET côté client pour une UX cohérente.

---

## Bonnes pratiques WebSocket

### 1. Toujours logger les événements critiques

```typescript
// Backend
@SubscribeMessage('answer:submit')
async handleSubmitAnswer(client: Socket, data: any) {
  console.log('[Gateway] 📥 Received answer:submit', {
    userId: client.userId,
    matchId: data.matchId,
    questionIndex: data.questionIndex,
  });
  
  // ... traitement ...
  
  console.log('[Gateway] ✅ Answer submitted successfully');
}

// Frontend
const handleChoiceClick = (choice: string) => {
  console.log('[Match] ✅ Choice clicked:', {
    choice,
    matchId: currentMatch!.id,
    questionIndex: currentQuestionIndex,
  });
  
  websocketService.submitAnswer(...);
  
  console.log('[Match] ✅ Answer submitted');
};
```

**Pourquoi :** Les bugs WebSocket sont difficiles à reproduire. Des logs clairs permettent de tracer tout le flux.

---

### 2. Valider les données côté serveur

```typescript
@SubscribeMessage('answer:submit')
async handleSubmitAnswer(client: Socket, data: any) {
  // ✅ Vérifier l'authentification
  if (!client.userId) {
    console.error('[Gateway] ❌ Unauthorized - no userId');
    return { error: 'Unauthorized' };
  }

  // ✅ Vérifier les paramètres
  if (!data.matchId || data.questionIndex === undefined) {
    console.error('[Gateway] ❌ Invalid parameters');
    return { error: 'Invalid parameters' };
  }

  // ✅ Vérifier que le match existe
  const match = await this.prisma.pvpMatch.findUnique({
    where: { id: data.matchId }
  });
  
  if (!match || match.status !== 'in_progress') {
    console.error('[Gateway] ❌ Match not found or not in progress');
    return { error: 'Invalid match' };
  }

  // Traiter la réponse
  await this.matchService.submitAnswer(...);
}
```

**Pourquoi :** Le client peut envoyer n'importe quoi. Toujours valider pour éviter les exploits.

---

### 3. Nettoyer les listeners dans useEffect

```typescript
useEffect(() => {
  const socket = websocketService.getSocket();
  if (!socket) return;

  // ✅ Définir les handlers
  const handleQuestionStart = (data: any) => { ... };
  const handleQuestionEnd = (data: any) => { ... };

  // ✅ Attacher
  socket.on('match:question_start', handleQuestionStart);
  socket.on('match:question_end', handleQuestionEnd);

  // ✅ Cleanup au unmount
  return () => {
    socket.off('match:question_start', handleQuestionStart);
    socket.off('match:question_end', handleQuestionEnd);
  };
}, []);  // Empty deps = attach once
```

**Pourquoi :** Sans cleanup, chaque re-render ajoute de nouveaux listeners → fuites mémoire et événements multiples.

---

### 4. Utiliser des rooms pour les matchs

```typescript
// Backend: joindre les rooms
joinMatchRoom(userId: string, matchId: string) {
  const socketId = this.findSocketByUserId(userId);
  const socket = this.server.sockets.sockets.get(socketId);
  socket?.join(`match:${matchId}`);
}

// Envoyer à tout le match
sendToMatch(matchId: string, event: string, data: any) {
  this.server.to(`match:${matchId}`).emit(event, data);
}

// Envoyer à un joueur spécifique
sendToUser(userId: string, event: string, data: any) {
  this.server.to(`user:${userId}`).emit(event, data);
}
```

**Pourquoi :** Les rooms permettent de cibler précisément les destinataires sans boucler sur tous les sockets connectés.

---

## Pièges à éviter

### 1. ❌ Réutiliser le même event listener

```typescript
// ❌ Mauvais - crée un nouveau listener à chaque render
useEffect(() => {
  socket.on('match:start', (data) => {
    setMatchData(data);  // Capture la version du state au render
  });
});

// ✅ Bon - un seul listener, mis à jour avec les dernières valeurs
useEffect(() => {
  const handleMatchStart = (data) => {
    usePvpStore.getState().setMatchData(data);
  };
  
  socket.on('match:start', handleMatchStart);
  return () => socket.off('match:start', handleMatchStart);
}, []);  // Empty deps
```

---

### 2. ❌ Oublier de vérifier la connexion WebSocket

```typescript
// ❌ Mauvais
websocketService.submitAnswer(matchId, ...);

// ✅ Bon
if (!websocketService.isConnected()) {
  console.error('WebSocket not connected');
  alert('Connexion perdue. Reconnexion...');
  return;
}

websocketService.submitAnswer(matchId, ...);
```

---

### 3. ❌ Envoyer des événements sans validation

```typescript
// ❌ Mauvais
const handleClick = () => {
  socket.emit('answer:submit', {
    matchId: currentMatch.id,  // peut être undefined !
    choice: selectedChoice,
  });
};

// ✅ Bon
const handleClick = () => {
  if (!currentMatch?.id) {
    console.error('No current match');
    return;
  }
  
  if (!selectedChoice) {
    console.error('No choice selected');
    return;
  }
  
  socket.emit('answer:submit', {
    matchId: currentMatch.id,
    choice: selectedChoice,
  });
};
```

---

### 4. ❌ Ne pas gérer les timeouts

```typescript
// ❌ Mauvais - attend indéfiniment
const request = rematchRequests.get(matchId);

// ✅ Bon - timeout automatique
const timeout = setTimeout(() => {
  rematchRequests.delete(matchId);
  sendToUser(requesterId, 'rematch:declined', {});
}, 10000);

rematchRequests.set(matchId, { ...request, timeout });
```

---

## Debugging et logging

### Stratégie de logging

**Frontend (console navigateur) :**
```typescript
console.log('[Match] ✅ Choice clicked');     // Action utilisateur
console.log('[Match] 📤 Submitting answer');  // Envoi WebSocket
console.log('[Match] 📥 Question end');       // Réception WebSocket
console.log('[Match] ❌ Error');              // Erreur
console.log('[Match] 🔍 DEBUG');              // Debug temporaire
```

**Backend (terminal) :**
```typescript
console.log('[Gateway] 📥 Received event');   // Réception WebSocket
console.log('[MatchService] 💾 Data saved');  // Opération DB
console.log('[MatchService] 📤 Sending event'); // Envoi WebSocket
console.log('[MatchService] ✅ Success');      // Succès
console.log('[MatchService] ❌ Error');        // Erreur
```

### Checklist de debugging WebSocket

Quand un événement ne fonctionne pas :

1. **Frontend :** L'événement est-il envoyé ?
   - [ ] Voir `[Match] 📤 Emitting ...` dans la console
   - [ ] Vérifier que les paramètres sont corrects (pas undefined)

2. **Backend :** L'événement est-il reçu ?
   - [ ] Voir `[Gateway] 📥 Received ...` dans le terminal
   - [ ] Vérifier que `client.userId` existe (authentification)

3. **Backend :** Le traitement fonctionne-t-il ?
   - [ ] Voir `[MatchService] ...` logs dans le terminal
   - [ ] Vérifier qu'il n'y a pas d'erreur SQL/Prisma

4. **Backend :** L'événement de réponse est-il envoyé ?
   - [ ] Voir `[WebSocket] Sending ... to match` dans le terminal
   - [ ] Vérifier que la room existe et contient des clients

5. **Frontend :** L'événement de réponse est-il reçu ?
   - [ ] Voir `[Match] 📥 ...` dans la console
   - [ ] Vérifier que le listener est bien attaché

---

## Session 2026-10-17 : Bugs critiques et fixes

### 5. Bug du compteur de questions réussies

**Symptôme :** Le frontend affichait "Questions réussies: 0/10" même après avoir réussi plusieurs questions.

**Cause :** Les valeurs `player1CorrectAnswers` et `player2CorrectAnswers` étaient calculées dans le backend mais **non stockées** dans le frontend.

**Backend (déjà correct) :**
```typescript
// completeMatch() - match.service.ts
let player1CorrectAnswers = 0;
let player2CorrectAnswers = 0;

for (let i = 0; i < questions.length; i++) {
  const question = questions[i];
  const player1Answer = playerAnswers[match.player1Id]?.[i];
  const player2Answer = playerAnswers[match.player2Id]?.[i];

  if (player1Answer?.choice === question.correctAnswer) {
    player1CorrectAnswers++;
  }
  if (player2Answer?.choice === question.correctAnswer) {
    player2CorrectAnswers++;
  }
}

// ✅ Envoyé dans match:complete
const results = {
  matchId,
  winnerId,
  player1Score: match.player1Score,
  player2Score: match.player2Score,
  player1CorrectAnswers,  // ✅ Calculé et envoyé
  player2CorrectAnswers,  // ✅ Calculé et envoyé
  eloChanges: { ... },
};
```

**Frontend (bugué) :**
```typescript
// ❌ Mauvais - ne stocke pas les bonnes réponses
const handleMatchComplete = (data: any) => {
  usePvpStore.getState().setMatchResults({
    matchId: data.matchId,
    winnerId: data.winnerId,
    player1Score: data.player1Score,
    player2Score: data.player2Score,
    player1Time: data.player1Time,
    player2Time: data.player2Time,
    // ❌ Manquant !
    eloChanges: data.eloChanges,
  });
};
```

**Solution :**
```typescript
// ✅ Correct - stocke les bonnes réponses
const handleMatchComplete = (data: any) => {
  usePvpStore.getState().setMatchResults({
    matchId: data.matchId,
    winnerId: data.winnerId,
    player1Score: data.player1Score,
    player2Score: data.player2Score,
    player1Time: data.player1Time,
    player2Time: data.player2Time,
    player1CorrectAnswers: data.player1CorrectAnswers,  // ✅ Ajouté
    player2CorrectAnswers: data.player2CorrectAnswers,  // ✅ Ajouté
    eloChanges: data.eloChanges,
  });
};
```

**Page de résultats :**
```typescript
// ✅ Affichage avec fallback pour undefined
<div className="text-xl font-bold text-gray-800">
  {(isPlayer1 ? matchResults.player1CorrectAnswers : matchResults.player2CorrectAnswers) ?? 0}/10
</div>
```

**Leçon :** Toujours vérifier que TOUTES les données envoyées par le backend sont bien stockées dans le store frontend. Les logs backend peuvent afficher les bonnes valeurs, mais si le frontend ne les stocke pas, elles sont perdues.

---

### 6. Bug du temps total (questions sans réponse)

**Symptôme :** Le "Temps total" affiché était incorrectement bas car les questions sans réponse comptaient pour 0s au lieu de 10s.

**Cause :** Le temps n'était incrémenté que quand le joueur répondait. Si timeout sans réponse, le temps restait à 0 pour cette question.

**Code problématique :**
```typescript
// endQuestionTimer() - match.service.ts
const questionEndData = {
  questionIndex,
  correctAnswer: currentQuestion.correctAnswer,
  player1Answer: player1Answer?.choice || null,
  player1Time: player1Answer?.timeMs || null,  // ❌ null si pas de réponse
  player1Correct: player1Answer?.choice === currentQuestion.correctAnswer,
  player2Answer: player2Answer?.choice || null,
  player2Time: player2Answer?.timeMs || null,  // ❌ null si pas de réponse
  player2Correct: player2Answer?.choice === currentQuestion.correctAnswer,
};
```

**Solution :**
```typescript
// ✅ Ajouter la pénalité de 10s pour les non-réponses
const player1TimeMs = player1Answer?.timeMs ?? 10000;  // ✅ 10s si pas de réponse
const player2TimeMs = player2Answer?.timeMs ?? 10000;  // ✅ 10s si pas de réponse

// ✅ Mettre à jour la DB pour les joueurs qui n'ont pas répondu
const updates: any = {};
if (!player1Answer) {
  updates.player1Time = { increment: 10000 };
}
if (!player2Answer) {
  updates.player2Time = { increment: 10000 };
}

if (Object.keys(updates).length > 0) {
  await this.prisma.pvpMatch.update({
    where: { id: matchId },
    data: updates,
  });
  console.log('[MatchService] ⏱️ Added timeout penalty for non-answers:', updates);
}

const questionEndData = {
  questionIndex,
  correctAnswer: currentQuestion.correctAnswer,
  player1Answer: player1Answer?.choice || null,
  player1Time: player1TimeMs,  // ✅ Toujours un nombre
  player1Correct: player1Answer?.choice === currentQuestion.correctAnswer,
  player2Answer: player2Answer?.choice || null,
  player2Time: player2TimeMs,  // ✅ Toujours un nombre
  player2Correct: player2Answer?.choice === currentQuestion.correctAnswer,
};
```

**Leçon :** Dans un système de quiz avec timer, toujours compter le temps maximum (10s) pour les questions sans réponse. Sinon, un joueur qui ne répond à aucune question aurait un "temps total" de 0s, ce qui est incohérent.

---

### 7. Système d'abandon de match

**Nouvelle fonctionnalité :** Permettre aux joueurs d'abandonner un match en cours avec pénalité ELO.

**Architecture :**

```
Player                      Gateway                     Match Service
  |                            |                              |
  |--[Clique "Abandonner"]---->|                              |
  |                            |                              |
  |  Dialogue de confirmation  |                              |
  |  "Vous risquez de perdre   |                              |
  |   de l'ELO"                |                              |
  |                            |                              |
  |--[Confirme]--------------->|                              |
  |                            |                              |
  |                            |--[match:abandon]------------>|
  |                            |                              |
  |                            |  Détermine winner (adversaire)|
  |                            |  Calcule ELO changes          |
  |                            |  Status = completed           |
  |                            |                              |
  |                            |<----[match:abandoned]--------|
  |<----[match:abandoned]------|                              |
  |                            |                              |
  |  Navigate vers résultats   |                              |
  |  Affiche changement ELO    |                              |
```

**Backend - Gateway :**
```typescript
// pvp.gateway.ts
@SubscribeMessage('match:abandon')
async handleAbandon(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: { matchId: string },
) {
  if (!client.userId) {
    return { error: 'Unauthorized' };
  }

  console.log(`[Abandon] User ${client.userId} abandons match ${data.matchId}`);

  if (this.matchService) {
    await this.matchService.handleAbandon(data.matchId, client.userId);
  }
}
```

**Backend - Match Service :**
```typescript
// match.service.ts
async handleAbandon(matchId: string, userId: string): Promise<void> {
  const match = await this.prisma.pvpMatch.findUnique({
    where: { id: matchId },
  });

  if (!match || match.status !== 'in_progress') {
    console.error(`[Match] Cannot abandon - match not found or not in progress`);
    return;
  }

  // Déterminer gagnant (adversaire) et perdant (celui qui abandonne)
  const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;
  const loserId = userId;

  // Mettre à jour le match
  await this.prisma.pvpMatch.update({
    where: { id: matchId },
    data: {
      status: 'completed',
      winnerId,
      completedAt: new Date(),
    },
  });

  // Calculer les changements ELO
  const eloResult = await this.eloService.updateElo(winnerId, loserId, matchId);
  const winnerEloChange = eloResult.winner.change;
  const loserEloChange = eloResult.loser.change;

  // Envoyer les résultats aux deux joueurs
  const results = {
    matchId,
    winnerId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    abandoned: true,
    abandonedBy: loserId,
    eloChanges: {
      [winnerId]: winnerEloChange,
      [loserId]: loserEloChange,
    },
  };

  this.pvpGateway.sendToMatch(matchId, 'match:abandoned', results);
}
```

**Frontend - Match Page :**
```typescript
// PvpMatchPage.tsx
const [showAbandonDialog, setShowAbandonDialog] = useState(false);

const handleAbandonClick = () => {
  setShowAbandonDialog(true);
};

const confirmAbandon = () => {
  console.log('[Match] User confirms abandon');
  websocketService.getSocket()?.emit('match:abandon', { matchId: currentMatch.id });
  setShowAbandonDialog(false);
};

const handleMatchAbandoned = (data: any) => {
  console.log('[Match] Abandoned:', data);

  // Stocker les résultats (pas de scores, juste ELO)
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

  // Rediriger vers les résultats
  navigate('/pvp/results');
};

// Dialogue de confirmation
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
        <button onClick={cancelAbandon}>Non</button>
        <button onClick={confirmAbandon}>Oui</button>
      </div>
    </div>
  </div>
)}
```

**Frontend - Results Page :**
```typescript
// PvpResultsPage.tsx
{matchResults.abandoned ? (
  <>
    {/* Message d'abandon */}
    <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
      <div className="text-lg font-semibold text-yellow-800 mb-2">
        {matchResults.abandonedBy === user?.id
          ? "Vous avez abandonné la partie"
          : "Votre adversaire a abandonné"}
      </div>
      <div className="text-sm text-yellow-700">
        Match terminé par abandon
      </div>
    </div>

    {/* Pas de statistiques du match */}
    
    {/* Seul le bouton "Retour au menu" (pas de revanche) */}
    <button onClick={handleBackToMatchmaking}>
      Retour au menu
    </button>
  </>
) : (
  <>
    {/* Scores normaux */}
    {/* Statistiques du match */}
    {/* Boutons "Revanche" et "Retour au menu" */}
  </>
)}
```

**Types TypeScript :**
```typescript
// types/pvp.ts
export interface MatchResults {
  matchId: string;
  winnerId: string;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  player1CorrectAnswers?: number;  // ✅ Optional
  player2CorrectAnswers?: number;  // ✅ Optional
  eloChanges: Record<string, number>;
  abandoned?: boolean;              // ✅ Nouveau
  abandonedBy?: string;             // ✅ Nouveau
}
```

**Leçon :** Un système d'abandon nécessite :
1. **Confirmation explicite** pour éviter les abandons accidentels
2. **Pénalité claire** (perte d'ELO) affichée dans le dialogue
3. **Gestion spéciale des résultats** (pas de scores, pas de statistiques)
4. **Pas de revanche** après un abandon (UX)

---

### 8. Bug du blocage WebSocket "Connexion au serveur PVP..."

**Symptôme :** Après avoir cliqué sur "Retour au menu" depuis la page de résultats, la page de matchmaking restait bloquée sur "Connexion au serveur PVP..." indéfiniment.

**Cause :** La fonction `initializeWebSocket()` réinitialisait systématiquement la connexion WebSocket même si elle était déjà active, créant des listeners multiples et des états incohérents.

**Code problématique :**
```typescript
// ❌ PvpMatchmakingPage.tsx
const initializeWebSocket = async () => {
  try {
    setConnecting(true);
    setConnected(false);

    // ❌ Toujours reconnecte, même si déjà connecté
    const socket = websocketService.connect();
    
    // ❌ Re-attache tous les listeners
    socket.on('connect', () => { ... });
    socket.on('matchmaking:joined', () => { ... });
    // ...
  }
};
```

**Solution :**
```typescript
// ✅ Vérifier si déjà connecté avant de réinitialiser
const initializeWebSocket = async () => {
  try {
    // ✅ Check si déjà connecté
    if (websocketService.isConnected()) {
      console.log('[WebSocket] Already connected, skipping initialization');
      setConnected(true);
      setConnecting(false);
      setError('');
      return;  // ✅ Sort directement
    }

    setConnecting(true);
    setConnected(false);

    const socket = websocketService.connect();
    
    // Listeners...
  }
};
```

**Service WebSocket :**
```typescript
// websocket.ts
connect(): Socket {
  // ✅ Réutiliser la connexion existante
  if (this.socket?.connected) {
    console.log('[WebSocket] Already connected, reusing socket');
    return this.socket;
  }

  // Sinon, créer une nouvelle connexion
  this.socket = io(BACKEND_URL, { ... });
  return this.socket;
}

isConnected(): boolean {
  return this.socket?.connected || false;
}
```

**Leçon :** 
- **Un WebSocket doit persister** entre les navigations de pages (matchmaking → match → results → matchmaking)
- **Ne jamais recréer** une connexion WebSocket si elle existe déjà
- **Vérifier l'état** avec `isConnected()` avant toute réinitialisation
- Les listeners WebSocket doivent être attachés **une seule fois** au mount du composant

---

### 9. Images locales vs proxy

**Problème :** Images servies via proxy backend ou directement depuis Wikimedia Commons causant des erreurs CORS et problèmes de performance.

**Solution :** Pipeline de téléchargement local avec optimisation Sharp.

**📖 Documentation complète :** Voir section **"Images Locales vs Proxy"** dans `docs/QUESTIONS/IMAGE-QUALITY-GUIDELINES.md`

**Points clés :**
- ✅ Téléchargement initial en 2 phases (normale + remplacements 404)
- ✅ Optimisation automatique avec Sharp (resize 800px, compression)
- ✅ Stockage dans `public/images/quiz/` avec noms MD5
- ✅ Métadonnées de licence préservées en DB
- ✅ Aucun problème CORS, chargement instantané via CDN

**Leçon :** Toujours télécharger les images localement plutôt que proxy ou URLs externes. Performance et fiabilité > stockage.

---

### 10. ⚠️ RÈGLE CRITIQUE : NE JAMAIS utiliser `prisma migrate reset --force`

**Incident :** Durant une session de debugging, `prisma migrate reset --force` a été exécuté par erreur, **détruisant TOUTES les données de la base de données** incluant :
- Toutes les questions générées (60+ questions avec images)
- Tous les utilisateurs et leurs profils ELO
- Tout l'historique des matchs
- **Des heures de travail perdues irrémédiablement**

**Commande dangereuse :**
```bash
# ❌ ❌ ❌ NE JAMAIS FAIRE ❌ ❌ ❌
npx prisma migrate reset --force

# Cette commande :
# 1. DROP toutes les tables
# 2. Recrée les tables vides
# 3. Exécute les seeds (si configurés)
# 4. TOUTES LES DONNÉES SONT PERDUES DÉFINITIVEMENT
```

**Ce qu'il faut faire à la place :**

**Pour appliquer de nouvelles migrations :**
```bash
# ✅ Appliquer les migrations manquantes sans toucher aux données
npx prisma migrate deploy

# ✅ Ou synchroniser le schéma sans créer de migration
npx prisma db push
```

**Pour résoudre des conflits de schema :**
```bash
# ✅ Créer une migration pour résoudre les différences
npx prisma migrate dev --name fix-schema-conflicts

# ✅ Ou reset SEULEMENT en développement avec backup
pg_dump quizz > backup-$(date +%Y%m%d).sql
npx prisma migrate reset  # Sans --force, demande confirmation
```

**Protection supplémentaire :**

1. **Ajouter un alias de sécurité** (`.zshrc` ou `.bashrc`) :
```bash
alias prisma-reset='echo "⚠️  DANGER: Cette commande supprime TOUTES les données !" && read -p "Taper DESTROY pour confirmer: " confirm && [ "$confirm" = "DESTROY" ] && npx prisma migrate reset'
```

2. **Script de backup automatique** (avant toute migration) :
```bash
#!/bin/bash
# scripts/safe-migrate.sh
echo "📦 Creating backup..."
pg_dump $DATABASE_URL > "backups/backup-$(date +%Y%m%d-%H%M%S).sql"
echo "✅ Backup created"
npx prisma migrate dev
```

3. **Variables d'environnement** :
```bash
# .env.local (développement uniquement)
DATABASE_URL="postgresql://user:pass@localhost:5432/quizz_dev"

# .env.production (protection)
DISABLE_PRISMA_RESET=true
```

**Leçon :** 
- `prisma migrate reset` est **l'équivalent de `rm -rf /` pour votre base de données**
- TOUJOURS vérifier l'environnement avant une commande Prisma
- TOUJOURS avoir un backup récent avant toute opération destructive
- En cas de doute, **faire un backup puis tester en local**

---

### 11. MCQ : Exactement 4 distractors requis

**Problème :** Match PVP annulé avec "Invalid questions" car certaines questions n'ont que 3 distractors au lieu de 4.

**Règle critique :** Le mode PVP nécessite **EXACTEMENT 4 distractors** par question (+ 1 réponse = 5 choix MCQ).

**📖 Documentation complète :** Voir section **"Mode PVP : Exactement 4 Distractors Requis"** dans `docs/QUESTIONS/QUESTION-QUALITY-GUIDELINES.md`

**Points clés :**
- ✅ Validation backend au démarrage du match
- ✅ Script de vérification (`check-mcq-distractors.ts`)
- ✅ Script de correction automatique (`add-missing-4th-distractor.ts`)
- ✅ Pools de distractors par catégorie
- ✅ Checklist avant publication

**Leçon :** Toujours vérifier le nombre de distractors AVANT d'activer `enabledForMcq: true`. Un match annulé cause une mauvaise UX pour les deux joueurs.

---

## Améliorations futures

### Gestion de la reconnexion

```typescript
// À implémenter
socket.on('disconnect', () => {
  // Sauvegarder l'état du match
  const matchState = {
    matchId: currentMatch.id,
    questionIndex: currentQuestionIndex,
  };
  localStorage.setItem('pvp_reconnect', JSON.stringify(matchState));
});

socket.on('connect', () => {
  // Tenter de rejoindre le match en cours
  const state = localStorage.getItem('pvp_reconnect');
  if (state) {
    const { matchId } = JSON.parse(state);
    socket.emit('match:rejoin', { matchId });
  }
});
```

### Gestion des joueurs AFK

```typescript
// Backend: détecter l'inactivité
if (!player1Answer && !player2Answer && timeElapsed > 15000) {
  // Les deux joueurs AFK → annuler le match
  await this.cancelMatch(matchId, 'Inactivity');
}
```

### Analytics temps réel

```typescript
// Tracker les métriques
await this.analytics.track({
  event: 'pvp_match_complete',
  matchId,
  duration: completedAt - startedAt,
  player1Score,
  player2Score,
  averageAnswerTime: totalTime / 10,
});
```

---

## Ressources

### Documentation externe

- **Architecture WebSocket :** [Socket.io Documentation](https://socket.io/docs/v4/)
- **NestJS WebSocket Gateway :** [NestJS Gateways](https://docs.nestjs.com/websockets/gateways)
- **React useEffect cleanup :** [React Hooks Reference](https://react.dev/reference/react/useEffect#removing-unnecessary-effect-dependencies)
- **Zustand getState :** [Zustand Documentation](https://github.com/pmndrs/zustand#reading-from-state-in-actions)

### Documentation interne

- **Qualité des questions :** `docs/QUESTIONS/QUESTION-QUALITY-GUIDELINES.md`
  - Section "Mode PVP : Exactement 4 Distractors Requis"
  - Scripts de vérification et correction
  - Bonnes pratiques pour distractors plausibles

- **Gestion des images :** `docs/QUESTIONS/IMAGE-QUALITY-GUIDELINES.md`
  - Section "Images Locales vs Proxy"
  - Pipeline de téléchargement en 2 phases
  - Optimisation Sharp et métadonnées de licence

- **Architecture générale :** `docs/ARCHITECTURE.md`
- **Base de données :** `docs/DATABASE.md`
- **Roadmap :** `docs/ROADMAP.md`

---

## Checklist de validation PVP

Avant de déployer ou de tester le système PVP, vérifier :

### Questions
- [ ] Toutes les questions MCQ ont exactement **4 distractors** (voir `QUESTION-QUALITY-GUIDELINES.md`)
- [ ] Les images sont **téléchargées localement** dans `public/images/quiz/` (voir `IMAGE-QUALITY-GUIDELINES.md`)
- [ ] Les URLs d'images sont de la forme `/images/quiz/[hash].[ext]`
- [ ] Les métadonnées de licence sont stockées (`mediaLicenseAuthor`, `mediaLicenseType`)

### Backend
- [ ] Les événements WebSocket envoient **tous les champs** requis par les types frontend
- [ ] `match:complete` envoie `player1CorrectAnswers` et `player2CorrectAnswers`
- [ ] `match:abandoned` gère correctement les deux joueurs
- [ ] Les timeouts pour non-réponse ajoutent bien **10000ms** au temps total
- [ ] Les logs sont présents pour tous les événements critiques

### Frontend
- [ ] `handleMatchComplete` stocke **toutes** les données reçues du backend
- [ ] Le WebSocket **ne se reconnecte pas** si déjà connecté
- [ ] Les listeners WebSocket sont **nettoyés** au unmount des composants
- [ ] Les valeurs du store sont lues via `getState()` dans les event handlers
- [ ] Les dialogues d'abandon affichent la pénalité ELO

### Base de données
- [ ] ❌ **JAMAIS** utiliser `prisma migrate reset --force` en production
- [ ] ✅ Toujours faire un backup avant une migration
- [ ] ✅ Utiliser `prisma migrate deploy` ou `prisma db push`
- [ ] Vérifier que `UserElo.elo` a le default à **1200** (pas 800)

### Tests manuels
- [ ] Un match complet fonctionne (10 questions)
- [ ] Le compteur "Questions réussies" s'incrémente correctement
- [ ] Le "Temps total" compte les non-réponses comme 10s
- [ ] Le bouton "Abandonner" fonctionne avec confirmation
- [ ] Les deux joueurs voient les bons changements ELO après abandon
- [ ] "Retour au menu" ne bloque pas sur "Connexion au serveur PVP..."
- [ ] Les images se chargent sans erreur CORS

---

**Contributeurs :**
- Session 2026-10-15 : Claude Sonnet 4.5 (debugging, fixes, rematch system)
- Session 2026-10-17 : Claude Sonnet 4.5 (abandon system, stats fixes, image pipeline, documentation)

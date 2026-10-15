# PVP Technical Guidelines

Documentation technique des learnings et bonnes pratiques découverts lors de l'implémentation du système PVP.

**Dernière mise à jour :** 2026-10-15

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

- **Architecture WebSocket :** [Socket.io Documentation](https://socket.io/docs/v4/)
- **NestJS WebSocket Gateway :** [NestJS Gateways](https://docs.nestjs.com/websockets/gateways)
- **React useEffect cleanup :** [React Hooks Reference](https://react.dev/reference/react/useEffect#removing-unnecessary-effect-dependencies)
- **Zustand getState :** [Zustand Documentation](https://github.com/pmndrs/zustand#reading-from-state-in-actions)

---

**Contributeurs :**
- Session 2026-10-15 : Claude Sonnet 4.5 (debugging, fixes, rematch system)

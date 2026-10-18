# Module PVP - Player vs Player

## Rôle du module

Le module PVP gère les **matchs compétitifs 1v1 en temps réel** entre joueurs avec système de classement ELO.

**Responsabilités** :
- **Matchmaking** automatique basé sur l'ELO (avec expansion de range selon le temps d'attente)
- **Communication temps réel** via WebSockets (Socket.IO)
- **Gestion des matchs** : sélection de questions, timer, validation des réponses
- **Calcul du score** et du gagnant
- **Système ELO** : gain/perte de points selon l'écart de niveau
- **Classement par rang** : Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster
- **Système d'abandon** : pénalité ELO pour le joueur qui abandonne

---

## Architecture

```
Frontend (WebSocket client)
    ↓
Socket.IO (authentification JWT via cookie)
    ↓
PvpGateway
    ├─ Connexion/Déconnexion
    ├─ Matchmaking (join/leave queue)
    ├─ Réponses aux questions
    └─ Abandon de match
    ↓
Services
    ├─ MatchmakingService (queue, création match)
    ├─ MatchService (déroulement match, timer)
    └─ EloService (calcul ELO, rank)
    ↓
Database
    ├─ pvp_matches
    ├─ user_elo
    └─ elo_history
```

---

## Base de données

### Table : `pvp_matches`

```prisma
model PvpMatch {
  id     String      @id
  status MatchStatus // waiting, category_ban, in_progress, completed, cancelled

  player1Id String
  player2Id String

  player1BannedCat String[] // Catégories bannies (futur)
  player2BannedCat String[]

  questionIds String[] // 10 IDs de questions

  player1Score Int @default(0)
  player2Score Int @default(0)
  player1Time  Int @default(0)
  player2Time  Int @default(0)
  winnerId     String?

  player1EloChange Int @default(0)
  player2EloChange Int @default(0)

  metadata    Json? // { questions, playerAnswers }
  startedAt   DateTime?
  completedAt DateTime?
  
  player1 User @relation("Player1Matches")
  player2 User @relation("Player2Matches")
}
```

**Métadonnées** :
- `questions` : Questions avec choices shufflées + correctAnswer
- `playerAnswers` : Réponses de chaque joueur par question

---

### Table : `user_elo`

```prisma
model UserElo {
  userId String @unique

  elo      Int @default(1200)
  rank     String @default("Bronze")
  division Int @default(3) // 3=bas, 1=haut

  placementMatches Int @default(0) // 0-5 matchs de placement

  totalMatches Int @default(0)
  wins         Int @default(0)
  losses       Int @default(0)
  winStreak    Int @default(0)
  highestElo   Int @default(1200)
  
  eloHistory EloHistory[]
}
```

---

### Table : `elo_history`

```prisma
model EloHistory {
  userEloId String
  matchId   String
  oldElo    Int
  newElo    Int
  change    Int
  createdAt DateTime
  
  userElo UserElo
}
```

---

## Backend

### PvpGateway (WebSocket)

**Rôle** : Gère les connexions WebSocket et dispatche les événements.

**Authentification** :
1. Extraction du token JWT (cookie `token`)
2. Vérification du token
3. Récupération de l'utilisateur
4. Stockage dans `client.userId` et `client.username`
5. Jonction à la room personnelle `user:{userId}`

**Events reçus** :
- `matchmaking:join` : Rejoindre la file d'attente
- `matchmaking:leave` : Quitter la file
- `answer:submit` : Soumettre une réponse
- `match:abandon` : Abandonner le match

**Events émis** :
- `matchmaking:joined` : Confirmation d'entrée en queue
- `match:created` : Match trouvé, infos des joueurs
- `match:start` : Match démarre, questions envoyées
- `match:question_start` : Question X démarre, timer 10s
- `match:question_end` : Question X terminée, révélation réponse correcte + scores
- `match:completed` : Match terminé, résultats finaux
- `match:cancelled` : Match annulé

---

### MatchmakingService

**File d'attente** : Map `<userId, QueueEntry>`

**QueueEntry** :
- `userId`
- `elo`
- `joinedAt`

#### Algorithme de matchmaking

**Boucle** : Toutes les 5 secondes

1. Si < 2 joueurs en queue → skip
2. Pour chaque joueur :
   - Calcul du range ELO selon le temps d'attente :
     ```
     eloRange = INITIAL_RANGE + (waitTime / 10s) × EXPANSION_RATE
     eloRange = 200 + (waitTime / 10s) × 50
     ```
   - Recherche d'un adversaire avec `|elo1 - elo2| ≤ eloRange`
   - Si trouvé → création du match
   - Si temps d'attente > 2 minutes → match avec n'importe qui

**Exemple** :
- 0-10s : range ±200
- 10-20s : range ±250
- 20-30s : range ±300
- ...
- 120s+ : range infini (match avec n'importe qui)

---

### MatchService

**Rôle** : Déroulement du match.

#### Démarrage du match : `startMatch(matchId)`

1. **Sélection de 10 questions** :
   - Aléatoire parmi `status = 'publie'` ET `enabledForMcq = true`
   - Doit avoir au moins 4 distracteurs

2. **Préparation des choix** :
   - Pour chaque question : `correctAnswer` + 4 `distractorText`
   - Shuffle des 5 choix
   - Stockage de `correctAnswer` côté serveur (metadata)

3. **Mise à jour du match** :
   - `status = 'in_progress'`
   - `questionIds = [...]`
   - `startedAt = now()`
   - `metadata.questions = [{id, text, choices, correctAnswer}, ...]`

4. **Émission** :
   - `match:start` → questions (sans `correctAnswer`)
   - Timer de 3 secondes avant la première question

5. **Démarrage du timer** question 0

---

#### Timer par question : `startQuestionTimer(matchId, questionIndex)`

1. **Émission** : `match:question_start` avec `timerMs: 10000`
2. **Attente** 10 secondes
3. **Fin du timer** : `endQuestionTimer()`

---

#### Fin du timer : `endQuestionTimer(matchId, questionIndex)`

1. **Récupération** des réponses des joueurs (stockées dans `metadata.playerAnswers`)
2. **Validation** : comparaison avec `correctAnswer`
3. **Calcul du score** :
   - Bonne réponse : +1 point
   - Pas de bonus de vitesse (contrairement au Daily)
4. **Mise à jour** `player1Score`, `player2Score`
5. **Émission** : `match:question_end` avec résultats
6. **Si dernière question** → `completeMatch()`
7. **Sinon** → démarrage timer question suivante

---

#### Fin du match : `completeMatch(matchId)`

1. **Détermination du gagnant** :
   - Si score égal → plus rapide (total temps)
   - `winnerId` = gagnant

2. **Mise à jour ELO** via `EloService.updateElo()`

3. **Enregistrement** :
   - `status = 'completed'`
   - `completedAt = now()`
   - `winnerId`
   - `player1EloChange`, `player2EloChange`

4. **Émission** : `match:completed` avec résultats finaux + changements ELO

5. **Nettoyage** : sortie des rooms WebSocket

---

#### Abandon : `handleAbandon(matchId, userId)`

1. **Vérification** : match en cours ?
2. **Détermination** : `winnerId` = adversaire
3. **Pénalité ELO** : joueur qui abandonne perd comme s'il avait perdu normalement
4. **Mise à jour** : `status = 'completed'` (pas de statut `abandoned`)
5. **Émission** : `match:completed` avec `abandoner: userId`

---

### EloService

**Rôle** : Calculs ELO et ranks.

#### Calcul du changement ELO

**Formule** :
```
ΔElo = K × (Actual - Expected)

Expected_winner = 1 / (1 + 10^((EloLoser - EloWinner) / 400))
Expected_loser = 1 - Expected_winner

ΔWinner = round(K × (1 - Expected_winner))
ΔLoser = round(K × (0 - Expected_loser))
```

**K-factor** : 32 (standard)

**Exemples** :
- Gagnant 1200 vs Perdant 1200 → +16 / -16 (50% attendu)
- Gagnant 1400 vs Perdant 1200 → +11 / -11 (76% attendu pour le 1400)
- Gagnant 1000 vs Perdant 1400 → +27 / -27 (9% attendu pour le 1000, upset)

---

#### Calcul du rank

**Seuils** :
- Bronze : 0-999
- Silver : 1000-1199
- Gold : 1200-1399
- Platinum : 1400-1599
- Diamond : 1600-1799
- Master : 1800-1999
- Grandmaster : 2000+

**Divisions** : 3 (bas), 2 (moyen), 1 (haut)

**Calcul division** :
- Progression dans le rank : `(elo - seuil_rank) / (seuil_next - seuil_rank)`
- 0-33% → Division 3
- 33-67% → Division 2
- 67-100% → Division 1

**Exemple** :
- ELO 1050 → Silver Division 3
- ELO 1125 → Silver Division 2
- ELO 1180 → Silver Division 1

---

## Frontend

### Pages

1. **PvpMatchmakingPage** : Recherche d'adversaire
2. **PvpMatchPage** : Match en cours
3. **PvpResultsPage** : Résultats du match

### Store : pvpStore (Zustand)

**État** :
- `socket` : Connexion WebSocket
- `match` : Match actuel
- `inQueue` : Dans la file d'attente
- `currentQuestionIndex` : Question actuelle (0-9)
- `playerAnswers` : Réponses du joueur

**Actions** :
- `connectWebSocket()` : Connexion Socket.IO avec cookie JWT
- `joinQueue()` : Émission `matchmaking:join`
- `leaveQueue()` : Émission `matchmaking:leave`
- `submitAnswer(questionIndex, choice)` : Émission `answer:submit`
- `abandonMatch()` : Émission `match:abandon`

**Listeners** :
- `match:created` → Stocke le match, navigate vers `/pvp/match`
- `match:start` → Stocke les questions
- `match:question_start` → Démarre timer 10s
- `match:question_end` → Affiche résultat, passe à la question suivante après 3s
- `match:completed` → Navigate vers `/pvp/results`
- `match:cancelled` → Retour au matchmaking

---

## Flux fonctionnel : Match complet

```
Joueur 1                      Joueur 2
   │                             │
   ├─ Connexion WebSocket ────┬──┤
   │  (JWT cookie)             │  │
   │                           │  │
   ├─ join queue ──────────────┼──┤ join queue
   │                           │  │
   │      [Matchmaking service trouve un match]
   │                           │  │
   ├─ match:created ◄──────────┼──┤ match:created
   │  (infos adversaire)       │  │
   │                           │  │
   ├─ match:start ◄────────────┼──┤ match:start
   │  (10 questions + choix)   │  │
   │                           │  │
   ├─ match:question_start ◄───┼──┤ match:question_start
   │  Timer 10s démarre        │  │
   │                           │  │
   ├─ answer:submit ───────────┼──┤ answer:submit
   │  (choix A)                │  │ (choix B)
   │                           │  │
   │      [10 secondes écoulées]
   │                           │  │
   ├─ match:question_end ◄─────┼──┤ match:question_end
   │  (révélation réponse +    │  │
   │   scores actuels)         │  │
   │                           │  │
   │      [3 secondes pause]   │  │
   │                           │  │
   ├─ match:question_start ◄───┼──┤ match:question_start
   │  (question 2)             │  │
   │                           │  │
   │         ... x10 ...        │  │
   │                           │  │
   ├─ match:completed ◄────────┼──┤ match:completed
   │  (winnerId, scores,       │  │
   │   ELO changes)            │  │
   │                           │  │
   └─ Résultats ───────────────┴──┘ Résultats
```

---

## Dépendances

```
PVP
 ├── Utilise : AUTH (JWT pour WebSocket)
 ├── Utilise : QUESTIONS (sélection 10 MCQ avec distracteurs)
 ├── Fournit : Classement compétitif, matchs temps réel
 └── Consommé par : Frontend (WebSocket client)
```

---

## Points clés

1. **WebSocket authentifié** : JWT extrait du cookie `token`
2. **Matchmaking automatique** : Range ELO s'élargit avec le temps d'attente
3. **10 questions MCQ** : 5 choix shufflés, 10s par question
4. **Pas de bonus de vitesse** : 1 point par bonne réponse, temps sert de tie-breaker
5. **Système ELO classique** : K=32, formule standard
6. **Ranks avec divisions** : 7 ranks, 3 divisions par rank
7. **Abandon pénalisé** : Compte comme une défaite normale
8. **Pas de phase de ban** : Système prévu mais en standby

---

## Amélioration potentielles

1. **Phase de ban de catégories** : Actuellement en standby, prévu dans le schéma
2. **Matchs classés vs casual** : Séparer les matchs qui comptent pour l'ELO
3. **Saisons** : Reset ELO périodique avec récompenses
4. **Missions hebdomadaires** : Liées au PVP (déjà dans le schéma)
5. **Spectateur** : Regarder les matchs en cours
6. **Replay** : Revoir les matchs passés
7. **Bonus de vitesse** : Actuellement pas de bonus, contrairement au Daily
8. **Timeout côté serveur** : Valider le temps de réponse côté serveur
9. **Reconnexion** : Reprendre un match après déconnexion
10. **Chat** : Communication entre joueurs (avec modération)

# Module DAILY - Quiz quotidien

## Rôle du module

Le module DAILY gère le **quiz quotidien** de l'application : génération automatique, distribution des questions, validation des réponses, calcul du score, et gestion des classements.

**Responsabilités** :
- **Génération automatique** d'un Daily chaque jour à minuit (CRON)
- **Sélection équilibrée** de 10 questions parmi les catégories disponibles
- **Distribution** des questions aux joueurs
- **Validation** des réponses avec fuzzy matching (Levenshtein)
- **Calcul du score** avec bonus de vitesse et multiplicateurs de streak
- **Gestion des séries** (streaks) de participation
- **Classement** (leaderboard) journalier
- **Signalement** de questions problématiques

---

## Architecture générale

```
┌──────────────────────────────────┐
│   CRON (minuit UTC)              │
│   @Cron(EVERY_DAY_AT_MIDNIGHT)   │
└────────┬─────────────────────────┘
         │
         │ Génération automatique
         │
┌────────▼─────────────────────────┐
│   DailyService                   │
│   .generateDailyIfNeeded()       │
│   - Sélection catégories         │
│   - Équilibrage (2/1/proportion) │
│   - Exclusion derniers 7 dailies │
│   - Shuffle + création Daily     │
└────────┬─────────────────────────┘
         │
         │ Daily créé en DB
         │
┌────────▼─────────────────────────┐
│   Database                       │
│   - dailies                      │
│   - daily_questions              │
└────────┬─────────────────────────┘
         │
         │ Joueur se connecte
         │
┌────────▼─────────────────────────┐
│   Frontend - DailyPage           │
│   GET /api/daily/today           │
└────────┬─────────────────────────┘
         │
         │ Affichage des 10 questions
         │ Timer 25s par question
         │
┌────────▼─────────────────────────┐
│   Joueur répond                  │
│   - Saisie réponse texte         │
│   - Enregistrement du temps      │
└────────┬─────────────────────────┘
         │
         │ Soumission
         │ POST /api/daily/submit
         │
┌────────▼─────────────────────────┐
│   DailyService                   │
│   - AnswerValidatorService       │
│   - Calcul score (base + vitesse │
│     + multiplicateur streak)     │
│   - Mise à jour UserStreak       │
└────────┬─────────────────────────┘
         │
         │ Résultats + leaderboard
         │
┌────────▼─────────────────────────┐
│   Frontend - QuizResults         │
│   - Affichage score              │
│   - Détail réponses              │
│   - Classement du jour           │
└──────────────────────────────────┘
```

---

## Frontend

### DailyPage.tsx

**Rôle** : Page principale du quiz quotidien.

**Localisation** : `apps/frontend/src/pages/DailyPage.tsx`

**États** :

| État | Type | Rôle |
|------|------|------|
| `daily` | `Daily \| null` | Données du Daily (questions, etc.) |
| `currentQuestionIndex` | `number` | Index de la question actuelle (0-9) |
| `answers` | `Record<string, string>` | Réponses saisies par le joueur |
| `questionStartTime` | `number` | Timestamp de début de la question actuelle |
| `timeLeft` | `number` | Temps restant (secondes, 25 max) |
| `questionTimes` | `Record<string, number>` | Temps enregistré par question |
| `showResults` | `boolean` | Affichage des résultats |
| `submissionResult` | `SubmitDailyResponse` | Résultat de la soumission |

**Fonctionnalités** :

#### 1. **Chargement du Daily**
```typescript
GET /api/daily/today
```

Si déjà complété aujourd'hui → affiche un message avec le score obtenu.

#### 2. **Timer 25 secondes**

Compte à rebours par question :
- Décompte chaque seconde
- Au temps écoulé : passe automatiquement à la question suivante (ou soumet si dernière question)
- Temps cappé à 25 000 ms maximum

#### 3. **Navigation par Enter**

Touche Enter :
- Questions 1-9 : passe à la suivante
- Question 10 : soumet le quiz

#### 4. **Soumission**

```typescript
POST /api/daily/submit
Body: {
  answers: [
    { questionId, answer, timeMs },
    ...
  ]
}
```

**Validation côté client** : Temps cappé à 25 000 ms.

#### 5. **Affichage des résultats**

Composant `QuizResults` :
- Score total
- Nombre de bonnes réponses
- Détail question par question
- Classement du jour
- Série actuelle (streak)

#### 6. **Signalement de question**

Modal `ReportQuestionModal` :
```typescript
POST /api/daily/report-question
Body: {
  questionId,
  reason,
  comment
}
```

Raisons possibles :
- Mauvaise réponse
- Question ambiguë
- Erreur factuelle
- Autre

---

## Backend

### Routes

| Méthode | Route | Protection | Rôle |
|---------|-------|------------|------|
| `GET` | `/api/daily/today` | `JwtAuthGuard` | Récupère le Daily du jour |
| `POST` | `/api/daily/submit` | `JwtAuthGuard` | Soumet les réponses |
| `GET` | `/api/daily/leaderboard` | `JwtAuthGuard` | Classement du jour |
| `POST` | `/api/daily/report-question` | `JwtAuthGuard` | Signale une question |

---

### DailyService

#### Génération automatique : `generateDailyIfNeeded()`

**CRON** : `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`

**Processus** :

1. **Vérification** : Daily déjà créé aujourd'hui ?
   - Si oui → skip
   - Si non → continue

2. **Calcul du dailyNumber** :
   ```typescript
   const lastDaily = await prisma.daily.findFirst({ orderBy: { dailyNumber: 'desc' } });
   const dailyNumber = (lastDaily?.dailyNumber || 0) + 1;
   ```

3. **Récupération des catégories** avec questions publiées et `enabledForDaily = true`

4. **Stratégie d'équilibrage** :

   **Règle 1** : Allocation minimale
   - Catégorie avec ≥ 20 questions → minimum 2 questions
   - Catégorie avec ≥ 10 questions → minimum 1 question
   - Catégorie avec < 10 questions → 0 minimum

   **Règle 2** : Répartition du reste
   - Après allocation minimale, distribue les slots restants proportionnellement au nombre de questions par catégorie

   **Règle 3** : Si trop de catégories
   - Si l'allocation minimale dépasse 10 → prioriser les plus grandes catégories (1 question chacune jusqu'à 10 max)

5. **Exclusion des questions récentes** :
   - Récupère les questions des **7 derniers Dailies**
   - Exclut ces questions de la sélection
   - Permet de réutiliser si pas assez de questions fraîches

6. **Sélection par catégorie** :
   - Pour chaque catégorie : récupère les questions `publie`, `enabledForDaily`, non récentes
   - Shuffle aléatoire
   - Prend le nombre alloué

7. **Shuffle final** : Mélange les questions de toutes catégories pour éviter l'ordre prévisible

8. **Création en DB** :
   ```prisma
   Daily {
     dailyNumber,
     date: "YYYY-MM-DD",
     questions: [
       { questionId, order: 1 },
       { questionId, order: 2 },
       ...
     ]
   }
   ```

**Logs** : Affiche la distribution par catégorie et les exclusions.

---

#### Récupération du Daily : `getTodaysDaily(userId)`

**Processus** :

1. Charge le Daily du jour avec questions + `acceptedAnswers`
2. Si pas trouvé → génère via `generateDailyIfNeeded()` puis recharge
3. Vérifie si l'utilisateur a déjà soumis (`DailySubmission`)
4. Retourne :
   ```typescript
   {
     dailyNumber,
     date,
     alreadyCompleted: boolean,
     submission: DailySubmission | null,
     questions: [
       {
         questionId,
         text,
         questionType,
         mediaUrl,
         order,
         acceptedAnswers
       },
       ...
     ],
     serverTimestamp
   }
   ```

**Point important** : Les `acceptedAnswers` sont envoyées au frontend. C'est nécessaire pour le mode Daily (saisie libre), mais cela expose les réponses dans le code source de la page.

---

#### Soumission : `submitDaily(userId, answers)`

**Processus** :

1. **Validation** : Daily existe ? Pas déjà soumis ?

2. **Création du map questions** :
   ```typescript
   Map<questionId, Question avec acceptedAnswers>
   ```

3. **Validation et scoring** :

   **Pour chaque réponse** :

   a. **Validation du temps** : 0 ≤ timeMs ≤ 25 000

   b. **Validation de la réponse** via `AnswerValidatorService` (voir ci-dessous)

   c. **Si correct** :

   **Points de base** : 100

   **Bonus de vitesse** :
   ```
   ≤ 3s  → +100 (200 total)
   ≤ 7s  → +90  (190)
   ≤ 11s → +80  (180)
   ≤ 15s → +70  (170)
   ≤ 19s → +60  (160)
   ≤ 22s → +50  (150)
   > 22s → +40  (140)
   ```

   **Multiplicateur de streak** (consécutives correctes dans le quiz) :
   ```
   2 bonnes → x1.1
   3 bonnes → x1.2
   4 bonnes → x1.3
   ≥5 bonnes → x1.5
   ```

   **Calcul final** : `pointsEarned = floor(basePoints * multiplier)`

   d. **Si incorrect** :
   - Reset du streak consécutif
   - 0 point

4. **Création de la soumission** :
   ```prisma
   DailySubmission {
     userId,
     dailyId,
     score,
     totalTime,
     correctCount,
     answersData: [
       {
         questionId,
         answer,
         correct,
         timeMs,
         pointsEarned
       },
       ...
     ]
   }
   ```

5. **Mise à jour du streak** via `updateStreak()` (voir ci-dessous)

6. **Retour** :
   ```typescript
   {
     submission,
     dailyNumber
   }
   ```

---

#### Mise à jour du streak : `updateStreak(userId, todayDate)`

**Logique** :

1. **Récupère le UserStreak** (créé automatiquement à l'inscription)

2. **Compare les dates** :
   - `lastDailyDate` == `todayDate` → déjà mis à jour, skip
   - `lastDailyDate` == `todayDate - 1 jour` → série continue, `currentStreak++`
   - Sinon → série cassée, `currentStreak = 1`

3. **Met à jour** :
   ```typescript
   {
     currentStreak,
     longestStreak: max(longestStreak, currentStreak),
     lastDailyDate: todayDate
   }
   ```

**Point important** : Le streak compte les **jours consécutifs de participation**, pas le nombre de bonnes réponses.

---

#### Classement : `getLeaderboard(dailyId, limit = 100)`

**Tri** :
1. Score (décroissant)
2. Temps total (croissant, en cas d'égalité)

**Limite** : 100 premiers par défaut

**Retour** :
```typescript
[
  {
    rank: 1,
    userId,
    username,
    score,
    totalTime,
    correctCount
  },
  ...
]
```

---

#### Signalement : `reportQuestion(userId, dto)`

**Processus** :

1. **Récupère ou crée** `QuestionMetadata`

2. **Ajoute le rapport** au JSON `userReports` :
   ```json
   {
     "userId": "uuid",
     "reason": "Mauvaise réponse",
     "comment": "La capitale a changé",
     "timestamp": "2026-10-17T..."
   }
   ```

3. **Incrémente** `reportCount`

4. **Retourne** `{ success: true }`

**Utilisation** : Les rapports sont ensuite consultables dans le module ADMIN (`AdminReportedQuestions`).

---

### AnswerValidatorService

**Rôle** : Validation des réponses avec **fuzzy matching** pour tolérer les fautes.

**Localisation** : `apps/backend/src/modules/daily/answer-validator.service.ts`

#### Méthode : `validateAnswer(userAnswer, acceptedAnswers)`

**Processus** :

1. **Normalisation** de la réponse utilisateur et de chaque réponse acceptée

2. **Comparaison exacte** après normalisation
   - Si match → `true`

3. **Comparaison fuzzy** avec distance de Levenshtein
   - Pour chaque `AcceptedAnswer` :
     - Calcule `distance(normalized_user, normalized_accepted)`
     - Si `distance ≤ levenshteinThreshold` → `true`

4. Si aucune correspondance → `false`

---

#### Normalisation : `normalizeAnswer(answer)`

**Étapes** :

1. **Lowercase** : `answer.toLowerCase()`
2. **Trim** : suppression espaces début/fin
3. **Suppression des accents** :
   ```typescript
   normalize('NFD').replace(/[̀-ͯ]/g, '')
   ```
4. **Suppression de la ponctuation** : `.,/#!$%^&*;:{}=-_`~()`
5. **Suppression des espaces multiples** : `\s+` → ` `
6. **Suppression des articles français** au début :
   - `le `, `la `, `les `, `l'`, `un `, `une `, `des `

**Exemple** :
```
"La France" → "france"
"L'Italie!" → "italie"
"Les États-Unis" → "etats unis"
```

---

#### Distance de Levenshtein : `levenshteinDistance(str1, str2)`

**Algorithme** : Matrice de programmation dynamique.

**Retour** : Nombre minimal d'éditions (insertion, suppression, substitution) pour transformer `str1` en `str2`.

**Exemples** :
```
"paris" vs "pari" → 1 (suppression du 's')
"france" vs "frannce" → 1 (suppression d'un 'n')
"lyon" vs "lyyon" → 1 (suppression d'un 'y')
```

**Seuils par défaut** (définis dans `AcceptedAnswer.levenshteinThreshold`) :
- ≤ 4 caractères → 1
- 5-8 caractères → 2
- ≥ 9 caractères → 3

---

## Base de données

### Table : `dailies`

```prisma
model Daily {
  id          String   @id @default(uuid())
  dailyNumber Int      @unique
  date        String   @unique // YYYY-MM-DD (UTC)
  createdAt   DateTime @default(now())

  questions   DailyQuestion[]
  submissions DailySubmission[]
}
```

**Champs** :
- `dailyNumber` : Numéro incrémental (1, 2, 3, ...)
- `date` : Date au format `YYYY-MM-DD` (UTC)

**Contraintes** :
- `dailyNumber` unique
- `date` unique (un seul Daily par jour)

---

### Table : `daily_questions`

```prisma
model DailyQuestion {
  id         String @id @default(uuid())
  dailyId    String
  questionId String
  order      Int // 1-10

  daily    Daily
  question Question

  @@unique([dailyId, order])
}
```

**Rôle** : Table de liaison entre `Daily` et `Question` avec ordre.

**Contrainte** : `order` unique par `dailyId` (pas de doublons d'ordre).

---

### Table : `daily_submissions`

```prisma
model DailySubmission {
  id           String   @id @default(uuid())
  userId       String
  dailyId      String
  score        Int
  totalTime    Int // ms
  correctCount Int
  answersData  Json
  submittedAt  DateTime @default(now())

  user  User
  daily Daily

  @@unique([userId, dailyId])
  @@index([dailyId, score])
}
```

**Champs** :
- `score` : Score total calculé
- `totalTime` : Somme des temps de réponse
- `correctCount` : Nombre de bonnes réponses
- `answersData` : JSON détaillant chaque réponse

**Contrainte** : Un utilisateur ne peut soumettre qu'une fois par Daily (`@@unique([userId, dailyId])`).

**Index** : `[dailyId, score]` pour optimiser le leaderboard.

**Exemple de `answersData`** :
```json
[
  {
    "questionId": "uuid",
    "answer": "Paris",
    "correct": true,
    "timeMs": 3450,
    "pointsEarned": 200
  },
  {
    "questionId": "uuid2",
    "answer": "Lyon",
    "correct": false,
    "timeMs": 12000,
    "pointsEarned": 0
  },
  ...
]
```

---

### Table : `user_streaks`

```prisma
model UserStreak {
  id            String   @id @default(uuid())
  userId        String
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastDailyDate String?  // YYYY-MM-DD
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User

  @@unique([userId])
}
```

**Champs** :
- `currentStreak` : Nombre de jours consécutifs de participation
- `longestStreak` : Record personnel
- `lastDailyDate` : Date de la dernière participation (format `YYYY-MM-DD`)

**Création** : Automatique lors de l'inscription (module AUTH).

**Mise à jour** : Lors de chaque soumission de Daily.

---

## Flux fonctionnels

### Flux 1 : Génération automatique du Daily

```
[CRON minuit UTC]
    ↓
DailyService.generateDailyIfNeeded()
    ↓
Vérification: Daily déjà créé aujourd'hui ?
    │
    ├─ Oui → Skip
    │
    └─ Non → Continue
        ↓
    Calcul dailyNumber (dernier + 1)
        ↓
    Récupération catégories avec questions publiées + enabledForDaily
        ↓
    Calcul distribution équilibrée
    - Catégorie ≥20 questions → min 2
    - Catégorie ≥10 questions → min 1
    - Reste proportionnel
        ↓
    Exclusion des questions des 7 derniers Dailies
        ↓
    Sélection aléatoire par catégorie
        ↓
    Shuffle final des 10 questions
        ↓
    Création Daily en DB
        ↓
    Log: "✅ Generated Daily #42 for 2026-10-17"
```

---

### Flux 2 : Participation d'un joueur

```
Joueur → Page /daily
    ↓
GET /api/daily/today
    ↓
Backend vérifie: Daily existe ?
    │
    ├─ Non → generateDailyIfNeeded() puis recharge
    │
    └─ Oui → Continue
        ↓
    Vérifie: joueur a déjà soumis ?
        │
        ├─ Oui → Retourne alreadyCompleted=true + submission
        │
        └─ Non → Retourne questions avec acceptedAnswers
            ↓
        Frontend affiche question 1/10
        Timer 25s démarre
            ↓
        Joueur saisit réponse + Enter
            ↓
        Enregistre temps écoulé
        Passe à question 2/10
            ↓
        ... (répète pour questions 2-10) ...
            ↓
        Question 10/10 → Submit
            ↓
        POST /api/daily/submit
        Body: [{ questionId, answer, timeMs }, ...]
            ↓
        Backend valide chaque réponse
        - Normalisation
        - Levenshtein distance
        - Calcul score (base + vitesse + multiplier)
            ↓
        Création DailySubmission
        Mise à jour UserStreak
            ↓
        Retour: { submission, dailyNumber }
            ↓
        Frontend affiche QuizResults
        - Score total
        - Détail réponses
        - Classement du jour
        - Streak actuel
```

---

### Flux 3 : Calcul du score (exemple)

```
Question 1: Réponse correcte en 2s
    ↓
Base: 100
Vitesse: +100 (≤3s)
Multiplier: x1.0 (streak=1)
Points: 200
    ↓
Question 2: Réponse correcte en 5s
    ↓
Base: 100
Vitesse: +90 (≤7s)
Multiplier: x1.1 (streak=2)
Points: floor(190 * 1.1) = 209
    ↓
Question 3: Réponse correcte en 10s
    ↓
Base: 100
Vitesse: +80 (≤11s)
Multiplier: x1.2 (streak=3)
Points: floor(180 * 1.2) = 216
    ↓
Question 4: Réponse incorrecte
    ↓
Points: 0
Streak réinitialisé à 0
    ↓
Question 5: Réponse correcte en 15s
    ↓
Base: 100
Vitesse: +70 (≤15s)
Multiplier: x1.0 (streak=1)
Points: 170
    ↓
...
    ↓
Score total = somme de tous les points
```

---

## Dépendances entre modules

```
DAILY
 ├── Utilise : AUTH (JwtAuthGuard, UserStreak)
 ├── Utilise : QUESTIONS (sélection, validation réponses)
 ├── Fournit : UserStreak (mis à jour automatiquement)
 └── Consommé par : Frontend DailyPage
```

**Point important** : Le module DAILY dépend fortement de la qualité du contenu du module QUESTIONS. Sans questions valides et équilibrées par catégorie, la génération du Daily échouera ou sera déséquilibrée.

---

## Gestion des erreurs

### Erreurs backend

| Code | Cas | Message |
|------|-----|---------|
| `400 Bad Request` | Temps invalide (< 0 ou > 25000) | "Invalid time for question" |
| `401 Unauthorized` | Token manquant/invalide | "No token provided" |
| `409 Conflict` | Déjà soumis aujourd'hui | "Daily already completed" |
| `500 Internal Server Error` | Pas assez de questions pour générer le Daily | "Not enough published questions for daily" |
| `500 Internal Server Error` | Échec génération Daily | "Failed to generate daily" |
| `500 Internal Server Error` | Pas de Daily disponible | "No daily available" |

### Gestion frontend

- **Erreur réseau** : Message "Failed to load daily" avec bouton Retry
- **Déjà complété** : Affiche le score obtenu + bouton "Voir le classement"
- **Erreur soumission** : Message "Failed to submit" (rare, déjà vérifié côté client)

---

## Sécurité

### Mécanismes présents

#### 1. **Protection des routes**

Toutes les routes sont protégées par `@UseGuards(JwtAuthGuard)`.

---

#### 2. **Validation du temps**

Le temps de réponse est cappé à 25 000 ms. Empêche les temps négatifs ou excessifs.

**Validation côté serveur** :
```typescript
if (ans.timeMs > 25000 || ans.timeMs < 0) {
  throw new Error(`Invalid time for question ${ans.questionId}`);
}
```

---

#### 3. **Protection contre les soumissions multiples**

Contrainte unique `@@unique([userId, dailyId])` empêche de soumettre plusieurs fois le même Daily.

**Vérification côté serveur** :
```typescript
const existing = await prisma.dailySubmission.findUnique({
  where: { userId_dailyId: { userId, dailyId } }
});

if (existing) {
  throw new Error('Daily already completed');
}
```

---

### Points d'attention

#### 1. **Réponses exposées dans le code source**

**Problème** : Les `acceptedAnswers` sont envoyées au frontend dans `/api/daily/today`.

**Risque** : Un joueur peut inspecter le code source et trouver toutes les bonnes réponses.

**Justification** : Nécessaire pour le mode Daily (saisie libre). Le frontend doit connaître les variantes acceptées pour afficher le feedback après soumission.

**Mitigation** : Pas de mitigation possible sans changer le mode de jeu (passer en MCQ, par exemple).

---

#### 2. **Timing manipulable côté client**

**Problème** : Le temps de réponse est mesuré côté frontend et envoyé au backend.

**Risque** : Un joueur peut modifier le JavaScript pour envoyer des temps de 0 ms et maximiser le bonus de vitesse.

**Mitigation actuelle** : Validation côté serveur (0 ≤ timeMs ≤ 25000).

**Amélioration potentielle** :
- Mesurer le temps côté serveur (envoi timestamp de démarrage + soumission)
- Détecter les temps suspicieusement bas (ex: < 500 ms sur plusieurs questions)

---

#### 3. **Pas de détection de triche**

**Problème** : Aucun système de détection des joueurs qui répondent trop vite ou trop bien de manière suspecte.

**Amélioration potentielle** :
- Flagging automatique : 10/10 correct en < 10 secondes total
- Review manuel des scores aberrants
- Rate limiting : empêcher de tester plusieurs réponses rapidement (non applicable en mode Daily car 1 soumission unique)

---

#### 4. **CRON dépend du démarrage du serveur**

**Problème** : Le CRON `@Cron(EVERY_DAY_AT_MIDNIGHT)` ne fonctionne que si le serveur est en cours d'exécution à minuit.

**Risque** : Si le serveur est redémarré après minuit, le Daily du jour ne sera pas généré automatiquement.

**Mitigation actuelle** : `getTodaysDaily()` génère le Daily à la demande si non trouvé.

**Amélioration potentielle** : Utiliser un service externe de CRON ou un worker dédié.

---

## À retenir

1. **Le Daily est généré automatiquement chaque jour à minuit UTC** via CRON, mais peut aussi être généré à la demande si manquant.

2. **Sélection équilibrée** : 10 questions réparties entre les catégories selon leur taille (≥20 → 2 min, ≥10 → 1 min, reste proportionnel).

3. **Exclusion des questions récentes** : Les questions des 7 derniers Dailies sont exclues pour éviter les répétitions.

4. **Validation des réponses avec fuzzy matching** : Normalisation + distance de Levenshtein pour tolérer les fautes.

5. **Calcul du score** : Base (100) + Bonus de vitesse (40-100) × Multiplicateur de streak (1.0-1.5).

6. **Streak = jours consécutifs de participation**, pas nombre de bonnes réponses.

7. **Un joueur ne peut soumettre qu'une fois par Daily** (contrainte unique en DB).

8. **Les réponses acceptées sont exposées au frontend** (nécessaire pour le mode saisie libre).

9. **Le temps de réponse est mesuré côté frontend** et validé côté serveur (0-25000 ms).

10. **Le leaderboard est trié par score décroissant**, puis temps total croissant en cas d'égalité.

---

## Points d'amélioration potentiels

1. **Ne pas exposer les réponses au frontend** : Possible uniquement en changeant le mode de jeu (MCQ au lieu de saisie libre).

2. **Mesurer le temps côté serveur** : Envoyer un timestamp de démarrage au lieu du temps écoulé calculé côté client.

3. **Détection de triche** : Flagging automatique des scores aberrants, review manuel.

4. **CRON plus robuste** : Utiliser un service externe ou un worker dédié pour garantir l'exécution quotidienne.

5. **Prévisualisation des questions** : Permettre aux admins de prévisualiser le Daily avant publication.

6. **Historique des Dailies** : Permettre aux joueurs de rejouer les Dailies passés (mode entraînement).

7. **Optimisation de la sélection** : Éviter les questions avec un taux de succès trop bas ou trop haut.

8. **Notification push** : Rappeler aux joueurs de faire le Daily du jour.

9. **Classement global** : En plus du classement journalier, afficher un classement hebdomadaire ou mensuel.

10. **Récompenses** : Offrir des récompenses (badges, points) pour les streaks ou les scores exceptionnels.

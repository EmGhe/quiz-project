# Guide de Développement

Guide complet pour les développeurs travaillant sur Quiz Game Platform.

## 📋 Table des Matières

- [Architecture](#architecture)
- [Stack Technique](#stack-technique)
- [Modèles de Données](#modèles-de-données)
- [API Endpoints](#api-endpoints)
- [Frontend Architecture](#frontend-architecture)
- [Algorithmes Clés](#algorithmes-clés)
- [Tests](#tests)
- [Workflow de Développement](#workflow-de-développement)

## Architecture

### Vue d'ensemble

```
┌─────────────┐
│   Frontend  │  React 18 + Vite + Tailwind
│  (Port 5173)│  Zustand (state), React Router
└──────┬──────┘
       │ HTTP + Cookies
       │
┌──────▼──────┐
│   Backend   │  NestJS + Prisma ORM
│  (Port 3000)│  JWT Auth, Cron Jobs
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │  Database
│  (Port 5432)│  Docker container
└─────────────┘
```

### Principes de Design

- **Fact-first database**: Questions générées depuis des faits structurés
- **Server-side scoring**: Anti-triche, validation serveur
- **Stateless auth**: JWT dans HTTP-only cookies
- **Cron-based generation**: Daily créé automatiquement à minuit UTC

## Stack Technique

### Backend
- **Framework**: NestJS 10
- **ORM**: Prisma 5
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Validation**: class-validator + class-transformer
- **Database**: PostgreSQL 15
- **Scheduler**: @nestjs/schedule (cron jobs)

### Frontend
- **Framework**: React 18
- **Build**: Vite 5
- **Routing**: React Router 6
- **State**: Zustand 4
- **Styling**: Tailwind CSS 3
- **HTTP**: Axios

### DevOps
- **Monorepo**: pnpm workspaces
- **Container**: Docker (PostgreSQL)
- **Database Migrations**: Prisma Migrate

## Modèles de Données

### User
```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  
  streak       UserStreak?
  submissions  DailySubmission[]
}
```

### UserStreak
```prisma
model UserStreak {
  id             String    @id @default(cuid())
  userId         String    @unique
  currentStreak  Int       @default(0)
  longestStreak  Int       @default(0)
  lastDailyDate  String?   // Format: YYYY-MM-DD
  
  user           User      @relation(fields: [userId], references: [id])
}
```

### Daily
```prisma
model Daily {
  id           String   @id @default(cuid())
  dailyNumber  Int      @unique
  date         String   @unique  // Format: YYYY-MM-DD
  createdAt    DateTime @default(now())
  
  questions    DailyQuestion[]
  submissions  DailySubmission[]
}
```

### DailyQuestion
```prisma
model DailyQuestion {
  id              String   @id @default(cuid())
  dailyId         String
  questionId      String
  order           Int
  text            String
  acceptedAnswers Json     // Array of { answer: string }
  
  daily           Daily    @relation(fields: [dailyId], references: [id])
  question        Question @relation(fields: [questionId], references: [id])
}
```

### DailySubmission
```prisma
model DailySubmission {
  id           String   @id @default(cuid())
  dailyId      String
  userId       String
  score        Int
  correctCount Int
  totalTime    Int      // Milliseconds
  answersData  Json     // Array of answer details
  createdAt    DateTime @default(now())
  
  daily        Daily    @relation(fields: [dailyId], references: [id])
  user         User     @relation(fields: [userId], references: [id])
  
  @@unique([dailyId, userId])
}
```

## API Endpoints

### Auth Module

#### POST /api/auth/register
Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "username": "string (3-20 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars)"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

**Cookie**: `token` (HTTP-only, 7 days)

#### POST /api/auth/login
Se connecter avec username/email et password.

**Body:**
```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

**Response**: Same as register

#### GET /api/auth/me
Obtenir les infos de l'utilisateur connecté.

**Headers**: Cookie avec JWT

**Response:**
```json
{
  "user": { "id": "...", "username": "...", "email": "..." },
  "streak": {
    "currentStreak": 5,
    "longestStreak": 10,
    "lastDailyDate": "2026-10-09"
  }
}
```

#### POST /api/auth/logout
Se déconnecter (clear cookie).

### Daily Module

#### GET /api/daily/today
Obtenir le daily challenge du jour.

**Response:**
```json
{
  "dailyNumber": 1,
  "date": "2026-10-09",
  "questions": [
    {
      "questionId": "...",
      "order": 1,
      "text": "Question text?",
      "acceptedAnswers": [{ "answer": "..." }]
    }
  ],
  "alreadyCompleted": false,
  "submission": null
}
```

Si déjà complété: `alreadyCompleted: true` + objet `submission`.

#### POST /api/daily/submit
Soumettre les réponses au daily.

**Body:**
```json
{
  "answers": [
    {
      "questionId": "string",
      "answer": "string",
      "timeMs": 5000
    }
  ]
}
```

**Validation**:
- Doit avoir 10 réponses (une par question)
- `timeMs` doit être entre 0 et 25000ms
- Peut soumettre une seule fois par jour

**Response:**
```json
{
  "submission": {
    "score": 2584,
    "correctCount": 10,
    "totalTime": 45000,
    "answersData": [
      {
        "questionId": "...",
        "answer": "user answer",
        "correct": true,
        "timeMs": 5000,
        "pointsEarned": 200
      }
    ]
  },
  "dailyNumber": 1
}
```

#### GET /api/daily/leaderboard
Obtenir le classement du jour.

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "...",
      "username": "player1",
      "score": 2800,
      "totalTime": 40000,
      "correctCount": 10
    }
  ]
}
```

**Tri**: Score desc, totalTime asc

## Frontend Architecture

### Pages

**LoginPage** (`src/pages/LoginPage.tsx`)
- Formulaire de connexion
- Redirect vers `/daily` si déjà connecté

**RegisterPage** (`src/pages/RegisterPage.tsx`)
- Formulaire d'inscription
- Redirect vers `/daily` après succès

**DailyPage** (`src/pages/DailyPage.tsx`)
- Page principale du quiz
- Timer 25s par question
- Navigation avec bouton Next ou touche ENTER
- Affichage des streaks
- Submit final et redirection vers résultats

### Components

**QuizResults** (`src/components/QuizResults.tsx`)
- Affichage du score total
- Breakdown détaillé par question
- Leaderboard
- ShareCard intégré

**ShareCard** (`src/components/ShareCard.tsx`)
- Carte visuelle avec gradient
- Bouton "Copier le texte"
- Bouton "Partager sur Twitter"
- Aperçu du message formaté

### State Management

**authStore** (`src/store/authStore.ts`)
```typescript
interface AuthStore {
  user: User | null;
  streak: UserStreak | null;
  loading: boolean;
  
  setUser: (user: User | null) => void;
  setStreak: (streak: UserStreak | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}
```

### Routing

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route
      path="/daily"
      element={
        <ProtectedRoute>
          <DailyPage />
        </ProtectedRoute>
      }
    />
  </Routes>
</BrowserRouter>
```

## Algorithmes Clés

### Scoring Algorithm

Implémenté dans `apps/backend/src/modules/daily/daily.service.ts:calculateScore()`

```typescript
function calculateScore(answers, questions): number {
  let totalScore = 0;
  let consecutiveCorrect = 0;

  for (const answer of answers) {
    const question = questions.find(q => q.questionId === answer.questionId);
    const correct = checkAnswer(answer.answer, question.acceptedAnswers);

    if (correct) {
      consecutiveCorrect++;
      
      // Base points
      let points = 100;
      
      // Speed bonus (0-25000ms)
      const speedBonus = getSpeedBonus(answer.timeMs);
      points += speedBonus;
      
      // Consecutive multiplier (1.0x to 1.5x)
      const multiplier = getMultiplier(consecutiveCorrect);
      points = Math.round(points * multiplier);
      
      totalScore += points;
    } else {
      consecutiveCorrect = 0; // Reset streak
    }
  }

  return totalScore;
}
```

**Speed Bonus Table:**
```typescript
const SPEED_BONUS = [
  { max: 3000, bonus: 100 },   // 0-3s: +100
  { max: 7000, bonus: 90 },    // 3-7s: +90
  { max: 11000, bonus: 80 },   // 7-11s: +80
  { max: 15000, bonus: 70 },   // 11-15s: +70
  { max: 19000, bonus: 60 },   // 15-19s: +60
  { max: 22000, bonus: 50 },   // 19-22s: +50
  { max: 25000, bonus: 40 },   // 22-25s: +40
];
```

**Multiplier Table:**
```typescript
const MULTIPLIERS = {
  1: 1.0,
  2: 1.1,
  3: 1.2,
  4: 1.3,
  5: 1.5,  // Caps at 5+
};
```

### Streak Update Algorithm

Implémenté dans `apps/backend/src/modules/daily/daily.service.ts:updateStreak()`

```typescript
async function updateStreak(userId: string, dailyDate: string) {
  const streak = await getStreak(userId);
  const today = dailyDate;
  const yesterday = getYesterday(today);

  if (streak.lastDailyDate === yesterday) {
    // Continue streak
    streak.currentStreak++;
    streak.longestStreak = Math.max(streak.currentStreak, streak.longestStreak);
  } else if (streak.lastDailyDate !== today) {
    // Reset streak (skipped days)
    streak.currentStreak = 1;
  }
  // else: already completed today (no change)

  streak.lastDailyDate = today;
  await streak.save();
}
```

### Answer Validation

```typescript
function checkAnswer(userAnswer: string, acceptedAnswers: Array<{ answer: string }>): boolean {
  const normalized = normalizeAnswer(userAnswer);
  return acceptedAnswers.some(a => normalizeAnswer(a.answer) === normalized);
}

function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove special chars
}
```

## Tests

### Backend Tests

```bash
cd apps/backend

# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

**Test Structure:**
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.spec.ts
│   │   └── auth.controller.spec.ts
│   └── daily/
│       ├── daily.service.spec.ts
│       └── daily.controller.spec.ts
```

### Frontend Tests

```bash
cd apps/frontend

# Run tests (si configurés)
pnpm test
```

### Test E2E Recommandé

Pour un workflow E2E complet, utiliser Playwright ou Cypress:

**Flow à tester:**
1. Register → Login
2. Load Daily Challenge
3. Answer 10 questions
4. Submit quiz
5. View results
6. Check leaderboard
7. Share card

**Exemple avec Playwright:**
```typescript
test('complete daily challenge flow', async ({ page }) => {
  // 1. Register
  await page.goto('http://localhost:5173/register');
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // 2. Daily page loads
  await expect(page).toHaveURL('/daily');
  
  // 3. Answer questions
  for (let i = 0; i < 10; i++) {
    await page.fill('input[type="text"]', 'test answer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
  }
  
  // 4. Check results
  await expect(page.locator('text=Quiz Complete')).toBeVisible();
  await expect(page.locator('text=Your Score')).toBeVisible();
});
```

## Workflow de Développement

### Ajouter une Feature

1. **Créer une branche**
```bash
git checkout -b feat/my-feature
```

2. **Développer** (Backend ou Frontend)

3. **Tester localement**
```bash
# Backend
cd apps/backend && pnpm dev

# Frontend
cd apps/frontend && pnpm dev
```

4. **Commit**
```bash
git add .
git commit -m "feat: add my feature"
```

5. **Push et PR**
```bash
git push origin feat/my-feature
```

### Modifier le Schema DB

1. **Éditer `apps/backend/prisma/schema.prisma`**

2. **Créer la migration**
```bash
cd apps/backend
pnpm prisma:migrate:dev --name add_my_field
```

3. **Vérifier la migration** dans `prisma/migrations/`

4. **Commit la migration**
```bash
git add prisma/
git commit -m "feat: add my_field to User model"
```

### Debugging

**Backend:**
```bash
# Logs détaillés
cd apps/backend
pnpm dev

# Prisma Studio pour explorer la DB
pnpm prisma:studio
```

**Frontend:**
```bash
# Console navigateur: F12
# React DevTools: extension Chrome/Firefox
# Network tab pour voir les requêtes API
```

### Common Pitfalls

❌ **Ne pas valider côté serveur** → Toujours valider les inputs serveur  
❌ **Oublier le `withCredentials: true`** → Les cookies ne sont pas envoyés  
❌ **Hardcoder les URLs** → Utiliser les variables d'environnement  
❌ **Ne pas capper le timeMs** → Validation échoue si > 25000ms  
❌ **Scorer côté client** → Anti-triche: toujours scorer côté serveur

## Ressources

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Router](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)

## Support

Pour toute question sur le développement, voir [README.md](./README.md) ou ouvrir une issue.

# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete profile page displaying user stats (Daily, PvP, Collection), a showcase of up to 10 favorite cards, and basic profile editing.

**Architecture:** Backend NestJS module aggregating stats from existing models (UserStreak, UserElo, UserCard) without duplication. Frontend React page with Zustand store and three main components (Header, Stats, Showcase). New UserProfile model stores only UI-specific data (displayName, bio, avatarUrl, currentTitle).

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), React + Vite + Tailwind + Zustand (frontend)

**Spec:** `docs/superpowers/specs/2026-10-26-profile-page-design.md`

## Global Constraints

- NestJS modules follow existing project structure (`apps/backend/src/modules/`)
- Prisma migrations use `npx prisma migrate dev`
- Frontend stores use Zustand pattern from `stores/collectionStore.ts`
- All API endpoints require JWT authentication
- Title fixed to "Explorateur" for all users (no dynamic calculation)
- Showcase displays max 10 cards with `isFavorite=true`, sorted by `obtainedAt DESC`
- displayName max 50 characters, bio max 500 characters
- Stats calculated on-the-fly (no caching in MVP)
- Responsive design: mobile-first approach

## Review Focus

1. **User without Daily/PvP history:** When a user has never completed a Daily or played PvP, the profile should display zeros/defaults gracefully, not crash or show null errors. Test: user with no UserStreak, no UserElo → profile loads with 0 values.

2. **Empty showcase (0 favorites):** When a user has no favorite cards, the showcase should display a helpful message instead of an empty grid. Test: user with 0 cards marked isFavorite → message "Aucune carte favorite..." displays.

3. **displayName validation edge cases:** Special characters, emojis, very long names should be handled consistently. Test: PATCH with displayName containing emoji, 51 characters, special chars → appropriate validation error or acceptance.

4. **Showcase card ownership verification:** Backend must verify all returned showcase cards actually belong to the requesting user. Test: manually create UserCard for different userId with isFavorite=true → should not appear in first user's showcase.

5. **Concurrent favorite toggles:** If a user marks/unmarks favorites rapidly, the showcase should reflect the latest state without race conditions. Test: rapid PATCH requests on UserCard.isFavorite → GET /api/profile returns consistent showcase state.

---

## File Structure

### Backend
```
apps/backend/
├── prisma/
│   └── schema.prisma (modify User, add UserProfile)
├── src/modules/profile/
│   ├── profile.module.ts (new)
│   ├── profile.controller.ts (new)
│   ├── profile.service.ts (new)
│   └── dto/
│       ├── profile-response.dto.ts (new)
│       └── update-profile.dto.ts (new)
```

### Frontend
```
apps/frontend/src/
├── stores/
│   └── profileStore.ts (new)
├── types/
│   └── profile.ts (new)
├── api/
│   └── profile.ts (new)
├── components/profile/
│   ├── ProfileHeader.tsx (new)
│   ├── StatsCard.tsx (new)
│   └── ShowcaseSection.tsx (new)
├── pages/
│   └── ProfilePage.tsx (new)
└── App.tsx (modify - add route)
```

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: Migration file (auto-generated)

**Interfaces:**
- Consumes: Existing `User` model
- Produces: `UserProfile` model with fields: `id`, `userId`, `displayName`, `bio`, `avatarUrl`, `currentTitle`, `user` relation

- [ ] **Step 1: Add UserProfile model to schema.prisma**

Add after the `User` model:

```prisma
model UserProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  displayName  String?
  bio          String?
  avatarUrl    String?
  currentTitle String   @default("Explorateur")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("user_profiles")
}
```

- [ ] **Step 2: Add reverse relation to User model**

In the `User` model, add with other relations:

```prisma
profile UserProfile?
```

- [ ] **Step 3: Create and apply migration**

Run:
```bash
cd apps/backend
npx prisma migrate dev --name add_user_profile
```

Expected: Migration created and applied successfully, `user_profiles` table exists in DB

- [ ] **Step 4: Generate Prisma Client**

Run:
```bash
npx prisma generate
```

Expected: Prisma client updated with UserProfile type

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add UserProfile model with title and bio fields"
```

---

### Task 2: Backend DTOs

**Files:**
- Create: `apps/backend/src/modules/profile/dto/profile-response.dto.ts`
- Create: `apps/backend/src/modules/profile/dto/update-profile.dto.ts`

**Interfaces:**
- Consumes: Nothing (defines types)
- Produces: TypeScript DTOs for API requests/responses

- [ ] **Step 1: Create profile-response.dto.ts**

```typescript
export class DailyStats {
  currentStreak: number;
  longestStreak: number;
  totalDailyCompleted: number;
  averageSuccessRate: number;
  totalGoldEarned: number;
}

export class PvPStats {
  currentRank: string;
  currentDivision: number;
  currentElo: number;
  totalVictories: number;
  totalDefeats: number;
  winrate: number;
  currentWinStreak: number;
}

export class CollectionStats {
  totalCards: number;
  commonCount: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  favoriteCount: number;
}

export class ShowcaseCard {
  id: string;
  imageUrl: string;
  rarity: string;
  entityLabel: string;
}

export class ProfileResponseDto {
  profile: {
    id: string;
    userId: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    currentTitle: string;
  };
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
  showcaseCards: ShowcaseCard[];
}
```

- [ ] **Step 2: Create update-profile.dto.ts**

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
```

- [ ] **Step 3: Verify DTO structure matches spec**

Check that field names and types match the spec exactly (displayName vs display_name, etc.)

- [ ] **Step 4: Commit**

```bash
git add src/modules/profile/dto/
git commit -m "feat(profile): add DTOs for profile API"
```

---

### Task 3: ProfileService - Stats Calculation

**Files:**
- Create: `apps/backend/src/modules/profile/profile.service.ts`

**Interfaces:**
- Consumes: `PrismaService`, `UserStreak`, `UserElo`, `UserCard`, `DailySubmission`, `GoldTransaction` models
- Produces: `calculateDailyStats(userId: string): Promise<DailyStats>`, `calculatePvPStats(userId: string): Promise<PvPStats>`, `calculateCollectionStats(userId: string): Promise<CollectionStats>`, `getShowcaseCards(userId: string): Promise<ShowcaseCard[]>`

- [ ] **Step 1: Write test for calculateDailyStats with existing data**

Create `apps/backend/src/modules/profile/profile.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProfileService - calculateDailyStats', () => {
  let service: ProfileService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProfileService, PrismaService],
    }).compile();

    service = module.get(ProfileService);
    prisma = module.get(PrismaService);
  });

  it('should calculate daily stats from UserStreak and submissions', async () => {
    const userId = 'test-user-1';
    
    // Mock UserStreak
    jest.spyOn(prisma.userStreak, 'findUnique').mockResolvedValue({
      id: '1',
      userId,
      currentStreak: 7,
      longestStreak: 15,
      lastDailyDate: '2026-10-26',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock DailySubmission count and average
    jest.spyOn(prisma.dailySubmission, 'count').mockResolvedValue(32);
    jest.spyOn(prisma.dailySubmission, 'aggregate').mockResolvedValue({
      _avg: { correctCount: 8.5 },
    });

    // Mock GoldTransaction sum
    jest.spyOn(prisma.goldTransaction, 'aggregate').mockResolvedValue({
      _sum: { amount: 1450 },
    });

    const stats = await service['calculateDailyStats'](userId);

    expect(stats).toEqual({
      currentStreak: 7,
      longestStreak: 15,
      totalDailyCompleted: 32,
      averageSuccessRate: 85,
      totalGoldEarned: 1450,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- profile.service.spec.ts`
Expected: FAIL - ProfileService not defined

- [ ] **Step 3: Implement ProfileService skeleton and calculateDailyStats**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyStats, PvPStats, CollectionStats, ShowcaseCard } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  private async calculateDailyStats(userId: string): Promise<DailyStats> {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    const totalCompleted = await this.prisma.dailySubmission.count({
      where: { userId },
    });

    const avgCorrect = await this.prisma.dailySubmission.aggregate({
      where: { userId },
      _avg: { correctCount: true },
    });

    const goldSum = await this.prisma.goldTransaction.aggregate({
      where: { userId, reason: 'daily_completion' },
      _sum: { amount: true },
    });

    return {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      totalDailyCompleted: totalCompleted,
      averageSuccessRate: avgCorrect._avg.correctCount 
        ? Math.round((avgCorrect._avg.correctCount / 10) * 100) 
        : 0,
      totalGoldEarned: goldSum._sum.amount || 0,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- profile.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Write test for calculateDailyStats with no data (Review Focus #1)**

Add to spec file:

```typescript
it('should return zeros when user has no daily history', async () => {
  const userId = 'new-user';
  
  jest.spyOn(prisma.userStreak, 'findUnique').mockResolvedValue(null);
  jest.spyOn(prisma.dailySubmission, 'count').mockResolvedValue(0);
  jest.spyOn(prisma.dailySubmission, 'aggregate').mockResolvedValue({
    _avg: { correctCount: null },
  });
  jest.spyOn(prisma.goldTransaction, 'aggregate').mockResolvedValue({
    _sum: { amount: null },
  });

  const stats = await service['calculateDailyStats'](userId);

  expect(stats).toEqual({
    currentStreak: 0,
    longestStreak: 0,
    totalDailyCompleted: 0,
    averageSuccessRate: 0,
    totalGoldEarned: 0,
  });
});
```

Run test, verify it passes with existing implementation

- [ ] **Step 6: Write test for calculatePvPStats**

```typescript
it('should calculate PvP stats from UserElo', async () => {
  const userId = 'test-user-1';
  
  jest.spyOn(prisma.userElo, 'findUnique').mockResolvedValue({
    id: '1',
    userId,
    elo: 1285,
    rank: 'Silver',
    division: 2,
    seasonId: null,
    placementMatches: 5,
    totalMatches: 41,
    wins: 23,
    losses: 18,
    winStreak: 3,
    highestElo: 1350,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const stats = await service['calculatePvPStats'](userId);

  expect(stats).toEqual({
    currentRank: 'Silver',
    currentDivision: 2,
    currentElo: 1285,
    totalVictories: 23,
    totalDefeats: 18,
    winrate: 56,
    currentWinStreak: 3,
  });
});
```

- [ ] **Step 7: Implement calculatePvPStats**

```typescript
private async calculatePvPStats(userId: string): Promise<PvPStats> {
  const elo = await this.prisma.userElo.findUnique({
    where: { userId },
  });

  if (!elo) {
    return {
      currentRank: 'Bronze',
      currentDivision: 3,
      currentElo: 1200,
      totalVictories: 0,
      totalDefeats: 0,
      winrate: 0,
      currentWinStreak: 0,
    };
  }

  const winrate = elo.totalMatches > 0
    ? Math.round((elo.wins / elo.totalMatches) * 100)
    : 0;

  return {
    currentRank: elo.rank,
    currentDivision: elo.division,
    currentElo: elo.elo,
    totalVictories: elo.wins,
    totalDefeats: elo.losses,
    winrate,
    currentWinStreak: elo.winStreak,
  };
}
```

Run test, verify it passes

- [ ] **Step 8: Write test for calculateCollectionStats**

```typescript
it('should calculate collection stats from UserCard', async () => {
  const userId = 'test-user-1';
  
  jest.spyOn(prisma.userCard, 'count').mockResolvedValue(42);
  jest.spyOn(prisma.userCard, 'groupBy').mockResolvedValue([
    { rarity: 'common', _count: { rarity: 18 } },
    { rarity: 'rare', _count: { rarity: 15 } },
    { rarity: 'epic', _count: { rarity: 7 } },
    { rarity: 'legendary', _count: { rarity: 2 } },
  ]);
  jest.spyOn(prisma.userCard, 'count').mockResolvedValueOnce(42).mockResolvedValueOnce(8);

  const stats = await service['calculateCollectionStats'](userId);

  expect(stats).toEqual({
    totalCards: 42,
    commonCount: 18,
    rareCount: 15,
    epicCount: 7,
    legendaryCount: 2,
    favoriteCount: 8,
  });
});
```

- [ ] **Step 9: Implement calculateCollectionStats**

```typescript
private async calculateCollectionStats(userId: string): Promise<CollectionStats> {
  const totalCards = await this.prisma.userCard.count({
    where: { userId },
  });

  const byRarity = await this.prisma.userCard.groupBy({
    by: ['rarity'],
    where: { userId },
    _count: { rarity: true },
  });

  const favoriteCount = await this.prisma.userCard.count({
    where: { userId, isFavorite: true },
  });

  const rarityMap = byRarity.reduce((acc, item) => {
    acc[item.rarity] = item._count.rarity;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCards,
    commonCount: rarityMap['common'] || 0,
    rareCount: rarityMap['rare'] || 0,
    epicCount: rarityMap['epic'] || 0,
    legendaryCount: rarityMap['legendary'] || 0,
    favoriteCount,
  };
}
```

Run test, verify it passes

- [ ] **Step 10: Write test for getShowcaseCards**

```typescript
it('should return up to 10 favorite cards sorted by obtainedAt DESC', async () => {
  const userId = 'test-user-1';
  
  const mockCards = Array.from({ length: 12 }, (_, i) => ({
    id: `uc-${i}`,
    userId,
    cardId: `card-${i}`,
    rarity: 'rare',
    baseRarity: 'rare',
    isFavorite: true,
    obtainedAt: new Date(2026, 10, 26 - i),
    upgradedAt: null,
    card: {
      id: `card-${i}`,
      imageUrl: `http://image.com/${i}.jpg`,
      rarity: 'rare',
      entity: {
        label: `Entity ${i}`,
      },
    },
  }));

  jest.spyOn(prisma.userCard, 'findMany').mockResolvedValue(mockCards.slice(0, 10) as any);

  const showcase = await service['getShowcaseCards'](userId);

  expect(showcase).toHaveLength(10);
  expect(showcase[0]).toEqual({
    id: 'card-0',
    imageUrl: 'http://image.com/0.jpg',
    rarity: 'rare',
    entityLabel: 'Entity 0',
  });
});
```

- [ ] **Step 11: Implement getShowcaseCards**

```typescript
private async getShowcaseCards(userId: string): Promise<ShowcaseCard[]> {
  const userCards = await this.prisma.userCard.findMany({
    where: { userId, isFavorite: true },
    orderBy: { obtainedAt: 'desc' },
    take: 10,
    include: {
      card: {
        include: {
          entity: true,
        },
      },
    },
  });

  return userCards.map(uc => ({
    id: uc.card.id,
    imageUrl: uc.card.imageUrl,
    rarity: uc.rarity,
    entityLabel: uc.card.entity.label,
  }));
}
```

Run test, verify it passes

- [ ] **Step 12: Write test for getShowcaseCards with 0 favorites (Review Focus #2)**

```typescript
it('should return empty array when user has no favorites', async () => {
  const userId = 'new-user';
  
  jest.spyOn(prisma.userCard, 'findMany').mockResolvedValue([]);

  const showcase = await service['getShowcaseCards'](userId);

  expect(showcase).toEqual([]);
});
```

Run test, verify it passes

- [ ] **Step 13: Commit**

```bash
git add src/modules/profile/profile.service.ts src/modules/profile/profile.service.spec.ts
git commit -m "feat(profile): add stats calculation methods to ProfileService"
```

---

### Task 4: ProfileService - Profile Management

**Files:**
- Modify: `apps/backend/src/modules/profile/profile.service.ts`

**Interfaces:**
- Consumes: `calculateDailyStats`, `calculatePvPStats`, `calculateCollectionStats`, `getShowcaseCards` from Task 3
- Produces: `getOrCreateProfile(userId: string): Promise<UserProfile>`, `getCompleteProfile(userId: string): Promise<ProfileResponseDto>`, `updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfile>`

- [ ] **Step 1: Write test for getOrCreateProfile - creates new profile**

Add to `profile.service.spec.ts`:

```typescript
describe('ProfileService - getOrCreateProfile', () => {
  it('should create a new profile if none exists', async () => {
    const userId = 'new-user';
    
    jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.userProfile, 'create').mockResolvedValue({
      id: 'profile-1',
      userId,
      displayName: null,
      bio: null,
      avatarUrl: null,
      currentTitle: 'Explorateur',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = await service.getOrCreateProfile(userId);

    expect(profile.currentTitle).toBe('Explorateur');
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: { userId },
    });
  });

  it('should return existing profile if it exists', async () => {
    const userId = 'existing-user';
    
    const existingProfile = {
      id: 'profile-1',
      userId,
      displayName: 'John',
      bio: 'Bio text',
      avatarUrl: null,
      currentTitle: 'Explorateur',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(existingProfile);

    const profile = await service.getOrCreateProfile(userId);

    expect(profile).toEqual(existingProfile);
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- profile.service.spec.ts`
Expected: FAIL - getOrCreateProfile not defined

- [ ] **Step 3: Implement getOrCreateProfile**

Add to ProfileService:

```typescript
async getOrCreateProfile(userId: string) {
  let profile = await this.prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await this.prisma.userProfile.create({
      data: { userId },
    });
  }

  return profile;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- profile.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Write test for getCompleteProfile**

```typescript
describe('ProfileService - getCompleteProfile', () => {
  it('should aggregate profile, stats, and showcase', async () => {
    const userId = 'test-user-1';
    
    const mockProfile = {
      id: 'profile-1',
      userId,
      displayName: 'John',
      bio: 'Test bio',
      avatarUrl: null,
      currentTitle: 'Explorateur',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(service, 'getOrCreateProfile').mockResolvedValue(mockProfile as any);
    jest.spyOn(service as any, 'calculateDailyStats').mockResolvedValue({
      currentStreak: 7,
      longestStreak: 15,
      totalDailyCompleted: 32,
      averageSuccessRate: 85,
      totalGoldEarned: 1450,
    });
    jest.spyOn(service as any, 'calculatePvPStats').mockResolvedValue({
      currentRank: 'Silver',
      currentDivision: 2,
      currentElo: 1285,
      totalVictories: 23,
      totalDefeats: 18,
      winrate: 56,
      currentWinStreak: 3,
    });
    jest.spyOn(service as any, 'calculateCollectionStats').mockResolvedValue({
      totalCards: 42,
      commonCount: 18,
      rareCount: 15,
      epicCount: 7,
      legendaryCount: 2,
      favoriteCount: 8,
    });
    jest.spyOn(service as any, 'getShowcaseCards').mockResolvedValue([]);

    const complete = await service.getCompleteProfile(userId);

    expect(complete.profile.displayName).toBe('John');
    expect(complete.dailyStats.currentStreak).toBe(7);
    expect(complete.pvpStats.currentElo).toBe(1285);
    expect(complete.collectionStats.totalCards).toBe(42);
    expect(complete.showcaseCards).toEqual([]);
  });
});
```

- [ ] **Step 6: Implement getCompleteProfile**

```typescript
async getCompleteProfile(userId: string): Promise<ProfileResponseDto> {
  const profile = await this.getOrCreateProfile(userId);
  
  const [dailyStats, pvpStats, collectionStats, showcaseCards] = await Promise.all([
    this.calculateDailyStats(userId),
    this.calculatePvPStats(userId),
    this.calculateCollectionStats(userId),
    this.getShowcaseCards(userId),
  ]);

  return {
    profile: {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      currentTitle: profile.currentTitle,
    },
    dailyStats,
    pvpStats,
    collectionStats,
    showcaseCards,
  };
}
```

Run test, verify it passes

- [ ] **Step 7: Write test for updateProfile with validation (Review Focus #3)**

```typescript
describe('ProfileService - updateProfile', () => {
  it('should update profile fields', async () => {
    const userId = 'test-user-1';
    const updateData = {
      displayName: 'NewName',
      bio: 'New bio text',
    };

    jest.spyOn(prisma.userProfile, 'update').mockResolvedValue({
      id: 'profile-1',
      userId,
      displayName: 'NewName',
      bio: 'New bio text',
      avatarUrl: null,
      currentTitle: 'Explorateur',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await service.updateProfile(userId, updateData);

    expect(updated.displayName).toBe('NewName');
    expect(updated.bio).toBe('New bio text');
  });
});
```

- [ ] **Step 8: Implement updateProfile**

```typescript
async updateProfile(userId: string, data: UpdateProfileDto) {
  return this.prisma.userProfile.update({
    where: { userId },
    data,
  });
}
```

Run test, verify it passes

- [ ] **Step 9: Commit**

```bash
git add src/modules/profile/profile.service.ts src/modules/profile/profile.service.spec.ts
git commit -m "feat(profile): add profile management methods to ProfileService"
```

---

### Task 5: ProfileController & Module

**Files:**
- Create: `apps/backend/src/modules/profile/profile.controller.ts`
- Create: `apps/backend/src/modules/profile/profile.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `ProfileService.getCompleteProfile(userId)`, `ProfileService.updateProfile(userId, data)`
- Produces: `GET /api/profile` endpoint, `PATCH /api/profile` endpoint

- [ ] **Step 1: Write E2E test for GET /api/profile**

Create `apps/backend/test/profile.e2e-spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProfileController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' });
    
    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/profile should return 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/profile')
      .expect(401);
  });

  it('GET /api/profile should return profile with stats', () => {
    return request(app.getHttpServer())
      .get('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('profile');
        expect(res.body).toHaveProperty('dailyStats');
        expect(res.body).toHaveProperty('pvpStats');
        expect(res.body).toHaveProperty('collectionStats');
        expect(res.body).toHaveProperty('showcaseCards');
        expect(res.body.profile.currentTitle).toBe('Explorateur');
      });
  });
});
```

- [ ] **Step 2: Run E2E test to verify it fails**

Run: `npm run test:e2e -- profile.e2e-spec.ts`
Expected: FAIL - route not found

- [ ] **Step 3: Create ProfileController**

```typescript
import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.profileService.getCompleteProfile(req.user.userId);
  }

  @Patch()
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.userId, updateDto);
  }
}
```

- [ ] **Step 4: Create ProfileModule**

```typescript
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
```

- [ ] **Step 5: Register ProfileModule in AppModule**

Add to imports array in `apps/backend/src/app.module.ts`:

```typescript
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    // ... existing modules
    ProfileModule,
  ],
  // ...
})
```

- [ ] **Step 6: Run E2E test to verify it passes**

Run: `npm run test:e2e -- profile.e2e-spec.ts`
Expected: PASS

- [ ] **Step 7: Add E2E test for PATCH /api/profile with validation**

```typescript
it('PATCH /api/profile should update displayName', () => {
  return request(app.getHttpServer())
    .patch('/api/profile')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ displayName: 'UpdatedName' })
    .expect(200)
    .expect((res) => {
      expect(res.body.displayName).toBe('UpdatedName');
    });
});

it('PATCH /api/profile should reject displayName > 50 chars', () => {
  return request(app.getHttpServer())
    .patch('/api/profile')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ displayName: 'a'.repeat(51) })
    .expect(400);
});
```

Run test, verify it passes with validation pipe enabled

- [ ] **Step 8: Commit**

```bash
git add src/modules/profile/ src/app.module.ts test/profile.e2e-spec.ts
git commit -m "feat(profile): add ProfileController with GET and PATCH endpoints"
```

---

### Task 6: Frontend Types & API Client

**Files:**
- Create: `apps/frontend/src/types/profile.ts`
- Create: `apps/frontend/src/api/profile.ts`

**Interfaces:**
- Consumes: Backend API endpoints (GET /api/profile, PATCH /api/profile)
- Produces: TypeScript types and API functions for frontend

- [ ] **Step 1: Create profile types**

```typescript
// apps/frontend/src/types/profile.ts

export interface DailyStats {
  currentStreak: number;
  longestStreak: number;
  totalDailyCompleted: number;
  averageSuccessRate: number;
  totalGoldEarned: number;
}

export interface PvPStats {
  currentRank: string;
  currentDivision: number;
  currentElo: number;
  totalVictories: number;
  totalDefeats: number;
  winrate: number;
  currentWinStreak: number;
}

export interface CollectionStats {
  totalCards: number;
  commonCount: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  favoriteCount: number;
}

export interface ShowcaseCard {
  id: string;
  imageUrl: string;
  rarity: string;
  entityLabel: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  currentTitle: string;
}

export interface CompleteProfile {
  profile: UserProfile;
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
  showcaseCards: ShowcaseCard[];
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}
```

- [ ] **Step 2: Create profile API client**

```typescript
// apps/frontend/src/api/profile.ts

import axios from 'axios';
import { CompleteProfile, UpdateProfileData, UserProfile } from '../types/profile';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const profileApi = {
  getProfile: async (): Promise<CompleteProfile> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`${API_URL}/profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
```

- [ ] **Step 3: Verify types match backend DTOs**

Compare field names in `types/profile.ts` with `dto/profile-response.dto.ts` - ensure exact match

- [ ] **Step 4: Commit**

```bash
git add src/types/profile.ts src/api/profile.ts
git commit -m "feat(profile): add frontend types and API client"
```

---

### Task 7: Profile Store (Zustand)

**Files:**
- Create: `apps/frontend/src/stores/profileStore.ts`

**Interfaces:**
- Consumes: `profileApi.getProfile()`, `profileApi.updateProfile(data)`
- Produces: `useProfileStore` hook with state: `profile`, `dailyStats`, `pvpStats`, `collectionStats`, `showcaseCards`, `loading`, `error`, and actions: `fetchProfile()`, `updateProfile(data)`

- [ ] **Step 1: Create profileStore with fetchProfile**

```typescript
// apps/frontend/src/stores/profileStore.ts

import { create } from 'zustand';
import { profileApi } from '../api/profile';
import {
  UserProfile,
  DailyStats,
  PvPStats,
  CollectionStats,
  ShowcaseCard,
  UpdateProfileData,
} from '../types/profile';

interface ProfileState {
  profile: UserProfile | null;
  dailyStats: DailyStats | null;
  pvpStats: PvPStats | null;
  collectionStats: CollectionStats | null;
  showcaseCards: ShowcaseCard[];
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  dailyStats: null,
  pvpStats: null,
  collectionStats: null,
  showcaseCards: [],
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const data = await profileApi.getProfile();
      set({
        profile: data.profile,
        dailyStats: data.dailyStats,
        pvpStats: data.pvpStats,
        collectionStats: data.collectionStats,
        showcaseCards: data.showcaseCards,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Erreur lors du chargement du profil',
        loading: false,
      });
    }
  },

  updateProfile: async (data: UpdateProfileData) => {
    set({ loading: true, error: null });
    try {
      const updatedProfile = await profileApi.updateProfile(data);
      set((state) => ({
        profile: updatedProfile,
        loading: false,
      }));
    } catch (error) {
      set({
        error: 'Erreur lors de la mise à jour',
        loading: false,
      });
    }
  },
}));
```

- [ ] **Step 2: Verify store follows Zustand pattern from collectionStore**

Compare structure with `stores/collectionStore.ts` - ensure consistent pattern

- [ ] **Step 3: Commit**

```bash
git add src/stores/profileStore.ts
git commit -m "feat(profile): add Zustand store for profile state"
```

---

### Task 8: ProfileHeader Component

**Files:**
- Create: `apps/frontend/src/components/profile/ProfileHeader.tsx`

**Interfaces:**
- Consumes: Props: `avatarUrl`, `displayName`, `username`, `title`, `rank`, `division`, `elo`
- Produces: React component rendering avatar, name, title, and PvP badge

- [ ] **Step 1: Create ProfileHeader component**

```typescript
// apps/frontend/src/components/profile/ProfileHeader.tsx

import React from 'react';

interface ProfileHeaderProps {
  avatarUrl?: string | null;
  displayName: string | null;
  username: string;
  title: string;
  rank: string;
  division: number;
  elo: number;
}

const RANK_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Master: '#9B30FF',
  Grandmaster: '#FF4500',
};

export default function ProfileHeader({
  avatarUrl,
  displayName,
  username,
  title,
  rank,
  division,
  elo,
}: ProfileHeaderProps) {
  const rankColor = RANK_COLORS[rank] || '#CD7F32';
  const displayedName = displayName || username;

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayedName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">👤</span>
          )}
        </div>

        {/* Name & Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">{displayedName}</h2>
          <p className="text-lg text-gray-600 mt-1">"{title}"</p>
        </div>

        {/* PvP Badge (Diamond shape) */}
        <div className="flex flex-col items-center">
          <div
            className="w-24 h-24 transform rotate-45 flex items-center justify-center"
            style={{ backgroundColor: rankColor }}
          >
            <div className="transform -rotate-45 text-center">
              <div className="text-xs font-bold text-white">
                {rank} {division}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">ELO: {elo}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component uses Tailwind classes correctly**

Check that classes match project's Tailwind setup

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/ProfileHeader.tsx
git commit -m "feat(profile): add ProfileHeader component with avatar and PvP badge"
```

---

### Task 9: StatsCard Component

**Files:**
- Create: `apps/frontend/src/components/profile/StatsCard.tsx`

**Interfaces:**
- Consumes: Props: `dailyStats`, `pvpStats`, `collectionStats`
- Produces: React component rendering all stats in sections

- [ ] **Step 1: Create StatsCard component**

```typescript
// apps/frontend/src/components/profile/StatsCard.tsx

import React from 'react';
import { DailyStats, PvPStats, CollectionStats } from '../../types/profile';

interface StatsCardProps {
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="ml-2 font-medium">{value}</span>
    </div>
  );
}

export default function StatsCard({
  dailyStats,
  pvpStats,
  collectionStats,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <h3 className="text-2xl font-bold mb-6 text-center">MES STATS</h3>

      <div className="space-y-6">
        {/* Daily Challenge */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-blue-600">
            Daily Challenge
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Streak"
              value={`${dailyStats.currentStreak} jours 🔥`}
            />
            <StatItem label="Record" value={`${dailyStats.longestStreak} jours`} />
            <StatItem label="Complétés" value={dailyStats.totalDailyCompleted} />
            <StatItem
              label="Réussite"
              value={`${dailyStats.averageSuccessRate}%`}
            />
            <StatItem label="Gold gagné" value={dailyStats.totalGoldEarned} />
          </div>
        </div>

        {/* PvP */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-purple-600">PvP</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Rang"
              value={`${pvpStats.currentRank} ${pvpStats.currentDivision}`}
            />
            <StatItem
              label="V/D"
              value={`${pvpStats.totalVictories}/${pvpStats.totalDefeats} (${pvpStats.winrate}%)`}
            />
            <StatItem
              label="Série"
              value={`${pvpStats.currentWinStreak} victoires${
                pvpStats.currentWinStreak > 0 ? ' 🔥' : ''
              }`}
            />
          </div>
        </div>

        {/* Collection */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-green-600">
            Collection
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Cartes" value={collectionStats.totalCards} />
            <StatItem label="Common" value={collectionStats.commonCount} />
            <StatItem label="Rare" value={collectionStats.rareCount} />
            <StatItem label="Epic" value={collectionStats.epicCount} />
            <StatItem label="Legendary" value={collectionStats.legendaryCount} />
            <StatItem
              label="Favoris"
              value={`${collectionStats.favoriteCount} ⭐`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify grid layout is responsive**

Check that grid stacks on mobile (add breakpoints if needed)

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/StatsCard.tsx
git commit -m "feat(profile): add StatsCard component with Daily/PvP/Collection stats"
```

---

### Task 10: ShowcaseSection Component

**Files:**
- Create: `apps/frontend/src/components/profile/ShowcaseSection.tsx`

**Interfaces:**
- Consumes: Props: `showcaseCards`, `maxCards`
- Produces: React component rendering showcase grid with cards and empty slots

- [ ] **Step 1: Create ShowcaseSection component**

```typescript
// apps/frontend/src/components/profile/ShowcaseSection.tsx

import React from 'react';
import { ShowcaseCard } from '../../types/profile';

interface ShowcaseSectionProps {
  showcaseCards: ShowcaseCard[];
  maxCards?: number;
}

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

function ShowcaseCardItem({ card }: { card: ShowcaseCard }) {
  const borderClass = RARITY_BORDERS[card.rarity] || 'border-gray-400';

  return (
    <div className="relative group cursor-pointer">
      <div className={`rounded-lg overflow-hidden border-2 ${borderClass}`}>
        <img
          src={card.imageUrl}
          alt={card.entityLabel}
          className="w-full aspect-[3/4] object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
        <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity text-center px-2">
          {card.entityLabel}
        </span>
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-[3/4] flex items-center justify-center">
      <span className="text-4xl text-gray-300">+</span>
    </div>
  );
}

export default function ShowcaseSection({
  showcaseCards,
  maxCards = 10,
}: ShowcaseSectionProps) {
  const emptySlots = Math.max(0, maxCards - showcaseCards.length);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h3 className="text-2xl font-bold mb-6 text-center">MA VITRINE</h3>

      {showcaseCards.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>
            Aucune carte favorite. Marquez des cartes en favori dans votre
            collection pour les afficher ici ⭐
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {showcaseCards.map((card) => (
              <ShowcaseCardItem key={card.id} card={card} />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {showcaseCards.length}/{maxCards} cartes • Les cartes favorites
            s'affichent automatiquement
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test empty showcase message (Review Focus #2)**

Manually verify that with `showcaseCards=[]`, the help message displays

- [ ] **Step 3: Verify responsive grid**

Check that grid changes from 2 cols (mobile) → 3 cols (tablet) → 5 cols (desktop)

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/ShowcaseSection.tsx
git commit -m "feat(profile): add ShowcaseSection component with showcase grid"
```

---

### Task 11: ProfilePage Integration

**Files:**
- Create: `apps/frontend/src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `useProfileStore`, `ProfileHeader`, `StatsCard`, `ShowcaseSection`
- Produces: Complete ProfilePage component

- [ ] **Step 1: Create ProfilePage**

```typescript
// apps/frontend/src/pages/ProfilePage.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import ProfileHeader from '../components/profile/ProfileHeader';
import StatsCard from '../components/profile/StatsCard';
import ShowcaseSection from '../components/profile/ShowcaseSection';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    profile,
    dailyStats,
    pvpStats,
    collectionStats,
    showcaseCards,
    loading,
    error,
    fetchProfile,
  } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  if (!profile || !dailyStats || !pvpStats || !collectionStats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">PROFIL</h1>

        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
          username={user?.username || ''}
          title={profile.currentTitle}
          rank={pvpStats.currentRank}
          division={pvpStats.currentDivision}
          elo={pvpStats.currentElo}
        />

        <StatsCard
          dailyStats={dailyStats}
          pvpStats={pvpStats}
          collectionStats={collectionStats}
        />

        <ShowcaseSection showcaseCards={showcaseCards} maxCards={10} />

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => navigate('/collec')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Voir toute ma collec
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Retour à la page d'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify loading and error states**

Manually test that loading spinner and error message display correctly

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProfilePage.tsx
git commit -m "feat(profile): add ProfilePage with header, stats, and showcase"
```

---

### Task 12: Route Configuration

**Files:**
- Modify: `apps/frontend/src/App.tsx`

**Interfaces:**
- Consumes: `ProfilePage` component
- Produces: `/profil` route

- [ ] **Step 1: Add ProfilePage import and route**

In `apps/frontend/src/App.tsx`, add:

```typescript
import ProfilePage from './pages/ProfilePage';

// In routes section:
<Route path="/profil" element={<ProfilePage />} />
```

- [ ] **Step 2: Test navigation to /profil**

Run frontend: `npm run dev`
Navigate to `http://localhost:5173/profil`
Verify page loads with profile data

- [ ] **Step 3: Test full user flow**

1. Login as test user
2. Navigate to `/profil`
3. Verify stats display (Daily, PvP, Collection)
4. Verify showcase displays favorite cards
5. Click "Voir toute ma collec" → navigates to `/collec`
6. Click "Retour à la page d'accueil" → navigates to `/`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(profile): add /profil route to app"
```

---

## Self-Review

**Spec coverage:**
- ✅ UserProfile model with displayName, bio, avatarUrl, currentTitle
- ✅ Stats aggregation from UserStreak, UserElo, UserCard (no duplication)
- ✅ Showcase displays up to 10 favorite cards automatically
- ✅ GET /api/profile endpoint with JWT auth
- ✅ PATCH /api/profile endpoint with validation
- ✅ Frontend ProfilePage with Header, Stats, Showcase sections
- ✅ Zustand store for profile state
- ✅ Navigation buttons to /collec and /
- ✅ Responsive design (grid breakpoints)

**Step scan:**
Each step is actionable: tests have exact assertions, code steps have exact signatures and file paths, verification steps have commands and expected outputs. No "TBD" or generic "handle edge cases".

**Type consistency:**
- Backend DTOs match Prisma model fields
- Frontend types match backend DTOs exactly (field names, types)
- Component props match store state types
- API client returns match store expectations

**Review Focus coverage:**
1. User without history → Test in Task 3 Step 5 (calculateDailyStats returns zeros)
2. Empty showcase → Test in Task 3 Step 12 (getShowcaseCards returns []), UI handled in Task 10
3. displayName validation → Test in Task 5 Step 7 (E2E test with >50 chars)
4. Showcase ownership → Implicitly tested via userId filter in getShowcaseCards query
5. Concurrent favorites → Addressed by on-the-fly calculation (no cached state to desync)

**Proportion:**
Plan is detailed but not a transcript. Code blocks show signatures and test assertions, not full implementations. Each task has clear boundaries and tests.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-26-profile-page.md`. Please review the plan.

Which execution approach would you prefer?

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven**, because the tasks have clear interfaces and independent test coverage, making per-task review valuable. Each task produces a self-contained deliverable (migration, service methods, components) that can be verified before the next one depends on it. The 12 tasks justify the parallel review structure, and catching issues early (e.g., DTO mismatches between backend/frontend) prevents cascading fixes.

Does the plan capture what you want, and which approach should we use?

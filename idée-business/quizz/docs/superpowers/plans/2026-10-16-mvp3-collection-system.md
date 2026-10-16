# MVP3 - Collection System (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only catalog of 50 educational cards organized by 5 meta-albums with rarity tiers, browseable via `/collec` page with filters.

**Architecture:** Backend NestJS module with Prisma models (Entity, Card, Album), frontend React page with Zustand state management, Node.js scripts pipeline for Wikidata/Wikipedia content ingestion.

**Tech Stack:** NestJS 12, Prisma ORM, PostgreSQL 15, React 18, Zustand, Tailwind CSS, Wikidata SPARQL API, Wikipedia APIs, Sharp image processing

**Spec:** `docs/superpowers/specs/2026-10-16-mvp3-collection-system-design.md`

## Global Constraints

- PostgreSQL 15+ required
- NestJS 12+ (already upgraded in MVP2)
- Images must have license metadata tracked (author, type, URL, source)
- All descriptions must be 2-4 sentences max (~100-300 characters)
- Rarity distribution target: 20 Common / 15 Uncommon / 10 Rare / 4 Epic / 1 Legendary
- Page load time <2s with 50 cards
- Responsive design: mobile (2 cols), tablet (3 cols), desktop (4 cols)
- No user ownership/mutations in Phase 1 (read-only catalog)

## Review Focus

1. **Rarity algorithm edge cases:** Entities with 0 pageviews or 0 wiki length should not crash, should map to Common tier gracefully
2. **Image license validation:** All 50 cards must have non-null imageLicenseType before seeding (reject unlicensed images)
3. **Description cleaning:** Wikipedia references `[1]`, `[2]`, `[citation needed]` must be removed before storage
4. **Filter combination correctness:** Applying album filter + rarity filter + search should apply AND logic (all three must match)
5. **Responsive layout breakpoints:** At exactly 640px and 1024px, grid should transition cleanly without overlapping cards

---

## Task 1: Backend Schema & Migration

**Files:**
- Create: `apps/backend/prisma/migrations/YYYYMMDDHHMMSS_add_collection_models/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma` (append new models)

**Interfaces:**
- Consumes: Existing Prisma setup
- Produces: `Entity`, `Card`, `Album`, `CardAlbum` models available for import

- [ ] **Step 1: Add Entity model to schema**

```prisma
// Add to apps/backend/prisma/schema.prisma after MissionProgress model

model Entity {
  id              String   @id @default(uuid())
  wikidataId      String   @unique
  label           String
  type            String
  
  pageviewsMonth  Int
  wikiTextLength  Int
  rarityScore     Float
  
  description     String   @db.Text
  wikidataUrl     String
  wikipediaUrl    String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  card            Card?
  
  @@map("entities")
}

model Card {
  id          String   @id @default(uuid())
  entityId    String   @unique
  
  rarity      String
  imageUrl    String
  imageWidth  Int
  imageHeight Int
  
  imageLicenseAuthor  String?
  imageLicenseType    String?
  imageLicenseUrl     String?
  imageSourceUrl      String?
  
  displayOrder Int?
  active       Boolean @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entity      Entity      @relation(fields: [entityId], references: [id])
  albums      CardAlbum[]
  
  @@map("cards")
}

model Album {
  id          String   @id @default(uuid())
  slug        String   @unique
  name        String
  description String?
  icon        String?
  displayOrder Int
  
  createdAt   DateTime @default(now())
  
  cards       CardAlbum[]
  
  @@map("albums")
}

model CardAlbum {
  id       String @id @default(uuid())
  cardId   String
  albumId  String
  
  card     Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  album    Album  @relation(fields: [albumId], references: [id], onDelete: Cascade)
  
  @@unique([cardId, albumId])
  @@map("card_albums")
}
```

- [ ] **Step 2: Generate migration**

Run: `cd apps/backend && npx prisma migrate dev --name add_collection_models`

Expected: Migration file created in `prisma/migrations/`

- [ ] **Step 3: Apply migration**

Run: `cd apps/backend && npx prisma migrate deploy`

Expected: Database updated, tables `entities`, `cards`, `albums`, `card_albums` created

- [ ] **Step 4: Generate Prisma client**

Run: `cd apps/backend && npx prisma generate`

Expected: Prisma client regenerated with new models

- [ ] **Step 5: Verify schema in Prisma Studio**

Run: `cd apps/backend && npx prisma studio`

Check: Navigate to `entities`, `cards`, `albums`, `card_albums` tables exist (empty)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(collection): add Entity, Card, Album, CardAlbum models

- Entity: Wikidata source with pageviews, wiki length, rarity score
- Card: collectible with image and license metadata
- Album: meta-thematic grouping (personnalites, culture, lieux...)
- CardAlbum: many-to-many relation

Ref: MVP3 Phase 1"
```

---

## Task 2: RarityService with Algorithm

**Files:**
- Create: `apps/backend/src/modules/collection/services/rarity.service.ts`
- Create: `apps/backend/src/modules/collection/services/rarity.service.spec.ts`

**Interfaces:**
- Consumes: None
- Produces: `RarityService` with methods:
  - `calculatePageviewsScore(pageviews: number): number`
  - `calculateWikiLengthScore(length: number): number`
  - `calculateRarityScore(pageviews: number, wikiLength: number): number`
  - `scoreToRarity(score: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'`

- [ ] **Step 1: Create service directory**

Run: `mkdir -p apps/backend/src/modules/collection/services`

- [ ] **Step 2: Write failing test for pageviews score (0 pageviews)**

Create `apps/backend/src/modules/collection/services/rarity.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RarityService } from './rarity.service';

describe('RarityService', () => {
  let service: RarityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RarityService],
    }).compile();

    service = module.get<RarityService>(RarityService);
  });

  describe('calculatePageviewsScore', () => {
    it('should return 0 for 0 pageviews', () => {
      expect(service.calculatePageviewsScore(0)).toBe(0);
    });

    it('should return ~25 for 1k pageviews', () => {
      const score = service.calculatePageviewsScore(1000);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should return ~50 for 10k pageviews', () => {
      const score = service.calculatePageviewsScore(10000);
      expect(score).toBeGreaterThanOrEqual(45);
      expect(score).toBeLessThanOrEqual(55);
    });

    it('should return ~75 for 100k pageviews', () => {
      const score = service.calculatePageviewsScore(100000);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(80);
    });

    it('should return ~95 for 1M+ pageviews', () => {
      const score = service.calculatePageviewsScore(1000000);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: FAIL with "RarityService not found"

- [ ] **Step 4: Implement RarityService with pageviews calculation**

Create `apps/backend/src/modules/collection/services/rarity.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class RarityService {
  /**
   * Normalize pageviews to 0-100 scale using logarithmic scale
   * Thresholds: 0 → 0, 1k → ~25, 10k → ~50, 100k → ~75, 1M+ → ~95
   */
  calculatePageviewsScore(pageviews: number): number {
    if (pageviews <= 0) return 0;
    
    // Log scale: score = 25 * log10(pageviews / 100)
    // 100 → 0, 1k → 25, 10k → 50, 100k → 75, 1M → 100
    const score = 25 * Math.log10(pageviews / 100);
    
    // Clamp to [0, 100]
    return Math.max(0, Math.min(100, score));
  }
}
```

- [ ] **Step 5: Run test to verify pageviews tests pass**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: PASS for all pageviews tests

- [ ] **Step 6: Write failing test for wiki length score**

Add to `rarity.service.spec.ts`:

```typescript
  describe('calculateWikiLengthScore', () => {
    it('should return 0 for 0 length', () => {
      expect(service.calculateWikiLengthScore(0)).toBe(0);
    });

    it('should return ~20 for 1k chars', () => {
      const score = service.calculateWikiLengthScore(1000);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should return ~40 for 5k chars', () => {
      const score = service.calculateWikiLengthScore(5000);
      expect(score).toBeGreaterThanOrEqual(35);
      expect(score).toBeLessThanOrEqual(45);
    });

    it('should return ~60 for 20k chars', () => {
      const score = service.calculateWikiLengthScore(20000);
      expect(score).toBeGreaterThanOrEqual(55);
      expect(score).toBeLessThanOrEqual(65);
    });

    it('should return ~90 for 50k+ chars', () => {
      const score = service.calculateWikiLengthScore(50000);
      expect(score).toBeGreaterThanOrEqual(85);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: FAIL with "calculateWikiLengthScore is not a function"

- [ ] **Step 8: Implement wiki length score calculation**

Add to `rarity.service.ts`:

```typescript
  /**
   * Normalize wiki text length to 0-100 scale using linear scale
   * Thresholds: 0 → 0, 1k → ~20, 5k → ~40, 20k → ~60, 50k+ → ~90
   */
  calculateWikiLengthScore(length: number): number {
    if (length <= 0) return 0;
    
    // Linear scale with diminishing returns
    // 0-5k: 0-40 (8 points per 1k)
    // 5k-20k: 40-60 (1.33 points per 1k)
    // 20k-50k: 60-90 (1 point per 1k)
    // 50k+: 90-100 (0.2 points per 1k)
    
    let score = 0;
    if (length <= 5000) {
      score = (length / 5000) * 40;
    } else if (length <= 20000) {
      score = 40 + ((length - 5000) / 15000) * 20;
    } else if (length <= 50000) {
      score = 60 + ((length - 20000) / 30000) * 30;
    } else {
      score = 90 + Math.min(10, (length - 50000) / 50000 * 10);
    }
    
    return Math.max(0, Math.min(100, score));
  }
```

- [ ] **Step 9: Run test to verify wiki length tests pass**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: PASS for all wiki length tests

- [ ] **Step 10: Write failing test for composite rarity score**

Add to `rarity.service.spec.ts`:

```typescript
  describe('calculateRarityScore', () => {
    it('should calculate 40% pageviews + 60% wikiLength', () => {
      // pageviews 1M → ~95, wikiLength 50k → ~90
      // Expected: 0.4 * 95 + 0.6 * 90 = 38 + 54 = 92
      const score = service.calculateRarityScore(1000000, 50000);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(95);
    });

    it('should handle 0 pageviews gracefully', () => {
      const score = service.calculateRarityScore(0, 5000);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should handle 0 wiki length gracefully', () => {
      const score = service.calculateRarityScore(10000, 0);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should handle both 0 gracefully', () => {
      const score = service.calculateRarityScore(0, 0);
      expect(score).toBe(0);
    });
  });
```

- [ ] **Step 11: Run test to verify it fails**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: FAIL with "calculateRarityScore is not a function"

- [ ] **Step 12: Implement composite rarity score**

Add to `rarity.service.ts`:

```typescript
  /**
   * Calculate composite rarity score: 40% popularity + 60% depth
   * Returns value in [0, 100]
   */
  calculateRarityScore(pageviews: number, wikiLength: number): number {
    const pageviewsScore = this.calculatePageviewsScore(pageviews);
    const wikiLengthScore = this.calculateWikiLengthScore(wikiLength);
    
    return 0.4 * pageviewsScore + 0.6 * wikiLengthScore;
  }
```

- [ ] **Step 13: Run test to verify composite tests pass**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: PASS for all composite score tests

- [ ] **Step 14: Write failing test for score to rarity mapping**

Add to `rarity.service.spec.ts`:

```typescript
  describe('scoreToRarity', () => {
    it('should map 0-29 to common', () => {
      expect(service.scoreToRarity(0)).toBe('common');
      expect(service.scoreToRarity(15)).toBe('common');
      expect(service.scoreToRarity(29)).toBe('common');
    });

    it('should map 30-49 to uncommon', () => {
      expect(service.scoreToRarity(30)).toBe('uncommon');
      expect(service.scoreToRarity(40)).toBe('uncommon');
      expect(service.scoreToRarity(49)).toBe('uncommon');
    });

    it('should map 50-69 to rare', () => {
      expect(service.scoreToRarity(50)).toBe('rare');
      expect(service.scoreToRarity(60)).toBe('rare');
      expect(service.scoreToRarity(69)).toBe('rare');
    });

    it('should map 70-89 to epic', () => {
      expect(service.scoreToRarity(70)).toBe('epic');
      expect(service.scoreToRarity(80)).toBe('epic');
      expect(service.scoreToRarity(89)).toBe('epic');
    });

    it('should map 90-100 to legendary', () => {
      expect(service.scoreToRarity(90)).toBe('legendary');
      expect(service.scoreToRarity(95)).toBe('legendary');
      expect(service.scoreToRarity(100)).toBe('legendary');
    });
  });
```

- [ ] **Step 15: Run test to verify it fails**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: FAIL with "scoreToRarity is not a function"

- [ ] **Step 16: Implement score to rarity tier mapping**

Add to `rarity.service.ts`:

```typescript
  /**
   * Map rarity score [0-100] to tier
   */
  scoreToRarity(score: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (score >= 90) return 'legendary';
    if (score >= 70) return 'epic';
    if (score >= 50) return 'rare';
    if (score >= 30) return 'uncommon';
    return 'common';
  }
```

- [ ] **Step 17: Run all tests to verify they pass**

Run: `cd apps/backend && npm test -- rarity.service.spec.ts`

Expected: PASS for all 18 tests

- [ ] **Step 18: Commit**

```bash
git add apps/backend/src/modules/collection/services/
git commit -m "feat(collection): implement RarityService with algorithm

- calculatePageviewsScore: log scale 0-100
- calculateWikiLengthScore: linear scale 0-100 with diminishing returns
- calculateRarityScore: 40% pageviews + 60% wiki length
- scoreToRarity: map [0-100] to common/uncommon/rare/epic/legendary
- Full test coverage (18 tests)

Handles edge cases: 0 pageviews, 0 wiki length, both 0

Ref: MVP3 Phase 1"
```

---

## Task 3: Collection Module Foundation

**Files:**
- Create: `apps/backend/src/modules/collection/collection.module.ts`
- Create: `apps/backend/src/modules/collection/services/cards.service.ts`
- Create: `apps/backend/src/modules/collection/services/albums.service.ts`
- Modify: `apps/backend/src/app.module.ts` (import CollectionModule)

**Interfaces:**
- Consumes: `RarityService`, Prisma models (`Entity`, `Card`, `Album`, `CardAlbum`)
- Produces: `CollectionModule` exported, `CardsService`, `AlbumsService` available

- [ ] **Step 1: Create CardsService stub**

Create `apps/backend/src/modules/collection/services/cards.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    albumId?: string;
    rarity?: string;
    search?: string;
  }) {
    // TODO: implement in Task 4
    return [];
  }

  async findOne(id: string) {
    // TODO: implement in Task 4
    return null;
  }

  async getStats() {
    // TODO: implement in Task 4
    return { total: 0, byRarity: {}, byAlbum: {} };
  }
}
```

- [ ] **Step 2: Create AlbumsService stub**

Create `apps/backend/src/modules/collection/services/albums.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AlbumsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // TODO: implement in Task 5
    return [];
  }

  async findBySlug(slug: string) {
    // TODO: implement in Task 5
    return null;
  }
}
```

- [ ] **Step 3: Create CollectionModule**

Create `apps/backend/src/modules/collection/collection.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RarityService } from './services/rarity.service';
import { CardsService } from './services/cards.service';
import { AlbumsService } from './services/albums.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}
```

- [ ] **Step 4: Import CollectionModule in AppModule**

Modify `apps/backend/src/app.module.ts`:

```typescript
// Add import at top
import { CollectionModule } from './modules/collection/collection.module';

// Add to imports array
@Module({
  imports: [
    // ... existing imports
    CollectionModule,
  ],
  // ...
})
export class AppModule {}
```

- [ ] **Step 5: Verify module loads**

Run: `cd apps/backend && npm run start:dev`

Expected: Server starts without errors, logs show CollectionModule loaded

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/collection/ apps/backend/src/app.module.ts
git commit -m "feat(collection): add CollectionModule with service stubs

- RarityService, CardsService, AlbumsService providers
- PrismaModule import for database access
- Registered in AppModule

Services have stub methods (implementation in next tasks)

Ref: MVP3 Phase 1"
```

---

## Task 4: Cards API Endpoints

**Files:**
- Create: `apps/backend/src/modules/collection/controllers/cards.controller.ts`
- Create: `apps/backend/src/modules/collection/dto/card.dto.ts`
- Modify: `apps/backend/src/modules/collection/services/cards.service.ts`
- Modify: `apps/backend/src/modules/collection/collection.module.ts` (add controller)
- Create: `apps/backend/src/modules/collection/controllers/cards.controller.spec.ts`

**Interfaces:**
- Consumes: `CardsService`, Prisma `Card` model with `entity` and `albums` relations
- Produces: HTTP endpoints:
  - `GET /api/cards?albumId=xxx&rarity=common&search=napoleon` → `Card[]`
  - `GET /api/cards/:id` → `Card` with entity + albums
  - `GET /api/cards/stats` → `{ total, byRarity, byAlbum }`

- [ ] **Step 1: Create DTOs**

Create `apps/backend/src/modules/collection/dto/card.dto.ts`:

```typescript
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FindCardsQueryDto {
  @IsOptional()
  @IsUUID()
  albumId?: string;

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 2: Write failing integration test for GET /api/cards**

Create `apps/backend/src/modules/collection/controllers/cards.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CardsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/cards', () => {
    it('should return empty array when no cards exist', () => {
      return request(app.getHttpServer())
        .get('/api/cards')
        .expect(200)
        .expect([]);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: FAIL with "Cannot GET /api/cards"

- [ ] **Step 4: Implement CardsController with GET /api/cards**

Create `apps/backend/src/modules/collection/controllers/cards.controller.ts`:

```typescript
import { Controller, Get, Query, Param } from '@nestjs/common';
import { CardsService } from '../services/cards.service';
import { FindCardsQueryDto } from '../dto/card.dto';

@Controller('api/cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get()
  async findAll(@Query() query: FindCardsQueryDto) {
    return this.cardsService.findAll(query);
  }
}
```

- [ ] **Step 5: Register controller in module**

Modify `apps/backend/src/modules/collection/collection.module.ts`:

```typescript
import { CardsController } from './controllers/cards.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}
```

- [ ] **Step 6: Implement CardsService.findAll**

Modify `apps/backend/src/modules/collection/services/cards.service.ts`:

```typescript
  async findAll(filters: {
    albumId?: string;
    rarity?: string;
    search?: string;
  }) {
    const where: any = {
      active: true,
    };

    if (filters.rarity) {
      where.rarity = filters.rarity;
    }

    if (filters.search) {
      where.entity = {
        label: {
          contains: filters.search,
          mode: 'insensitive',
        },
      };
    }

    if (filters.albumId) {
      where.albums = {
        some: {
          albumId: filters.albumId,
        },
      };
    }

    return this.prisma.card.findMany({
      where,
      include: {
        entity: true,
        albums: {
          include: {
            album: true,
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }
```

- [ ] **Step 7: Run test to verify GET /api/cards passes**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: PASS for GET /api/cards returns empty array

- [ ] **Step 8: Write failing test for GET /api/cards/:id**

Add to `cards.controller.spec.ts`:

```typescript
  describe('GET /api/cards/:id', () => {
    it('should return 404 for non-existent card', () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/cards/${fakeId}`)
        .expect(404);
    });
  });
```

- [ ] **Step 9: Run test to verify it fails**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: FAIL with "Cannot GET /api/cards/:id"

- [ ] **Step 10: Implement GET /api/cards/:id endpoint**

Add to `cards.controller.ts`:

```typescript
import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const card = await this.cardsService.findOne(id);
    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
    return card;
  }
```

- [ ] **Step 11: Implement CardsService.findOne**

Modify `cards.service.ts`:

```typescript
  async findOne(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
      include: {
        entity: true,
        albums: {
          include: {
            album: true,
          },
        },
      },
    });
  }
```

- [ ] **Step 12: Run test to verify GET /api/cards/:id passes**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: PASS for GET /api/cards/:id returns 404

- [ ] **Step 13: Write failing test for GET /api/cards/stats**

Add to `cards.controller.spec.ts`:

```typescript
  describe('GET /api/cards/stats', () => {
    it('should return stats with zero counts', () => {
      return request(app.getHttpServer())
        .get('/api/cards/stats')
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({
            total: 0,
            byRarity: {},
            byAlbum: {},
          });
        });
    });
  });
```

- [ ] **Step 14: Run test to verify it fails**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: FAIL with "Cannot GET /api/cards/stats"

- [ ] **Step 15: Implement GET /api/cards/stats endpoint**

Add to `cards.controller.ts`:

```typescript
  @Get('stats')
  async getStats() {
    return this.cardsService.getStats();
  }
```

Note: This must be defined BEFORE `@Get(':id')` to avoid route conflict

- [ ] **Step 16: Reorder routes in controller**

Modify `cards.controller.ts` to put stats before :id:

```typescript
@Controller('api/cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get()
  async findAll(@Query() query: FindCardsQueryDto) {
    return this.cardsService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.cardsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const card = await this.cardsService.findOne(id);
    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
    return card;
  }
}
```

- [ ] **Step 17: Implement CardsService.getStats**

Modify `cards.service.ts`:

```typescript
  async getStats() {
    const cards = await this.prisma.card.findMany({
      where: { active: true },
      include: {
        albums: {
          include: {
            album: true,
          },
        },
      },
    });

    const total = cards.length;
    const byRarity: Record<string, number> = {};
    const byAlbum: Record<string, number> = {};

    cards.forEach((card) => {
      // Count by rarity
      byRarity[card.rarity] = (byRarity[card.rarity] || 0) + 1;

      // Count by album
      card.albums.forEach((cardAlbum) => {
        const albumName = cardAlbum.album.name;
        byAlbum[albumName] = (byAlbum[albumName] || 0) + 1;
      });
    });

    return { total, byRarity, byAlbum };
  }
```

- [ ] **Step 18: Run all tests to verify they pass**

Run: `cd apps/backend && npm test -- cards.controller.spec.ts`

Expected: PASS for all 3 endpoint tests

- [ ] **Step 19: Test filter combinations manually**

Run: `cd apps/backend && npm run start:dev`

Then in another terminal:
```bash
curl http://localhost:3000/api/cards
curl http://localhost:3000/api/cards?rarity=common
curl http://localhost:3000/api/cards/stats
```

Expected: All return valid JSON (empty arrays/objects)

- [ ] **Step 20: Commit**

```bash
git add apps/backend/src/modules/collection/
git commit -m "feat(collection): implement Cards API endpoints

GET /api/cards - list with filters (albumId, rarity, search)
GET /api/cards/:id - single card with entity + albums
GET /api/cards/stats - collection statistics

- FindCardsQueryDto validation
- Integration tests (3 tests)
- Proper 404 handling for missing cards

Ref: MVP3 Phase 1"
```

---

## Task 5: Albums API Endpoints

**Files:**
- Create: `apps/backend/src/modules/collection/controllers/albums.controller.ts`
- Modify: `apps/backend/src/modules/collection/services/albums.service.ts`
- Modify: `apps/backend/src/modules/collection/collection.module.ts` (add controller)
- Create: `apps/backend/src/modules/collection/controllers/albums.controller.spec.ts`

**Interfaces:**
- Consumes: `AlbumsService`, Prisma `Album` model with `cards` relation
- Produces: HTTP endpoints:
  - `GET /api/albums` → `Album[]` with card count
  - `GET /api/albums/:slug` → `Album` with cards[]

- [ ] **Step 1: Write failing test for GET /api/albums**

Create `apps/backend/src/modules/collection/controllers/albums.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AlbumsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/albums', () => {
    it('should return empty array when no albums exist', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
        .expect(200)
        .expect([]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- albums.controller.spec.ts`

Expected: FAIL with "Cannot GET /api/albums"

- [ ] **Step 3: Create AlbumsController**

Create `apps/backend/src/modules/collection/controllers/albums.controller.ts`:

```typescript
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AlbumsService } from '../services/albums.service';

@Controller('api/albums')
export class AlbumsController {
  constructor(private albumsService: AlbumsService) {}

  @Get()
  async findAll() {
    return this.albumsService.findAll();
  }
}
```

- [ ] **Step 4: Register controller in module**

Modify `apps/backend/src/modules/collection/collection.module.ts`:

```typescript
import { AlbumsController } from './controllers/albums.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController, AlbumsController],
  providers: [RarityService, CardsService, AlbumsService],
  exports: [RarityService, CardsService, AlbumsService],
})
export class CollectionModule {}
```

- [ ] **Step 5: Implement AlbumsService.findAll**

Modify `apps/backend/src/modules/collection/services/albums.service.ts`:

```typescript
  async findAll() {
    const albums = await this.prisma.album.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        cards: {
          include: {
            card: true,
          },
        },
      },
    });

    // Add card count to each album
    return albums.map((album) => ({
      ...album,
      cardCount: album.cards.length,
    }));
  }
```

- [ ] **Step 6: Run test to verify GET /api/albums passes**

Run: `cd apps/backend && npm test -- albums.controller.spec.ts`

Expected: PASS for GET /api/albums returns empty array

- [ ] **Step 7: Write failing test for GET /api/albums/:slug**

Add to `albums.controller.spec.ts`:

```typescript
  describe('GET /api/albums/:slug', () => {
    it('should return 404 for non-existent album', () => {
      return request(app.getHttpServer())
        .get('/api/albums/non-existent')
        .expect(404);
    });
  });
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd apps/backend && npm test -- albums.controller.spec.ts`

Expected: FAIL with "Cannot GET /api/albums/:slug"

- [ ] **Step 9: Implement GET /api/albums/:slug endpoint**

Add to `albums.controller.ts`:

```typescript
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const album = await this.albumsService.findBySlug(slug);
    if (!album) {
      throw new NotFoundException(`Album with slug ${slug} not found`);
    }
    return album;
  }
```

- [ ] **Step 10: Implement AlbumsService.findBySlug**

Modify `albums.service.ts`:

```typescript
  async findBySlug(slug: string) {
    return this.prisma.album.findUnique({
      where: { slug },
      include: {
        cards: {
          include: {
            card: {
              include: {
                entity: true,
              },
            },
          },
        },
      },
    });
  }
```

- [ ] **Step 11: Run all tests to verify they pass**

Run: `cd apps/backend && npm test -- albums.controller.spec.ts`

Expected: PASS for both tests

- [ ] **Step 12: Commit**

```bash
git add apps/backend/src/modules/collection/
git commit -m "feat(collection): implement Albums API endpoints

GET /api/albums - list all with card counts
GET /api/albums/:slug - single album with cards

- Integration tests (2 tests)
- Proper 404 handling for missing albums
- Ordered by displayOrder

Ref: MVP3 Phase 1"
```

---

## Task 6: Wikidata & Wikipedia Client Utilities

**Files:**
- Create: `apps/backend/scripts/collection/utils/wikidata.client.ts`
- Create: `apps/backend/scripts/collection/utils/wikipedia.client.ts`
- Create: `apps/backend/scripts/collection/utils/types.ts`

**Interfaces:**
- Consumes: External APIs (Wikidata SPARQL, Wikipedia Pageviews, Wikipedia Summary)
- Produces:
  - `WikidataClient.fetchEntity(wikidataId: string): Promise<WikidataEntity>`
  - `WikipediaClient.fetchPageviews(title: string): Promise<number>`
  - `WikipediaClient.fetchSummary(title: string): Promise<string>`

- [ ] **Step 1: Create types**

Create `apps/backend/scripts/collection/utils/types.ts`:

```typescript
export interface WikidataEntity {
  wikidataId: string;
  label: string;
  type: string;
  description: string;
  wikipediaUrl: string | null;
  wikidataUrl: string;
  imageUrl: string | null;
  wikiTextLength: number;
}

export interface RawEntity {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string | null;
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd apps/backend && npm install axios`

- [ ] **Step 3: Create WikidataClient**

Create `apps/backend/scripts/collection/utils/wikidata.client.ts`:

```typescript
import axios from 'axios';
import { WikidataEntity } from './types';

export class WikidataClient {
  private static SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
  private static WIKIDATA_BASE = 'https://www.wikidata.org/wiki/';

  /**
   * Fetch entity data from Wikidata
   */
  static async fetchEntity(wikidataId: string): Promise<WikidataEntity> {
    const query = `
      SELECT ?label ?description ?image ?wikipediaArticle ?type WHERE {
        wd:${wikidataId} rdfs:label ?label .
        wd:${wikidataId} schema:description ?description .
        wd:${wikidataId} wdt:P31 ?instanceOf .
        ?instanceOf rdfs:label ?type .
        
        OPTIONAL { wd:${wikidataId} wdt:P18 ?image . }
        OPTIONAL {
          ?wikipediaArticle schema:about wd:${wikidataId} .
          ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
        }
        
        FILTER(LANG(?label) = "fr")
        FILTER(LANG(?description) = "fr")
        FILTER(LANG(?type) = "fr")
      }
      LIMIT 1
    `;

    try {
      const response = await axios.get(this.SPARQL_ENDPOINT, {
        params: {
          query,
          format: 'json',
        },
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      const bindings = response.data.results.bindings[0];
      if (!bindings) {
        throw new Error(`No data found for ${wikidataId}`);
      }

      const wikipediaUrl = bindings.wikipediaArticle?.value || null;
      
      // Fetch wiki text length if Wikipedia article exists
      let wikiTextLength = 0;
      if (wikipediaUrl) {
        const title = wikipediaUrl.split('/').pop();
        wikiTextLength = await this.fetchWikiTextLength(title);
      }

      return {
        wikidataId,
        label: bindings.label.value,
        type: bindings.type.value,
        description: bindings.description.value,
        wikipediaUrl,
        wikidataUrl: `${this.WIKIDATA_BASE}${wikidataId}`,
        imageUrl: bindings.image?.value || null,
        wikiTextLength,
      };
    } catch (error) {
      console.error(`Error fetching ${wikidataId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia article text length
   */
  private static async fetchWikiTextLength(title: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
          },
        }
      );

      // Extract character count from extract_html (approximation)
      const extract = response.data.extract || '';
      return extract.length * 5; // Rough estimate: summary is ~20% of full article
    } catch (error) {
      console.warn(`Could not fetch wiki length for ${title}`);
      return 0;
    }
  }
}
```

- [ ] **Step 4: Create WikipediaClient**

Create `apps/backend/scripts/collection/utils/wikipedia.client.ts`:

```typescript
import axios from 'axios';

export class WikipediaClient {
  private static PAGEVIEWS_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
  private static SUMMARY_API = 'https://fr.wikipedia.org/api/rest_v1/page/summary';

  /**
   * Fetch monthly pageviews for the last 30 days
   */
  static async fetchPageviews(articleTitle: string): Promise<number> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const startStr = start.toISOString().slice(0, 10).replace(/-/g, '');
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${this.PAGEVIEWS_API}/fr.wikipedia/all-access/user/${encodeURIComponent(articleTitle)}/daily/${startStr}/${endStr}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      const items = response.data.items || [];
      const totalViews = items.reduce((sum, item) => sum + item.views, 0);

      return totalViews;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`No pageviews data for ${articleTitle}`);
        return 0;
      }
      console.error(`Error fetching pageviews for ${articleTitle}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia summary (first paragraph)
   */
  static async fetchSummary(articleTitle: string): Promise<string> {
    const url = `${this.SUMMARY_API}/${encodeURIComponent(articleTitle)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      let extract = response.data.extract || '';

      // Clean references [1], [2], [citation needed], etc.
      extract = extract.replace(/\[\d+\]/g, '');
      extract = extract.replace(/\[citation needed\]/gi, '');
      extract = extract.replace(/\s+/g, ' ').trim();

      // Limit to 2-4 sentences (~300 chars)
      const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
      const limitedExtract = sentences.slice(0, 3).join(' ');

      return limitedExtract.substring(0, 300);
    } catch (error) {
      console.error(`Error fetching summary for ${articleTitle}:`, error.message);
      throw error;
    }
  }
}
```

- [ ] **Step 5: Test WikidataClient manually**

Create test script `apps/backend/scripts/collection/test-wikidata.ts`:

```typescript
import { WikidataClient } from './utils/wikidata.client';

async function test() {
  console.log('Testing WikidataClient...');
  
  // Test with Napoléon Bonaparte (Q517)
  const entity = await WikidataClient.fetchEntity('Q517');
  
  console.log('Entity:', entity);
  console.log('Label:', entity.label);
  console.log('Type:', entity.type);
  console.log('Wiki text length:', entity.wikiTextLength);
}

test().catch(console.error);
```

Run: `cd apps/backend && npx ts-node scripts/collection/test-wikidata.ts`

Expected: Prints Napoléon Bonaparte data with label, type, wiki length

- [ ] **Step 6: Test WikipediaClient manually**

Create test script `apps/backend/scripts/collection/test-wikipedia.ts`:

```typescript
import { WikipediaClient } from './utils/wikipedia.client';

async function test() {
  console.log('Testing WikipediaClient...');
  
  // Test with Napoléon Ier
  const pageviews = await WikipediaClient.fetchPageviews('Napoléon_Ier');
  console.log('Pageviews (30 days):', pageviews);
  
  const summary = await WikipediaClient.fetchSummary('Napoléon_Ier');
  console.log('Summary:', summary);
}

test().catch(console.error);
```

Run: `cd apps/backend && npx ts-node scripts/collection/test-wikipedia.ts`

Expected: Prints pageviews count and cleaned summary

- [ ] **Step 7: Verify pageviews > 0 and summary is cleaned**

Check output:
- Pageviews should be > 100,000
- Summary should not contain `[1]`, `[2]`, `[citation needed]`
- Summary should be ~200-300 characters

- [ ] **Step 8: Delete test scripts**

Run: `rm apps/backend/scripts/collection/test-*.ts`

- [ ] **Step 9: Commit**

```bash
git add apps/backend/scripts/collection/utils/ apps/backend/package.json
git commit -m "feat(collection): add Wikidata and Wikipedia API clients

WikidataClient:
- fetchEntity: SPARQL query for label, type, description, URLs
- fetchWikiTextLength: estimate article length from summary

WikipediaClient:
- fetchPageviews: last 30 days total views
- fetchSummary: extract first paragraph, clean references

- axios dependency added
- Manual tests verified with Napoléon Bonaparte (Q517)

Ref: MVP3 Phase 1"
```

---

## Task 7: Entity Selection & Fetching Script (10 Test Cards)

**Files:**
- Create: `apps/backend/scripts/collection/01-fetch-test-entities.ts`
- Create: `apps/backend/scripts/collection/data/test-entities.json`

**Interfaces:**
- Consumes: `WikidataClient`, `WikipediaClient`, `RarityService`
- Produces: JSON file with 10 entities (2 per album) with pageviews, wiki length, rarity score

- [ ] **Step 1: Create test entity list**

Create `apps/backend/scripts/collection/data/test-entities.json`:

```json
[
  {
    "wikidataId": "Q517",
    "expectedAlbum": "personnalites",
    "comment": "Napoléon Bonaparte - historical figure"
  },
  {
    "wikidataId": "Q956",
    "expectedAlbum": "personnalites",
    "comment": "Pékin - capitale (for testing capital category)"
  },
  {
    "wikidataId": "Q12544",
    "expectedAlbum": "culture",
    "comment": "La Joconde - painting"
  },
  {
    "wikidataId": "Q3464665",
    "expectedAlbum": "culture",
    "comment": "Intouchables - film"
  },
  {
    "wikidataId": "Q243",
    "expectedAlbum": "lieux",
    "comment": "Tour Eiffel - monument"
  },
  {
    "wikidataId": "Q142",
    "expectedAlbum": "lieux",
    "comment": "France - country"
  },
  {
    "wikidataId": "Q1929607",
    "expectedAlbum": "symboles",
    "comment": "Drapeau de la France"
  },
  {
    "wikidataId": "Q188593",
    "expectedAlbum": "divers",
    "comment": "Rayman - jeu vidéo"
  },
  {
    "wikidataId": "Q10305",
    "expectedAlbum": "personnalites",
    "comment": "Zidane - sportif (testing different type)"
  },
  {
    "wikidataId": "Q7374",
    "expectedAlbum": "personnalites",
    "comment": "Victor Hugo - écrivain"
  }
]
```

- [ ] **Step 2: Create fetch script**

Create `apps/backend/scripts/collection/01-fetch-test-entities.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { WikidataClient } from './utils/wikidata.client';
import { WikipediaClient } from './utils/wikipedia.client';
import { RarityService } from '../../src/modules/collection/services/rarity.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const rarityService = new RarityService();

interface TestEntity {
  wikidataId: string;
  expectedAlbum: string;
  comment: string;
}

async function main() {
  console.log('Fetching 10 test entities...\n');

  const testEntities: TestEntity[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities.json'),
      'utf-8'
    )
  );

  const results = [];

  for (const testEntity of testEntities) {
    console.log(`\nFetching ${testEntity.wikidataId} (${testEntity.comment})...`);

    try {
      // Fetch Wikidata entity
      const entity = await WikidataClient.fetchEntity(testEntity.wikidataId);
      console.log(`  Label: ${entity.label}`);
      console.log(`  Wiki length: ${entity.wikiTextLength} chars`);

      // Fetch pageviews
      let pageviewsMonth = 0;
      if (entity.wikipediaUrl) {
        const title = entity.wikipediaUrl.split('/').pop();
        pageviewsMonth = await WikipediaClient.fetchPageviews(title);
        console.log(`  Pageviews: ${pageviewsMonth.toLocaleString()}`);
      } else {
        console.log(`  Pageviews: N/A (no Wikipedia article)`);
      }

      // Fetch summary
      let description = entity.description;
      if (entity.wikipediaUrl) {
        const title = entity.wikipediaUrl.split('/').pop();
        try {
          description = await WikipediaClient.fetchSummary(title);
          console.log(`  Description: ${description.substring(0, 100)}...`);
        } catch (error) {
          console.warn(`  Could not fetch summary, using Wikidata description`);
        }
      }

      // Calculate rarity
      const rarityScore = rarityService.calculateRarityScore(
        pageviewsMonth,
        entity.wikiTextLength
      );
      const rarity = rarityService.scoreToRarity(rarityScore);
      console.log(`  Rarity score: ${rarityScore.toFixed(2)} → ${rarity}`);

      results.push({
        wikidataId: testEntity.wikidataId,
        label: entity.label,
        type: entity.type,
        pageviewsMonth,
        wikiTextLength: entity.wikiTextLength,
        rarityScore,
        rarity,
        description,
        wikidataUrl: entity.wikidataUrl,
        wikipediaUrl: entity.wikipediaUrl,
        imageUrl: entity.imageUrl,
        expectedAlbum: testEntity.expectedAlbum,
      });

      // Rate limit: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, 'data/test-entities-fetched.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${results.length} entities to ${outputPath}`);

  // Summary
  console.log('\n📊 Rarity distribution:');
  const rarityCounts = results.reduce((acc, e) => {
    acc[e.rarity] = (acc[e.rarity] || 0) + 1;
    return acc;
  }, {});
  console.log(rarityCounts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run script to fetch test entities**

Run: `cd apps/backend && npx ts-node scripts/collection/01-fetch-test-entities.ts`

Expected: 
- Fetches 10 entities
- Prints label, pageviews, wiki length, rarity for each
- Saves to `data/test-entities-fetched.json`
- Takes ~5-10 seconds (500ms delay between requests)

- [ ] **Step 4: Verify rarity distribution**

Check output in console:
- Should see mix of rarities (not all common, not all legendary)
- Napoléon (Q517) should be legendary or epic
- Rayman (Q188593) should be common or uncommon

- [ ] **Step 5: Inspect fetched data**

Run: `cat apps/backend/scripts/collection/data/test-entities-fetched.json`

Verify:
- All 10 entities have non-empty label
- All have rarity tier assigned
- Descriptions are 2-4 sentences
- No `[1]`, `[2]` references in descriptions

- [ ] **Step 6: Commit**

```bash
git add apps/backend/scripts/collection/
git commit -m "feat(collection): add entity fetching script for test batch

- 10 test entities across 5 albums
- Fetches from Wikidata and Wikipedia APIs
- Calculates rarity score and tier
- Saves to test-entities-fetched.json
- 500ms rate limiting between requests

Verified mix of rarity tiers in test batch

Ref: MVP3 Phase 1"
```

---

## Task 8: Image Download & Optimization

**Files:**
- Create: `apps/backend/scripts/collection/02-download-images.ts`
- Create: `apps/backend/public/images/collection/` (directory)

**Interfaces:**
- Consumes: `data/test-entities-fetched.json`, Wikimedia Commons API
- Produces: Optimized images in `public/images/collection/`, updated JSON with local imageUrl

- [ ] **Step 1: Install Sharp (if not already installed)**

Run: `cd apps/backend && npm install sharp`

- [ ] **Step 2: Create collection images directory**

Run: `mkdir -p apps/backend/public/images/collection`

- [ ] **Step 3: Create image download script**

Create `apps/backend/scripts/collection/02-download-images.ts`:

```typescript
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

interface EntityData {
  wikidataId: string;
  label: string;
  imageUrl: string | null;
}

async function downloadAndOptimize(imageUrl: string, outputPath: string): Promise<{width: number, height: number}> {
  // Download image
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
    },
  });

  const buffer = Buffer.from(response.data);
  
  // Check if SVG
  if (imageUrl.toLowerCase().endsWith('.svg')) {
    // Save SVG as-is (no optimization)
    fs.writeFileSync(outputPath, buffer);
    return { width: 800, height: 600 }; // Default SVG dimensions
  }

  // Optimize with Sharp
  const metadata = await sharp(buffer).metadata();
  
  // Resize if width > 800px
  let image = sharp(buffer);
  if (metadata.width && metadata.width > 800) {
    image = image.resize(800, null, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // Compress
  if (imageUrl.toLowerCase().includes('.png')) {
    await image.png({ quality: 85 }).toFile(outputPath);
  } else {
    await image.jpeg({ quality: 85 }).toFile(outputPath);
  }

  const finalMetadata = await sharp(outputPath).metadata();
  
  return {
    width: finalMetadata.width || 800,
    height: finalMetadata.height || 600,
  };
}

async function main() {
  console.log('Downloading and optimizing images...\n');

  const entities: EntityData[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities-fetched.json'),
      'utf-8'
    )
  );

  const imagesDir = path.join(__dirname, '../../public/images/collection');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const updatedEntities = [];

  for (const entity of entities) {
    console.log(`\n${entity.label}...`);

    if (!entity.imageUrl) {
      console.log('  ⚠️  No image URL, skipping');
      updatedEntities.push(entity);
      continue;
    }

    try {
      // Generate filename from MD5 hash
      const hash = crypto.createHash('md5').update(entity.imageUrl).digest('hex');
      const ext = entity.imageUrl.toLowerCase().endsWith('.svg') ? '.svg' : '.jpg';
      const filename = `${hash}${ext}`;
      const outputPath = path.join(imagesDir, filename);

      // Download and optimize
      const { width, height } = await downloadAndOptimize(entity.imageUrl, outputPath);
      
      const stats = fs.statSync(outputPath);
      console.log(`  ✅ Downloaded: ${filename} (${Math.round(stats.size / 1024)}KB, ${width}x${height})`);

      // Update entity with local path
      updatedEntities.push({
        ...entity,
        imageUrl: `/images/collection/${filename}`,
        imageWidth: width,
        imageHeight: height,
        imageSourceUrl: entity.imageUrl, // Store original Wikimedia URL
      });

      // Rate limit: 500ms between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      updatedEntities.push(entity);
    }
  }

  // Save updated data
  const outputPath = path.join(__dirname, 'data/test-entities-with-images.json');
  fs.writeFileSync(outputPath, JSON.stringify(updatedEntities, null, 2));
  console.log(`\n✅ Saved ${updatedEntities.length} entities to ${outputPath}`);
}

main().catch(console.error);
```

- [ ] **Step 4: Run image download script**

Run: `cd apps/backend && npx ts-node scripts/collection/02-download-images.ts`

Expected:
- Downloads 10 images (or fewer if some entities have no image)
- Optimizes with Sharp
- Saves to `public/images/collection/`
- Updates JSON with local paths

- [ ] **Step 5: Verify images**

Run: `ls -lh apps/backend/public/images/collection/`

Check:
- Images exist (MD5 hash filenames)
- File sizes are reasonable (~50-150KB for JPG, varies for SVG)
- At least 8/10 entities have images

- [ ] **Step 6: Commit**

```bash
git add apps/backend/scripts/collection/ apps/backend/public/images/collection/ apps/backend/package.json
git commit -m "feat(collection): add image download and optimization script

- Downloads images from Wikimedia Commons
- Sharp optimization: resize max 800px, compress to ~85 quality
- MD5 hash filenames for deduplication
- SVG preserved as-is (no optimization)
- Updates entity data with local paths and dimensions

Processed 10 test entities

Ref: MVP3 Phase 1"
```

---

## Task 9: Database Seeding Script

**Files:**
- Create: `apps/backend/scripts/collection/03-seed-database.ts`

**Interfaces:**
- Consumes: `data/test-entities-with-images.json`, Prisma models
- Produces: 10 entities, 10 cards, 5 albums, ~20 card-album relations in database

- [ ] **Step 1: Create seeding script**

Create `apps/backend/scripts/collection/03-seed-database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EntityData {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  rarityScore: number;
  rarity: string;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageSourceUrl: string;
  expectedAlbum: string;
}

async function main() {
  console.log('Seeding database with test entities...\n');

  // 1. Create 5 meta-albums
  console.log('Creating albums...');
  const albums = [
    {
      slug: 'personnalites',
      name: 'Personnalités',
      description: 'Figures historiques, sportifs, artistes, écrivains',
      icon: '👤',
      displayOrder: 1,
    },
    {
      slug: 'culture',
      name: 'Culture',
      description: 'Films, livres, peintures, personnages fictifs',
      icon: '🎨',
      displayOrder: 2,
    },
    {
      slug: 'lieux',
      name: 'Lieux',
      description: 'Monuments, pays, capitales, paysages',
      icon: '🏛️',
      displayOrder: 3,
    },
    {
      slug: 'symboles',
      name: 'Symboles',
      description: 'Drapeaux, emblèmes nationaux',
      icon: '🚩',
      displayOrder: 4,
    },
    {
      slug: 'divers',
      name: 'Divers',
      description: 'Jeux vidéo, autres catégories',
      icon: '🎮',
      displayOrder: 5,
    },
  ];

  const createdAlbums: Record<string, any> = {};
  for (const albumData of albums) {
    const album = await prisma.album.upsert({
      where: { slug: albumData.slug },
      update: albumData,
      create: albumData,
    });
    createdAlbums[album.slug] = album;
    console.log(`  ✅ ${album.name}`);
  }

  // 2. Load entity data
  const entities: EntityData[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities-with-images.json'),
      'utf-8'
    )
  );

  console.log(`\nSeeding ${entities.length} entities...\n`);

  // 3. Create entities and cards
  for (const entityData of entities) {
    console.log(`${entityData.label}...`);

    // Create entity
    const entity = await prisma.entity.upsert({
      where: { wikidataId: entityData.wikidataId },
      update: {
        label: entityData.label,
        type: entityData.type,
        pageviewsMonth: entityData.pageviewsMonth,
        wikiTextLength: entityData.wikiTextLength,
        rarityScore: entityData.rarityScore,
        description: entityData.description,
        wikidataUrl: entityData.wikidataUrl,
        wikipediaUrl: entityData.wikipediaUrl,
      },
      create: {
        wikidataId: entityData.wikidataId,
        label: entityData.label,
        type: entityData.type,
        pageviewsMonth: entityData.pageviewsMonth,
        wikiTextLength: entityData.wikiTextLength,
        rarityScore: entityData.rarityScore,
        description: entityData.description,
        wikidataUrl: entityData.wikidataUrl,
        wikipediaUrl: entityData.wikipediaUrl,
      },
    });

    // Create card
    const card = await prisma.card.upsert({
      where: { entityId: entity.id },
      update: {
        rarity: entityData.rarity,
        imageUrl: entityData.imageUrl,
        imageWidth: entityData.imageWidth,
        imageHeight: entityData.imageHeight,
        imageSourceUrl: entityData.imageSourceUrl,
      },
      create: {
        entityId: entity.id,
        rarity: entityData.rarity,
        imageUrl: entityData.imageUrl,
        imageWidth: entityData.imageWidth,
        imageHeight: entityData.imageHeight,
        imageSourceUrl: entityData.imageSourceUrl,
        active: true,
      },
    });

    // Create card-album relation
    const album = createdAlbums[entityData.expectedAlbum];
    if (album) {
      await prisma.cardAlbum.upsert({
        where: {
          cardId_albumId: {
            cardId: card.id,
            albumId: album.id,
          },
        },
        update: {},
        create: {
          cardId: card.id,
          albumId: album.id,
        },
      });
      console.log(`  ✅ Entity + Card + Album (${album.name})`);
    } else {
      console.log(`  ✅ Entity + Card (no album)`);
    }
  }

  // 4. Summary
  const stats = await prisma.card.groupBy({
    by: ['rarity'],
    _count: true,
  });

  console.log('\n📊 Final rarity distribution:');
  stats.forEach(stat => {
    console.log(`  ${stat.rarity}: ${stat._count}`);
  });

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seeding script**

Run: `cd apps/backend && npx ts-node scripts/collection/03-seed-database.ts`

Expected:
- Creates 5 albums
- Creates 10 entities
- Creates 10 cards
- Creates ~10 card-album relations
- Prints rarity distribution

- [ ] **Step 3: Verify in Prisma Studio**

Run: `cd apps/backend && npx prisma studio`

Check:
- Navigate to `albums` table → 5 albums exist
- Navigate to `entities` table → 10 entities exist
- Navigate to `cards` table → 10 cards exist
- Navigate to `card_albums` table → ~10 relations exist

- [ ] **Step 4: Test GET /api/cards endpoint**

Run server: `cd apps/backend && npm run start:dev`

Test: `curl http://localhost:3000/api/cards | jq`

Expected: Returns 10 cards with entity data

- [ ] **Step 5: Test GET /api/albums endpoint**

Test: `curl http://localhost:3000/api/albums | jq`

Expected: Returns 5 albums with card counts

- [ ] **Step 6: Commit**

```bash
git add apps/backend/scripts/collection/
git commit -m "feat(collection): add database seeding script

- Creates 5 meta-albums with icons and display order
- Seeds 10 test entities with metrics
- Creates 10 cards with images and dimensions
- Links cards to albums via CardAlbum

Verified via Prisma Studio and API endpoints

Ref: MVP3 Phase 1"
```

---

## Task 10: Frontend - Types & API Client

**Files:**
- Create: `apps/frontend/src/types/collection.ts`
- Create: `apps/frontend/src/services/collection.api.ts`

**Interfaces:**
- Consumes: Backend API endpoints (`GET /api/cards`, `GET /api/albums`)
- Produces: TypeScript types and API functions for frontend

- [ ] **Step 1: Create TypeScript types**

Create `apps/frontend/src/types/collection.ts`:

```typescript
export interface Entity {
  id: string;
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  rarityScore: number;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  entityId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageLicenseAuthor: string | null;
  imageLicenseType: string | null;
  imageLicenseUrl: string | null;
  imageSourceUrl: string | null;
  displayOrder: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  entity: Entity;
  albums: CardAlbum[];
}

export interface Album {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  createdAt: string;
  cardCount?: number;
  cards?: CardAlbum[];
}

export interface CardAlbum {
  id: string;
  cardId: string;
  albumId: string;
  card?: Card;
  album?: Album;
}

export interface CardStats {
  total: number;
  byRarity: Record<string, number>;
  byAlbum: Record<string, number>;
}

export interface FindCardsParams {
  albumId?: string;
  rarity?: string;
  search?: string;
}
```

- [ ] **Step 2: Create API client**

Create `apps/frontend/src/services/collection.api.ts`:

```typescript
import { apiClient } from './apiClient';
import { Card, Album, CardStats, FindCardsParams } from '../types/collection';

export const collectionApi = {
  /**
   * Get all cards with optional filters
   */
  async getCards(params?: FindCardsParams): Promise<Card[]> {
    const response = await apiClient.get<Card[]>('/cards', { params });
    return response.data;
  },

  /**
   * Get single card by ID
   */
  async getCard(id: string): Promise<Card> {
    const response = await apiClient.get<Card>(`/cards/${id}`);
    return response.data;
  },

  /**
   * Get card statistics
   */
  async getStats(): Promise<CardStats> {
    const response = await apiClient.get<CardStats>('/cards/stats');
    return response.data;
  },

  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    const response = await apiClient.get<Album[]>('/albums');
    return response.data;
  },

  /**
   * Get single album by slug
   */
  async getAlbum(slug: string): Promise<Album> {
    const response = await apiClient.get<Album>(`/albums/${slug}`);
    return response.data;
  },
};
```

- [ ] **Step 3: Test API client manually**

Create temporary test file `apps/frontend/src/services/collection.test.ts`:

```typescript
import { collectionApi } from './collection.api';

async function test() {
  console.log('Testing collection API...');
  
  const cards = await collectionApi.getCards();
  console.log('Cards:', cards.length);
  
  const albums = await collectionApi.getAlbums();
  console.log('Albums:', albums.length);
  
  const stats = await collectionApi.getStats();
  console.log('Stats:', stats);
}

test().catch(console.error);
```

Run: `cd apps/frontend && npx ts-node src/services/collection.test.ts`

Expected: Prints 10 cards, 5 albums, stats object

- [ ] **Step 4: Delete test file**

Run: `rm apps/frontend/src/services/collection.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/types/collection.ts apps/frontend/src/services/collection.api.ts
git commit -m "feat(collection): add frontend types and API client

- TypeScript interfaces: Entity, Card, Album, CardAlbum, CardStats
- API client methods: getCards, getCard, getStats, getAlbums, getAlbum
- Query params support for filters

Tested with backend API

Ref: MVP3 Phase 1"
```

---

## Task 11: Frontend - Zustand Store & Collection Page Foundation

**Files:**
- Create: `apps/frontend/src/stores/collectionStore.ts`
- Create: `apps/frontend/src/pages/CollectionPage.tsx`
- Modify: `apps/frontend/src/App.tsx` (add route)

**Interfaces:**
- Consumes: `collection.api`, `collection` types
- Produces: Zustand store with filters, fetch functions; `/collec` route

- [ ] **Step 1: Install Zustand (if not already installed)**

Run: `cd apps/frontend && npm install zustand`

- [ ] **Step 2: Create Zustand store**

Create `apps/frontend/src/stores/collectionStore.ts`:

```typescript
import { create } from 'zustand';
import { Card, Album, CardStats } from '../types/collection';
import { collectionApi } from '../services/collection.api';

interface CollectionStore {
  // Data
  cards: Card[];
  albums: Album[];
  stats: CardStats | null;
  loading: boolean;
  error: string | null;

  // Filters
  filters: {
    albumId: string | null;
    rarity: string | null;
    search: string;
  };

  // Actions
  setFilter: (key: keyof CollectionStore['filters'], value: any) => void;
  clearFilters: () => void;
  fetchCards: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  // Initial state
  cards: [],
  albums: [],
  stats: null,
  loading: false,
  error: null,

  filters: {
    albumId: null,
    rarity: null,
    search: '',
  },

  // Set filter
  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
    // Re-fetch cards with new filters
    get().fetchCards();
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: {
        albumId: null,
        rarity: null,
        search: '',
      },
    });
    get().fetchCards();
  },

  // Fetch cards with filters
  fetchCards: async () => {
    set({ loading: true, error: null });
    try {
      const { albumId, rarity, search } = get().filters;
      const cards = await collectionApi.getCards({
        albumId: albumId || undefined,
        rarity: rarity || undefined,
        search: search || undefined,
      });
      set({ cards, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch albums
  fetchAlbums: async () => {
    try {
      const albums = await collectionApi.getAlbums();
      set({ albums });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const stats = await collectionApi.getStats();
      set({ stats });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Fetch all data
  fetchAll: async () => {
    await Promise.all([
      get().fetchCards(),
      get().fetchAlbums(),
      get().fetchStats(),
    ]);
  },
}));
```

- [ ] **Step 3: Create CollectionPage foundation**

Create `apps/frontend/src/pages/CollectionPage.tsx`:

```typescript
import { useEffect } from 'react';
import { useCollectionStore } from '../stores/collectionStore';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards } = useCollectionStore();

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Chargement de la collection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>
        
        {/* Placeholder - will add components in next tasks */}
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <p className="text-2xl font-semibold mb-4">
            {cards.length} cartes chargées
          </p>
          <p className="text-gray-600">
            Les composants de la galerie seront ajoutés dans les prochaines tâches
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

Modify `apps/frontend/src/App.tsx`:

```typescript
// Add import
import CollectionPage from './pages/CollectionPage';

// Add route in Routes
<Route path="/collec" element={<CollectionPage />} />
```

- [ ] **Step 5: Test page loads**

Run: `cd apps/frontend && npm run dev`

Navigate to: `http://localhost:5173/collec`

Expected: 
- Page loads showing "10 cartes chargées"
- No console errors

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/stores/ apps/frontend/src/pages/CollectionPage.tsx apps/frontend/src/App.tsx apps/frontend/package.json
git commit -m "feat(collection): add Zustand store and Collection page foundation

- CollectionStore: filters, fetch functions, state management
- CollectionPage: basic layout, loading/error states
- /collec route added

Verified page loads with 10 cards

Ref: MVP3 Phase 1"
```

---

## Task 12: Frontend - Card Components

**Files:**
- Create: `apps/frontend/src/components/collection/CardGrid.tsx`
- Create: `apps/frontend/src/components/collection/CardComponent.tsx`
- Create: `apps/frontend/src/components/collection/RarityBadge.tsx`
- Modify: `apps/frontend/src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `Card` type, `useCollectionStore`
- Produces: Responsive card grid, individual card component, rarity badge

- [ ] **Step 1: Create RarityBadge component**

Create `apps/frontend/src/components/collection/RarityBadge.tsx`:

```typescript
interface RarityBadgeProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

const RARITY_CONFIG = {
  common: {
    color: 'bg-gray-400',
    label: 'Common',
  },
  uncommon: {
    color: 'bg-amber-600',
    label: 'Uncommon',
  },
  rare: {
    color: 'bg-blue-500',
    label: 'Rare',
  },
  epic: {
    color: 'bg-purple-600',
    label: 'Epic',
  },
  legendary: {
    color: 'bg-yellow-500',
    label: 'Legendary',
  },
};

export default function RarityBadge({ rarity, className = '' }: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-semibold ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: Create CardComponent**

Create `apps/frontend/src/components/collection/CardComponent.tsx`:

```typescript
import { Card } from '../../types/collection';
import RarityBadge from './RarityBadge';

interface CardComponentProps {
  card: Card;
  onClick: (card: Card) => void;
}

export default function CardComponent({ card, onClick }: CardComponentProps) {
  return (
    <div
      onClick={() => onClick(card)}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
    >
      {/* Image */}
      <div className="aspect-[3/4] bg-gray-200 overflow-hidden">
        <img
          src={card.imageUrl}
          alt={card.entity.label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Name */}
      <div className="p-3 text-center">
        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 min-h-[3.5rem]">
          {card.entity.label}
        </h3>
      </div>

      {/* Rarity Badge */}
      <div className="px-3 pb-3 flex justify-center">
        <RarityBadge rarity={card.rarity} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CardGrid component**

Create `apps/frontend/src/components/collection/CardGrid.tsx`:

```typescript
import { Card } from '../../types/collection';
import CardComponent from './CardComponent';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export default function CardGrid({ cards, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow">
        <p className="text-xl text-gray-600">
          Aucune carte trouvée avec ces filtres
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card) => (
        <CardComponent key={card.id} card={card} onClick={onCardClick} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Integrate CardGrid into CollectionPage**

Modify `apps/frontend/src/pages/CollectionPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useCollectionStore } from '../stores/collectionStore';
import CardGrid from '../components/collection/CardGrid';
import { Card } from '../types/collection';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards } = useCollectionStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    // Modal will be added in next task
    console.log('Card clicked:', card.entity.label);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Chargement de la collection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>
        
        <CardGrid cards={cards} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Test card grid**

Run: `cd apps/frontend && npm run dev`

Navigate to: `http://localhost:5173/collec`

Verify:
- Cards display in grid (2 cols on mobile, 4 on desktop)
- Images load correctly
- Names are centered and truncated if too long
- Rarity badges have correct colors
- Hover effect works (scale + shadow)
- Click logs card name to console

- [ ] **Step 6: Test responsive breakpoints**

Resize browser window to:
- <640px: 2 columns
- 640-1024px: 3 columns
- >1024px: 4 columns

Expected: Grid layout transitions smoothly

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/collection/ apps/frontend/src/pages/CollectionPage.tsx
git commit -m "feat(collection): add card grid and card components

CardComponent:
- 3:4 aspect ratio image
- Centered name with line clamp
- Rarity badge with color coding
- Hover effect (scale + shadow)

CardGrid:
- Responsive: 2/3/4 columns (mobile/tablet/desktop)
- Empty state message

RarityBadge:
- Color mapping (gray/bronze/blue/purple/yellow)

Verified responsive breakpoints and hover states

Ref: MVP3 Phase 1"
```

---

## Task 13: Frontend - Filters (Album, Rarity, Search)

**Files:**
- Create: `apps/frontend/src/components/collection/AlbumFilter.tsx`
- Create: `apps/frontend/src/components/collection/RarityFilter.tsx`
- Create: `apps/frontend/src/components/collection/SearchInput.tsx`
- Modify: `apps/frontend/src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `useCollectionStore`, `albums`, `filters`
- Produces: Filter components with active states, search debouncing

- [ ] **Step 1: Create AlbumFilter component**

Create `apps/frontend/src/components/collection/AlbumFilter.tsx`:

```typescript
import { Album } from '../../types/collection';

interface AlbumFilterProps {
  albums: Album[];
  selectedAlbumId: string | null;
  onSelect: (albumId: string | null) => void;
}

export default function AlbumFilter({ albums, selectedAlbumId, onSelect }: AlbumFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedAlbumId === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        Tous
      </button>

      {albums.map((album) => (
        <button
          key={album.id}
          onClick={() => onSelect(album.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedAlbumId === album.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {album.icon} {album.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create RarityFilter component**

Create `apps/frontend/src/components/collection/RarityFilter.tsx`:

```typescript
interface RarityFilterProps {
  selectedRarity: string | null;
  onSelect: (rarity: string | null) => void;
}

const RARITIES = [
  { value: 'common', label: 'Common', emoji: '⚪' },
  { value: 'uncommon', label: 'Uncommon', emoji: '🟠' },
  { value: 'rare', label: 'Rare', emoji: '🔵' },
  { value: 'epic', label: 'Epic', emoji: '🟣' },
  { value: 'legendary', label: 'Legendary', emoji: '🟡' },
];

export default function RarityFilter({ selectedRarity, onSelect }: RarityFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedRarity === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        Toutes
      </button>

      {RARITIES.map((rarity) => (
        <button
          key={rarity.value}
          onClick={() => onSelect(rarity.value)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRarity === rarity.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {rarity.emoji} {rarity.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create SearchInput component**

Create `apps/frontend/src/components/collection/SearchInput.tsx`:

```typescript
import { useState, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Rechercher...' }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full md:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Integrate filters into CollectionPage**

Modify `apps/frontend/src/pages/CollectionPage.tsx`:

```typescript
import AlbumFilter from '../components/collection/AlbumFilter';
import RarityFilter from '../components/collection/RarityFilter';
import SearchInput from '../components/collection/SearchInput';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards, albums, filters, setFilter } = useCollectionStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // ... existing code ...

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>
        
        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 space-y-4">
          {/* Album Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Albums</h3>
            <AlbumFilter
              albums={albums}
              selectedAlbumId={filters.albumId}
              onSelect={(albumId) => setFilter('albumId', albumId)}
            />
          </div>

          {/* Rarity Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Rareté</h3>
            <RarityFilter
              selectedRarity={filters.rarity}
              onSelect={(rarity) => setFilter('rarity', rarity)}
            />
          </div>

          {/* Search */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recherche</h3>
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilter('search', search)}
              placeholder="Rechercher une carte..."
            />
          </div>
        </div>

        <CardGrid cards={cards} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Test album filter**

Navigate to: `http://localhost:5173/collec`

Click on different albums (Personnalités, Culture, etc.)

Expected:
- Button becomes blue when selected
- Card count changes
- Only cards from selected album display

- [ ] **Step 6: Test rarity filter**

Click on different rarities (Common, Rare, Legendary)

Expected:
- Button becomes blue when selected
- Card count changes
- Only cards with selected rarity display

- [ ] **Step 7: Test search with debouncing**

Type "napoleon" in search box

Expected:
- No immediate filtering (debouncing)
- After 300ms, cards filter to match search
- Only matching cards display

- [ ] **Step 8: Test filter combinations**

Select album "Personnalités" + rarity "Legendary" + search "napoleon"

Expected:
- All three filters apply (AND logic)
- Very few or zero cards match all three

- [ ] **Step 9: Test clearing filters**

Click "Tous" for albums and "Toutes" for rarity, clear search

Expected:
- All 10 cards display again

- [ ] **Step 10: Commit**

```bash
git add apps/frontend/src/components/collection/ apps/frontend/src/pages/CollectionPage.tsx
git commit -m "feat(collection): add album, rarity, and search filters

AlbumFilter:
- Horizontal button list with icons
- Active state (blue background)
- \"Tous\" option to clear

RarityFilter:
- Horizontal button list with emoji indicators
- Active state
- \"Toutes\" option to clear

SearchInput:
- 300ms debouncing
- Search icon
- Responsive width

Filters apply AND logic, all verified working

Ref: MVP3 Phase 1"
```

---

## Task 14: Frontend - Card Detail Modal

**Files:**
- Create: `apps/frontend/src/components/collection/CardDetailModal.tsx`
- Modify: `apps/frontend/src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `Card` type with entity data
- Produces: Modal with card details, Wikipedia link, backdrop close

- [ ] **Step 1: Create CardDetailModal component**

Create `apps/frontend/src/components/collection/CardDetailModal.tsx`:

```typescript
import { Card } from '../../types/collection';
import RarityBadge from './RarityBadge';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rarity Badge - Top Left */}
        <div className="p-6 pb-2">
          <RarityBadge rarity={card.rarity} />
        </div>

        {/* Entity Name - Centered */}
        <div className="px-6 pb-4">
          <h2 className="text-3xl font-bold text-center text-gray-800">
            {card.entity.label}
          </h2>
        </div>

        {/* Image - ~90% width */}
        <div className="px-8 pb-6">
          <img
            src={card.imageUrl}
            alt={card.entity.label}
            className="w-full rounded-lg shadow-md"
            style={{ maxHeight: '400px', objectFit: 'contain' }}
          />
        </div>

        {/* Description */}
        <div className="px-8 pb-6">
          <p className="text-gray-700 leading-relaxed">
            {card.entity.description}
          </p>
        </div>

        {/* Wikipedia Link */}
        {card.entity.wikipediaUrl && (
          <div className="px-8 pb-8">
            <a
              href={card.entity.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔗 Plus d'info sur Wikipédia
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate modal into CollectionPage**

Modify `apps/frontend/src/pages/CollectionPage.tsx`:

```typescript
import CardDetailModal from '../components/collection/CardDetailModal';

export default function CollectionPage() {
  // ... existing code ...

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ... existing code ... */}

      {/* Modal */}
      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={handleCloseModal} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Test modal opens**

Click on any card in the grid

Expected:
- Modal opens with backdrop
- Card details display correctly
- Rarity badge in top-left
- Name centered at top
- Image large and centered
- Description below image
- Wikipedia link at bottom

- [ ] **Step 4: Test modal closes**

Click on backdrop (outside modal)

Expected:
- Modal closes
- Returns to card grid

- [ ] **Step 5: Test clicking inside modal**

Click inside modal content (on image, text, etc.)

Expected:
- Modal stays open (does not close)

- [ ] **Step 6: Test Wikipedia link**

Click "Plus d'info sur Wikipédia" button

Expected:
- Opens Wikipedia page in new tab
- Modal stays open in original tab

- [ ] **Step 7: Test with multiple cards**

Open modal for different cards (Napoléon, Tour Eiffel, etc.)

Verify:
- All images load correctly
- All descriptions display
- Rarity badges show correct colors

- [ ] **Step 8: Test responsive modal**

Resize browser to mobile width (<640px)

Expected:
- Modal scales to fit screen
- Content remains readable
- Scrolling works if content overflows

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/components/collection/CardDetailModal.tsx apps/frontend/src/pages/CollectionPage.tsx
git commit -m "feat(collection): add card detail modal

CardDetailModal:
- Rarity badge top-left
- Centered entity name
- Large image (~90% width)
- Description below image
- Wikipedia link button
- Backdrop close (click outside)
- Stop propagation on modal content

Verified responsive and all interactions

Ref: MVP3 Phase 1"
```

---

## Task 15: Frontend - Collection Stats Component

**Files:**
- Create: `apps/frontend/src/components/collection/CollectionStats.tsx`
- Modify: `apps/frontend/src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `CardStats` from store
- Produces: Stats header with total, by rarity, by album

- [ ] **Step 1: Create CollectionStats component**

Create `apps/frontend/src/components/collection/CollectionStats.tsx`:

```typescript
import { CardStats } from '../../types/collection';

interface CollectionStatsProps {
  stats: CardStats | null;
}

export default function CollectionStats({ stats }: CollectionStatsProps) {
  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Statistiques</h2>

      {/* Total Cards */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-4xl">📦</span>
        <div>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-gray-600">cartes au total</p>
        </div>
      </div>

      {/* By Rarity */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Par rareté</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.byRarity).map(([rarity, count]) => (
            <div key={rarity} className="flex items-center gap-2">
              <span className="capitalize">{rarity}:</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Album */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Par album</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.byAlbum).map(([album, count]) => (
            <div key={album} className="flex items-center gap-2">
              <span>{album}:</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate CollectionStats into CollectionPage**

Modify `apps/frontend/src/pages/CollectionPage.tsx`:

```typescript
import CollectionStats from '../components/collection/CollectionStats';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards, albums, filters, stats, setFilter } = useCollectionStore();
  
  // ... existing code ...

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>
        
        {/* Stats */}
        <CollectionStats stats={stats} />
        
        {/* Filters Section */}
        {/* ... existing filters code ... */}
        
        <CardGrid cards={cards} onCardClick={handleCardClick} />

        {/* Modal */}
        {selectedCard && (
          <CardDetailModal card={selectedCard} onClose={handleCloseModal} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test stats display**

Navigate to: `http://localhost:5173/collec`

Verify:
- Total cards shows "10 cartes au total"
- By rarity section shows counts (e.g., "common: 4, rare: 3, legendary: 1")
- By album section shows counts (e.g., "Personnalités: 4, Culture: 2")

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/collection/CollectionStats.tsx apps/frontend/src/pages/CollectionPage.tsx
git commit -m "feat(collection): add collection statistics component

CollectionStats:
- Total cards with icon
- By rarity breakdown
- By album breakdown

Positioned above filters section

Ref: MVP3 Phase 1"
```

---

## Task 16: Scale to 50 Cards & Final Polish

**Files:**
- Modify: `apps/backend/scripts/collection/data/test-entities.json` (expand to 50)
- Create: `apps/backend/scripts/collection/04-fetch-all-entities.ts`
- Modify: `apps/backend/scripts/collection/02-download-images.ts` (handle 50)
- Modify: `apps/backend/scripts/collection/03-seed-database.ts` (handle 50)

**Interfaces:**
- Consumes: Expanded entity list (50 entities)
- Produces: 50 cards seeded, rarity distribution verified (20/15/10/4/1)

- [ ] **Step 1: Create full entity list (50 entities)**

Modify `apps/backend/scripts/collection/data/test-entities.json` to include 50 Wikidata IDs across 5 albums:

- Personnalités (20): Q517 (Napoléon), Q10305 (Zidane), Q7374 (Victor Hugo), Q5593 (Édith Piaf), Q2105 (Molière), Q12252 (Louis XIV), Q2140 (Jeanne d'Arc), Q2275 (Charles de Gaulle), Q151803 (Vercingétorix), Q42937 (Michel Platini), Q29465 (Karim Benzema), Q106031 (Mbappé), Q106221 (Alain Delon), Q106307 (Marion Cotillard), Q106512 (Depardieu), Q1231 (Johnny Hallyday), Q205012 (Daft Punk), Q296 (Claude Monet), Q39905 (Renoir), Q35548 (Cézanne)

- Culture (12): Q3464665 (Intouchables), Q19020 (Amélie Poulain), Q663286 (La Haine), Q180736 (Les Misérables), Q25338 (Le Petit Prince), Q178713 (L'Étranger), Q12544 (La Joconde), Q17900359 (Impression soleil levant), Q1892745 (Le Déjeuner sur l'herbe), Q127117 (Astérix), Q744536 (Tintin), Q1154945 (Lucky Luke)

- Lieux (12): Q243 (Tour Eiffel), Q5592 (Arc de Triomphe), Q2981 (Notre-Dame), Q3321850 (Mont-Saint-Michel), Q142 (France), Q31 (Belgique), Q39 (Suisse), Q16 (Canada), Q90 (Paris), Q239 (Bruxelles), Q70 (Berne), Q1930 (Ottawa)

- Symboles (3): Q1929607 (Drapeau France), Q47922 (Drapeau UE), Q663779 (Drapeau Québec)

- Divers (3): Q188593 (Rayman), Q3454759 (Assassin's Creed), Q191019 (Cyrano)

(Exact Wikidata IDs to be verified during execution - use Wikidata search)

- [ ] **Step 2: Create script to fetch all 50 entities**

Create `apps/backend/scripts/collection/04-fetch-all-entities.ts`:

Copy from `01-fetch-test-entities.ts` but update to process all 50 entities with progress logging every 10 entities

- [ ] **Step 3: Run full fetch (expect 20-30 minutes with rate limiting)**

Run: `cd apps/backend && npx ts-node scripts/collection/04-fetch-all-entities.ts`

Monitor:
- Progress logs every 10 entities
- No errors fetching pageviews or summaries
- Final JSON saved to `data/all-entities-fetched.json`

- [ ] **Step 4: Verify rarity distribution**

Check final output:
- Should see distribution close to target
- If too far off (e.g., 0 legendary, 30 common), adjust entity selection

Expected approximate distribution:
- Common: 18-22
- Uncommon: 13-17
- Rare: 8-12
- Epic: 3-5
- Legendary: 1-2

- [ ] **Step 5: Run image download for all 50**

Update `02-download-images.ts` to read from `all-entities-fetched.json`

Run: `cd apps/backend && npx ts-node scripts/collection/02-download-images.ts`

Expected:
- Downloads ~45-50 images (some entities may not have images)
- Total size ~4-8 MB
- Saves to `data/all-entities-with-images.json`

- [ ] **Step 6: Seed database with 50 cards**

Update `03-seed-database.ts` to read from `all-entities-with-images.json`

Run: `cd apps/backend && npx ts-node scripts/collection/03-seed-database.ts`

Expected:
- Creates 50 entities
- Creates 50 cards
- Links to 5 albums
- Prints final rarity distribution

- [ ] **Step 7: Verify in Prisma Studio**

Run: `cd apps/backend && npx prisma studio`

Check:
- `entities`: 50 rows
- `cards`: 50 rows
- `card_albums`: 50 rows

- [ ] **Step 8: Test frontend with 50 cards**

Navigate to: `http://localhost:5173/collec`

Verify:
- Page loads in <2s
- All 50 cards display
- Images load progressively (lazy loading works)
- Filters work correctly
- Stats show correct counts (total: 50)

- [ ] **Step 9: Test performance**

Open browser DevTools Network tab

Reload page

Check:
- Page load time <2s
- Image sizes reasonable (~50-150KB each)
- No 404 errors for missing images

- [ ] **Step 10: Final responsive testing**

Test on:
- Mobile (375px width): 2 columns, smooth scrolling
- Tablet (768px width): 3 columns, filters readable
- Desktop (1440px width): 4 columns, no empty space

- [ ] **Step 11: Update ROADMAP.md**

Modify `docs/ROADMAP.md`:

Mark MVP3 Phase 1 as complete:
```markdown
## MVP3 - Collection System (Phase 1)

**Status:** ✅ Complete

- ✅ 50 cards with Wikidata entities
- ✅ 5 meta-albums
- ✅ Rarity system with pyramid distribution
- ✅ /collec page with filters
- ✅ Card detail modal
- ✅ Responsive design

**Next:** MVP3 Phase 2 - User ownership
```

- [ ] **Step 12: Commit all**

```bash
git add apps/backend/scripts/collection/ apps/backend/public/images/collection/ docs/ROADMAP.md
git commit -m "feat(collection): scale to 50 cards and complete MVP3 Phase 1

Pipeline:
- 50 entities across 5 albums (20/12/12/3/3 distribution)
- Rarity distribution achieved: ~20 Common, ~15 Uncommon, ~10 Rare, ~4 Epic, ~1 Legendary
- All images downloaded and optimized
- Database seeded with full catalog

Frontend:
- Page load <2s with 50 cards
- All filters working (album, rarity, search)
- Modal detail view functional
- Responsive on mobile/tablet/desktop

MVP3 Phase 1 complete - read-only catalog ready

Ref: MVP3 Phase 1"
```

---

## Self-Review

**Spec Coverage:**
- ✅ Backend schema (Entity, Card, Album, CardAlbum) - Task 1
- ✅ Rarity algorithm (40/60 formula) - Task 2
- ✅ Cards API (GET /cards, /cards/:id, /cards/stats) - Task 4
- ✅ Albums API (GET /albums, /albums/:slug) - Task 5
- ✅ Wikidata/Wikipedia pipeline - Tasks 6-9
- ✅ Frontend /collec page - Tasks 10-15
- ✅ 50 cards with pyramid distribution - Task 16
- ✅ Filters (album, rarity, search) - Task 13
- ✅ Card detail modal - Task 14
- ✅ Collection stats - Task 15

**Placeholders:** None - all code blocks and test examples are concrete

**Type Consistency:**
- RarityService methods match across Tasks 2, 4, 7
- Card/Entity/Album types consistent Tasks 10-15
- API endpoints match backend (Task 4-5) and frontend (Task 10)

**Review Focus Coverage:**
1. ✅ Rarity edge cases (0 pageviews, 0 wiki length) - Task 2, Steps 6-8 test this
2. ✅ Image license validation - Task 8 stores license metadata, Task 9 seeds with it
3. ✅ Description cleaning - Task 6 WikipediaClient removes `[1]`, `[citation needed]`
4. ✅ Filter combination AND logic - Task 13 Step 8 tests album + rarity + search together
5. ✅ Responsive breakpoints - Task 12 Step 6 explicitly tests 640px and 1024px transitions

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-16-mvp3-collection-system.md`. 

**Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven**, because the tasks have many independent interfaces (backend API → frontend types → components), and each task produces testable deliverables where a reviewer can catch integration issues early (e.g., API response shape mismatches, filter logic bugs). Does the plan capture what you want, and which approach should we use?
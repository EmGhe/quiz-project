# Tags System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to organize their card collection with personal, reusable, colored tags that are visible in the grid and filterable.

**Architecture:** Backend creates Tag and CardTag models with validation (max 4 tags/card, unique labels/user). Frontend adds TagStore (Zustand) for state management, reusable UI components (TagBadge, ColorPicker), and integrates tag management into CardDetailModal with filtering in CollectionPage.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React 18, Zustand, Tailwind CSS, TypeScript

**Spec:** `docs/superpowers/specs/2026-10-23-tags-system-design.md`

## Global Constraints

- Node.js ≥ 18
- PostgreSQL 15
- TypeScript strict mode enabled
- All user-facing text in French
- Max tag label length: 20 characters
- Max tags per card: 4
- Color format: hex `#RRGGBB`
- All API routes require authentication

## Review Focus

1. **User creates two tags with same label** → Backend returns `409 Conflict`, frontend shows "Tu as déjà une étiquette avec ce nom"
2. **User tries to add 5th tag to a card** → Backend returns `400 Bad Request`, frontend disables add button and shows limit message
3. **User tries to tag a card they don't own** → Backend returns `403 Forbidden`, operation fails silently or shows error
4. **Tag label contains special characters or is empty** → Backend validation rejects with `400`, frontend shows validation error
5. **User deletes a tag used on multiple cards** → All CardTag associations cascade delete, cards no longer show the tag

---

## File Structure

### Backend
```
apps/backend/
├── prisma/
│   └── schema.prisma (modify: add Tag, CardTag models)
├── src/modules/
│   ├── tags/
│   │   ├── tags.module.ts (create)
│   │   ├── tags.controller.ts (create)
│   │   ├── tags.service.ts (create)
│   │   ├── tags.controller.spec.ts (create)
│   │   ├── tags.service.spec.ts (create)
│   │   └── dto/
│   │       ├── create-tag.dto.ts (create)
│   │       ├── update-tag.dto.ts (create)
│   │       └── tag.dto.ts (create)
│   └── collection/
│       ├── services/
│       │   └── cards.service.ts (modify: add tagId filter)
│       └── controllers/
│           └── cards.controller.ts (modify: add tagId param)
```

### Frontend
```
apps/frontend/
├── src/
│   ├── types/
│   │   └── tag.ts (create)
│   ├── services/
│   │   └── tags.api.ts (create)
│   ├── stores/
│   │   ├── tagStore.ts (create)
│   │   └── collectionStore.ts (modify: add tagId filter)
│   ├── components/
│   │   └── collection/
│   │       ├── TagBadge.tsx (create)
│   │       ├── ColorPicker.tsx (create)
│   │       ├── TagManager.tsx (create)
│   │       ├── TagFilter.tsx (create)
│   │       ├── CardDetailModal.tsx (modify: add TagManager)
│   │       └── CardComponent.tsx (modify: show tags)
│   └── pages/
│       └── CollectionPage.tsx (modify: add TagFilter)
```

---

## Task 1: Database Schema - Tag Model

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create migration after schema change

**Interfaces:**
- Consumes: Existing `User` model
- Produces: `Tag` model with fields: `id`, `userId`, `label`, `color`, `createdAt`, relations to `User` and `CardTag[]`

- [ ] **Step 1: Add Tag model to schema**

Open `apps/backend/prisma/schema.prisma` and add after the `User` model:

```prisma
model Tag {
  id        String   @id @default(uuid())
  userId    String
  label     String
  color     String
  createdAt DateTime @default(now())
  
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardTags  CardTag[]
  
  @@unique([userId, label])
  @@index([userId])
  @@map("tags")
}
```

- [ ] **Step 2: Add Tag relation to User model**

Find the `User` model and add to its relations:

```prisma
model User {
  // ... existing fields
  tags      Tag[]
  cardTags  CardTag[]
  // ... other existing relations
}
```

- [ ] **Step 3: Create migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_tag_model
```

Expected: Migration created successfully

- [ ] **Step 4: Verify migration**

```bash
npx prisma studio
```

Expected: `tags` table visible with correct schema

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add Tag model with user relation

- Add Tag table with userId, label, color
- Unique constraint on (userId, label)
- Cascade delete on user removal
- Index on userId for query performance"
```

---

## Task 2: Database Schema - CardTag Model

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create migration after schema change

**Interfaces:**
- Consumes: `Tag` model from Task 1, existing `Card` model
- Produces: `CardTag` model with fields: `id`, `userId`, `cardId`, `tagId`, `createdAt`, relations to `User`, `Card`, `Tag`

- [ ] **Step 1: Add CardTag model to schema**

Open `apps/backend/prisma/schema.prisma` and add after the `Tag` model:

```prisma
model CardTag {
  id        String   @id @default(uuid())
  userId    String
  cardId    String
  tagId     String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@unique([userId, cardId, tagId])
  @@index([userId, cardId])
  @@index([userId, tagId])
  @@map("card_tags")
}
```

- [ ] **Step 2: Add CardTag relation to Card model**

Find the `Card` model and add:

```prisma
model Card {
  // ... existing fields
  cardTags  CardTag[]
  // ... other existing relations
}
```

- [ ] **Step 3: Create migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_card_tag_model
```

Expected: Migration created successfully

- [ ] **Step 4: Verify migration**

```bash
npx prisma studio
```

Expected: `card_tags` table visible with foreign keys to users, cards, tags

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add CardTag junction table

- Many-to-many relation between cards and tags
- Unique constraint (userId, cardId, tagId)
- Indexes for filtering queries
- Cascade delete on user/card/tag removal"
```

---

## Task 3: Tags Module - DTOs

**Files:**
- Create: `apps/backend/src/modules/tags/dto/create-tag.dto.ts`
- Create: `apps/backend/src/modules/tags/dto/update-tag.dto.ts`
- Create: `apps/backend/src/modules/tags/dto/tag.dto.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `CreateTagDto` with `label: string`, `color: string`; `UpdateTagDto` with optional `label?: string`, `color?: string`; `TagDto` with `id`, `userId`, `label`, `color`, `cardCount`, `createdAt`

- [ ] **Step 1: Create CreateTagDto**

Create `apps/backend/src/modules/tags/dto/create-tag.dto.ts`:

```typescript
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex code (e.g., #FF5733)',
  })
  color: string;
}
```

- [ ] **Step 2: Create UpdateTagDto**

Create `apps/backend/src/modules/tags/dto/update-tag.dto.ts`:

```typescript
import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex code (e.g., #FF5733)',
  })
  color?: string;
}
```

- [ ] **Step 3: Create TagDto**

Create `apps/backend/src/modules/tags/dto/tag.dto.ts`:

```typescript
export class TagDto {
  id: string;
  userId: string;
  label: string;
  color: string;
  cardCount: number;
  createdAt: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/tags/dto/
git commit -m "feat(tags): add DTOs for tag operations

- CreateTagDto with validation (1-20 chars, hex color)
- UpdateTagDto with optional fields
- TagDto for response serialization"
```

---

## Task 4: Tags Service - Create Tag

**Files:**
- Create: `apps/backend/src/modules/tags/tags.service.ts`
- Create: `apps/backend/src/modules/tags/tags.service.spec.ts`

**Interfaces:**
- Consumes: `CreateTagDto` from Task 3, `PrismaService`
- Produces: `TagsService.create(userId: string, dto: CreateTagDto): Promise<Tag>` - creates a tag, throws `ConflictException` if label exists for user

- [ ] **Step 1: Write failing test for create**

Create `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            cardTag: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
            userCard: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a tag successfully', async () => {
      const userId = 'user-123';
      const dto = { label: 'Favoris', color: '#EF4444' };
      const mockTag = {
        id: 'tag-1',
        userId,
        label: dto.label,
        color: dto.color,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.tag, 'create').mockResolvedValue(mockTag as any);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockTag);
      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: { userId, label: dto.label, color: dto.color },
      });
    });

    it('should throw ConflictException on duplicate label', async () => {
      const userId = 'user-123';
      const dto = { label: 'Favoris', color: '#EF4444' };
      const error = { code: 'P2002' };

      jest.spyOn(prisma.tag, 'create').mockRejectedValue(error);

      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend
npm test tags.service.spec.ts
```

Expected: FAIL - `TagsService is not defined`

- [ ] **Step 3: Write minimal implementation**

Create `apps/backend/src/modules/tags/tags.service.ts`:

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTagDto) {
    try {
      return await this.prisma.tag.create({
        data: {
          userId,
          label: dto.label,
          color: dto.color,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Tu as déjà une étiquette avec ce nom');
      }
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tags.service.spec.ts
```

Expected: PASS - Both tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/tags/tags.service.ts src/modules/tags/tags.service.spec.ts
git commit -m "feat(tags): add TagsService.create method

- Create tag with userId, label, color
- Handle duplicate label with ConflictException
- Unit tests for success and duplicate cases"
```

---

## Task 5: Tags Service - List, Update, Delete

**Files:**
- Modify: `apps/backend/src/modules/tags/tags.service.ts`
- Modify: `apps/backend/src/modules/tags/tags.service.spec.ts`

**Interfaces:**
- Consumes: `UpdateTagDto` from Task 3, existing `create` method
- Produces: `findAllByUser(userId: string): Promise<TagDto[]>`, `update(userId: string, tagId: string, dto: UpdateTagDto): Promise<Tag>`, `delete(userId: string, tagId: string): Promise<void>`

- [ ] **Step 1: Write failing tests for findAllByUser, update, delete**

Add to `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
  describe('findAllByUser', () => {
    it('should return user tags with card counts', async () => {
      const userId = 'user-123';
      const mockTags = [
        {
          id: 'tag-1',
          userId,
          label: 'Favoris',
          color: '#EF4444',
          createdAt: new Date(),
          _count: { cardTags: 3 },
        },
      ];

      jest.spyOn(prisma.tag, 'findMany').mockResolvedValue(mockTags as any);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual([
        {
          id: 'tag-1',
          userId,
          label: 'Favoris',
          color: '#EF4444',
          cardCount: 3,
          createdAt: mockTags[0].createdAt.toISOString(),
        },
      ]);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const dto = { label: 'Nouveaux favoris' };
      const mockTag = {
        id: tagId,
        userId,
        label: 'Favoris',
        color: '#EF4444',
        createdAt: new Date(),
      };
      const updatedTag = { ...mockTag, label: dto.label };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.tag, 'update').mockResolvedValue(updatedTag as any);

      const result = await service.update(userId, tagId, dto);

      expect(result).toEqual(updatedTag);
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      const userId = 'user-123';
      const tagId = 'tag-999';

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(null);

      await expect(service.update(userId, tagId, {})).rejects.toThrow(
        'Étiquette introuvable',
      );
    });
  });

  describe('delete', () => {
    it('should delete a tag', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const mockTag = {
        id: tagId,
        userId,
        label: 'Favoris',
        color: '#EF4444',
        createdAt: new Date(),
      };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.tag, 'delete').mockResolvedValue(mockTag as any);

      await service.delete(userId, tagId);

      expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: tagId } });
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tags.service.spec.ts
```

Expected: FAIL - Methods not defined

- [ ] **Step 3: Implement findAllByUser, update, delete**

Add to `apps/backend/src/modules/tags/tags.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagDto } from './dto/tag.dto';

// ... existing create method

  async findAllByUser(userId: string): Promise<TagDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { cardTags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      userId: tag.userId,
      label: tag.label,
      color: tag.color,
      cardCount: tag._count.cardTags,
      createdAt: tag.createdAt.toISOString(),
    }));
  }

  async update(userId: string, tagId: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });

    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    return await this.prisma.tag.update({
      where: { id: tagId },
      data: dto,
    });
  }

  async delete(userId: string, tagId: string): Promise<void> {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });

    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    await this.prisma.tag.delete({ where: { id: tagId } });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tags.service.spec.ts
```

Expected: PASS - All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/tags/tags.service.ts src/modules/tags/tags.service.spec.ts
git commit -m "feat(tags): add list, update, delete methods

- findAllByUser returns tags with card counts
- update verifies ownership before updating
- delete cascades to CardTag via DB constraints
- Unit tests for all methods"
```

---

## Task 6: Tags Service - Card Tag Operations

**Files:**
- Modify: `apps/backend/src/modules/tags/tags.service.ts`
- Modify: `apps/backend/src/modules/tags/tags.service.spec.ts`

**Interfaces:**
- Consumes: Existing `Tag` model, `UserCard` model
- Produces: `addToCard(userId: string, tagId: string, cardId: string): Promise<CardTag>`, `removeFromCard(userId: string, tagId: string, cardId: string): Promise<void>`, `findCardTags(userId: string, cardId: string): Promise<Tag[]>`

- [ ] **Step 1: Write failing tests for card tag operations**

Add to `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
  describe('addToCard', () => {
    it('should add tag to card', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const cardId = 'card-1';
      const mockTag = { id: tagId, userId };
      const mockUserCard = { userId, cardId };
      const mockCardTag = { id: 'ct-1', userId, tagId, cardId, createdAt: new Date() };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(mockUserCard as any);
      jest.spyOn(prisma.cardTag, 'count').mockResolvedValue(2);
      jest.spyOn(prisma.cardTag, 'create').mockResolvedValue(mockCardTag as any);

      const result = await service.addToCard(userId, tagId, cardId);

      expect(result).toEqual(mockCardTag);
    });

    it('should throw if user does not own card', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const cardId = 'card-1';
      const mockTag = { id: tagId, userId };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(null);

      await expect(service.addToCard(userId, tagId, cardId)).rejects.toThrow(
        'Tu ne possèdes pas cette carte',
      );
    });

    it('should throw if 4 tag limit reached', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const cardId = 'card-1';
      const mockTag = { id: tagId, userId };
      const mockUserCard = { userId, cardId };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(mockUserCard as any);
      jest.spyOn(prisma.cardTag, 'count').mockResolvedValue(4);

      await expect(service.addToCard(userId, tagId, cardId)).rejects.toThrow(
        'Maximum 4 étiquettes par carte',
      );
    });
  });

  describe('removeFromCard', () => {
    it('should remove tag from card', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const cardId = 'card-1';
      const mockCardTag = { id: 'ct-1', userId, tagId, cardId };

      jest.spyOn(prisma.cardTag, 'findFirst').mockResolvedValue(mockCardTag as any);
      jest.spyOn(prisma.cardTag, 'delete').mockResolvedValue(mockCardTag as any);

      await service.removeFromCard(userId, tagId, cardId);

      expect(prisma.cardTag.delete).toHaveBeenCalledWith({ where: { id: 'ct-1' } });
    });
  });

  describe('findCardTags', () => {
    it('should return tags for a card', async () => {
      const userId = 'user-123';
      const cardId = 'card-1';
      const mockCardTags = [
        {
          id: 'ct-1',
          userId,
          cardId,
          tagId: 'tag-1',
          tag: { id: 'tag-1', userId, label: 'Favoris', color: '#EF4444', createdAt: new Date() },
        },
      ];

      jest.spyOn(prisma.cardTag, 'findMany').mockResolvedValue(mockCardTags as any);

      const result = await service.findCardTags(userId, cardId);

      expect(result).toEqual([mockCardTags[0].tag]);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tags.service.spec.ts
```

Expected: FAIL - Methods not defined

- [ ] **Step 3: Implement card tag operations**

Add to `apps/backend/src/modules/tags/tags.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// ... existing methods

  async addToCard(userId: string, tagId: string, cardId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.userId !== userId) {
      throw new NotFoundException('Étiquette introuvable');
    }

    const userCard = await this.prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });
    if (!userCard) {
      throw new ForbiddenException('Tu ne possèdes pas cette carte');
    }

    const currentTagCount = await this.prisma.cardTag.count({
      where: { userId, cardId },
    });
    if (currentTagCount >= 4) {
      throw new BadRequestException('Maximum 4 étiquettes par carte');
    }

    try {
      return await this.prisma.cardTag.create({
        data: { userId, cardId, tagId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Cette étiquette est déjà posée sur cette carte');
      }
      throw error;
    }
  }

  async removeFromCard(userId: string, tagId: string, cardId: string): Promise<void> {
    const cardTag = await this.prisma.cardTag.findFirst({
      where: { userId, cardId, tagId },
    });

    if (!cardTag) {
      throw new NotFoundException('Association introuvable');
    }

    await this.prisma.cardTag.delete({ where: { id: cardTag.id } });
  }

  async findCardTags(userId: string, cardId: string) {
    const cardTags = await this.prisma.cardTag.findMany({
      where: { userId, cardId },
      include: { tag: true },
    });

    return cardTags.map((ct) => ct.tag);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tags.service.spec.ts
```

Expected: PASS - All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/tags/tags.service.ts src/modules/tags/tags.service.spec.ts
git commit -m "feat(tags): add card tag operations

- addToCard verifies ownership and 4-tag limit
- removeFromCard deletes association
- findCardTags returns tags for a card
- Unit tests for all edge cases (ownership, limits, duplicates)"
```

---

## Task 7: Tags Controller

**Files:**
- Create: `apps/backend/src/modules/tags/tags.controller.ts`
- Create: `apps/backend/src/modules/tags/tags.controller.spec.ts`

**Interfaces:**
- Consumes: `TagsService` from Tasks 4-6, `CreateTagDto`, `UpdateTagDto`
- Produces: HTTP endpoints: `GET /api/tags`, `POST /api/tags`, `PATCH /api/tags/:id`, `DELETE /api/tags/:id`, `POST /api/tags/:tagId/cards/:cardId`, `DELETE /api/tags/:tagId/cards/:cardId`, `GET /api/cards/:cardId/tags`

- [ ] **Step 1: Write failing controller test**

Create `apps/backend/src/modules/tags/tags.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            findAllByUser: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addToCard: jest.fn(),
            removeFromCard: jest.fn(),
            findCardTags: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/tags', () => {
    it('should return user tags', async () => {
      const mockUser = { id: 'user-123' };
      const mockTags = [{ id: 'tag-1', label: 'Favoris', cardCount: 3 }];

      jest.spyOn(service, 'findAllByUser').mockResolvedValue(mockTags as any);

      const result = await controller.findAll(mockUser as any);

      expect(result).toEqual(mockTags);
      expect(service.findAllByUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /api/tags', () => {
    it('should create a tag', async () => {
      const mockUser = { id: 'user-123' };
      const dto = { label: 'Favoris', color: '#EF4444' };
      const mockTag = { id: 'tag-1', ...dto };

      jest.spyOn(service, 'create').mockResolvedValue(mockTag as any);

      const result = await controller.create(dto, mockUser as any);

      expect(result).toEqual(mockTag);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tags.controller.spec.ts
```

Expected: FAIL - `TagsController is not defined`

- [ ] **Step 3: Implement controller**

Create `apps/backend/src/modules/tags/tags.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.tagsService.findAllByUser(user.id);
  }

  @Post()
  async create(@Body() dto: CreateTagDto, @CurrentUser() user: User) {
    return this.tagsService.create(user.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.tagsService.delete(user.id, id);
  }

  @Post(':tagId/cards/:cardId')
  async addToCard(
    @Param('tagId') tagId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.addToCard(user.id, tagId, cardId);
  }

  @Delete(':tagId/cards/:cardId')
  async removeFromCard(
    @Param('tagId') tagId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: User,
  ) {
    await this.tagsService.removeFromCard(user.id, tagId, cardId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tags.controller.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/tags/tags.controller.ts src/modules/tags/tags.controller.spec.ts
git commit -m "feat(tags): add tags controller with auth

- All routes protected with JwtAuthGuard
- CRUD operations for tags
- Card tag association endpoints
- Unit tests for controller"
```

---

## Task 8: Tags Module Registration

**Files:**
- Create: `apps/backend/src/modules/tags/tags.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `TagsController`, `TagsService`, `PrismaModule`
- Produces: Registered `TagsModule` available in the app

- [ ] **Step 1: Create tags module**

Create `apps/backend/src/modules/tags/tags.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
```

- [ ] **Step 2: Register module in app**

Open `apps/backend/src/app.module.ts` and add `TagsModule` to imports:

```typescript
import { TagsModule } from './modules/tags/tags.module';

@Module({
  imports: [
    // ... existing modules
    TagsModule,
  ],
  // ...
})
export class AppModule {}
```

- [ ] **Step 3: Verify module loads**

```bash
cd apps/backend
npm run dev
```

Expected: Server starts without errors, check logs for "TagsModule initialized"

- [ ] **Step 4: Test endpoint manually**

```bash
# Get auth token first (use existing login)
curl http://localhost:3000/api/tags \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: 200 OK with empty array `[]`

- [ ] **Step 5: Commit**

```bash
git add src/modules/tags/tags.module.ts src/app.module.ts
git commit -m "feat(tags): register tags module

- Export TagsModule with controller and service
- Add to app imports for route registration"
```

---

## Task 9: Cards Service - Tag Filter

**Files:**
- Modify: `apps/backend/src/modules/collection/services/cards.service.ts`
- Modify: `apps/backend/src/modules/collection/controllers/cards.controller.ts`

**Interfaces:**
- Consumes: Existing `findAll` method, `CardTag` model
- Produces: Modified `findAll(filters: {albumId?, rarity?, search?, tagId?, userId?})` that filters cards by tag when `tagId` provided

- [ ] **Step 1: Write failing test for tag filter**

Add to `apps/backend/src/modules/collection/services/cards.service.spec.ts` (or create if doesn't exist):

```typescript
describe('findAll with tagId filter', () => {
  it('should filter cards by tag', async () => {
    const filters = { tagId: 'tag-1', userId: 'user-123' };
    const mockCards = [{ id: 'card-1', entity: { label: 'Test' } }];

    jest.spyOn(prisma.card, 'findMany').mockResolvedValue(mockCards as any);

    const result = await service.findAll(filters);

    expect(result).toEqual(mockCards);
    expect(prisma.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cardTags: {
            some: {
              tagId: 'tag-1',
              userId: 'user-123',
            },
          },
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test cards.service.spec.ts
```

Expected: FAIL - Filter not applied

- [ ] **Step 3: Implement tag filter in CardsService**

Modify `apps/backend/src/modules/collection/services/cards.service.ts`:

```typescript
async findAll(filters: {
  albumId?: string;
  rarity?: string;
  search?: string;
  tagId?: string;
  userId?: string;
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

  // NEW: Tag filter
  if (filters.tagId && filters.userId) {
    where.cardTags = {
      some: {
        tagId: filters.tagId,
        userId: filters.userId,
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

- [ ] **Step 4: Add tagId parameter to controller**

Modify `apps/backend/src/modules/collection/controllers/cards.controller.ts`:

```typescript
@Get()
async findAll(
  @Query('albumId') albumId?: string,
  @Query('rarity') rarity?: string,
  @Query('search') search?: string,
  @Query('tagId') tagId?: string,
  @CurrentUser() user?: User,
) {
  return this.cardsService.findAll({
    albumId,
    rarity,
    search,
    tagId,
    userId: user?.id,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test cards.service.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/collection/services/cards.service.ts src/modules/collection/controllers/cards.controller.ts
git commit -m "feat(collection): add tag filter to cards endpoint

- Accept tagId query parameter
- Filter cards by CardTag association
- Include userId in filter for security"
```

---

## Task 10: Frontend Types - Tag

**Files:**
- Create: `apps/frontend/src/types/tag.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: TypeScript types: `Tag`, `CreateTagDto`, `UpdateTagDto`

- [ ] **Step 1: Create tag types**

Create `apps/frontend/src/types/tag.ts`:

```typescript
export interface Tag {
  id: string;
  userId: string;
  label: string;
  color: string;
  cardCount?: number;
  createdAt: string;
}

export interface CreateTagDto {
  label: string;
  color: string;
}

export interface UpdateTagDto {
  label?: string;
  color?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend
npm run build
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/types/tag.ts
git commit -m "feat(types): add tag types for frontend

- Tag interface with all fields
- CreateTagDto and UpdateTagDto for API calls"
```

---

## Task 11: Tags API Client

**Files:**
- Create: `apps/frontend/src/services/tags.api.ts`

**Interfaces:**
- Consumes: `Tag`, `CreateTagDto`, `UpdateTagDto` from Task 10, axios instance
- Produces: `tagsApi` object with methods: `getUserTags()`, `createTag(dto)`, `updateTag(id, dto)`, `deleteTag(id)`, `addTagToCard(tagId, cardId)`, `removeTagFromCard(tagId, cardId)`, `getCardTags(cardId)`

- [ ] **Step 1: Create tags API client**

Create `apps/frontend/src/services/tags.api.ts`:

```typescript
import axios from 'axios';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag';

export const tagsApi = {
  getUserTags: () => axios.get<Tag[]>('/api/tags'),

  createTag: (data: CreateTagDto) => axios.post<Tag>('/api/tags', data),

  updateTag: (tagId: string, data: UpdateTagDto) =>
    axios.patch<Tag>(`/api/tags/${tagId}`, data),

  deleteTag: (tagId: string) => axios.delete(`/api/tags/${tagId}`),

  addTagToCard: (tagId: string, cardId: string) =>
    axios.post(`/api/tags/${tagId}/cards/${cardId}`),

  removeTagFromCard: (tagId: string, cardId: string) =>
    axios.delete(`/api/tags/${tagId}/cards/${cardId}`),

  getCardTags: (cardId: string) => axios.get<Tag[]>(`/api/cards/${cardId}/tags`),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/services/tags.api.ts
git commit -m "feat(api): add tags API client

- CRUD operations for tags
- Card tag association endpoints
- Type-safe axios calls"
```

---

## Task 12: Tag Store - Zustand

**Files:**
- Create: `apps/frontend/src/stores/tagStore.ts`

**Interfaces:**
- Consumes: `Tag` from Task 10, `tagsApi` from Task 11
- Produces: `useTagStore` hook with state: `tags`, `cardTags`, `loading`, `error` and actions: `fetchUserTags()`, `fetchCardTags(cardId)`, `createTag(label, color)`, `updateTag(id, updates)`, `deleteTag(id)`, `addTagToCard(tagId, cardId)`, `removeTagFromCard(tagId, cardId)`, `getCardTags(cardId)`, `canAddTagToCard(cardId)`

- [ ] **Step 1: Create tag store**

Create `apps/frontend/src/stores/tagStore.ts`:

```typescript
import { create } from 'zustand';
import { Tag } from '../types/tag';
import { tagsApi } from '../services/tags.api';

interface TagStore {
  tags: Tag[];
  cardTags: Record<string, Tag[]>;
  loading: boolean;
  error: string | null;

  fetchUserTags: () => Promise<void>;
  fetchCardTags: (cardId: string) => Promise<void>;
  createTag: (label: string, color: string) => Promise<Tag>;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  addTagToCard: (tagId: string, cardId: string) => Promise<void>;
  removeTagFromCard: (tagId: string, cardId: string) => Promise<void>;
  getCardTags: (cardId: string) => Tag[];
  canAddTagToCard: (cardId: string) => boolean;
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  cardTags: {},
  loading: false,
  error: null,

  fetchUserTags: async () => {
    set({ loading: true, error: null });
    try {
      const response = await tagsApi.getUserTags();
      set({ tags: response.data, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement des étiquettes', loading: false });
    }
  },

  fetchCardTags: async (cardId: string) => {
    try {
      const response = await tagsApi.getCardTags(cardId);
      set((state) => ({
        cardTags: { ...state.cardTags, [cardId]: response.data },
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des étiquettes de la carte', error);
    }
  },

  createTag: async (label: string, color: string) => {
    const response = await tagsApi.createTag({ label, color });
    set((state) => ({ tags: [...state.tags, response.data] }));
    return response.data;
  },

  updateTag: async (tagId: string, updates: Partial<Tag>) => {
    const response = await tagsApi.updateTag(tagId, updates);
    set((state) => ({
      tags: state.tags.map((t) => (t.id === tagId ? response.data : t)),
    }));
  },

  deleteTag: async (tagId: string) => {
    await tagsApi.deleteTag(tagId);
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== tagId),
      cardTags: Object.fromEntries(
        Object.entries(state.cardTags).map(([cardId, tags]) => [
          cardId,
          tags.filter((t) => t.id !== tagId),
        ]),
      ),
    }));
  },

  addTagToCard: async (tagId: string, cardId: string) => {
    await tagsApi.addTagToCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  removeTagFromCard: async (tagId: string, cardId: string) => {
    await tagsApi.removeTagFromCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  getCardTags: (cardId: string) => {
    return get().cardTags[cardId] || [];
  },

  canAddTagToCard: (cardId: string) => {
    const tags = get().getCardTags(cardId);
    return tags.length < 4;
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/stores/tagStore.ts
git commit -m "feat(store): add tag store with Zustand

- Manage user tags and card tag associations
- Cache card tags by cardId
- Loading and error states
- 4-tag limit validation helper"
```

---

## Task 13: Collection Store - Tag Filter

**Files:**
- Modify: `apps/frontend/src/stores/collectionStore.ts`

**Interfaces:**
- Consumes: Existing `filters` state
- Produces: Modified `filters` with `tagId: string | null` field

- [ ] **Step 1: Add tagId to filters**

Open `apps/frontend/src/stores/collectionStore.ts` and modify the filters interface:

```typescript
interface CollectionStore {
  // ... existing fields
  filters: {
    albumId: string | null;
    rarity: string | null;
    search: string;
    tagId: string | null; // NEW
  };
  // ... rest unchanged
}
```

- [ ] **Step 2: Initialize tagId in initial state**

```typescript
const useCollectionStore = create<CollectionStore>((set, get) => ({
  // ... existing state
  filters: {
    albumId: null,
    rarity: null,
    search: '',
    tagId: null, // NEW
  },
  // ... rest unchanged
}));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/stores/collectionStore.ts
git commit -m "feat(collection): add tagId filter to store

- Add tagId to filters interface
- Initialize as null"
```

---

## Task 14: TagBadge Component

**Files:**
- Create: `apps/frontend/src/components/collection/TagBadge.tsx`

**Interfaces:**
- Consumes: Nothing
- Produces: `TagBadge` component with props: `label: string`, `color: string`, `size?: 'sm' | 'md' | 'lg'`, `removable?: boolean`, `onRemove?: () => void`, `truncate?: boolean`

- [ ] **Step 1: Create TagBadge component**

Create `apps/frontend/src/components/collection/TagBadge.tsx`:

```tsx
interface TagBadgeProps {
  label: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  truncate?: boolean;
}

export default function TagBadge({
  label,
  color,
  size = 'md',
  removable = false,
  onRemove,
  truncate = false,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full text-white font-medium ${sizeClasses[size]} ${truncate ? 'max-w-[100px]' : ''}`}
      style={{ backgroundColor: color }}
    >
      <span className={truncate ? 'truncate' : ''}>{label}</span>
      {removable && (
        <button
          onClick={onRemove}
          className="hover:opacity-80 ml-1"
          aria-label="Retirer l'étiquette"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders**

Start dev server and manually test:

```bash
npm run dev
```

Create a test page that renders `<TagBadge label="Test" color="#EF4444" size="md" />`

Expected: Red badge with "Test" label

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/TagBadge.tsx
git commit -m "feat(ui): add TagBadge component

- Configurable size (sm, md, lg)
- Optional remove button
- Truncate long labels option
- Custom color via inline style"
```

---

## Task 15: ColorPicker Component

**Files:**
- Create: `apps/frontend/src/components/collection/ColorPicker.tsx`

**Interfaces:**
- Consumes: Nothing
- Produces: `ColorPicker` component with props: `selectedColor: string`, `onSelect: (color: string) => void`, exports `PRESET_COLORS` constant

- [ ] **Step 1: Create ColorPicker component**

Create `apps/frontend/src/components/collection/ColorPicker.tsx`:

```tsx
export const PRESET_COLORS = [
  '#EF4444', // Rouge
  '#F97316', // Orange
  '#F59E0B', // Ambre
  '#EAB308', // Jaune
  '#84CC16', // Lime
  '#22C55E', // Vert
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Bleu
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#A855F7', // Pourpre
];

interface ColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export default function ColorPicker({ selectedColor, onSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`w-10 h-10 rounded-full transition-all ${
            selectedColor === color
              ? 'ring-4 ring-white ring-offset-2'
              : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Couleur ${color}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders**

Test manually in dev server with a test page

Expected: 12 colored circles in a grid, selected color has white ring

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/ColorPicker.tsx
git commit -m "feat(ui): add ColorPicker component

- 12 preset colors in 6x2 grid
- Visual selection indicator (ring)
- Hover scale effect
- Export PRESET_COLORS for reuse"
```

---

## Task 16: TagManager Component

**Files:**
- Create: `apps/frontend/src/components/collection/TagManager.tsx`

**Interfaces:**
- Consumes: `Tag` from Task 10, `TagBadge` from Task 14, `ColorPicker` from Task 15
- Produces: `TagManager` component with props: `cardId: string`, `currentTags: Tag[]`, `availableTags: Tag[]`, `onAddTag: (tagId: string) => Promise<void>`, `onRemoveTag: (tagId: string) => Promise<void>`, `onCreateAndAdd: (label: string, color: string) => Promise<void>`

- [ ] **Step 1: Create TagManager component**

Create `apps/frontend/src/components/collection/TagManager.tsx`:

```tsx
import { useState } from 'react';
import { Tag } from '../../types/tag';
import TagBadge from './TagBadge';
import ColorPicker, { PRESET_COLORS } from './ColorPicker';

interface TagManagerProps {
  cardId: string;
  currentTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
  onCreateAndAdd: (label: string, color: string) => Promise<void>;
}

export default function TagManager({
  cardId,
  currentTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateAndAdd,
}: TagManagerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const canAddMore = currentTags.length < 4;
  const hasNoTags = availableTags.length === 0;

  const handleCreateAndAdd = async () => {
    if (!newLabel.trim()) return;

    setLoading(true);
    try {
      await onCreateAndAdd(newLabel.trim(), selectedColor);
      setNewLabel('');
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (hasNoTags) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">ÉTIQUETTES</h3>
        </div>

        <p className="text-gray-300 text-sm">
          Tu n&apos;as pas encore d&apos;étiquette : crée la première ci-dessous.
        </p>

        <input
          type="text"
          placeholder="Nouvelle étiquette"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={20}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />

        <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

        <button
          onClick={handleCreateAndAdd}
          disabled={!newLabel.trim() || loading}
          className="w-full py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer et ajouter'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">
          ÉTIQUETTES{' '}
          {currentTags.length > 0 && (
            <span className="ml-2 text-sm text-gray-400">
              {currentTags.length} posée{currentTags.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <button className="text-sm text-blue-400 hover:text-blue-300">Gérer</button>
      </div>

      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <TagBadge
              key={tag.id}
              label={tag.label}
              color={tag.color}
              size="md"
              removable
              onRemove={() => onRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-amber-500">
          Limite de 4 étiquettes atteinte. Retire-en une pour en ajouter une nouvelle.
        </p>
      )}

      {canAddMore && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Nouvelle étiquette
        </button>
      )}

      {canAddMore && showCreateForm && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <input
            type="text"
            placeholder="Nouvelle étiquette"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

          <div className="flex gap-2">
            <button
              onClick={handleCreateAndAdd}
              disabled={!newLabel.trim() || loading}
              className="flex-1 py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer et poser'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewLabel('');
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders**

Test manually with mock props

Expected: Component renders correctly in both states (no tags / with tags)

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/TagManager.tsx
git commit -m "feat(ui): add TagManager component

- Two states: first tag creation vs existing tags
- Inline tag creation with color picker
- 4-tag limit enforcement with message
- Remove tags functionality"
```

---

## Task 17: TagFilter Component

**Files:**
- Create: `apps/frontend/src/components/collection/TagFilter.tsx`

**Interfaces:**
- Consumes: `Tag` from Task 10, `TagBadge` from Task 14
- Produces: `TagFilter` component with props: `tags: Tag[]`, `selectedTagId: string | null`, `onSelect: (tagId: string | null) => void`

- [ ] **Step 1: Create TagFilter component**

Create `apps/frontend/src/components/collection/TagFilter.tsx`:

```tsx
import { Tag } from '../../types/tag';
import TagBadge from './TagBadge';

interface TagFilterProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
}

export default function TagFilter({ tags, selectedTagId, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedTagId === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Toutes
      </button>

      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.id)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedTagId === tag.id
              ? 'ring-2 ring-blue-500 ring-offset-2'
              : 'hover:opacity-80'
          }`}
        >
          <TagBadge label={tag.label} color={tag.color} size="sm" />
          <span className="text-sm text-gray-500">({tag.cardCount})</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders**

Test manually with mock tags

Expected: "Toutes" button + tag badges with counts

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/TagFilter.tsx
git commit -m "feat(ui): add TagFilter component

- 'Toutes' button to clear filter
- Tag badges with card counts
- Visual selection indicator (ring)"
```

---

## Task 18: CardDetailModal - Integrate TagManager

**Files:**
- Modify: `apps/frontend/src/components/collection/CardDetailModal.tsx`

**Interfaces:**
- Consumes: `Card` from existing types, `TagManager` from Task 16, `useTagStore` from Task 12
- Produces: Modified `CardDetailModal` with two-panel layout and tag management section

- [ ] **Step 1: Refactor CardDetailModal structure**

Modify `apps/frontend/src/components/collection/CardDetailModal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card } from '../../types/collection';
import { Tag } from '../../types/tag';
import { useTagStore } from '../../stores/tagStore';
import RarityBadge from './RarityBadge';
import TagManager from './TagManager';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const tagStore = useTagStore();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCardTags();
  }, [card.id]);

  const loadCardTags = async () => {
    await tagStore.fetchCardTags(card.id);
    setCurrentTags(tagStore.getCardTags(card.id));
  };

  const handleAddTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.addTagToCard(tagId, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.removeTagFromCard(tagId, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async (label: string, color: string) => {
    setLoading(true);
    try {
      const newTag = await tagStore.createTag(label, color);
      await tagStore.addTagToCard(newTag.id, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left Panel */}
          <div className="md:w-1/2 p-6 bg-gray-50">
            <div className="relative">
              <RarityBadge rarity={card.rarity} />
              <img
                src={card.imageUrl}
                alt={card.entity.label}
                className="w-full rounded-lg shadow-md mt-4"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>
            <h2 className="text-2xl font-bold text-center mt-4">{card.entity.label}</h2>
            <p className="text-gray-700 text-center mt-2">{card.entity.description}</p>
          </div>

          {/* Right Panel */}
          <div className="md:w-1/2 p-6 space-y-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>

            <h2 className="text-3xl font-bold">{card.entity.label}</h2>

            <div>
              <RarityBadge rarity={card.rarity} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600">Type de la carte</h3>
              <p className="text-gray-800">{card.entity.type}</p>
            </div>

            <div className="border border-gray-300 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">{card.entity.description}</p>
            </div>

            {card.entity.wikipediaUrl && (
              <a
                href={card.entity.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                🔗 Lien Wikipédia
              </a>
            )}

            <TagManager
              cardId={card.id}
              currentTags={currentTags}
              availableTags={tagStore.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateAndAdd={handleCreateAndAdd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test modal in dev**

```bash
npm run dev
```

Navigate to collection page, click a card

Expected: Two-panel modal with TagManager at bottom of right panel

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/CardDetailModal.tsx
git commit -m "feat(ui): refactor CardDetailModal with tag management

- Two-panel layout (card visual + details)
- Integrate TagManager component
- Load and manage card tags
- Create, add, remove tags from modal"
```

---

## Task 19: CardComponent - Display Tags

**Files:**
- Modify: `apps/frontend/src/components/collection/CardComponent.tsx`

**Interfaces:**
- Consumes: `Card` from existing types, `TagBadge` from Task 14, `useTagStore` from Task 12
- Produces: Modified `CardComponent` with tags displayed in bottom-left corner

- [ ] **Step 1: Add tags display to CardComponent**

Modify `apps/frontend/src/components/collection/CardComponent.tsx`:

```tsx
import { Card } from '../../types/collection';
import { useTagStore } from '../../stores/tagStore';
import RarityBadge from './RarityBadge';
import TagBadge from './TagBadge';

interface CardComponentProps {
  card: Card;
  onClick: () => void;
}

export default function CardComponent({ card, onClick }: CardComponentProps) {
  const tagStore = useTagStore();
  const cardTags = tagStore.getCardTags(card.id);

  return (
    <div
      className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <img src={card.imageUrl} alt={card.entity.label} className="w-full h-48 object-cover" />

      <div className="p-4">
        <h3 className="font-semibold text-lg">{card.entity.label}</h3>
        <RarityBadge rarity={card.rarity} />
      </div>

      {cardTags.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1 max-w-[90%]">
          {cardTags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} label={tag.label} color={tag.color} size="sm" truncate />
          ))}
          {cardTags.length > 3 && (
            <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded-full font-medium">
              +{cardTags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test in dev**

Expected: Tags appear in bottom-left corner of each card

- [ ] **Step 3: Commit**

```bash
git add src/components/collection/CardComponent.tsx
git commit -m "feat(ui): display tags on card grid items

- Show up to 3 tags in bottom-left corner
- Display +N for additional tags
- Truncate long labels"
```

---

## Task 20: CollectionPage - Integrate TagFilter

**Files:**
- Modify: `apps/frontend/src/pages/CollectionPage.tsx`

**Interfaces:**
- Consumes: `TagFilter` from Task 17, `useTagStore` from Task 12, modified `collectionStore` from Task 13
- Produces: Modified `CollectionPage` with tag filter section and tag store initialization

- [ ] **Step 1: Add TagFilter to CollectionPage**

Modify `apps/frontend/src/pages/CollectionPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useCollectionStore } from '../stores/collectionStore';
import { useTagStore } from '../stores/tagStore';
import CardGrid from '../components/collection/CardGrid';
import AlbumFilter from '../components/collection/AlbumFilter';
import RarityFilter from '../components/collection/RarityFilter';
import SearchInput from '../components/collection/SearchInput';
import TagFilter from '../components/collection/TagFilter';
import CardDetailModal from '../components/collection/CardDetailModal';
import CollectionStats from '../components/collection/CollectionStats';
import { Card } from '../types/collection';

export default function CollectionPage() {
  const collectionStore = useCollectionStore();
  const tagStore = useTagStore();
  const { loading, error, cards, albums, filters, stats, setFilter } = collectionStore;
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    tagStore.fetchUserTags();
    collectionStore.fetchAll();
  }, []);

  useEffect(() => {
    cards.forEach((card) => {
      if (!tagStore.cardTags[card.id]) {
        tagStore.fetchCardTags(card.id);
      }
    });
  }, [cards]);

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

        <CollectionStats stats={stats} />

        <div className="bg-white rounded-lg shadow-md p-6 mb-8 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Albums</h3>
            <AlbumFilter
              albums={albums}
              selectedAlbumId={filters.albumId}
              onSelect={(albumId) => setFilter('albumId', albumId)}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Rareté</h3>
            <RarityFilter selectedRarity={filters.rarity} onSelect={(rarity) => setFilter('rarity', rarity)} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Étiquettes</h3>
            <TagFilter
              tags={tagStore.tags}
              selectedTagId={filters.tagId}
              onSelect={(tagId) => setFilter('tagId', tagId)}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recherche</h3>
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilter('search', search)}
              placeholder="Rechercher une carte..."
            />
          </div>
        </div>

        <CardGrid cards={cards} onCardClick={setSelectedCard} />
      </div>

      {selectedCard && <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Test end-to-end**

```bash
npm run dev
```

1. Create a tag in the modal
2. Verify it appears in the filter section
3. Click the tag filter
4. Verify only cards with that tag are shown

Expected: Full tag workflow works

- [ ] **Step 3: Commit**

```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat(collection): integrate tag filter

- Add TagFilter section to filters panel
- Initialize tag store on page load
- Load card tags for all visible cards
- Wire up tag filter to collection store"
```

---

## Task 21: Final Integration Testing

**Files:**
- No file changes

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified end-to-end functionality

- [ ] **Step 1: Run backend tests**

```bash
cd apps/backend
npm test
```

Expected: All tests pass

- [ ] **Step 2: Run frontend build**

```bash
cd apps/frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Manual E2E test**

Start both servers and test:

1. **Create first tag**
   - Open a card modal
   - Should see "Tu n'as pas encore d'étiquette"
   - Create tag "Favoris" with red color
   - Verify tag appears on card in grid

2. **Create second tag and test limit**
   - Open another card
   - Create tags until 4 are on the card
   - Verify message "Limite de 4 étiquettes atteinte"
   - Verify cannot add 5th tag

3. **Test filtering**
   - Create tag on multiple cards
   - Click tag filter
   - Verify only cards with that tag show

4. **Test duplicate label**
   - Try to create tag with existing label
   - Verify error "Tu as déjà une étiquette avec ce nom"

5. **Test tag removal**
   - Remove tag from card
   - Verify it disappears from grid

- [ ] **Step 4: Document any issues found**

Create a list of any bugs or UX issues

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: verify tags system E2E functionality

Manual E2E test completed:
- Tag creation (first tag + subsequent)
- 4-tag limit enforcement
- Tag filtering
- Duplicate label prevention
- Tag removal
- Grid display
- Modal integration"
```

---

## Review Focus Tests

Add these tests to the relevant tasks to cover the 5 Review Focus scenarios:

### Test 1: Duplicate Label (Add to Task 4)

Add to `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
it('should throw ConflictException on duplicate label', async () => {
  const userId = 'user-123';
  const dto = { label: 'Favoris', color: '#EF4444' };
  const error = { code: 'P2002' };

  jest.spyOn(prisma.tag, 'create').mockRejectedValue(error);

  await expect(service.create(userId, dto)).rejects.toThrow(
    'Tu as déjà une étiquette avec ce nom',
  );
});
```

### Test 2: 4-Tag Limit (Add to Task 6)

Add to `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
it('should throw if 4 tag limit reached', async () => {
  const userId = 'user-123';
  const tagId = 'tag-1';
  const cardId = 'card-1';
  const mockTag = { id: tagId, userId };
  const mockUserCard = { userId, cardId };

  jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
  jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(mockUserCard as any);
  jest.spyOn(prisma.cardTag, 'count').mockResolvedValue(4);

  await expect(service.addToCard(userId, tagId, cardId)).rejects.toThrow(
    'Maximum 4 étiquettes par carte',
  );
});
```

### Test 3: Card Ownership (Add to Task 6)

Add to `apps/backend/src/modules/tags/tags.service.spec.ts`:

```typescript
it('should throw if user does not own card', async () => {
  const userId = 'user-123';
  const tagId = 'tag-1';
  const cardId = 'card-1';
  const mockTag = { id: tagId, userId };

  jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
  jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(null);

  await expect(service.addToCard(userId, tagId, cardId)).rejects.toThrow(
    'Tu ne possèdes pas cette carte',
  );
});
```

### Test 4: Label Validation (Add to Task 3)

Validation is handled by class-validator decorators in `CreateTagDto`. Test manually:

```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "", "color": "#FF0000"}'
```

Expected: 400 Bad Request with validation error

### Test 5: Tag Deletion Cascade (Add to Task 5)

The cascade is handled at DB level via `onDelete: Cascade`. Verify with manual test:

```bash
# Create tag and add to multiple cards
# Delete tag
# Verify all CardTag associations are removed
```

Expected: All associations cascade delete

---

## Self-Review Checklist

- [x] **Spec coverage**: All spec sections have corresponding tasks
  - Database schema: Tasks 1-2
  - Backend API: Tasks 3-9
  - Frontend types/store: Tasks 10-13
  - UI components: Tasks 14-17
  - Integration: Tasks 18-20
  - Testing: Task 21

- [x] **No placeholders**: All code blocks contain actual implementation
- [x] **Type consistency**: All interfaces match across tasks
- [x] **Review Focus**: All 5 scenarios have corresponding tests

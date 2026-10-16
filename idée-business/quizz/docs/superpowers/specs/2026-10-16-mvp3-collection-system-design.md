# MVP3 - Collection System (Phase 1) - Design Specification

**Date:** 2026-10-16  
**Status:** Draft  
**Phase:** MVP3 Phase 1 - Catalogue Foundation  

---

## 1. Executive Summary

### Goal
Build the foundational collection system that allows users to browse a catalog of 50 educational cards organized by thematic albums with rarity tiers. This phase focuses on content creation and display infrastructure, without user ownership or economy systems.

### Success Criteria
- ✅ 50 cards generated from Wikidata with validated images and educational descriptions
- ✅ 5 meta-albums organizing cards by themes
- ✅ Rarity distribution matches pyramid target (40% Common → 2% Legendary)
- ✅ `/collec` page loads in <2s with functional filters (album, rarity, search)
- ✅ Card detail modal displays entity info, image, description, Wikipedia link
- ✅ Responsive layout works on mobile/tablet/desktop

### Out of Scope (Future Phases)
- ❌ User ownership (UserCard model, "my collection")
- ❌ Gold economy & pack opening system
- ❌ User stats (cards owned count will come in Phase 2)
- ❌ Achievements & profile customization
- ❌ Trading or marketplace

---

## 2. Architecture Overview

### Conceptual Model
```
Wikidata Entity → Entity (DB) → Card → Album (many-to-many)
                                  ↓
                              CardImage (metadata)
```

### Tech Stack
- **Backend:** NestJS module `collection` with Prisma ORM
- **Frontend:** React page `/collec` with Zustand state + Tailwind CSS
- **Pipeline:** Node.js scripts using Wikidata SPARQL, Wikipedia APIs, Wikimedia Commons
- **Storage:** Reuse MVP1 image pipeline (Sharp optimization → local storage → Vercel CDN)

### Design Principles
1. **Fact-first:** Cards derive from validated Wikidata entities (traceability)
2. **Educational focus:** Short descriptions extracted from Wikipedia FR (2-4 sentences)
3. **Read-only catalog:** No mutations in Phase 1, pure consultation
4. **Reuse existing patterns:** Follow MVP1 image pipeline, CLAUDE.md guidelines

---

## 3. Data Model

### 3.1 Prisma Schema

```prisma
// Wikidata entity (source of truth)
model Entity {
  id              String   @id @default(uuid())
  wikidataId      String   @unique  // Q42, Q5582...
  label           String   // "Napoléon Bonaparte"
  type            String   // "person", "film", "monument", "country"...
  
  // Rarity calculation metrics
  pageviewsMonth  Int      // Wikipedia FR pageviews (last month)
  wikiTextLength  Int      // Wikipedia FR article length (characters)
  rarityScore     Float    // 0.4 * pageviewsScore + 0.6 * wikiLengthScore
  
  description     String   @db.Text  // Educational short description
  wikidataUrl     String   // Link to Wikidata entity page
  wikipediaUrl    String?  // Link to Wikipedia FR article
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  card            Card?
  
  @@map("entities")
}

// Collectible card
model Card {
  id          String   @id @default(uuid())
  entityId    String   @unique
  
  rarity      String   // "common", "uncommon", "rare", "epic", "legendary"
  imageUrl    String   // CDN URL of main image
  imageWidth  Int      // Dimensions for responsive rendering
  imageHeight Int
  
  // Image metadata (reuse MVP1 pipeline)
  imageLicenseAuthor  String?
  imageLicenseType    String?
  imageLicenseUrl     String?
  imageSourceUrl      String?
  
  displayOrder Int?    // Optional ordering in gallery
  active       Boolean @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entity      Entity      @relation(fields: [entityId], references: [id])
  albums      CardAlbum[] // Many-to-many with Album
  
  @@map("cards")
}

// Meta-thematic albums
model Album {
  id          String   @id @default(uuid())
  slug        String   @unique  // "personnalites", "culture", "lieux", "symboles", "divers"
  name        String   // "Personnalités", "Culture"...
  description String?
  icon        String?  // Emoji or icon identifier
  displayOrder Int     // Display order in filters
  
  createdAt   DateTime @default(now())
  
  cards       CardAlbum[]
  
  @@map("albums")
}

// Many-to-many relation (a card can belong to multiple albums)
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

### 3.2 Meta-Albums Definition

**5 meta-albums organizing 50 cards:**

| Album Slug | Name | Description | Icon |
|------------|------|-------------|------|
| `personnalites` | Personnalités | Figures historiques, sportifs, artistes, écrivains | 👤 |
| `culture` | Culture | Films, livres, peintures, personnages fictifs | 🎨 |
| `lieux` | Lieux | Monuments, pays, capitales, paysages | 🏛️ |
| `symboles` | Symboles | Drapeaux, emblèmes nationaux | 🚩 |
| `divers` | Divers | Jeux vidéo, autres catégories | 🎮 |

---

## 4. Rarity System

### 4.1 Rarity Tiers

**5 tiers with visual identity:**

| Tier | Color (Tailwind) | Target % | Target Count (50 cards) |
|------|------------------|----------|-------------------------|
| Common | `bg-gray-400` (gris clair) | 40% | 20 cards |
| Uncommon | `bg-amber-600` (bronze) | 30% | 15 cards |
| Rare | `bg-blue-500` (bleu) | 20% | 10 cards |
| Epic | `bg-purple-600` (violet) | 8% | 4 cards |
| Legendary | `bg-yellow-500` (or) | 2% | 1 card |

### 4.2 Rarity Calculation Algorithm

**Formula:** `rarityScore = 0.4 * pageviewsScore + 0.6 * wikiLengthScore`

**Rationale:** 
- **Popularity (40%):** Wikipedia FR pageviews/month reflects public interest
- **Depth (60%):** Wiki article length indicates encyclopedic importance and available educational content

**Pageviews Thresholds (monthly):**

| Tier | Min Pageviews |
|------|---------------|
| Legendary | 1,000,000+ |
| Epic | 100,000 - 999,999 |
| Rare | 10,000 - 99,999 |
| Uncommon | 1,000 - 9,999 |
| Common | 0 - 999 |

**Wiki Length Thresholds (characters):**

| Tier | Min Characters |
|------|----------------|
| Legendary | 50,000+ |
| Epic | 20,000 - 49,999 |
| Rare | 5,000 - 19,999 |
| Uncommon | 1,000 - 4,999 |
| Common | 0 - 999 |

**Score Normalization:**
- Pageviews normalized to 0-100 scale (log scale for extreme values)
- Wiki length normalized to 0-100 scale (linear)
- Final rarityScore in range [0, 100]

**Score → Tier Mapping:**
- Legendary: 90-100
- Epic: 70-89
- Rare: 50-69
- Uncommon: 30-49
- Common: 0-29

**Manual Adjustment:** After algorithmic calculation, if distribution doesn't match target (20/15/10/4/1), adjust by:
1. Selecting different entities (prefer this method)
2. Fine-tuning algorithm thresholds (only if entity selection is constrained)
Goal: Reach target distribution without compromising entity quality/interest.

---

## 5. Backend API

### 5.1 Module Structure

```
apps/backend/src/modules/collection/
├── collection.module.ts
├── controllers/
│   ├── cards.controller.ts
│   ├── albums.controller.ts
│   └── entities.controller.ts
├── services/
│   ├── cards.service.ts
│   ├── albums.service.ts
│   └── rarity.service.ts
└── dto/
    ├── card.dto.ts
    └── album.dto.ts
```

### 5.2 API Endpoints

**Cards Endpoints:**

```typescript
GET /api/cards
// Query params: ?albumId=uuid, ?rarity=common|uncommon|rare|epic|legendary, ?search=napoleon
// Response: Card[] with entity populated
// Use case: Gallery with filters

GET /api/cards/:id
// Params: Card UUID
// Response: Card with entity + albums[]
// Use case: Card detail modal

GET /api/cards/stats
// Response: { total: number, byRarity: {...}, byAlbum: {...} }
// Use case: Collection stats display
```

**Albums Endpoints:**

```typescript
GET /api/albums
// Response: Album[] with card count
// Use case: Filter dropdown population

GET /api/albums/:slug
// Params: Album slug (personnalites, culture...)
// Response: Album with cards[]
// Use case: Album-specific view
```

### 5.3 Services

**RarityService** - Rarity calculation logic

```typescript
class RarityService {
  // Normalize pageviews to 0-100 scale (log scale)
  calculatePageviewsScore(pageviews: number): number;
  
  // Normalize wiki length to 0-100 scale (linear)
  calculateWikiLengthScore(length: number): number;
  
  // Composite formula: 0.4 * pageviews + 0.6 * wikiLength
  calculateRarityScore(pageviews: number, wikiLength: number): number;
  
  // Map score [0-100] to tier
  scoreToRarity(score: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}
```

**CardsService** - Card CRUD + filtering

```typescript
class CardsService {
  // Get all cards with optional filters
  findAll(filters: {
    albumId?: string;
    rarity?: string;
    search?: string;
  }): Promise<Card[]>;
  
  // Get single card with relations
  findOne(id: string): Promise<Card>;
  
  // Get collection statistics
  getStats(): Promise<{
    total: number;
    byRarity: Record<string, number>;
    byAlbum: Record<string, number>;
  }>;
}
```

**AlbumsService** - Album management

```typescript
class AlbumsService {
  // Get all albums with card counts
  findAll(): Promise<Album[]>;
  
  // Get album with all cards
  findBySlug(slug: string): Promise<Album>;
}
```

---

## 6. Frontend Interface

### 6.1 Component Structure

```
apps/frontend/src/
├── pages/
│   └── CollectionPage.tsx        # Main /collec page
├── components/
│   └── collection/
│       ├── CardGrid.tsx          # Responsive grid
│       ├── CardComponent.tsx     # Individual card
│       ├── AlbumFilter.tsx       # Album filter buttons
│       ├── RarityFilter.tsx      # Rarity filter buttons
│       ├── RarityBadge.tsx       # Colored rarity badge
│       ├── CardDetailModal.tsx   # Card detail modal
│       └── CollectionStats.tsx   # Stats header
├── services/
│   └── collection.api.ts         # API client functions
├── stores/
│   └── collectionStore.ts        # Zustand state management
└── types/
    └── collection.ts              # TypeScript types
```

### 6.2 Page Layout (`/collec`)

```
┌─────────────────────────────────────────┐
│  Header (existing navigation)            │
├─────────────────────────────────────────┤
│  Collection Stats                        │
│  📦 50 cartes • 🏆 5 albums              │
│  Common: 20 • Uncommon: 15 • Rare: 10... │
├─────────────────────────────────────────┤
│  Filters                                 │
│  [Tous] [Personnalités] [Culture]...    │
│  [Toutes] [Common] [Rare] [Legendary]   │
│  🔍 Rechercher...                        │
├─────────────────────────────────────────┤
│  Card Grid (responsive 2-4 columns)     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ IMG │ │ IMG │ │ IMG │ │ IMG │       │
│  │ Nom │ │ Nom │ │ Nom │ │ Nom │       │
│  │ 🟢  │ │ 🔵  │ │ 🟣  │ │ 🟡  │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ ... │ │ ... │ │ ... │ │ ... │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────┘
```

### 6.3 Card Component Design

**Card in Grid:**
```
┌────────────────┐
│                │  
│     IMAGE      │  ← Image (3:4 ratio, slightly undersized)
│                │
├────────────────┤
│ Napoléon       │  ← Entity label (centered)
│ Bonaparte      │
├────────────────┤
│ 🟡 Legendary   │  ← Rarity badge with color
└────────────────┘
     ↓ (click)
  Opens modal
```

**Card Detail Modal:**
```
┌──────────────────────────────────────┐
│  🟡 Legendary                         │  ← Rarity badge (top-left)
│                                       │
│        Napoléon Bonaparte             │  ← Entity name (centered, large)
│                                       │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │          IMAGE                 │  │  ← Image (~90% width)
│  │                                │  │
│  └────────────────────────────────┘  │
│                                       │
│  Empereur français (1769-1821),       │  ← Description (no label)
│  figure majeure de l'histoire         │     2-4 sentences
│  européenne. Il établit le Code       │
│  Napoléon et mena de nombreuses       │
│  campagnes militaires.                │
│                                       │
│  ┌────────────────────────────────┐  │
│  │ 🔗 Plus d'info sur Wikipédia   │  │  ← Wikipedia link button
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Modal close:** Click outside (backdrop), no close button needed

### 6.4 Filters

**Album Filter:**
- Horizontal buttons: `[Tous] [Personnalités] [Culture] [Lieux] [Symboles] [Divers]`
- Active state: background color + bold
- Single selection

**Rarity Filter:**
- Horizontal buttons with color indicators: `[Toutes] [🟢 Common] [🟠 Uncommon] [🔵 Rare] [🟣 Epic] [🟡 Legendary]`
- Active state: border + bold
- Single selection

**Search:**
- Text input with live filtering on `entity.label`
- Debounced (300ms)
- Clears on album/rarity filter change (optional behavior)

### 6.5 Responsive Breakpoints

| Screen | Columns | Card Width |
|--------|---------|------------|
| Mobile (<640px) | 2 | ~150px |
| Tablet (640-1024px) | 3 | ~200px |
| Desktop (>1024px) | 4 | ~250px |

### 6.6 State Management

**Zustand Store:**
```typescript
interface CollectionStore {
  // Data
  cards: Card[];
  albums: Album[];
  stats: CardStats | null;
  
  // Filters
  filters: {
    albumId: string | null;
    rarity: string | null;
    search: string;
  };
  
  // Actions
  setFilter: (key: keyof filters, value: any) => void;
  fetchCards: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchStats: () => Promise<void>;
}
```

---

## 7. Content Pipeline

### 7.1 Script Structure

```
apps/backend/scripts/collection/
├── 01-fetch-entities.ts          # Fetch Wikidata entities
├── 02-fetch-pageviews.ts         # Wikipedia pageviews API
├── 03-calculate-rarity.ts        # Calculate rarityScore + tier
├── 04-fetch-images.ts            # Download images (reuse MVP1 pipeline)
├── 05-generate-descriptions.ts   # Extract Wikipedia descriptions
├── 06-create-albums.ts           # Create 5 meta-albums
├── 07-seed-database.ts           # Insert entities, cards, card-album relations
└── utils/
    ├── wikidata.client.ts        # SPARQL query helpers
    ├── wikipedia.client.ts       # Wikipedia API client
    └── rarity.calculator.ts      # Rarity calculation logic
```

### 7.2 Pipeline Workflow

```
1. Manual entity selection (50 entities across 5 albums)
   ↓
2. Fetch Wikidata (wikidataId, label, type, wikiTextLength, URLs)
   ↓
3. Fetch Wikipedia pageviews (Wikimedia API, last 30 days)
   ↓
4. Calculate rarity (40% pageviews + 60% wikiLength → score → tier)
   ↓
5. Manual adjustment to reach target distribution (20/15/10/4/1)
   ↓
6. Fetch images from Wikimedia Commons (P18 property)
   ↓
7. Download + optimize images (Sharp, reuse MVP1 pipeline)
   ↓
8. Generate descriptions (extract 1st paragraph Wikipedia FR + clean)
   ↓
9. Assign albums (CardAlbum relations)
   ↓
10. Insert database (Entity → Card → CardAlbum)
```

### 7.3 Entity Selection (50 Cards)

**Album "Personnalités" (20 cards):**
- Historiques: Napoléon Bonaparte, Jeanne d'Arc, Louis XIV, Charles de Gaulle, Vercingétorix
- Sportifs: Zinédine Zidane, Kylian Mbappé, Michel Platini, Karim Benzema
- Acteurs: Alain Delon, Marion Cotillard, Gérard Depardieu
- Chanteurs: Édith Piaf, Johnny Hallyday, Daft Punk
- Peintres: Claude Monet, Pierre-Auguste Renoir, Paul Cézanne
- Écrivains: Molière, Victor Hugo

**Album "Culture" (12 cards):**
- Films: Intouchables, Le Fabuleux Destin d'Amélie Poulain, La Haine
- Livres: Les Misérables, Le Petit Prince, L'Étranger
- Peintures: La Joconde, Impression soleil levant, Le Déjeuner sur l'herbe
- Personnages: Astérix, Tintin, Lucky Luke

**Album "Lieux" (12 cards):**
- Monuments: Tour Eiffel, Arc de Triomphe, Notre-Dame de Paris, Mont-Saint-Michel
- Pays: France, Belgique, Suisse, Canada
- Capitales: Paris, Bruxelles, Berne, Ottawa
- Paysages: Mont Blanc, Gorges du Verdon

**Album "Symboles" (3 cards):**
- Drapeaux: France, Union Européenne, Québec

**Album "Divers" (3 cards):**
- Jeux vidéo: Rayman, Assassin's Creed
- Personnages fictifs: Cyrano de Bergerac

**Total: 50 cards**

### 7.4 APIs Used

**Wikidata SPARQL API:**
- Endpoint: `https://query.wikidata.org/sparql`
- Fetch: `wikidataId`, `label@fr`, `description@fr`, `P18` (image), `P31` (instance of), wiki text length
- Example query for Napoléon (Q517):
  ```sparql
  SELECT ?label ?description ?image ?wikipediaArticle WHERE {
    wd:Q517 rdfs:label ?label .
    wd:Q517 schema:description ?description .
    OPTIONAL { wd:Q517 wdt:P18 ?image . }
    OPTIONAL {
      ?wikipediaArticle schema:about wd:Q517 .
      ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
    }
    FILTER(LANG(?label) = "fr")
    FILTER(LANG(?description) = "fr")
  }
  ```

**Wikipedia Pageviews API:**
- Endpoint: `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/{article_title}/monthly/{start}/{end}`
- Fetch: Monthly pageviews for last 30 days
- Example: `GET /metrics/pageviews/per-article/fr.wikipedia/all-access/user/Napoléon_Ier/monthly/20260901/20261001`

**Wikimedia Commons API:**
- Reuse MVP1 image pipeline (documented in `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`)
- Fetch image metadata (license, author, dimensions)
- Download → Sharp optimization → Local storage (`public/images/collection/`)
- Target: ~80KB per image (resize max 800px width, compression)

**Wikipedia Text API:**
- Endpoint: `https://fr.wikipedia.org/api/rest_v1/page/summary/{title}`
- Fetch: First paragraph (`extract` field) for description
- Clean: Remove references, simplify to 2-4 sentences

### 7.5 Description Generation (Option A)

**Process:**
1. Fetch Wikipedia summary via REST API
2. Extract `extract` field (first paragraph)
3. Clean:
   - Remove `[citation needed]`, `[1]`, `[2]` references
   - Limit to first 2-4 sentences (max ~300 characters)
   - Ensure French natural language
4. Manual validation of all 50 descriptions

**Example:**
- **Raw extract:** "Napoléon Bonaparte, né le 15 août 1769 à Ajaccio et mort le 5 mai 1821 sur l'île Sainte-Hélène, est un militaire et homme d'État français, premier empereur des Français, du 18 mai 1804 au 6 avril 1814 et du 20 mars au 22 juin 1815[1]."
- **Cleaned:** "Empereur français (1769-1821), figure majeure de l'histoire européenne. Il établit le Code Napoléon et mena de nombreuses campagnes militaires qui transformèrent l'Europe."

---

## 8. Implementation Plan

### Phase 1: Backend Foundation (Day 1-2)
- Create Prisma migration for Entity, Card, Album, CardAlbum models
- Implement `collection` NestJS module (controllers + services)
- Implement RarityService with algorithm (40/60 formula)
- Create API endpoints (`GET /cards`, `GET /albums`, `GET /cards/:id`, `GET /cards/stats`)
- Write unit tests for RarityService

### Phase 2: Content Pipeline - Test Batch (Day 2-3)
- Implement Wikidata client (SPARQL queries)
- Implement Wikipedia client (pageviews + summary APIs)
- Create 10 test entities (2 per album)
- Run full pipeline on 10 cards
- Manual validation (images, descriptions, rarity)

### Phase 3: Frontend Foundation (Day 3-4)
- Create `/collec` page route
- Implement components (CardGrid, CardComponent, Filters, Modal)
- Implement Zustand store for state management
- Integrate API client (`collection.api.ts`)
- Test with 10 real cards from Phase 2

### Phase 4: Content Scale-Up (Day 4-5)
- Generate remaining 40 entities
- Run full pipeline on all 50 cards
- Manual adjustment for rarity distribution (target 20/15/10/4/1)
- Create CardAlbum relations for all 5 albums
- Validate all images load correctly
- Review all 50 descriptions for quality

### Phase 5: Polish & Testing (Day 5-6)
- UI/UX adjustments based on real data
- Test all filter combinations (album + rarity + search)
- Test modal interactions
- Responsive testing (mobile/tablet/desktop)
- Performance optimization (lazy loading if needed)
- Accessibility review (alt text, keyboard navigation)

### Phase 6: Documentation & Deployment (Day 6-7)
- Update `docs/ROADMAP.md` (MVP3 Phase 1 status)
- Document pipeline scripts usage
- Create migration guide for production database
- Final review of 50 cards (images + descriptions)
- Deploy to staging environment
- User acceptance testing

**Total Duration:** 5-7 days

---

## 9. Testing Strategy

### 9.1 Unit Tests

**RarityService:**
- Test pageviews score normalization (edge cases: 0, 100, 1M+)
- Test wiki length score normalization
- Test composite formula accuracy
- Test score → tier mapping boundaries

**CardsService:**
- Test filtering by album
- Test filtering by rarity
- Test search functionality (partial matches, case-insensitive)
- Test combined filters

### 9.2 Integration Tests

**API Endpoints:**
- `GET /cards` returns filtered results
- `GET /cards/:id` returns full card with entity + albums
- `GET /albums/:slug` returns album with cards
- `GET /cards/stats` returns accurate counts

**Pipeline Scripts:**
- Wikidata fetching handles missing data gracefully
- Wikipedia API handles rate limits
- Image download retries on failure (3 attempts max)
- Description cleaning removes all references correctly

### 9.3 End-to-End Tests

**User Flows:**
1. Navigate to `/collec` → See 50 cards in grid
2. Filter by "Personnalités" → See 20 cards
3. Filter by "Legendary" → See 1 card
4. Search "Napoléon" → See matching card
5. Click card → Modal opens with details
6. Click Wikipedia link → Opens new tab
7. Close modal → Returns to grid

### 9.4 Critical Validation Checks

**Rarity Distribution:**
- Verify final distribution matches target (20/15/10/4/1)
- No tier has 0 cards

**Images:**
- All 50 images load successfully
- Dimensions are appropriate (not oversized)
- Licenses are tracked in database

**Descriptions:**
- All 50 descriptions exist and are non-empty
- Length is appropriate (2-4 sentences, ~100-300 chars)
- French language, natural reading
- No Wikipedia references (`[1]`, `[citation needed]`)

**Performance:**
- `/collec` page loads in <2s
- Filtering is instant (<100ms)
- Modal opens without lag

**Responsive:**
- Grid layouts correctly on mobile (2 cols), tablet (3 cols), desktop (4 cols)
- Images scale appropriately
- Modal is readable on all screen sizes

---

## 10. Technical Constraints

### 10.1 Image Handling

**Reuse MVP1 Pipeline:**
- Follow existing `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`
- Images stored in `public/images/collection/`
- MD5 hash filenames for deduplication
- Sharp optimization (resize max 800px, compression ~80KB target)
- SVG untouched (vectorial), PNG/JPG compressed

**Dimensions:**
- **Card in grid:** 3:4 ratio (portrait), e.g., 240x320px
- **Modal:** Scale to fit (~90% modal width), maintain aspect ratio
- **Undersizing strategy:** Better to display smaller image than oversized (prevents blur/pixelation)

### 10.2 API Rate Limits

**Wikidata SPARQL:**
- No strict rate limit, but batch queries recommended
- Use `LIMIT 10` for testing, then scale to 50

**Wikipedia Pageviews API:**
- Rate limit: ~200 requests/second
- Batch requests with delays (500ms between requests)
- Retry logic for 429 errors (exponential backoff)

**Wikimedia Commons:**
- Rate limit: ~200 requests/second
- Download images sequentially with 500ms delay
- Retry up to 3 times on failure

### 10.3 Database

**Constraints:**
- `Entity.wikidataId` unique (prevent duplicate entities)
- `Card.entityId` unique (1-to-1 with Entity)
- `CardAlbum` unique on `[cardId, albumId]` (prevent duplicate relations)
- `Album.slug` unique (URL-safe identifiers)

**Indexes:**
- `Card.rarity` (for filtering)
- `Card.active` (for future soft-deletion)
- `CardAlbum.albumId` (for album queries)

### 10.4 CLAUDE.md Compliance

**Fact-First Principle:**
- All cards derive from validated Wikidata entities (traceability)
- Source URLs stored (`wikidataUrl`, `wikipediaUrl`)
- No content generated from LLM memory alone

**Quality Guidelines:**
- Descriptions are factual, objective, non-ambiguous
- Images have proper licenses tracked (author, type, URL)
- No subjective or promotional language

**Geographic Distribution:**
- Initial 50 cards focus on French-speaking world (France 35%, Europe 25%, North America 20%, Rest 20%)
- Future expansions will balance other regions

---

## 11. Future Phases (Not in Scope)

### MVP3 Phase 2: User Ownership
- `UserCard` model (userId, cardId, acquiredAt, source)
- "My Collection" view (filter owned vs not owned)
- Stats: "You own 42 cards" (absolute count, never percentage)

### MVP3 Phase 3: Gold Economy + Packs
- `UserBalance` model (userId, gold)
- `GoldTransaction` model (audit log)
- Pack system (Bronze/Silver/Gold packs, server-side RNG)
- `POST /api/packs/open` endpoint

### MVP3 Phase 4: Achievements + Profile
- `Achievement` model (badges, titles)
- Profile customization (avatars, frames)
- `UserProfile` model

### MVP4+: Trading & Marketplace
- Card trading (peer-to-peer, atomic swaps)
- Marketplace (buy/sell, 10% tax)
- Auction system

---

## 12. Success Metrics

### Launch Criteria (Phase 1)
- ✅ 50 cards seeded in database
- ✅ All cards have valid images loading correctly
- ✅ All cards have educational descriptions (2-4 sentences)
- ✅ Rarity distribution matches target (±2 cards per tier acceptable)
- ✅ `/collec` page functional with all filters
- ✅ Modal displays correct information
- ✅ Responsive on mobile/tablet/desktop
- ✅ No console errors or broken images

### User Experience Goals
- Page load time: <2s
- Filter response time: <100ms
- Modal open/close: <300ms animation
- Image load: <1s per image
- No layout shift (CLS < 0.1)

### Content Quality Goals
- 100% of images have proper licenses tracked
- 100% of descriptions are human-validated
- 0 duplicate entities (unique wikidataId)
- 0 broken Wikipedia links

---

## 13. Risk Mitigation

### Risk 1: Wikidata Entity Unavailability
**Mitigation:** Manual fallback for entities without Wikidata ID (create custom Entity without wikidataId constraint relaxed)

### Risk 2: Image License Issues
**Mitigation:** Only use Wikimedia Commons images with CC-BY-SA, CC0, or Public Domain licenses (filter in script)

### Risk 3: Wikipedia API Changes
**Mitigation:** Implement error handling + manual description entry fallback for failed API calls

### Risk 4: Rarity Distribution Imbalance
**Mitigation:** Manual adjustment step after algorithmic calculation to force target distribution (20/15/10/4/1)

### Risk 5: Performance with 50+ Cards
**Mitigation:** Implement lazy loading if page load >2s, paginate grid if necessary (future optimization)

---

## 14. Appendix

### A. Rarity Score Examples

**Example 1: Napoléon Bonaparte (Legendary)**
- Pageviews/month: ~1,200,000 → pageviewsScore = 95
- Wiki length: ~85,000 chars → wikiLengthScore = 95
- Rarity score = 0.4 * 95 + 0.6 * 95 = 95 → **Legendary**

**Example 2: Rayman (Common)**
- Pageviews/month: ~5,000 → pageviewsScore = 35
- Wiki length: ~3,000 chars → wikiLengthScore = 25
- Rarity score = 0.4 * 35 + 0.6 * 25 = 29 → **Common**

### B. Album Card Distribution

| Album | Target Cards | Example Entities |
|-------|--------------|------------------|
| Personnalités | 20 | Napoléon, Zidane, Édith Piaf, Monet |
| Culture | 12 | Intouchables, La Joconde, Astérix |
| Lieux | 12 | Tour Eiffel, Paris, Mont Blanc |
| Symboles | 3 | Drapeau France, UE, Québec |
| Divers | 3 | Rayman, Assassin's Creed, Cyrano |

### C. Color Palette Reference

```css
/* Rarity Colors */
--rarity-common: #9CA3AF;      /* Tailwind gray-400 */
--rarity-uncommon: #D97706;    /* Tailwind amber-600 */
--rarity-rare: #3B82F6;        /* Tailwind blue-500 */
--rarity-epic: #9333EA;        /* Tailwind purple-600 */
--rarity-legendary: #EAB308;   /* Tailwind yellow-500 */
```

---

**End of Specification**

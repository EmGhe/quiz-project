# Quiz Game Platform - Development Roadmap

Complete implementation roadmap from MVP1 to V3, with task breakdown and effort estimates.

## Overview

| Phase | Focus | Tasks | Estimated Time | Status |
|-------|-------|-------|----------------|--------|
| **MVP1** | Daily Challenge | ~12 tasks | 2-3 weeks | ✅ Complete |
| **POST-MVP1** | Question Database + Images | ~18 tasks | 2-3 weeks | 🚧 In Progress (60%) |
| **MVP2** | PvP Competition | ~15 tasks | 2-3 weeks | 🚧 In Progress (80%) |
| **MVP3 Phase 1** | Collection Read-only | ~10 tasks | 1-2 weeks | ✅ Complete |
| **Gold Economy** | Virtual Currency System | ~12 tasks | 1 week | ✅ Complete |
| **MVP3 Phase 2** | Tags & Personal Collection | ~21 tasks | 1-2 weeks | ✅ Complete |
| **V2** | Advanced Features | ~16 tasks | 2-3 weeks | 📋 Planned |
| **V3** | Social & Marketplace | ~20 tasks | 3-4 weeks | 📋 Planned |

**Total estimated time:** 14-19 weeks (3.5-5 months) for complete platform  
**Current progress:** ~65% complete (MVP1 + POST-MVP1 60% + MVP2 80% + MVP3 Phase 1 + Gold Economy + MVP3 Phase 2)

---

## MVP1 - Daily Challenge (Foundation)

**Goal:** Core game loop that drives retention

**Status:** ✅ Completed

**Plan:** `docs/superpowers/plans/2026-10-09-mvp1-daily-challenge.md`

### Key Features
- ✅ JWT Authentication (register, login, session management)
- ✅ User accounts with streak tracking
- ✅ Daily generation (10 questions, resets at UTC midnight)
- ✅ Server-side scoring (speed bonus + multiplier, anti-cheat)
- ✅ Streak system (consecutive days tracking)
- ✅ Daily leaderboard (rank by score, tie-breaker by time)
- ✅ Share card generation (visual results for social sharing)
- ✅ Training mode (practice with category selection)
- ✅ Basic profile & stats

### Critical Success Metrics
- Day 1 retention > 40%
- Day 7 retention > 20%
- Average Daily completion time: 4-6 minutes
- Streak abandonment rate < 30% at 7 days

### Technical Highlights
- **Anti-timer-manipulation:** Server validates all timestamps
- **Concurrent submissions:** Database transactions prevent race conditions
- **Case-insensitive matching:** "États-Unis" = "USA" = "Etats-Unis"

### Dependencies
- ✅ Initialization complete (monorepo, backend, frontend, database)
- ⏳ Seed at least 100 published questions
- ⏳ Deploy to staging environment

---

## POST-MVP1 - Question Database Pipeline (Content Foundation)

**Goal:** Replace template questions with production-ready content pipeline

**Status:** 📋 Planned

**Strategy Document:** `brainstorm/stratégie_bdd_quiz.md`

**Estimated Time:** 2-3 weeks

### Overview

MVP1 was built with ~50 template questions for testing. This phase builds the infrastructure to generate and manage thousands of high-quality questions from Wikidata.

### Key Principles (from strategy doc)

- **Facts first, questions second:** Never generate questions from LLM memory alone
- **Wikidata as single source:** All MVPs use Wikidata exclusively
- **Separate storage:** Facts and questions stored independently
- **Quality over quantity:** 500 validated questions > 5000 mediocre ones

### Phase 1: Database Architecture (2-3 days)

#### Task 1: Design schema
- [ ] Create `facts` table (source of truth from Wikidata)
  - Columns: id, wikidata_entity_id, property, value, category, source_url, last_verified, metadata (JSONB)
- [ ] Create `questions` table 
  - Columns: id, fact_id (FK), question_text, canonical_answer, difficulty, category, format (open/mcq), status (draft/published), created_at
- [ ] Create `accepted_answers` table (for open questions - Daily mode)
  - Columns: id, question_id (FK), answer_variant, levenshtein_threshold
- [ ] Create `distractors` table (for MCQ - PvP/Training mode)
  - Columns: id, question_id (FK), distractor_text, wikidata_source_id, score
- [ ] Create `question_metadata` table (analytics & QA)
  - Columns: question_id (FK), success_rate, avg_time_ms, times_asked, user_reports (JSONB)

#### Task 2: Set up Wikidata integration
- [ ] Install Wikidata SDK/library (Python: `wikidata` or Node: `wikibase-sdk`)
- [ ] Create utility functions for SPARQL queries
- [ ] Test connection and basic queries
- [ ] Set up error handling and rate limiting

### Phase 2: POC - Capitals Domain (3-5 days)

**Target:** 200 high-quality questions about world capitals

#### Task 3: Wikidata ingestion script
- [ ] Write SPARQL query to fetch all countries + capitals from Wikidata
  - Query properties: P31 (instance of) = Q6256 (country), P36 (capital)
  - Include: country name (FR + EN), capital name (FR + EN), population, continent
- [ ] Parse SPARQL results and insert into `facts` table
- [ ] Log source URL and verification timestamp
- [ ] Expected output: ~200 country-capital facts

#### Task 4: Question generation from facts
- [ ] Create question templates for capitals:
  - "Quelle est la capitale de {country} ?"
  - "Dans quel pays se trouve {capital} ?"
  - "{capital} est la capitale de quel pays ?"
- [ ] Generate questions from each fact using templates
- [ ] Insert into `questions` table with status = 'draft'
- [ ] Link each question to source fact (fact_id)

#### Task 5: Answer variants generation (for Daily mode)
- [ ] For each question, generate accepted answer variants:
  - Canonical answer (e.g., "Rome")
  - Alternate spellings (e.g., "Roma")
  - With/without articles (e.g., "La Rome" should also match)
- [ ] Store in `accepted_answers` table
- [ ] Set appropriate Levenshtein threshold (1 for short words, 2-3 for longer)
- [ ] Test fuzzy matching algorithm (case-insensitive, accent-insensitive, typo-tolerant)

#### Task 6: Distractor generation (for PvP/Training mode)
- [ ] For each capital question, generate 4 distractors:
  - Query Wikidata for other capitals from same continent
  - Query Wikidata for major cities from same country (non-capitals)
  - Score distractors by plausibility (similar population, geographic proximity)
- [ ] Store top 4 distractors per question
- [ ] Validate: no duplicates, no distractor = correct answer
- [ ] Expected output: 200 questions × 5 choices (1 correct + 4 distractors)

#### Task 7: Manual QA review
- [ ] Export first 50 generated questions to CSV/spreadsheet
- [ ] Manual review checklist:
  - Question text is clear and grammatically correct
  - Canonical answer is factually correct
  - Accepted variants cover common spellings/typos
  - Distractors are plausible but incorrect
  - No ambiguity (only one correct answer)
- [ ] Fix issues and iterate on generation scripts
- [ ] Approve questions: update status 'draft' → 'published'

### Phase 3: Extend to 3-4 More Domains (1 week)

**Target:** 500-700 total questions across 5 categories

#### Task 8: Add Geography basics
- [ ] Wikidata ingestion: oceans, seas, major rivers, continents
- [ ] Question generation: "Quel océan borde {country} ?", "Quel fleuve traverse {city} ?"
- [ ] Target: +100 questions

#### Task 9: Add Cinema/Oscars
- [ ] Wikidata ingestion: Best Picture winners, famous directors, lead actors/actresses
  - Properties: P166 (award received) = Q102427 (Academy Award for Best Picture)
- [ ] Question generation: "Qui a réalisé {film} ?", "Quel film a gagné l'Oscar du meilleur film en {year} ?"
- [ ] Distractors: other directors/films from similar era
- [ ] Target: +150 questions

#### Task 10: Add Basic Science
- [ ] Wikidata ingestion: planets, chemical elements, major inventions
  - Properties: P31 (instance of) = Q634 (planet), P246 (element symbol)
- [ ] Question generation: "Quel est le symbole chimique de {element} ?", "Combien de planètes dans le système solaire ?"
- [ ] Target: +100 questions

#### Task 11: Add Flags (image-based questions)
- [ ] Wikidata ingestion: country flags (P41 - flag image)
- [ ] Download flag images to CDN/Cloudinary
- [ ] Question generation: "À quel pays appartient ce drapeau ?" + image URL
- [ ] Distractors: flags with similar colors/patterns
- [ ] Target: +50 questions

#### Task 12: Image Pipeline Infrastructure
- [ ] **Database:** Add license metadata fields to Question model
  - mediaLicenseAuthor, mediaLicenseType, mediaLicenseUrl, mediaSourceUrl
  - Prisma migration: `add_media_license_fields`
- [ ] **Script:** Enhance image download script with:
  - Wikimedia Commons API integration (fetch license metadata)
  - Sharp optimization (resize max 800px, compression)
  - Automatic retry with exponential backoff (3× max)
  - License metadata storage in DB
- [ ] **Optimization:** Install Sharp, configure image processing
  - SVG: no transformation (keep vectorial)
  - PNG/JPG: resize + compression (target ~80 KB/image)
- [ ] **Storage:** Local storage in `public/images/quiz/` + Vercel CDN
  - MD5 hash filenames for deduplication
  - ~180 images × 80 KB = ~14 MB total
- [ ] **Execution:** Run download script (optimal delay from test)
  - Expected: 1-3h for full download (rate limit safe)
- [ ] **Validation:** Test image display in Daily, check all 180 images load
- [ ] **Documentation:** Update QUESTION-QUALITY-GUIDELINES.md with image best practices

**Design Spec:** `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`

**Scalability Note:** Phase 1 (local + Vercel CDN) supports 0-500 images. Migration to Cloudflare R2 (~1h effort) unlocks unlimited scaling when crossing 500 images. See spec for migration path.

### Phase 4: Industrialization Tools (parallel to content creation)

#### Task 13: Admin dashboard (basic)
- [x] View all questions (filterable by category, difficulty, status) ✅ Complété
- [x] Approve/reject/edit draft questions ✅ Complété
- [x] View question stats (success rate, avg time, times asked) ✅ Complété
- [x] Bulk actions (approve multiple, delete multiple) ✅ Complété

**Pages créées:**
- `AdminDashboard.tsx` - Vue d'ensemble
- `AdminQuestions.tsx` - Liste et filtres
- `AdminQuestionDetail.tsx` - Édition détaillée
- `AdminReportedQuestions.tsx` - File de questions signalées

#### Task 14: Automated quality checks
- [x] **Duplicate detection intelligent** ✅ Script créé `scripts/qa/detect-duplicate-questions.ts`
  - Ignore les questions de type "image" avec même texte (images différentes)
  - Extraction d'entités nommées (pays, villes, personnes)
  - Similarité sémantique vs textuelle
  - Exemple : "Capitale de l'Algérie" vs "Capitale de la Tunisie" → DIFFÉRENTES (95% similarité textuelle mais entités différentes)
- [ ] **Distractor validation**: ensure 4 unique distractors per MCQ question
- [ ] **Answer validation**: canonical_answer must be in accepted_answers list
- [ ] **Category balance check**: warn if category has <50 questions
- [ ] **Difficulty distribution**: visualize easy/medium/hard ratio (20/60/20 target)

#### Task 15: User reporting system
- [x] Add "Report Question" button in frontend ✅ Session 2026-10-13
- [x] Store reports in question_metadata.user_reports (JSONB) ✅ Session 2026-10-13
- [x] Admin dashboard: review queue for reported questions ✅ Session 2026-10-13
- [x] Track common report reasons (incorrect answer, ambiguous, typo) ✅ Session 2026-10-13

#### Task 16: Analytics & monitoring
- [ ] Track question performance metrics:
  - Success rate by question (too easy? too hard?)
  - Average answer time (outliers = poorly worded?)
  - Skip rate (players skipping = uninteresting/too hard?)
- [ ] Flag questions for review if:
  - Success rate <10% or >95% (rebalance difficulty)
  - Avg time >20s for simple questions (unclear wording)
  - Skip rate >30% (boring or frustrating)

### Phase 5: Content Expansion Strategy (ongoing)

#### Task 17: Define content roadmap
- [ ] Set target: 1000 questions by MVP2 launch
- [ ] Prioritize categories based on user preferences (from MVP1 analytics)
- [ ] Create weekly content sprint plan:
  - Week 1: +100 History questions (Wikidata: major events, historical figures)
  - Week 2: +100 Sports questions (Wikidata: Olympic winners, World Cup, tennis Grand Slams)
  - Week 3: +100 Music questions (Wikidata: famous artists, albums, hit songs)
  - Week 4: +50 Technology questions (Wikidata: inventions, companies, programming languages)

#### Task 18: Community content pipeline (future)
- [ ] Design user-submitted question workflow:
  - Users propose questions (with sources)
  - Moderators review and approve
  - Credits for accepted questions (Gold reward in V2?)
- [ ] Not required for MVP2, but plan architecture

### Success Metrics

- [ ] **500+ published questions** across 5+ categories before MVP2
- [ ] **<5% reported questions** (high quality from start)
- [ ] **20/60/20 difficulty distribution** achieved (easy/medium/hard)
- [ ] **Wikidata pipeline** can generate 100 new questions/week with <2 hours human review
- [ ] **Zero duplicate questions** detected in production

### Dependencies

- ✅ MVP1 complete (infrastructure ready to consume new questions)
- ✅ Wikidata integration tested and rate-limits understood
- ✅ Admin dashboard deployed for QA review

### Notes

- **Content over features:** MVP2 PvP requires diverse questions to avoid repetition
- **Quality gates:** Every question must pass manual QA before first 500, then spot-check 10% after pipeline is proven
- **Scalability:** Design with 10k+ questions in mind (indexing, query performance)
- **Localization:** All Wikidata queries fetch both French and English labels (future i18n support)
- **Image scalability:** Phase 1 pipeline (local + Vercel CDN) supports 0-500 images optimally. When crossing 500 images, migrate to Cloudflare R2 storage (~1h migration effort, unlimited free storage, faster global CDN). See image pipeline design spec for details.

---

## MVP2 - PvP Competition (Engagement)

**Goal:** Competitive layer for engagement and depth

**Status:** 🚧 In Progress (80% complete)

**Plan:** `docs/superpowers/plans/2026-10-09-mvp2-pvp-competition.md`

**Guidelines:** `docs/PVP-GUIDELINES.md`

**Branch:** `mvp2-pvp-implementation`

**Latest Session:** 2026-10-15 (UI/UX improvements + critical bug fixes)

### Implementation Progress

**Backend (Tasks 1-6):** ✅ Complete
- ✅ Task 1: PvP Database Schema (Prisma models, migrations)
- ✅ Task 2: ELO Service (K-factor 32, atomic updates, rank calculation)
- ✅ Task 3: WebSocket Gateway (Socket.io, JWT auth, room management)
- ✅ Task 4: Matchmaking Queue (ELO-based pairing, expanding range)
- ✅ Task 5: Category Ban Phase (⏸️ removed - on stand by for future)
- ✅ Task 6: PvP Match Flow (simplified: matchmaking → questions → scoring)

**Frontend (Tasks 10-13):** 🚧 In Progress
- ✅ Task 10: Matchmaking UI (Find Match button, queue status, WebSocket connection)
- ⏸️ Task 11: Category Ban UI (on stand by - skipped for simplified flow)
- ✅ Task 12: PvP Match UI (synchronized gameplay, MCQ choices, timer, results)
- ✅ Task 12.1: UI/UX Polish (Session 2026-10-15)
  - Player profiles with rank, division, ELO in header
  - Ready/Go countdown animation before first question
  - Timer animation synchronization fix (300ms linear)
  - Rematch system with 10s acceptance popup
  - Match statistics with accurate question counts
- ⏳ Task 13: Ranks & Missions UI (display progression)

**Backend Advanced (Tasks 7-9):** 📋 Planned
- ⏳ Task 7: Seasons System (cron jobs, soft reset)
- ⏳ Task 8: Ranks & Divisions (promotion/demotion notifications)
- ⏳ Task 9: Weekly Missions Module (rotation, tracking)

**Additional Features:**
- ✅ Task 14: Rematch System (10s acceptance window, popup UI, WebSocket events) - Session 2026-10-15
- ⏳ Task 15: Testing & Documentation (integration tests, WebSocket tests)

**Critical Bug Fixes (Session 2026-10-15):**
- ✅ **Match ID Bug:** Fixed `matchId` vs `id` mismatch in WebSocket events
  - Backend was sending `matchId`, frontend expected `id`
  - Caused `currentMatch.id` to be undefined → answers not submitted
  - Root cause of scores staying at 0
- ✅ **Score Calculation Bug:** Fixed stale closure in `handleQuestionEnd`
  - playerScore/opponentScore captured at first render (always 0)
  - Fixed by using `getState()` to read fresh values
- ✅ **Match Statistics Bug:** Fixed incorrect question count calculation
  - Was calculating from score (2200/200 * 10 = 11) → displayed as "22/10"
  - Backend now counts actual correct answers and sends to frontend
- ✅ **Rematch State Bug:** Fixed flash of "Question 10/10" when accepting rematch
  - Added `resetMatch()` before setting new match in both flows
  - Prevents stale state bleeding into new match

### Technical Updates

**✅ NestJS 12 Upgrade (2026-10-15)**
- Migrated from NestJS 10.x → 12.1.3
- Fixed security vulnerability in @nestjs/core ≤11.1.17
- Native WebSocket compatibility (no version conflicts)
- All modules tested and working

**⚠️ Simplified Match Flow**
- Category ban phase removed from initial implementation
- Direct flow: matchmaking → questions → answers → scoring
- Ban phase can be re-added in future (schema fields preserved)
- Faster time to playable match

### Key Features
- ✅ 1v1 Real-time matchmaking (WebSocket + Socket.io)
- ⏸️ Category ban phase (on stand by - can be re-added later)
- ✅ ELO system (atomic calculations, K=32, rank calculation)
- ✅ Ranks & Divisions calculation (Bronze → Grandmaster, 3 divisions each)
- ⏳ Seasons (6 months, placement matches, soft reset) - planned
- ⏳ Weekly missions (3/5 completion → rewards) - planned
- ⏳ Rematch system (30s acceptance window) - planned

### Critical Success Metrics
- PvP participation rate > 30% of Daily players
- Average matchmaking time < 45 seconds
- ELO distribution follows bell curve (median ~1200)
- Mission completion rate > 50%

### Technical Highlights
- **ELO race conditions:** Row-level locks + Prisma transactions ✅
- **Matchmaking fairness:** ±200 ELO initial, expands +50 every 10s ✅
- **Reconnection handling:** 30s grace period (planned)
- **WebSocket architecture:** JWT auth middleware, room-based events ✅
- **Simplified flow:** Direct to questions (no ban delay) ✅

### Dependencies
- ✅ MVP1 complete (auth, users, questions, scoring)
- ⏳ POST-MVP1 in progress (500+ published questions from Wikidata pipeline)
- ✅ WebSocket infrastructure implemented (NestJS 12 + Socket.io)
- ⏳ WebSocket load testing needed before production

---

## MVP3 - Collection System (Phase 1)

**Goal:** Read-only catalog demonstrating collection mechanics

**Status:** ✅ Complete

**Plan:** `docs/superpowers/plans/2026-10-16-mvp3-collection-system.md`

### Completed Features
- ✅ 52 cards with Wikidata entities (personalities, landmarks, monuments, symbols)
- ✅ Rarity system with algorithmic distribution (40% pageviews + 60% wiki depth)
- ✅ `/collec` page with grid display and lazy loading
- ✅ Filters: rarity tiers, entity type, text search
- ✅ Card detail modal with Wikidata entity information
- ✅ Collection statistics (total cards, rarity breakdown)
- ✅ Responsive design (mobile 2 cols / tablet 3 cols / desktop 4 cols)

**Note:** Albums system deprecated - cards are now organized by rarity and entity type only.

### Rarity Distribution (Achieved)
- Common: 23 (target 20)
- Uncommon: 16 (target 15)
- Rare: 9 (target 10)
- Epic: 3 (target 4)
- Legendary: 1 (target 1)

**Total deviation from target: 6** (well within acceptable range)

### Performance Metrics
- Page load time: < 2s with 52 cards
- Responsive breakpoints: 640px (mobile), 1024px (tablet/desktop)
- All filters functional with smooth UX

### Next Steps
**MVP3 Phase 2:** User ownership layer
- User-card ownership mapping
- Pack opening system
- Gold economy integration

### Collection Pipeline Improvements (Backlog)

**Context:** Improvements identified during P0 review of collection scripts (2026-10-19)  
**Documentation:** `docs/COLLEC/P0-IMPROVEMENTS-2026-10-19.md`  
**Status:** 📋 Planned

#### P1 — Data Integrity

**Task: Validate WikidataID uniqueness before seeding**
- **Priority:** P1
- **Effort:** ~30 min
- **Description:** Add validation in `03-seed-database.ts` to detect duplicate QIDs before insertion
- **Implementation:**
  ```typescript
  const wikidataIds = new Set();
  for (const entity of entities) {
    if (wikidataIds.has(entity.wikidataId)) {
      throw new Error(`Duplicate wikidataId: ${entity.wikidataId}`);
    }
    wikidataIds.add(entity.wikidataId);
  }
  ```
- **Impact:** Prevents data corruption from duplicate entities

#### P2 — Enhanced Rarity Algorithm

**Task: Add "International Presence" criterion (20% weight)**
- **Priority:** P2
- **Effort:** ~3 hours
- **Current formula:** `0.4 * pageviewsScore + 0.6 * wikiLengthScore`
- **Target formula:** `0.5 * pageviewsScore + 0.3 * wikiLengthScore + 0.2 * internationalScore`
- **Description:** 
  - Fetch number of Wikipedia language versions from Wikidata
  - Normalize to 0-100 scale (1 lang → 0, 50+ langs → 100)
  - Update `RarityService.calculateRarityScore()` to accept 3 parameters
  - Recalculate all existing cards with new formula
- **Rationale:** More accurate rarity for entities with global vs regional importance
- **Breaking change:** Yes - requires migration and recalculation of all cards
- **Defer until:** After MVP3 Phase 2, when collection is stabilized

**Task: Rarity algorithm versioning**
- **Priority:** P2
- **Effort:** ~2 hours
- **Description:**
  - Add fields to `Card` model:
    - `rarityAlgorithmVersion: String` (e.g., "1.0.0", "2.0.0")
    - `rarityCalculatedAt: DateTime`
  - Store raw data used for calculation (pageviews, wikiLength, internationalScore)
  - Enable selective recalculation when algorithm changes
- **Prisma migration:**
  ```prisma
  model Card {
    // ... existing fields
    rarityAlgorithmVersion String  @default("1.0.0")
    rarityCalculatedAt     DateTime @default(now())
    rarityRawData          Json?   // {pageviews, wikiLength, internationalScore}
  }
  ```
- **Impact:** Enables safe algorithm evolution without losing historical data

#### P2 — Test Coverage

**Task: RarityService unit tests**
- **Priority:** P2
- **Effort:** ~2 hours
- **Test file:** `apps/backend/src/modules/collection/services/rarity.service.spec.ts`
- **Test cases:**
  - `calculatePageviewsScore()`:
    - ✓ Returns null for null/undefined input (data unavailable)
    - ✓ Returns 0 for measured zero pageviews
    - ✓ Returns ~25 for 1k pageviews
    - ✓ Returns ~50 for 10k pageviews
    - ✓ Returns ~75 for 100k pageviews
    - ✓ Returns ~100 for 1M+ pageviews
  - `calculateWikiLengthScore()`:
    - ✓ Returns null for null/undefined input
    - ✓ Returns 0 for measured zero length
    - ✓ Returns ~20 for 1k chars
    - ✓ Returns ~40 for 5k chars
    - ✓ Returns ~60 for 20k chars
  - `calculateRarityScore()`:
    - ✓ Returns null if any input is null (incomplete data)
    - ✓ Returns correct weighted score for complete data
    - ✓ Distinguishes null (unavailable) from 0 (measured zero)
  - `scoreToRarity()`:
    - ✓ Returns null for null score
    - ✓ Returns 'common' for score < 30
    - ✓ Returns 'uncommon' for score 30-49
    - ✓ Returns 'rare' for score 50-69
    - ✓ Returns 'epic' for score 70-89
    - ✓ Returns 'legendary' for score >= 90
- **Impact:** Prevents regressions when modifying rarity algorithm

#### P2 — Collection Utils Improvements

**Context:** Improvements identified during utils review (2026-10-19)  
**Documentation:** `docs/COLLEC/utils-feedback.md`

**Task: Replace wikiTextLength estimation with real data**
- **Priority:** P2
- **Effort:** ~2 hours (investigation + implementation)
- **Current issue:** `wikiTextLength = extract.length * 5` is unreliable
  - Assumes summary is 20% of article (no correlation)
  - Short summary ≠ short article, long summary ≠ long article
- **Investigation needed:**
  - Check if Wikipedia REST API exposes actual article length
  - Check if MediaWiki API `action=query&prop=revisions&rvprop=size` is accessible
- **Alternative (if no API):** Rename to `estimatedWikiLength` and document clearly
- **Impact:** More accurate rarity scores for "documentary importance" criterion

**Task: SPARQL make description OPTIONAL**
- **Priority:** P2
- **Effort:** ~1 hour
- **Current issue:** Entities without French description are excluded
- **Fix:** Change SPARQL query from:
  ```sparql
  ?entity schema:description ?description .
  FILTER(LANG(?description) = "fr")
  ```
  To:
  ```sparql
  OPTIONAL { ?entity schema:description ?description . FILTER(LANG(?description) = "fr") }
  ```
- **Impact:** Include more valid entities (especially for rare/obscure ones)
- **Defer until:** V2 when scaling to 1000+ cards

**Task: Handle multiple P31 (instance of) types**
- **Priority:** P2
- **Effort:** ~2 hours
- **Current issue:** Entities with multiple types keep first one arbitrarily
- **Fix options:**
  1. Define type hierarchy (humain > artiste > peintre)
  2. Use `ORDER BY` in SPARQL to prioritize certain types
  3. Store all types and pick most specific
- **Impact:** More accurate entity type classification
- **Defer until:** V2 when type accuracy becomes critical

**Task: Centralize HTTP utilities**
- **Priority:** P2
- **Effort:** ~2 hours
- **What:** Create comprehensive `http-config.ts` with:
  - ✅ User-Agent (done)
  - ✅ Error handling (done)
  - Retry policy (exponential backoff)
  - Timeout configuration (done)
  - Rate limiting utilities
- **Impact:** Consistent HTTP behavior across all clients
- **Defer until:** When adding more data sources (V2)

#### Completed (2026-10-19)

**Session 1 — Main Scripts (P0 fixes)**

✅ **P0 — Remove fake image generation** (`02-download-images.ts`)
- Removed `createTestImage()` function
- Failed downloads set `imageUrl: null` explicitly
- Failed downloads tracked in `data/failed-downloads-report.json`

✅ **P0 — Validate image format by content** (`02-download-images.ts`, `06-update-card-images.ts`)
- Sharp detects actual format from buffer (not URL)
- SVG detected by content analysis (`buffer.includes('<svg')`)
- File extension matches real format (no `.jpg` files containing PNG data)

✅ **P0 — Distinguish null vs 0 for missing data** (`RarityService`)
- Signatures accept `number | null | undefined`
- `null` = data unavailable → returns `null` (cannot calculate)
- `0` = measured zero → returns score based on zero
- Scripts propagate `null` correctly (`01`, `04`, `05`)

**Session 2 — Utils (P0/P1 fixes)**

✅ **P0 — Return null instead of 0 for errors** (`wikipedia.client.ts`, `wikidata.client.ts`)
- `fetchPageviews()` returns `number | null` (404 → null, not 0)
- `fetchWikiTextLength()` returns `number | null` (error → null, not 0)
- Types updated: `WikidataEntity.wikiTextLength: number | null`
- Types updated: `RawEntity.pageviewsMonth/wikiTextLength: number | null`

✅ **P1 — Centralize User-Agent** (`utils/http-config.ts`)
- New file with shared `USER_AGENT` constant
- Both clients import from central config
- Compliant with Wikimedia User-Agent policy

✅ **P1 — Validate pageviews response structure** (`wikipedia.client.ts`)
- Check `response.data.items` is array before processing
- Validate each `item.views` is number before summing
- Prevents `NaN` from invalid responses

✅ **P1 — Fix word splitting bug in validateImageUrl** (`wikidata.client.ts`)
- Separate `normalizeForMatch()` (no spaces) from `normalizeForWords()` (keep spaces)
- Use `normalizeForWords()` for splitting label into words
- Fixes bug where "Marie Curie" became "mariecurie" → no word matches

✅ **P1 — TypeScript error handling** (all utils)
- Use `getErrorMessage(error: unknown)` helper
- Use `getHttpStatus(error: unknown)` helper
- Consistent `catch (error: unknown)` blocks

---

## Gold Economy System (MVP3 Phase 1.5)

**Goal:** Virtual currency system for collection engagement (no Pay-to-Win)

**Status:** ✅ Complete (2026-10-23)

**Documentation:** `docs/GOLD/README.md` (38 pages), `apps/frontend/ECONOMY_GUIDE.md`

### Completed Features

**Backend (100%):**
- ✅ Prisma migration: `gold`, `fragments`, `gold_transactions`, `fragment_transactions`, `packs`, `pack_configs`, `user_pity_counters`, `user_cards`, `streak_rewards`
- ✅ **GoldModule** - Transaction tracking, Daily rewards, streak milestones
- ✅ **FragmentModule** - Card destruction (10-400 fragments), card upgrade (30-300 fragments)
- ✅ **PackModule** - RNG system with pity guarantees, 3 pack types (Bronze/Silver/Gold)
- ✅ Integrated into DailyService - Automatic Gold rewards after quiz completion
- ✅ Streak milestone system - Bonus at 5, 10, 20, 30, 50, 75, 100 days
- ✅ Seed script for pack configurations

**Frontend (100%):**
- ✅ API clients: `gold.ts`, `fragments.ts`, `packs.ts`
- ✅ Zustand stores: `goldStore`, `fragmentStore`, `packStore`
- ✅ UI Components:
  - `GoldBalance`, `FragmentBalance`, `CurrencyDisplay`
  - `PackCard`, `PackShop`, `PackOpening` with animations
  - `Header` with global currency display
- ✅ ShopPage with pack purchase and opening
- ✅ Gold reward display after Daily completion

### Economy Parameters

**Gold Earning:**
- **Daily formula:** `(Correct answers × 3) + (Time bonus × 2)`
  - Time bonus = `max(0, (25 - seconds) / 25) × 2`
  - Max theoretical: 50 Gold/quiz (10/10 perfect)
  - Expert realistic: ~46 Gold/quiz

**Pack Prices:**
- Bronze: 500 Gold (~11 days expert)
- Silver: 1200 Gold (~26 days expert)
- Gold: 3000 Gold (~65 days expert)

**Pity System (backend-only, hidden from UI):**
- Bronze: Epic/12 packs, Legendary/30 packs
- Silver: Epic/6 packs, Legendary/15 packs
- Gold: Epic/guaranteed, Legendary/10 packs

**Fragments:**
- Destruction values: Common=10, Rare=35, Epic=120, Legendary=400
- Upgrade costs: C→R=30, R→E=100, E→L=300

### Technical Highlights
- **Atomic transactions:** All Gold/Fragment operations use Prisma transactions
- **Pity tracking:** Per-user, per-pack-type counters (automatic reset on drop)
- **RNG fairness:** Probabilistic card generation with guaranteed minimums
- **No Pay-to-Win:** Gold earned only through gameplay (Daily, streaks, PvP)
- **Frontend privacy:** Probabilities and pity counters hidden from UI (backend-only)

### Success Metrics (To Monitor)
- Gold sink/source ratio: 0.9-1.1 (balanced economy)
- Pack purchase rate > 30% of Daily players
- Average user opens first pack within 14 days
- Fragments encourage card management (destruction/upgrade)

---

## MVP3 Phase 2 - Tags System & Personal Collection

**Goal:** User ownership of cards + organization with tags & favorites

**Status:** ✅ Complete (2026-10-24)

**Plan:** `docs/superpowers/plans/2026-10-23-tags-system.md`

### Completed Features
- ✅ **Tags System** - Create, edit, delete, reuse custom tags
  - ✅ Color-coded tags (12 preset colors)
  - ✅ Add up to 4 tags per card
  - ✅ Reuse existing tags across multiple cards (select from available list)
  - ✅ Tag filtering in collection (only shows tags with ≥1 card)
  - ✅ Tag management UI (create, delete with confirmation)
  - ✅ Tags displayed on cards (max 3 visible + "+N" counter)
- ✅ **Favorites System** - Star/unstar cards
  - ✅ Favorite icon on cards (grid + modal, ☆/⭐)
  - ✅ Toggle favorite status with instant feedback
  - ✅ Persisted per user in UserCard model
- ✅ **User Ownership** - Collection shows only user's cards
  - ✅ User-card mapping (UserCard model with isFavorite)
  - ✅ All filters work on owned cards only (tags, rarity, search, album)
  - ✅ Statistics reflect user's personal collection
  - ✅ Script to give all cards to admin for testing

### Technical Highlights
- **Backend:** Tag/CardTag models, Tags CRUD endpoints, JWT auth on all routes
- **Frontend:** TagManager, TagFilter, ColorPicker, FavoriteIcon, TagBadge components
- **Database:** Proper foreign keys, cascade deletes, unique constraints (userId+label, userId+cardId+tagId)
- **Auth:** All collection/tags endpoints require JWT authentication
- **UX:** Hover effects, confirmation dialogs, loading states, tag reuse UI
- **Query Optimization:** Two-step query for tag filtering (Prisma limitation workaround)

### Documentation
- **Complete Guide:** `docs/COLLEC/TAGS-SYSTEM-2026-10-24.md` (architecture, features, troubleshooting)
- **Updated README:** `docs/COLLEC/README.md` (schemas, routes, services updated)

---

## Profile Page (MVP3 Phase 3)

**Goal:** User profile with progression stats and card showcase

**Status:** ✅ Complete (2026-10-26)

**Documentation:** `docs/PROFIL/README.md`

### Completed Features

**Profile Display:**
- ✅ Header with avatar, username, title ("Explorateur"), PvP badge
- ✅ Statistics cards (3 sections):
  - Daily Challenge: streak, record, completion, success rate, gold earned
  - PvP: rank, division, ELO, wins/losses, winrate, win streak
  - Collection: total cards, rarity breakdown, favorites count
- ✅ Showcase vitrine (10 favorite cards grid)
- ✅ Card detail modal (click card → popup with image, description, Wikipedia link)
- ✅ Navigation buttons (← Back, View Collection →)

**Technical Implementation:**
- ✅ Backend: `/api/profile` endpoints (GET/PATCH)
- ✅ ProfileService: stats calculation from UserStreak, UserElo, UserCard
- ✅ Frontend: ProfilePage, ProfileHeader, StatsCard, ShowcaseSection, CardModal
- ✅ Zustand store for profile state management
- ✅ Responsive design (mobile 2 cols, tablet 3 cols, desktop 5 cols)

**Authentication Pattern:**
- ✅ Cookie-based auth documented in `docs/ARCHITECTURE.md`
- ✅ Backend: `JwtAuthGuard` + `@CurrentUser()` decorator
- ✅ Frontend: `apiClient` with `withCredentials: true`

### Success Metrics (To Monitor)
- Profile visit rate > 40% of active users
- Favorite cards: average 5-8 per user
- Showcase engagement: clicks on cards > 30%

### Future Enhancements
- [ ] Dynamic title system (achievements-based)
- [ ] Public profiles (`/profil/:userId`)
- [ ] Edit profile UI (displayName, bio, avatar upload)
- [ ] Manual showcase selection (drag & drop)
- [ ] Progression graphs (temporal stats)
- [ ] Title unlock history

---

## V2 - Collection Rewards & Profile System

**Goal:** Pack rewards integration + achievements + profile customization

**Status:** 📋 Planned

**Plan:** `docs/superpowers/plans/2026-10-09-v2-collection-system.md`

### Key Features
- ⏳ **Pack opening → UserCard integration**
  - Open pack → add cards to user's collection
  - Duplicate detection (check if user already owns card)
  - Duplicate handling UI (keep for display or convert to fragments)
- ⏳ **Collection milestones** (seuils absolus: 10, 25, 50, 100, 150 cartes)
  - Bonus Gold/fragments à chaque seuil
  - **Note:** JAMAIS afficher de total ou % ("23 cartes" OK, "23/150" ou "15%" NON)
- ⏳ **Rarity set completion** (collect all Common, all Rare, etc.)
  - Backend détection quand joueur possède 100% d'une rareté
  - Notification surprise: "🎉 Collection Common complète !"
  - Joueur ne sait PAS à l'avance combien manquent
- ⏳ **Achievements & badges** (Collection-focused)
  - "First Legendary" badge
  - "50 cards collected" achievement
  - Display achievements on profile
- ⏳ **Profile customization**
  - Avatars (unlockable + purchasable with Gold)
  - Card frames (earned through achievements)
  - Profile backgrounds (themed, rare drops)
- ⏳ **Trading system** (peer-to-peer card swaps, future)

### Critical Success Metrics
- Card collection engagement > 40% of active users
- Collection completion rate < 10% (creates long-term goal)
- Average user owns 50-100 cards after 1 month
- Duplicate management increases fragment circulation
- Milestone rewards encourage completion

### Technical Highlights
- **Pack opening flow:** Purchase → RNG → Add to UserCard → Check duplicates → Offer fragment conversion
- **Duplicate detection:** Query `UserCard.findFirst({ userId, cardId })` before adding
- **Milestone triggers:** Count total cards owned, trigger at 10/25/50/100/150
- **Rarity sets:** Backend calculates if user owns ALL cards of a rarity → surprise reward
- **Educational value:** Cards display Wikidata info (learn while collecting)
- **Total cards SECRET:** UI shows only owned count, never reveals total or %

### Dependencies
- ✅ MVP3 Phase 1 complete (52 cards, raretés)
- ✅ MVP3 Phase 2 complete (tags, favorites, user ownership)
- ✅ Gold Economy System complete (earning + spending mechanisms)
- ⏳ Create 100+ additional card entries (target 150-200 total)
- ⏳ Source/generate more card images (Wikidata Commons)
- ⏳ Balance Gold earning/spending rates based on metrics

---

## V3 - Social & Marketplace (Endgame)

**Goal:** Social features + advanced economy for long-term retention

**Status:** 📋 Planned

**Plan:** `docs/superpowers/plans/2026-10-09-v3-social-marketplace.md`

### Key Features
- ✅ Marketplace (buy/sell cards, 10% tax Gold sink)
- ✅ Auctions (timed bidding, auto-extend, anti-snipe)
- ✅ Card trading (peer-to-peer, atomic swaps)
- ✅ Friend system (requests, friend list, stats comparison)
- ✅ Private leagues (isolated leaderboards, no Gold rewards)
- ✅ "Nuit des Érudits" tournament (entry fee, exclusive prizes)
- ✅ Social reactions (emoji-only post-game)

### Critical Success Metrics
- Marketplace participation > 25% of V2 users
- Average card sold within 48 hours
- Tournament participation > 500 users per event
- Friend list average size: 5-10 friends

### Technical Highlights
- **Marketplace double-spend prevention:** Card locking + atomic transactions
- **Auction bid races:** Highest timestamp wins, losers refunded
- **Trade atomicity:** Both parties confirm, full rollback on failure
- **Tournament brackets:** Handle odd counts, seed by ELO
- **Fraud detection:** Detect marketplace manipulation patterns

### Dependencies
- ✅ V2 complete (card economy established)
- ⏳ Economy analytics dashboard (monitor Gold sinks vs sources)
- ⏳ Admin tools for tournament management
- ⏳ Fraud detection rules configured

---

## Implementation Strategy

### Phase Sequencing

```
MVP1 (2-3 weeks) - BASIC DESIGN ✅
  ↓
  Test with users, measure retention
  ↓
POST-MVP1 (2-3 weeks) - CONTENT PIPELINE 🚧
  ↓
  Replace template questions with Wikidata
  Build to 500+ high-quality questions
  ↓
MVP2 (2-3 weeks) - BASIC DESIGN
  ↓
  Balance ELO, test matchmaking
  Validate concept with real users
  ↓
DESIGN SPRINT (2-3 weeks) ⭐ MAJOR INVESTMENT
  ↓
  UI/UX overhaul
  Branding & identity
  Animation & polish
  Component library
  ↓
V2 (2-3 weeks) - WITH NEW DESIGN
  ↓
  Monitor Gold economy, adjust sinks/sources
  ↓
V3 (3-4 weeks) - WITH NEW DESIGN
  ↓
  Full platform launch
```

**Design Philosophy:**
- **MVP1 & MVP2:** Functional prototype with basic Tailwind UI
  - Goal: Validate game mechanics & retention
  - Design investment: Minimal (use default Tailwind components)
  
- **Design Sprint:** Only after MVP1+MVP2 validation
  - Goal: Create polished, branded experience
  - Design investment: Major (dedicated design phase)
  
- **V2 & V3:** Build on new design system
  - Goal: Consistent, professional UI across all features

### Parallel Work Opportunities

During each phase, these can proceed in parallel:
- **Content creation** (questions, cards, images) - can be done by non-developers
- **UI/UX polish** - frontend designer
- **Testing** - QA can start as soon as APIs exist
- **Documentation** - technical writer

### Budget-Friendly Hosting Plan

| Phase | Hosting Needs | Cost |
|-------|---------------|------|
| MVP1 Testing | Supabase Free + Vercel Free + Railway Free | $0/month |
| MVP2 Beta | Supabase Starter ($25) + Railway Hobby ($5) + Vercel Free | $30/month |
| V2 Launch | Supabase Pro ($25) + Railway Pro ($20) + Vercel Pro ($20) + Cloudinary ($0-89) | $65-154/month |
| V3 Scale | Supabase Pro + Railway scaling + CDN | $100-300/month |

Start free, scale only when users validate the product.

---

## Risk Mitigation

### High-Risk Items (Address Early)

1. **Question quality & quantity**
   - **Risk:** Not enough questions → repetitive Dailies
   - **Mitigation:** Seed 200+ questions before MVP1 launch, plan Wikidata integration

2. **Server-side timing validation**
   - **Risk:** Timer manipulation exploits
   - **Mitigation:** Implemented in MVP1 Task 7, tested in Task 12

3. **Gold economy balance**
   - **Risk:** Inflation or deflation breaks collection system
   - **Mitigation:** Analytics dashboard, daily monitoring, ability to adjust rates

4. **Matchmaking at low user counts**
   - **Risk:** Long wait times discourage PvP
   - **Mitigation:** Bots as fallback (not in MVP2 plan, add if needed)

### Medium-Risk Items (Monitor)

5. **WebSocket scalability**
   - **Risk:** PvP breaks under load
   - **Mitigation:** Load test before MVP2 launch, Redis pub/sub if needed

6. **Marketplace fraud**
   - **Risk:** Gold duplication or card manipulation
   - **Mitigation:** Comprehensive audit logs, fraud detection in V3

---

## Success Criteria

### MVP1 Launch Gate
- [ ] 200+ published questions across 5+ categories
- [ ] Day 1 retention > 40% in beta test (50+ users)
- [ ] No timer manipulation exploits found in security review
- [ ] Streak system tested across midnight UTC boundary

### MVP2 Launch Gate
- [ ] All MVP1 metrics sustained
- [ ] Matchmaking < 60s average wait time (simulated load test)
- [ ] ELO calculations pass race condition tests (100 concurrent matches)
- [ ] PvP participation > 20% of Daily players

### V2 Launch Gate
- [ ] Gold economy balanced (sink/source ratio 0.9-1.1)
- [ ] 100+ cards created with educational content
- [ ] Pack opening RNG verified fair (10k simulation)
- [ ] No Gold duplication exploits in security review

### V3 Launch Gate
- [ ] Marketplace transactions pass atomicity tests
- [ ] Tournament brackets handle 7-256 players correctly
- [ ] Fraud detection catches test manipulation patterns
- [ ] Economy analytics show healthy Gold circulation

---

## Next Steps (Mis à jour 2026-10-23)

### **Semaines 1-2: POST-MVP1 - Questions & Qualité**

1. **Import de contenu (priorité haute)**
   - [x] Import QuizzAPI.fr : 87 questions ✅ Complété 2026-10-23
   - [ ] Importer 400+ questions supplémentaires pour atteindre 500+ total
   - [ ] Diversifier sources (Wikidata, autres APIs publiques)
   - [ ] Validation manuelle des questions importées

2. **Quality Assurance (priorité haute)**
   - [x] Checks qualité automatiques - Script duplicate detection ✅
   - [ ] Script validation distracteurs (4 uniques par MCQ)

### **Semaines 3-4: MVP2 Finition + Intégrations**

3. **PvP Polish & Rank Rewards**
   - [ ] Vérifier/compléter UI Ranks (badges, progression)
   - [ ] **Rank Promotion Rewards System** (5-7 jours)
     - [ ] Backend: UserSeasonRankReward model + Season model
     - [ ] Service: RankRewardsService avec anti-farming
     - [ ] Intégration match flow (détection promotion → distribution)
     - [ ] Frontend: Popup promotion + historique rewards saison
     - **Spec:** `docs/PVP/RANK-REWARDS.md`
   - [ ] Tests de charge WebSocket (50-100 joueurs simultanés)
   - [ ] Debug final et optimisations

4. **Gold Economy - Intégrations** ✅ **Système complet** (2026-10-23)
   - [x] Migration Prisma complète (gold, fragments, packs, pity counters) ✅
   - [x] Backend modules complets (Gold, Fragment, Pack) ✅
   - [x] Intégration Daily → Gold automatique après quiz ✅
   - [x] Système Fragments (destruction/upgrade cartes) ✅
   - [x] Frontend complet (stores, composants, pages) ✅
   - [x] PackShop avec achat et ouverture animée ✅
   - [x] Display Gold gagné après Daily ✅
   - [x] Header avec currency display global ✅
   - [x] Probabilities & pity cachées de l'UI (backend-only) ✅
   - [ ] Intégration PvP : Rank Promotion Rewards (voir section MVP2)

### **Semaines 5-6: Polish & Ownership Layer**

5. **Collection - Tags & Ownership (MVP3 Phase 2)** ✅ **Système complet** (2026-10-24/25)
   - [x] Backend pack opening RNG ✅
   - [x] **Tags System** complet ✅
     - [x] Tag CRUD (create, read, update, delete) ✅
     - [x] Add/remove tags to/from cards (max 4 per card) ✅
     - [x] Reuse existing tags across multiple cards ✅ (2026-10-25)
     - [x] Color-coded tags (12 preset colors) ✅
     - [x] Tag filtering (only shows tags with ≥1 card) ✅ (2026-10-25)
     - [x] Tag management UI with delete functionality ✅
   - [x] **Favorites System** complet ✅
     - [x] Star/unstar cards (persisted per user) ✅
     - [x] Favorite icon on cards (grid + modal) ✅
   - [x] **User Ownership** implémenté ✅
     - [x] Collection shows ONLY user's cards ✅
     - [x] Statistics reflect user's collection ✅
     - [x] Script to give all cards for testing ✅
   - [x] **Documentation** mise à jour ✅ (2026-10-25)
     - [x] TAGS-SYSTEM-2026-10-24.md (guide complet) ✅
     - [x] COLLEC/README.md (schemas, routes, architecture) ✅
   - [ ] **Next (V2):** Pack opening → UserCard integration
   - [ ] Gestion doublons (afficher + option destruction pour fragments)
   - [ ] Rewards collection milestones (seuils absolus: 10, 25, 50, 100, 150 cartes)
   - [ ] Rewards rarity sets (all Common, all Rare, etc.)
   - [ ] **Note:** NE PAS afficher le total global de cartes (mystère)

6. **Esthétique & UX**
   - [ ] **Header intégré partout** (Daily ✅, Shop ✅, Collection, PvP)
   - [ ] **Cartes Collection** : bordures gradients, animations hover
   - [ ] **Raretés visuelles** : logos distinctifs par rareté
     - Common: ⚪ cercle gris
     - Uncommon: 🟢 losange vert
     - Rare: 🔵 étoile bleue
     - Epic: 🟣 couronne violette
     - Legendary: 🟡 dragon doré avec animation pulse
   - [ ] **Ranks PvP** : badges visuels, progression animée
   - [ ] **Gold UI** : animations transitions, historique transactions
   - [ ] **Toast notifications** : achats, ouvertures, destructions

7. **Beta Testing**
   - [ ] Recruter 20-50 testeurs
   - [ ] Collecter feedback via formulaire
   - [ ] Mesurer métriques clés :
     - Temps moyen pour acheter premier pack
     - Taux participation PvP
     - Questions signalées vs total
     - Gold sink/source ratio

### **Mois 2+: V2 Features**

8. **V2 Advanced Features**
   - [ ] Achievements & badges system
   - [ ] Personnalisation profil (avatars, frames, backgrounds)
   - [ ] Stats & analytics page (Gold earned/spent, collection progress)
   - [ ] Missions hebdomadaires PvP (avec rewards)
   - [ ] Seasons system PvP (soft reset tous les 6 mois)

9. **V3 Social & Marketplace** (futur lointain)
   - [ ] Marketplace (buy/sell cards, 10% tax)
   - [ ] Trading system (peer-to-peer swaps)
   - [ ] Tournois "Nuit des Érudits"
   - [ ] Friend system & private leagues

---

**Latest Update:** 2026-10-26
**Status:** 
- **MVP1 implementation complete** ✅
- **POST-MVP1 Question Database Pipeline in progress** 🚧
  - 87 questions imported from QuizzAPI.fr ✅ (Session 2026-10-23)
  - Admin dashboard complete ✅
  - QA duplicate detection script ✅
  - Next: Import 400+ more questions to reach 500+ total
- **MVP2 PvP Competition in progress (80% complete)** 🚧
  - Backend core complete: Schema, ELO, WebSocket, Matchmaking, Match Flow ✅
  - Frontend matchmaking UI complete ✅
  - Frontend match UI complete (synchronized gameplay, MCQ, timer, results) ✅
  - UI/UX Polish complete (Session 2026-10-15) ✅
  - Critical bugs fixed (Session 2026-10-15) ✅
  - NestJS upgraded to v12 for security ✅
  - Next: Ranks & Missions UI, Seasons System, Weekly Missions
- **MVP3 Phase 1 Collection complete** ✅
  - 52 cards across 5 albums ✅
  - Read-only catalog with filters ✅
  - Rarity algorithm & distribution ✅
- **Gold Economy System complete** ✅ (Session 2026-10-23)
  - Backend: Gold, Fragment, Pack modules complete ✅
  - Frontend: Stores, components, ShopPage complete ✅
  - Daily integration: Auto Gold rewards ✅
  - Streak milestones: 5-100 days bonuses ✅
  - Pack system: Purchase + opening with RNG + pity ✅
  - Fragment system: Destruction + upgrade ✅
  - UI: Currency display, pack shop, animations ✅
  - Documentation: 38-page guide + frontend guide ✅
- **MVP3 Phase 2 Tags & Personal Collection complete** ✅ (Sessions 2026-10-24/25)
  - Tags system: Create, reuse, delete, filter (12 colors, 4 max/card) ✅
  - Favorites: Star/unstar cards with instant feedback ✅
  - User ownership: Collection shows ONLY user's cards ✅
  - Tag reuse: Select existing tags for multiple cards ✅ (2026-10-25)
  - Smart filtering: Hide tags with 0 cards ✅ (2026-10-25)
  - Documentation: TAGS-SYSTEM-2026-10-24.md + COLLEC/README.md updated ✅
- **Profile Page complete** ✅ (Session 2026-10-26)
  - Profile page with stats (Daily, PvP, Collection) ✅
  - Showcase vitrine with 10 favorite cards ✅
  - Card detail modal (image, description, Wikipedia link) ✅
  - Cookie-based auth documented in ARCHITECTURE.md ✅
  - Documentation: PROFIL/README.md ✅
  - Next: V2 - Pack opening → UserCard integration
- **Documentation complete:**
  - Content strategy: `brainstorm/stratégie_bdd_quiz.md`
  - Image pipeline: `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`
  - PVP guidelines: `docs/PVP-GUIDELINES.md`
  - Gold economy: `docs/GOLD/README.md` (38 pages)
  - Frontend economy: `apps/frontend/ECONOMY_GUIDE.md`
  - Tags system: `docs/COLLEC/TAGS-SYSTEM-2026-10-24.md`
  - Collection: `docs/COLLEC/README.md` (updated schemas, routes, architecture)


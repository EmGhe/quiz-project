# Quiz Game Platform - Development Roadmap

Complete implementation roadmap from MVP1 to V3, with task breakdown and effort estimates.

## Overview

| Phase | Focus | Tasks | Estimated Time | Priority |
|-------|-------|-------|----------------|----------|
| **MVP1** | Daily Challenge | ~12 tasks | 2-3 weeks | ✅ Complete |
| **POST-MVP1** | Question Database + Images | ~18 tasks | 2-3 weeks | 🔴 Critical |
| **MVP2** | PvP Competition | ~15 tasks | 2-3 weeks | 🟠 High |
| **V2** | Collection System | ~16 tasks | 2-3 weeks | 🟡 Medium |
| **V3** | Social & Marketplace | ~20 tasks | 3-4 weeks | 🟢 Low |

**Total estimated time:** 11-16 weeks (3-4 months) for complete platform

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
- [ ] View all questions (filterable by category, difficulty, status)
- [ ] Approve/reject/edit draft questions
- [ ] View question stats (success rate, avg time, times asked)
- [ ] Bulk actions (approve multiple, delete multiple)

#### Task 14: Automated quality checks
- [ ] Duplicate detection: flag questions with >80% similar text
- [ ] Distractor validation: ensure 4-5 unique distractors per MCQ question
- [ ] Answer validation: canonical_answer must be in accepted_answers list
- [ ] Category balance check: warn if category has <50 questions
- [ ] Difficulty distribution: visualize easy/medium/hard ratio

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

**Status:** 🚧 In Progress (67% complete)

**Plan:** `docs/superpowers/plans/2026-10-09-mvp2-pvp-competition.md`

**Branch:** `mvp2-pvp-implementation`

**Latest Session:** 2026-10-15

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
- ⏳ Task 13: Ranks & Missions UI (display progression)

**Backend Advanced (Tasks 7-9):** 📋 Planned
- ⏳ Task 7: Seasons System (cron jobs, soft reset)
- ⏳ Task 8: Ranks & Divisions (promotion/demotion notifications)
- ⏳ Task 9: Weekly Missions Module (rotation, tracking)

**Additional Features:**
- ⏳ Task 14: Rematch System (30s acceptance window)
- ⏳ Task 15: Testing & Documentation (integration tests, WebSocket tests)

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

## V2 - Collection System (Monetization Layer)

**Goal:** Retention through collection + Gold economy (no Pay-to-Win)

**Status:** 📋 Planned

**Plan:** `docs/superpowers/plans/2026-10-09-v2-collection-system.md`

### Key Features
- ✅ Card system (Common → Mythic, Shiny variants)
- ✅ Pack opening (Bronze/Silver/Gold packs, server RNG)
- ✅ Albums (thematic collections, exclusive rewards)
- ✅ Gold economy (earn from Dailies/PvP, spend on packs/customization)
- ✅ Achievements (badges, titles)
- ✅ Profile customization (avatars, frames, backgrounds)
- ✅ Educational card info (learn while collecting)

### Critical Success Metrics
- Card collection engagement > 40% of active users
- Gold sink/source ratio: 0.9-1.1 (balanced economy)
- Album completion rate < 5% per album (creates long-term goals)
- Average user owns 50-100 cards after 1 month

### Technical Highlights
- **Gold duplication prevention:** Atomic transactions with row locks
- **Pack RNG fairness:** Crypto-secure random, audit logs, 10k simulation tests
- **Album completion atomicity:** Reward triggered exactly once
- **No Pay-to-Win:** Cards are purely cosmetic/educational

### Dependencies
- ✅ MVP1 + POST-MVP1 + MVP2 complete (Gold earning mechanisms exist)
- ⏳ Create 100+ card entries with educational descriptions
- ⏳ Source/generate card images (Cloudinary/S3 setup)
- ⏳ Balance Gold earning rates

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

## Next Steps

1. **Immediate (Week 1-2): POST-MVP1 Phase 1-2**
   - Design database schema for facts/questions/answers/distractors
   - Set up Wikidata integration (SPARQL queries)
   - POC: Generate 200 capital questions with variants + distractors
   - Manual QA review of first 50 questions

2. **Short-term (Weeks 3-4): POST-MVP1 Phase 3-4**
   - Extend to 4 more domains (Geography, Cinema, Science, Flags)
   - Target: 500-700 published questions
   - Build admin dashboard for question management
   - Set up automated quality checks and user reporting

3. **Medium-term (Weeks 5-6): POST-MVP1 Phase 5 + MVP1 Beta Testing**
   - Deploy new question database to production
   - Replace template questions in MVP1
   - Recruit 20-50 beta testers
   - Measure Day 1 & Day 7 retention with real content

4. **Long-term (Months 2-4):**
   - Execute MVP2 if retention validates concept
   - Continue content expansion (target 1000+ questions)
   - Execute V2 & V3
   - Scale infrastructure as user base grows

---

**Latest Update:** 2026-10-15
**Status:** 
- MVP1 implementation complete ✅
- POST-MVP1 Question Database Pipeline planned and ready to execute 🚧
- **MVP2 PvP Competition in progress (67% complete)** 🚧
  - Backend core complete: Schema, ELO, WebSocket, Matchmaking, Match Flow ✅
  - Frontend matchmaking UI complete ✅
  - Frontend match UI complete (synchronized gameplay, MCQ, timer, results) ✅
  - NestJS upgraded to v12 for security & compatibility ✅
  - Match flow simplified (category ban on stand by) ✅
  - Next: Ranks & Missions UI, Seasons System, Weekly Missions
- Task 15 (User reporting system) completed ✅ (Session 2026-10-13)
- Task 12 (Image Pipeline Infrastructure) added with design spec 📋
- Content strategy documented in `brainstorm/stratégie_bdd_quiz.md`
- Image pipeline strategy documented in `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`


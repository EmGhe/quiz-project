# Quiz Game Platform - Development Roadmap

Complete implementation roadmap from MVP1 to V3, with task breakdown and effort estimates.

## Overview

| Phase | Focus | Tasks | Estimated Time | Priority |
|-------|-------|-------|----------------|----------|
| **MVP1** | Daily Challenge | ~12 tasks | 2-3 weeks | 🔴 Critical |
| **MVP2** | PvP Competition | ~15 tasks | 2-3 weeks | 🟠 High |
| **V2** | Collection System | ~16 tasks | 2-3 weeks | 🟡 Medium |
| **V3** | Social & Marketplace | ~20 tasks | 3-4 weeks | 🟢 Low |

**Total estimated time:** 9-13 weeks (2-3 months) for complete platform

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

## MVP2 - PvP Competition (Engagement)

**Goal:** Competitive layer for engagement and depth

**Status:** 📋 Planned

**Plan:** `docs/superpowers/plans/2026-10-09-mvp2-pvp-competition.md`

### Key Features
- ✅ 1v1 Real-time matchmaking (WebSocket-based)
- ✅ Category ban phase (10s per player, sequential)
- ✅ ELO system (atomic calculations, rank display)
- ✅ Ranks & Divisions (Bronze → Grandmaster)
- ✅ Seasons (6 months, placement matches, soft reset)
- ✅ Weekly missions (3/5 completion → rewards)
- ✅ Rematch system (30s acceptance window)

### Critical Success Metrics
- PvP participation rate > 30% of Daily players
- Average matchmaking time < 45 seconds
- ELO distribution follows bell curve (median ~1200)
- Mission completion rate > 50%

### Technical Highlights
- **ELO race conditions:** Row-level locks + transactions
- **Matchmaking fairness:** ±200 ELO, expands by 50 every 10s
- **Reconnection handling:** 30s grace period for disconnects
- **Category ban validation:** Server ensures no banned categories in questions

### Dependencies
- ✅ MVP1 complete (auth, users, questions, scoring)
- ⏳ Seed 200+ published questions across 8+ categories
- ⏳ WebSocket infrastructure tested under load

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
- ✅ MVP1 + MVP2 complete (Gold earning mechanisms exist)
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
MVP1 (2-3 weeks) - BASIC DESIGN
  ↓
  Test with users, measure retention
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

1. **Immediate (Week 1):**
   - Review MVP1 plan
   - Set up staging environment (free tier hosting)
   - Seed initial 100 questions for testing

2. **Short-term (Weeks 2-4):**
   - Execute MVP1 plan (superpowers:executing-plans or subagent-driven)
   - Recruit 20-50 beta testers
   - Measure Day 1 & Day 7 retention

3. **Medium-term (Month 2):**
   - Iterate based on MVP1 feedback
   - Execute MVP2 if retention validates concept
   - Plan question generation pipeline (Wikidata integration)

4. **Long-term (Months 3-4):**
   - Execute V2 & V3
   - Scale infrastructure as user base grows
   - Implement monetization (optional, not in current plans)

---

**Latest Update:** 2026-10-09
**Status:** All implementation plans drafted, ready for execution


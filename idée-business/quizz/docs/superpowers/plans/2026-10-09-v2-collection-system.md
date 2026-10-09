# V2 - Collection System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement card collection system with packs, albums, Gold economy, achievements, and profile customization (no Pay-to-Win).

**Architecture:** Card metadata in JSON, ownership in database, pack opening with server-side RNG, Gold balance tracking with atomic transactions, achievement triggers via events.

**Tech Stack:**
- Backend: Cards module, Packs module, Economy module, Achievements module
- Frontend: Card gallery, pack opening animation (Framer Motion), collection progress
- Storage: Card images on Cloudinary/S3

**Spec:** `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/vision_globale.md` sections 27-46

## Global Constraints

- All from MVP1 + MVP2 plus:
- Gold transactions MUST be atomic (no duplication exploits)
- Pack RNG MUST use cryptographically secure random (crypto.randomBytes)
- Card ownership MUST be validated before trades/sales
- Marketplace transactions MUST have 10% tax (Gold sink)
- Cards MUST NOT provide gameplay advantage (no Pay-to-Win)
- Album completion rewards MUST be one-time only
- Gold balance MUST never go negative (validate before deduct)

## Review Focus

1. **Gold duplication prevention** - Concurrent transactions must use row-level locks; test with simultaneous pack purchases
2. **Pack probability fairness** - Rarity distribution must match declared rates (e.g., 5% legendary); audit with 10k simulated opens
3. **Trade atomicity** - Card swaps must complete fully or rollback (A gives card to B, B gives card to A, or neither)
4. **Album completion detection** - Parallel card acquisitions completing an album must trigger reward exactly once
5. **Marketplace price manipulation** - Detect suspicious patterns (same users trading back/forth); implement cooldowns

## Task Summary

### Task 1: Card System Schema
- Models: `Card` (metadata), `UserCard` (ownership), `CardCollection` (user's cards), `Album`, `AlbumCard`
- Rarity enum: Common, Uncommon, Rare, Epic, Legendary, Mythic
- Shiny variants (boolean flag)
- Card categories (Person, Event, Place, Object, Animal)

### Task 2: Gold Economy Schema
- `UserBalance` model (userId, gold, transactions audit log)
- `GoldTransaction` (userId, amount, type, description, timestamp)
- Transaction types: daily_reward, pvp_win, mission_complete, pack_purchase, market_purchase, market_sale, market_tax

### Task 3: Pack System
- Pack types: Bronze (5 cards), Silver (5 cards, better odds), Gold (5 cards, best odds)
- Probability tables in config
- Server-side RNG with seed logging (for audit)
- Pack opening logic (generate 5 cards based on probabilities)

### Task 4: Packs Module Implementation
- `POST /api/packs/open` - costs Gold, returns 5 cards, adds to user inventory
- Pack purchase validation (sufficient Gold)
- Atomic transaction (deduct Gold, add cards)
- Duplicate handling (still add to collection, enables trading)

### Task 5: Cards Module
- `GET /api/cards` - all card metadata
- `GET /api/cards/collection` - user's owned cards
- `GET /api/cards/:id` - card details with educational info
- Card image URLs (from Cloudinary)

### Task 6: Albums System
- Album definitions (e.g., "Histoire de France", "Conquête Spatiale")
- `GET /api/albums` - list with completion status
- `GET /api/albums/:id` - cards in album, user's progress
- Album completion detection
- Exclusive card reward on completion

### Task 7: Achievements Module
- Achievement definitions in code (e.g., "7-day streak", "100 PvP wins", "Complete 3 albums")
- Progress tracking (listener pattern or event emitters)
- `GET /api/achievements` - user's achievements with progress
- Badge/title rewards

### Task 8: Profile Customization
- `UserProfile` model (avatar, frame, background, title, badge)
- Customization items purchasable with Gold
- `GET /api/profile/:userId` - public profile view
- `PATCH /api/profile` - update customization

### Task 9: Frontend - Card Gallery
- Grid view with filters (rarity, category, owned/not owned)
- Card flip animation on hover
- Search functionality
- Shiny indicator

### Task 10: Frontend - Pack Opening
- Purchase confirmation modal
- Animated pack opening (Framer Motion)
- Card reveal sequence
- "New card" badge vs "Duplicate" indicator

### Task 11: Frontend - Albums View
- Album list with progress bars
- Album detail view (card grid, greyed-out for missing)
- Completion reward display
- Exclusive card showcase

### Task 12: Frontend - Profile Customization
- Avatar/frame/background selection UI
- Live preview
- Purchase options (Gold cost)
- Equipped items indicator

### Task 13: Achievements UI
- Achievement list with progress
- Badge display on profile
- Title selection
- Toast notification on unlock

### Task 14: Gold Display & Economy UI
- Gold balance in header
- Transaction history page
- Gold sources breakdown (analytics)

### Task 15: Seed Initial Cards
- Create 100+ card entries (persons, events, places)
- Educational descriptions for each
- Source card images (generate or use free stock)
- Assign to albums

### Task 16: Testing & Balancing
- Test Gold transaction atomicity with concurrent requests
- Simulate 10k pack openings, verify probability distribution
- Test album completion with rapid card acquisition
- Balance Gold earning rates vs spending

**No Pay-to-Win verification:** Ensure cards provide zero gameplay advantage in Daily or PvP. They are purely cosmetic/educational.


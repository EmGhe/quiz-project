# V3 - Social & Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement card marketplace (trading, sales, auctions), friend system, private leagues, "Nuit des Érudits" tournament, and advanced social features.

**Architecture:** Marketplace with order book pattern, friend graph in database, league as isolated leaderboard, tournament as bracket system, Gold sink via marketplace tax.

**Tech Stack:**
- Backend: Marketplace module, Friends module, Leagues module, Tournament module
- Frontend: Marketplace UI, friend list, league dashboard, tournament bracket
- Real-time: WebSocket for live market updates and tournament progression

**Spec:** `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/vision_globale.md` sections 34-49

## Global Constraints

- All from MVP1 + MVP2 + V2 plus:
- Marketplace transactions MUST be atomic with 10% tax (Gold sink)
- Card listings MUST lock the card (prevent double-sale)
- Trades MUST exchange cards atomically (both parties confirm)
- Auctions MUST prevent bid sniping (extend timer on last-minute bids)
- Private leagues MUST isolate stats (no Gold rewards)
- Tournament entry MUST cost Gold (Gold sink)
- Friend requests MUST be bidirectional (accept/reject)
- Tournament brackets MUST handle odd player counts

## Review Focus

1. **Marketplace double-spend** - Seller lists card, buyer A & B purchase simultaneously; only one succeeds, other gets refund
2. **Trade confirmation race** - Both users click "confirm" at same instant; transaction must complete exactly once
3. **Auction bid race** - Two users bid same amount in final second; highest timestamp wins, other gets refund
4. **Tournament bracket fairness** - Odd player count must give bye to highest seed, not arbitrary
5. **League score isolation** - Points in private league must not affect global ELO or Gold earnings

## Task Summary

### Task 1: Marketplace Schema
- Models: `MarketListing`, `MarketTransaction`, `CardTrade`, `Auction`
- Listing types: fixed_price, auction
- Card lock mechanism (listed cards unavailable for other actions)
- Transaction log for audit

### Task 2: Marketplace - Fixed Price Sales
- `POST /api/market/list` - list card at fixed price (locks card)
- `GET /api/market` - browse listings with filters
- `POST /api/market/purchase/:listingId` - buy card (atomic: deduct Gold, transfer card, tax seller, unlock card)
- `DELETE /api/market/cancel/:listingId` - cancel listing (unlock card)

### Task 3: Marketplace - Auctions
- Auction model (cardId, startPrice, currentBid, highestBidder, endTime)
- `POST /api/market/auction/create` - start auction
- `POST /api/market/auction/bid/:auctionId` - place bid (validate > currentBid)
- Auto-extend timer if bid placed in last 2 minutes
- Auction end cron job (transfer card to winner, refund losers)

### Task 4: Card Trading Module
- `POST /api/trades/offer` - propose trade (user A offers cards X,Y for user B's cards Z,W)
- `GET /api/trades/incoming` - pending trade offers
- `POST /api/trades/accept/:tradeId` - accept trade (atomic swap)
- `DELETE /api/trades/reject/:tradeId` - reject trade
- Trade expiration (24 hours)

### Task 5: Friends System Schema
- Models: `Friendship` (userId1, userId2, status: pending/accepted)
- Friend request logic (bidirectional)
- Friend list

### Task 6: Friends Module
- `POST /api/friends/request/:userId` - send friend request
- `GET /api/friends/requests` - pending requests
- `POST /api/friends/accept/:requestId` - accept
- `DELETE /api/friends/remove/:userId` - unfriend
- `GET /api/friends` - friend list with online status

### Task 7: Private Leagues Schema
- Models: `League` (name, ownerId, inviteCode), `LeagueMember`, `LeagueScore`
- League as isolated leaderboard (tracks Daily scores, PvP wins within league)
- No Gold rewards for league placement

### Task 8: Leagues Module
- `POST /api/leagues/create` - create private league (generates invite code)
- `POST /api/leagues/join` - join via invite code
- `GET /api/leagues/:id` - league info and leaderboard
- `GET /api/leagues/:id/members` - member list
- League stats (aggregate member performance)

### Task 9: Tournament System Schema
- Models: `Tournament` (name, entryFee, prizePool, status), `TournamentParticipant`, `TournamentMatch`, `TournamentBracket`
- "Nuit des Érudits" as special tournament type
- Single-elimination bracket

### Task 10: Tournament Module
- `POST /api/tournaments/enter/:tournamentId` - pay entry fee (Gold sink)
- Tournament start cron (generates bracket)
- Bracket generation (seed by ELO, bye for odd count)
- Tournament match = special PvP match
- Advance winners to next round
- Prize distribution to winner

### Task 11: Frontend - Marketplace UI
- Market browse page (grid of listings)
- Filters (rarity, price range, card type)
- Purchase confirmation modal
- Sell card modal (set price)

### Task 12: Frontend - Auction UI
- Auction browse page
- Live bid updates (WebSocket)
- Bid placement with validation
- Countdown timer
- "You've been outbid" notification

### Task 13: Frontend - Trading UI
- Trade offer creation (select cards from inventory + target user)
- Incoming trades list
- Trade preview (side-by-side card comparison)
- Accept/Reject buttons

### Task 14: Frontend - Friends UI
- Friend list with online indicators
- Add friend modal (search by username)
- Friend requests notifications
- Friend profile view (stats, collection)

### Task 15: Frontend - Leagues UI
- Create league modal
- Join league (enter invite code)
- League dashboard (leaderboard, members, recent activity)
- Invite code copy button

### Task 16: Frontend - Tournament UI
- Tournament lobby (list of upcoming tournaments)
- Entry confirmation modal
- Bracket view (visual bracket tree)
- Live match updates
- Prize distribution display

### Task 17: Social Post-Game Reactions
- Quick reactions after PvP (GG, 🔥, etc.)
- No text chat (emoji-only, pre-defined)
- Reaction display in match history

### Task 18: Anti-Cheat & Fraud Detection
- Detect marketplace manipulation (same users trading back/forth)
- Flag suspicious patterns (new account buying expensive cards)
- Admin dashboard for reviewing flags
- Rate limiting on marketplace actions

### Task 19: Testing & Balancing
- Simulate concurrent marketplace purchases
- Test auction bid races
- Test trade atomicity with simultaneous confirmations
- Balance Gold sinks (marketplace tax, tournament fees) vs sources
- Test tournament bracket with various player counts (7, 8, 9, 15, 16, 17)

### Task 20: Documentation & Admin Tools
- Marketplace API documentation
- Admin panel for managing tournaments
- Fraud detection dashboard
- Economy analytics (Gold in circulation, sinks vs sources)

**Gold Economy Validation:** At this point, verify Gold sinks (marketplace tax, tournament fees, pack purchases, customization) balance Gold sources (Dailies, PvP, missions) to prevent inflation.


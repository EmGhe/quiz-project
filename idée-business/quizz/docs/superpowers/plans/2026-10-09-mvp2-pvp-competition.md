# MVP2 - PvP Competition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 1v1 PvP matchmaking with ELO system, category bans, ranks/divisions, seasons, and weekly missions.

**Architecture:** WebSocket server for real-time matchmaking and game sync, ELO calculation server-side, matchmaking queue with skill-based pairing, server validates all game state.

**Tech Stack:**
- Backend: NestJS WebSocket gateway (@nestjs/websockets, socket.io)
- Frontend: Socket.io-client for real-time updates
- Database: Match history, ELO ratings, seasons, missions

**Spec:** `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/vision_globale.md` sections 13-26

## Global Constraints

- All from MVP1 plus:
- ELO calculations MUST be atomic (prevent race conditions)
- WebSocket messages MUST be validated server-side
- Matchmaking MUST prevent same-user matching
- Category ban phase limited to 10 seconds per player
- Questions selected after bans (cannot pre-generate)
- Season length: 6 months
- Placement matches: 5 games minimum

## Review Focus

1. **ELO race conditions** - Concurrent match endings must not corrupt ELO; use database transactions
2. **Matchmaking fairness** - ±200 ELO window initially, expands by 50 every 10 seconds; max wait 2 minutes
3. **WebSocket reconnection** - Player disconnect during match must allow 30s reconnect window without forfeit
4. **Category ban validation** - Server must verify banned categories don't appear in questions
5. **Season rollover atomicity** - Season end calculations (rewards, rank resets) must complete before new season starts

## Task Summary

### Task 1: PvP Database Schema
- Models: `PvpMatch`, `MatchPlayer`, `UserElo`, `Season`, `WeeklyMission`, `MissionProgress`
- ELO history tracking
- Match state enum (waiting, category_ban, in_progress, completed)

### Task 2: ELO Service
- Calculate ELO delta based on rating difference
- Atomic ELO updates with transactions
- Rank calculation from ELO (Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster)
- Placement match logic

### Task 3: WebSocket Gateway Setup
- Socket.io integration
- Authentication middleware for WebSocket
- Room management (match rooms)
- Event handlers structure

### Task 4: Matchmaking Queue Service
- In-memory queue (userId → ELO, timestamp)
- Pairing algorithm (closest ELO within expanding window)
- Queue join/leave
- Match creation when pair found

### Task 5: Category Ban Phase
- 10-second timer per player
- Sequential bans (Player 1 bans → Player 2 bans → reveal)
- Question pool filtering by banned categories
- 10 questions selected after bans

### Task 6: PvP Match Flow
- Match start → category ban → questions served → answers validated → scoring → results → ELO update
- Server authoritative timing
- Concurrent answer submission handling
- Tie-breaker logic (same score → faster total time wins)

### Task 7: Seasons System
- Season creation cron job
- Placement matches (first 5 games of season)
- Soft reset formula (pull toward median)
- Season rewards distribution

### Task 8: Ranks & Divisions
- ELO ranges for each rank
- Division calculation (e.g., Gold III, Gold II, Gold I)
- Promotion/demotion logic
- Rank display in profile

### Task 9: Weekly Missions Module
- Mission types: "Win 5 PvP", "Answer 100 questions", "3 Dailies", "80% accuracy in History"
- Mission rotation (new set each Monday UTC)
- Progress tracking
- Reward distribution (3/5 missions → 1 pack + Gold)

### Task 10: Frontend - Matchmaking UI
- "Find Match" button
- Queue status display
- Estimated wait time
- Cancel search

### Task 11: Frontend - Category Ban UI
- 10-second countdown timer
- Category grid selection
- Locked-in indicator
- Opponent ban reveal

### Task 12: Frontend - PvP Match UI
- Question display with timer
- Answer input
- Real-time opponent progress (question count, not answers)
- Match results with ELO change

### Task 13: Frontend - Ranks & Missions
- Rank badge display
- Division progress bar
- Weekly missions list with progress
- Mission rewards claim

### Task 14: Rematch System
- Rematch offer after match
- 30-second acceptance window
- New match with same players

### Task 15: Testing & Documentation
- Simulate concurrent matches
- Test ELO edge cases (new player vs veteran)
- Test WebSocket reconnection
- Document PvP API

**Implementation note:** Each task follows TDD - write failing tests first, implement to pass, commit. WebSocket events must have integration tests simulating two connected clients.


# Testing Guide: MVP2 Task 12 - PvP Match UI

## Prerequisites

1. Backend running: `cd apps/backend && npm run dev`
2. Frontend running: `cd apps/frontend && npm run dev`
3. Database with at least 10 published questions with `enabledForMcq = true` and 4 distractors each

## Quick Test with 2 Browser Tabs

### Setup
1. Open 2 **incognito/private** browser windows (to avoid session conflicts)
2. Register 2 different users:
   - Tab 1: `user1@test.com` / `password123`
   - Tab 2: `user2@test.com` / `password123`

### Test Flow

**Step 1: Join matchmaking**
- Tab 1: Navigate to `/pvp` → Click "Trouver un adversaire"
- Tab 2: Navigate to `/pvp` → Click "Trouver un adversaire"
- Expected: Both tabs show "Recherche d'adversaire..." then auto-navigate to `/pvp/match`

**Step 2: Play the match**
- Both tabs show the same question with 5 shuffled choices
- Timer counts down from 10s
- Click a choice in each tab (can be different choices)
- Expected:
  - ✓ "Vous avez répondu" appears in the tab that answered
  - ✓ "Adversaire a répondu" appears in the other tab when opponent answers
  - After 10s, revelation phase shows:
    - Green highlight on correct answer
    - Red highlight on incorrect choice (if selected)
    - Points gained displayed for each player
  - After 3s, automatically moves to next question

**Step 3: Complete match (10 questions)**
- Repeat Step 2 for all 10 questions
- After Q10, both tabs auto-navigate to `/pvp/results`
- Expected results screen shows:
  - Winner/loser banner (🏆 or 😔)
  - Final scores
  - ELO change (+/- points)
  - Match statistics

**Step 4: Verify ELO update**
- Click "Retour au menu" → Navigate to profile or stats
- Expected: User's ELO should reflect the change shown in results

## Edge Cases to Test

### Timer expiration (no answer)
- Don't click any choice for a question
- Expected: After 10s, revelation shows no points gained (0 pts)

### Both players answer correctly
- Both select the correct answer
- Expected: Both get points, faster player gets more points

### One correct, one incorrect
- Tab 1: select correct, Tab 2: select incorrect
- Expected: Tab 1 gets points, Tab 2 gets 0 points

### Match cancellation
- During matchmaking, close one tab or disconnect WebSocket
- Expected: Other player sees "Match annulé" and returns to matchmaking

## Known Issues / TODO

- [ ] Random question selection (currently uses `orderBy createdAt desc` - not truly random)
- [ ] Need to validate that all questions have exactly 4 distractors
- [ ] No reconnection handling (if player disconnects mid-match)
- [ ] Timer sync might drift if client-side timer is off (should be server-authoritative)

## Backend Logs to Monitor

```bash
# Matchmaking
User <userId> joined queue (ELO: 1200, Queue size: 1)
Match created: <matchId> (player1 vs player2)

# Match flow
[Match] Question start: { questionIndex: 0, timerMs: 10000 }
[Match] Player answered: { playerId, questionIndex }
[Match] Question end: { questionIndex, correctAnswer, ... }
[Match] Complete: { winnerId, scores, eloChanges }
```

## Database Verification

```sql
-- Check match was recorded
SELECT * FROM pvp_matches WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1;

-- Check ELO updates
SELECT user_id, elo, rank, division FROM user_elos WHERE user_id IN ('user1-id', 'user2-id');

-- Check metadata stored correctly
SELECT metadata FROM pvp_matches WHERE id = '<match-id>';
```

## Performance Notes

- Each question timer is 10s
- Revelation phase is 3s
- Total match duration: 10 * (10s + 3s) = 130s (~2 minutes)
- WebSocket events: ~40 events per match (question_start, question_end, player_answered × 2 per question)

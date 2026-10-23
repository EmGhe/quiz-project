-- Migration: Add Gold Economy Complete
-- Description: Adds Gold + Fragments currencies, Packs system, Streaks, and User Cards

-- ==========================================
-- 1. Add Gold & Fragments to Users
-- ==========================================
ALTER TABLE "users" ADD COLUMN "gold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "fragments" INTEGER NOT NULL DEFAULT 0;

-- ==========================================
-- 2. Gold Transactions
-- ==========================================
CREATE TABLE "gold_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gold_transactions_userId_idx" ON "gold_transactions"("userId");
CREATE INDEX "gold_transactions_createdAt_idx" ON "gold_transactions"("createdAt");
CREATE INDEX "gold_transactions_reason_idx" ON "gold_transactions"("reason");

ALTER TABLE "gold_transactions" ADD CONSTRAINT "gold_transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- 3. Fragment Transactions
-- ==========================================
CREATE TABLE "fragment_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fragment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fragment_transactions_userId_idx" ON "fragment_transactions"("userId");
CREATE INDEX "fragment_transactions_createdAt_idx" ON "fragment_transactions"("createdAt");

ALTER TABLE "fragment_transactions" ADD CONSTRAINT "fragment_transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- 4. Pack Type Enum & Pack Config
-- ==========================================
CREATE TYPE "PackType" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

CREATE TABLE "pack_configs" (
    "id" TEXT NOT NULL,
    "type" "PackType" NOT NULL,
    "cost" INTEGER NOT NULL,
    "cardCount" INTEGER NOT NULL DEFAULT 5,
    "commonChance" INTEGER NOT NULL,
    "rareChance" INTEGER NOT NULL,
    "epicChance" INTEGER NOT NULL,
    "legendaryChance" DOUBLE PRECISION NOT NULL,
    "minRares" INTEGER NOT NULL,
    "minEpics" INTEGER NOT NULL,
    "epicPityCount" INTEGER NOT NULL,
    "legendaryPityCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pack_configs_type_key" ON "pack_configs"("type");

-- ==========================================
-- 5. Packs
-- ==========================================
CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PackType" NOT NULL,
    "cost" INTEGER NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "cards" JSONB,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "packs_userId_opened_idx" ON "packs"("userId", "opened");

ALTER TABLE "packs" ADD CONSTRAINT "packs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- 6. User Pity Counters
-- ==========================================
CREATE TABLE "user_pity_counters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packType" "PackType" NOT NULL,
    "packsOpenedSinceLegendary" INTEGER NOT NULL DEFAULT 0,
    "packsOpenedSinceEpic" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_pity_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_pity_counters_userId_packType_key" ON "user_pity_counters"("userId", "packType");

ALTER TABLE "user_pity_counters" ADD CONSTRAINT "user_pity_counters_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- 7. User Cards
-- ==========================================
CREATE TABLE "user_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "baseRarity" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upgradedAt" TIMESTAMP(3),

    CONSTRAINT "user_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_cards_userId_cardId_key" ON "user_cards"("userId", "cardId");
CREATE INDEX "user_cards_userId_idx" ON "user_cards"("userId");

ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- 8. Streak Rewards
-- ==========================================
CREATE TABLE "streak_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streakLevel" INTEGER NOT NULL,
    "rewardGold" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "streak_rewards_userId_streakLevel_key" ON "streak_rewards"("userId", "streakLevel");

ALTER TABLE "streak_rewards" ADD CONSTRAINT "streak_rewards_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

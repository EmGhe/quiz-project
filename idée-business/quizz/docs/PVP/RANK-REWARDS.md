# PvP Rank Rewards System

**Status:** 📋 Spécification (à implémenter)  
**Version:** 1.0  
**Date:** 2026-10-25

---

## Vue d'ensemble

Les joueurs gagnent des rewards **uniquement lors des montées de rang**, pas par victoire individuelle.

**Principe clé:** Une montée de rang ne donne des rewards qu'**une seule fois par saison**.

---

## Règles Métier

### 1. Match PvP - Aucun Gold Direct

| Résultat | ELO | Gold | Fragments | Packs |
|----------|-----|------|-----------|-------|
| Victoire | +20-40 | 0 | 0 | 0 |
| Défaite | -15-30 | 0 | 0 | 0 |

**Seule la montée de rang donne des rewards.**

---

### 2. Montée de Rang - Rewards Une Fois par Saison

**Trigger:** Lorsque le joueur passe d'un rang N à un rang N+1.

**Exemple:**
- Joueur Bronze 3 (1000 ELO) gagne un match
- ELO passe à 1050 → Bronze 2
- **Trigger:** Rewards Bronze 2

**Rewards reçues:**
- Gold (montant selon le rang)
- Fragments (type et quantité selon le rang)
- Pack(s) (type et quantité selon le rang)

---

### 3. Anti-Farming - Rewards Une Seule Fois

**Scenario problématique (à empêcher):**
1. Joueur monte Bronze 3 → Bronze 2 → reçoit rewards ✅
2. Joueur perd des matchs → descend Bronze 2 → Bronze 3
3. Joueur remonte Bronze 3 → Bronze 2
4. **Question:** Reçoit-il à nouveau les rewards ?

**Réponse:** ❌ **NON** - Déjà reçues sur cette saison.

**Implémentation:**
- Table `UserSeasonRankReward` avec contrainte unique `(userId, seasonId, rank)`
- Flag `claimed: boolean`
- On vérifie avant de donner les rewards

---

### 4. Reset Saisonnier

**À chaque nouvelle saison:**
1. Soft reset ELO (tous les joueurs ramenés vers 1200)
2. Archive `UserSeasonRankReward` entries (historique)
3. Crée nouvelle entrée de saison
4. Joueur peut à nouveau gagner **toutes** les rewards de montée de rang

**Exemple:**
- Saison Hiver 2026: Joueur a réclamé Bronze 2, Silver 1, Gold 3
- Saison Printemps 2026 commence
- Joueur peut à nouveau réclamer Bronze 2, Silver 1, Gold 3 (+ tous les autres rangs)

---

## Table des Rewards par Rang

### Bronze Tier (1000-1199 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Bronze 3 → Bronze 2 | 60 | 10 Rare | 1 Bronze |
| Bronze 2 → Bronze 1 | 80 | 15 Rare | 1 Bronze |

### Silver Tier (1200-1399 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Bronze 1 → Silver 3 | 100 | 20 Rare | 2 Bronze |
| Silver 3 → Silver 2 | 120 | 25 Rare | 1 Silver |
| Silver 2 → Silver 1 | 150 | 30 Epic | 1 Silver |

### Gold Tier (1400-1599 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Silver 1 → Gold 3 | 180 | 40 Epic | 2 Silver |
| Gold 3 → Gold 2 | 200 | 50 Epic | 1 Gold |
| Gold 2 → Gold 1 | 250 | 60 Epic | 1 Gold |

### Platinum Tier (1600-1799 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Gold 1 → Platinum 3 | 300 | 80 Epic | 2 Gold |
| Platinum 3 → Platinum 2 | 350 | 100 Epic | 1 Gold + 1 Silver |
| Platinum 2 → Platinum 1 | 400 | 120 Epic | 2 Gold |

### Diamond Tier (1800-1999 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Platinum 1 → Diamond 3 | 450 | 140 Epic | 3 Gold |
| Diamond 3 → Diamond 2 | 500 | 150 Legendary | 3 Gold |
| Diamond 2 → Diamond 1 | 600 | 200 Legendary | 4 Gold |

### Master Tier (2000-2199 ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Diamond 1 → Master 3 | 700 | 250 Legendary | 5 Gold |
| Master 3 → Master 2 | 800 | 300 Legendary | 5 Gold + 1 Silver |
| Master 2 → Master 1 | 900 | 350 Legendary | 6 Gold |

### Grandmaster Tier (2200+ ELO)

| Montée | Gold | Fragments | Packs |
|--------|------|-----------|-------|
| Master 1 → Grandmaster | 1000 | 400 Legendary | 8 Gold |

**Note:** Valeurs à ajuster selon le testing et l'économie du jeu.

---

## Implémentation Backend

### 1. Database Schema

```prisma
model UserSeasonRankReward {
  id        String   @id @default(cuid())
  userId    String
  seasonId  String
  rank      String   // "bronze_2", "silver_1", "gold_3", etc.
  claimed   Boolean  @default(false)
  claimedAt DateTime?
  createdAt DateTime @default(now())
  
  // Rewards données
  goldAmount      Int
  fragmentAmount  Int
  fragmentType    String // "rare", "epic", "legendary"
  packs           Json   // [{ type: "bronze", count: 1 }]
  
  user   User   @relation(fields: [userId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])
  
  @@unique([userId, seasonId, rank])
  @@index([userId, seasonId])
}

model Season {
  id        String   @id @default(cuid())
  name      String   // "Hiver 2026", "Printemps 2026"
  startDate DateTime
  endDate   DateTime
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  
  rankRewards UserSeasonRankReward[]
  
  @@index([isActive])
}
```

### 2. Service Logic

```typescript
// apps/backend/src/modules/pvp/services/rank-rewards.service.ts

interface RankReward {
  rank: string;
  gold: number;
  fragments: {
    amount: number;
    type: 'rare' | 'epic' | 'legendary';
  };
  packs: Array<{
    type: 'bronze' | 'silver' | 'gold';
    count: number;
  }>;
}

const RANK_REWARDS: Record<string, RankReward> = {
  bronze_2: {
    rank: 'bronze_2',
    gold: 60,
    fragments: { amount: 10, type: 'rare' },
    packs: [{ type: 'bronze', count: 1 }],
  },
  bronze_1: {
    rank: 'bronze_1',
    gold: 80,
    fragments: { amount: 15, type: 'rare' },
    packs: [{ type: 'bronze', count: 1 }],
  },
  // ... tous les autres rangs
};

class RankRewardsService {
  async checkAndGrantRankReward(
    userId: string,
    newRank: string,
  ): Promise<RankReward | null> {
    const activeSeason = await this.getActiveSeason();
    
    // Check si déjà réclamé cette saison
    const existingClaim = await prisma.userSeasonRankReward.findUnique({
      where: {
        userId_seasonId_rank: {
          userId,
          seasonId: activeSeason.id,
          rank: newRank,
        },
      },
    });
    
    if (existingClaim?.claimed) {
      // Déjà réclamé cette saison
      return null;
    }
    
    const reward = RANK_REWARDS[newRank];
    if (!reward) return null;
    
    // Transaction atomique
    await prisma.$transaction(async (tx) => {
      // 1. Marquer comme réclamé
      await tx.userSeasonRankReward.upsert({
        where: {
          userId_seasonId_rank: {
            userId,
            seasonId: activeSeason.id,
            rank: newRank,
          },
        },
        create: {
          userId,
          seasonId: activeSeason.id,
          rank: newRank,
          claimed: true,
          claimedAt: new Date(),
          goldAmount: reward.gold,
          fragmentAmount: reward.fragments.amount,
          fragmentType: reward.fragments.type,
          packs: reward.packs,
        },
        update: {
          claimed: true,
          claimedAt: new Date(),
        },
      });
      
      // 2. Donner Gold
      await this.goldService.addGold(userId, reward.gold, {
        source: 'pvp_rank_promotion',
        metadata: { rank: newRank, season: activeSeason.name },
      });
      
      // 3. Donner Fragments
      await this.fragmentService.addFragments(
        userId,
        reward.fragments.amount,
        reward.fragments.type,
        { source: 'pvp_rank_promotion', rank: newRank },
      );
      
      // 4. Donner Packs
      for (const pack of reward.packs) {
        await this.packService.addPacks(userId, pack.type, pack.count, {
          source: 'pvp_rank_promotion',
          rank: newRank,
        });
      }
    });
    
    return reward;
  }
}
```

### 3. Intégration dans Match Flow

```typescript
// Après mise à jour ELO
const oldRank = this.eloService.calculateRank(oldElo);
const newRank = this.eloService.calculateRank(newElo);

if (oldRank !== newRank && this.isPromotion(oldRank, newRank)) {
  // Montée de rang détectée
  const reward = await this.rankRewardsService.checkAndGrantRankReward(
    userId,
    newRank,
  );
  
  if (reward) {
    // Envoyer notification au joueur
    this.notificationService.send(userId, {
      type: 'rank_promotion',
      rank: newRank,
      rewards: reward,
    });
  }
}
```

---

## UI/UX Frontend

### 1. Notification Rank Promotion

**Popup modal après match si promotion:**

```
┌─────────────────────────────────┐
│   🎉 PROMOTION DE RANG ! 🎉    │
├─────────────────────────────────┤
│                                 │
│      [Badge Bronze 2]           │
│                                 │
│   Tu es maintenant Bronze 2 !  │
│                                 │
│   Récompenses :                 │
│   💰 60 Gold                    │
│   🔹 10 Fragments Rare          │
│   📦 1 Pack Bronze              │
│                                 │
│        [RÉCUPÉRER]              │
└─────────────────────────────────┘
```

### 2. Historique Rank Rewards (Profil)

Section "Récompenses de Rang - Saison Actuelle"

```
Saison Hiver 2026

✅ Bronze 2    60 Gold, 10 Rare, 1 Bronze
✅ Bronze 1    80 Gold, 15 Rare, 1 Bronze
✅ Silver 3    100 Gold, 20 Rare, 2 Bronze
⬜ Silver 2    (Non atteint)
⬜ Silver 1    (Non atteint)
```

---

## Métriques à Tracker

- Nombre de rank promotions par jour
- Montant de Gold distribué via rank rewards
- Distribution des joueurs par rang
- Taux de rétention après première promotion
- Économie: Ratio Gold gagné (Daily + Ranks) vs dépensé (Packs)

---

## Migration & Déploiement

**Phase 1: Backend**
1. Créer migration Prisma (Season + UserSeasonRankReward)
2. Créer saison initiale "Beta 2026"
3. Implémenter RankRewardsService
4. Intégrer dans match flow

**Phase 2: Frontend**
1. Modal rank promotion
2. Section historique rewards
3. Notifications

**Phase 3: Testing**
1. Tester anti-farming (monter/descendre/remonter)
2. Vérifier atomicité des transactions
3. Tester reset saisonnier

---

**Auteur:** Spec basée sur feedback utilisateur  
**Prochaine étape:** Implémenter backend (RankRewardsService)

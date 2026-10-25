# Page Profil - Spécification

**Status:** 📋 Spécification (à implémenter)  
**Version:** 1.0  
**Date:** 2026-10-25

---

## Vue d'ensemble

Page profil personnalisée affichant les statistiques, performances et progression du joueur avec un **système de surnom dynamique** basé sur ses performances.

---

## Système de Surnoms Dynamiques

### Principe

Le surnom du joueur évolue automatiquement selon ses performances sur:
- **Daily Challenge** (streak, taux de réussite, vitesse)
- **PvP** (rang, ELO, victoires)
- **Collection** (nombre de cartes, raretés possédées)

**Exemple:**
- Novice → "Explorateur"
- Daily expert → "Maître du Quotidien"
- PvP Diamond → "Champion Érudit"
- Collection complète → "Collectionneur Légendaire"

---

## Catégories de Surnoms

### 1. Surnoms Daily Challenge

Basés sur le **streak** et le **taux de réussite moyen**.

| Conditions | Surnom | Badge |
|------------|--------|-------|
| Débutant (streak < 3) | **Explorateur** | 🔍 |
| Streak 3-6 jours | **Apprenti Érudit** | 📚 |
| Streak 7-13 jours | **Disciple Assidu** | ✍️ |
| Streak 14-29 jours | **Sage du Quotidien** | 🎓 |
| Streak 30-49 jours | **Maître du Quotidien** | 👑 |
| Streak 50-74 jours | **Grand Maître Érudit** | ⭐ |
| Streak 75-99 jours | **Encyclopédie Vivante** | 📖 |
| Streak 100+ jours | **Gardien du Savoir** | 🏆 |

**Modificateurs de vitesse** (taux réponses rapides > 80%):
- Ajoute "Éclair" avant le titre
- Ex: "Éclair Sage du Quotidien" ⚡

**Modificateurs de précision** (taux réussite > 90%):
- Ajoute "Infaillible" avant le titre
- Ex: "Infaillible Maître du Quotidien" 🎯

**Cumul possible:**
- "Éclair Infaillible Gardien du Savoir" (100+ streak, 90%+ réussite, 80%+ rapidité)

---

### 2. Surnoms PvP

Basés sur le **rang actuel** et le **nombre de victoires**.

| Rang | Surnom de Base | Badge |
|------|----------------|-------|
| Bronze 3-1 | **Duelliste Novice** | ⚔️ |
| Silver 3-1 | **Combattant Prometteur** | 🛡️ |
| Gold 3-1 | **Guerrier Cultivé** | ⚜️ |
| Platinum 3-1 | **Champion Érudit** | 💎 |
| Diamond 3-1 | **Légende Intellectuelle** | 💠 |
| Master 3-1 | **Titan du Savoir** | 👑 |
| Grandmaster | **Dieu de l'Érudition** | 🌟 |

**Modificateurs de victoires:**
- 50+ victoires: "Vétéran" (ex: "Vétéran Guerrier Cultivé")
- 100+ victoires: "Conquérant" (ex: "Conquérant Champion Érudit")
- 250+ victoires: "Invincible" (ex: "Invincible Légende Intellectuelle")
- 500+ victoires: "Immortel" (ex: "Immortel Titan du Savoir")

**Modificateurs de série:**
- Série de 5+ victoires: Ajoute "🔥" à la fin
- Série de 10+ victoires: Ajoute "🔥🔥" à la fin

---

### 3. Surnoms Collection

Basés sur le **nombre de cartes** et les **raretés complètes**.

| Conditions | Surnom | Badge |
|------------|--------|-------|
| 0-9 cartes | **Collectionneur Débutant** | 🃏 |
| 10-24 cartes | **Chasseur de Cartes** | 🎴 |
| 25-49 cartes | **Archiviste Passionné** | 📇 |
| 50-99 cartes | **Conservateur Émérite** | 🗃️ |
| 100-149 cartes | **Maître Collectionneur** | 💼 |
| 150+ cartes | **Gardien du Trésor** | 💎 |

**Modificateurs de rareté:**
- Toutes les Common: "Fondations Solides"
- Toutes les Rare: "Amateur de Raretés"
- Toutes les Epic: "Traqueur d'Épiques"
- Toutes les Legendary: "Chasseur de Légendes" 🌟
- TOUTES les raretés complètes: **"Collectionneur Légendaire"** 👑

---

### 4. Surnoms Hybrides (Système Avancé)

Pour les joueurs excellant dans **plusieurs domaines** simultanément.

| Conditions | Surnom Hybride | Badge |
|------------|----------------|-------|
| Daily streak 30+ ET Platinum+ | **Érudit Suprême** | 🔱 |
| Daily streak 50+ ET Diamond+ | **Légende Omnisciente** | 🏛️ |
| 100+ cartes ET Gold+ | **Conquérant Cultivé** | 🎖️ |
| Toutes raretés ET Master+ | **Empereur du Savoir** | 👑 |
| Streak 100+ ET Grandmaster ET 150+ cartes | **Divinité Absolue** | ✨🌟✨ |

---

## Logique de Sélection du Surnom

### Ordre de Priorité

1. **Hybride** (si conditions remplies) → Surnom le plus prestigieux
2. **PvP** (si rang > Bronze 1) → Domaine compétitif
3. **Daily** (si streak > 7) → Engagement régulier
4. **Collection** (si > 25 cartes) → Progression collection
5. **Défaut** → "Explorateur" (novice)

### Exemples de Calcul

**Joueur A:**
- Daily: Streak 45 jours, 92% réussite, 85% rapidité
- PvP: Gold 2, 75 victoires
- Collection: 35 cartes, toutes Common

**Calcul:**
1. Check hybride: Streak 45 + Gold 2 → **Érudit Suprême** ✅
2. Modificateurs: 92% réussite → "Infaillible", 85% rapidité → "Éclair", 75 victoires → "Vétéran"
3. **Résultat final:** "Éclair Infaillible Vétéran Érudit Suprême" 🔱

**Joueur B:**
- Daily: Streak 5 jours, 70% réussite
- PvP: Bronze 3, 8 victoires
- Collection: 12 cartes

**Calcul:**
1. Check hybride: Aucun critère ✗
2. PvP: Bronze 3 → Trop faible ✗
3. Daily: Streak 5 → Trop faible ✗
4. Collection: 12 cartes → "Chasseur de Cartes" ✅
5. **Résultat final:** "Chasseur de Cartes" 🎴

---

## Interface Profil

### Sections de la Page

```
┌─────────────────────────────────────────────┐
│  [Avatar]    Nom d'utilisateur              │
│              🔍 Explorateur                  │  ← Surnom dynamique
│              Niveau 12 • 2,450 XP            │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ STATISTIQUES DAILY                   │   │
│  │ Streak actuel: 7 jours 🔥           │   │
│  │ Record streak: 15 jours              │   │
│  │ Daily complétés: 32                  │   │
│  │ Taux de réussite: 85%                │   │
│  │ Gold total gagné: 1,450              │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ STATISTIQUES PVP                     │   │
│  │ Rang actuel: Silver 2 🛡️            │   │
│  │ ELO: 1,285                           │   │
│  │ Victoires: 23 | Défaites: 18         │   │
│  │ Winrate: 56%                         │   │
│  │ Série actuelle: 3 victoires 🔥       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ COLLECTION                           │   │
│  │ Cartes possédées: 42                 │   │
│  │ Raretés:                             │   │
│  │   Common: 18 | Rare: 15              │   │
│  │   Epic: 7 | Legendary: 2             │   │
│  │ Favoris: 8 cartes ⭐                │   │
│  │ Tags créés: 5                        │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ BADGES & ACHIEVEMENTS                │   │
│  │ [Badge 1] [Badge 2] [Badge 3]        │   │
│  │ [Badge 4] [Badge 5] [Badge 6]        │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ HISTORIQUE SURNOMS                   │   │
│  │ • Gardien du Savoir (2026-09-15)     │   │
│  │ • Maître du Quotidien (2026-08-01)   │   │
│  │ • Sage du Quotidien (2026-07-15)     │   │
│  │ • Explorateur (2026-06-20)           │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [MODIFIER PROFIL] [PARAMÈTRES]              │
└─────────────────────────────────────────────┘
```

---

## Détails des Stats

### Daily Stats

```typescript
interface DailyStats {
  currentStreak: number;           // Streak actuel
  longestStreak: number;           // Record streak
  totalDailyCompleted: number;     // Total Daily complétés
  averageSuccessRate: number;      // % moyen réussite
  averageSpeed: number;            // Temps moyen par question (ms)
  totalGoldEarned: number;         // Gold total gagné via Daily
  perfectScoreCount: number;       // Nombre de 10/10
}
```

### PvP Stats

```typescript
interface PvPStats {
  currentRank: string;             // Rang actuel
  currentElo: number;              // ELO actuel
  highestRank: string;             // Meilleur rang atteint
  highestElo: number;              // Meilleur ELO atteint
  totalVictories: number;          // Victoires totales
  totalDefeats: number;            // Défaites totales
  winrate: number;                 // % victoires
  currentWinStreak: number;        // Série actuelle
  longestWinStreak: number;        // Meilleure série
  ranksClimbed: number;            // Nombre de promotions saison
}
```

### Collection Stats

```typescript
interface CollectionStats {
  totalCards: number;              // Nombre de cartes
  commonCount: number;             // Common possédées
  rareCount: number;               // Rare possédées
  epicCount: number;               // Epic possédées
  legendaryCount: number;          // Legendary possédées
  favoriteCount: number;           // Cartes en favoris
  tagsCreated: number;             // Tags créés
  completedRarities: string[];     // ['common', 'rare']
}
```

---

## Backend Implementation

### 1. Database Schema

```prisma
model UserProfile {
  id                   String   @id @default(cuid())
  userId               String   @unique
  displayName          String?
  bio                  String?
  avatarUrl            String?
  
  // Stats Daily
  currentStreak        Int      @default(0)
  longestStreak        Int      @default(0)
  totalDailyCompleted  Int      @default(0)
  totalGoldEarned      Int      @default(0)
  perfectScoreCount    Int      @default(0)
  
  // Stats PvP
  totalVictories       Int      @default(0)
  totalDefeats         Int      @default(0)
  currentWinStreak     Int      @default(0)
  longestWinStreak     Int      @default(0)
  ranksClimbedSeason   Int      @default(0)
  
  // Collection
  favoriteCount        Int      @default(0)
  tagsCreated          Int      @default(0)
  
  // Surnom actuel
  currentTitle         String   @default("Explorateur")
  titleUpdatedAt       DateTime @default(now())
  
  user                 User     @relation(fields: [userId], references: [id])
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  titleHistory         TitleHistory[]
}

model TitleHistory {
  id        String   @id @default(cuid())
  profileId String
  title     String
  earnedAt  DateTime @default(now())
  
  profile   UserProfile @relation(fields: [profileId], references: [id])
  
  @@index([profileId, earnedAt])
}
```

### 2. Title Calculation Service

```typescript
// apps/backend/src/modules/profile/services/title-calculator.service.ts

interface TitleCalculationInput {
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
}

class TitleCalculatorService {
  calculateTitle(input: TitleCalculationInput): string {
    // 1. Check Hybrid titles (highest priority)
    const hybridTitle = this.checkHybridTitles(input);
    if (hybridTitle) return hybridTitle;
    
    // 2. Check PvP titles
    if (input.pvpStats.currentRank !== 'bronze_3') {
      return this.calculatePvPTitle(input.pvpStats);
    }
    
    // 3. Check Daily titles
    if (input.dailyStats.currentStreak >= 7) {
      return this.calculateDailyTitle(input.dailyStats);
    }
    
    // 4. Check Collection titles
    if (input.collectionStats.totalCards >= 25) {
      return this.calculateCollectionTitle(input.collectionStats);
    }
    
    // 5. Default
    return 'Explorateur';
  }
  
  private calculateDailyTitle(stats: DailyStats): string {
    let title = this.getBaseDailyTitle(stats.currentStreak);
    
    // Add modifiers
    const modifiers: string[] = [];
    
    if (stats.averageSpeed < 3000 && stats.totalDailyCompleted >= 10) {
      modifiers.push('Éclair');
    }
    
    if (stats.averageSuccessRate >= 90 && stats.totalDailyCompleted >= 10) {
      modifiers.push('Infaillible');
    }
    
    return modifiers.length > 0 
      ? `${modifiers.join(' ')} ${title}`
      : title;
  }
  
  private getBaseDailyTitle(streak: number): string {
    if (streak >= 100) return 'Gardien du Savoir';
    if (streak >= 75) return 'Encyclopédie Vivante';
    if (streak >= 50) return 'Grand Maître Érudit';
    if (streak >= 30) return 'Maître du Quotidien';
    if (streak >= 14) return 'Sage du Quotidien';
    if (streak >= 7) return 'Disciple Assidu';
    if (streak >= 3) return 'Apprenti Érudit';
    return 'Explorateur';
  }
  
  private calculatePvPTitle(stats: PvPStats): string {
    const baseTitle = this.getBasePvPTitle(stats.currentRank);
    const modifiers: string[] = [];
    
    if (stats.totalVictories >= 500) modifiers.push('Immortel');
    else if (stats.totalVictories >= 250) modifiers.push('Invincible');
    else if (stats.totalVictories >= 100) modifiers.push('Conquérant');
    else if (stats.totalVictories >= 50) modifiers.push('Vétéran');
    
    let title = modifiers.length > 0 
      ? `${modifiers.join(' ')} ${baseTitle}`
      : baseTitle;
    
    // Add fire emojis for win streaks
    if (stats.currentWinStreak >= 10) title += ' 🔥🔥';
    else if (stats.currentWinStreak >= 5) title += ' 🔥';
    
    return title;
  }
  
  private getBasePvPTitle(rank: string): string {
    if (rank.startsWith('grandmaster')) return 'Dieu de l\'Érudition';
    if (rank.startsWith('master')) return 'Titan du Savoir';
    if (rank.startsWith('diamond')) return 'Légende Intellectuelle';
    if (rank.startsWith('platinum')) return 'Champion Érudit';
    if (rank.startsWith('gold')) return 'Guerrier Cultivé';
    if (rank.startsWith('silver')) return 'Combattant Prometteur';
    return 'Duelliste Novice';
  }
  
  private calculateCollectionTitle(stats: CollectionStats): string {
    // Check for legendary collector first
    if (stats.completedRarities.length === 4) {
      return 'Collectionneur Légendaire 👑';
    }
    
    // Base title by card count
    let title = '';
    if (stats.totalCards >= 150) title = 'Gardien du Trésor';
    else if (stats.totalCards >= 100) title = 'Maître Collectionneur';
    else if (stats.totalCards >= 50) title = 'Conservateur Émérite';
    else if (stats.totalCards >= 25) title = 'Archiviste Passionné';
    else if (stats.totalCards >= 10) title = 'Chasseur de Cartes';
    else title = 'Collectionneur Débutant';
    
    // Add rarity modifiers
    const modifiers: string[] = [];
    if (stats.completedRarities.includes('legendary')) {
      modifiers.push('Chasseur de Légendes 🌟');
    } else if (stats.completedRarities.includes('epic')) {
      modifiers.push('Traqueur d\'Épiques');
    } else if (stats.completedRarities.includes('rare')) {
      modifiers.push('Amateur de Raretés');
    } else if (stats.completedRarities.includes('common')) {
      modifiers.push('Fondations Solides');
    }
    
    return modifiers.length > 0
      ? `${modifiers[0]} ${title}`
      : title;
  }
  
  private checkHybridTitles(input: TitleCalculationInput): string | null {
    const { dailyStats, pvpStats, collectionStats } = input;
    
    // Divinité Absolue (ultra rare)
    if (
      dailyStats.currentStreak >= 100 &&
      pvpStats.currentRank === 'grandmaster' &&
      collectionStats.totalCards >= 150
    ) {
      return 'Divinité Absolue ✨🌟✨';
    }
    
    // Empereur du Savoir
    if (
      collectionStats.completedRarities.length === 4 &&
      pvpStats.currentRank.startsWith('master')
    ) {
      return 'Empereur du Savoir 👑';
    }
    
    // Légende Omnisciente
    if (
      dailyStats.currentStreak >= 50 &&
      pvpStats.currentRank.startsWith('diamond')
    ) {
      return 'Légende Omnisciente 🏛️';
    }
    
    // Érudit Suprême
    if (
      dailyStats.currentStreak >= 30 &&
      pvpStats.currentRank.startsWith('platinum')
    ) {
      return 'Érudit Suprême 🔱';
    }
    
    // Conquérant Cultivé
    if (
      collectionStats.totalCards >= 100 &&
      pvpStats.currentRank.startsWith('gold')
    ) {
      return 'Conquérant Cultivé 🎖️';
    }
    
    return null;
  }
}
```

### 3. Profile Service

```typescript
// apps/backend/src/modules/profile/services/profile.service.ts

class ProfileService {
  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        titleHistory: {
          orderBy: { earnedAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!profile) {
      // Create default profile
      return this.createProfile(userId);
    }
    
    // Recalculate title
    await this.updateTitle(userId);
    
    return profile;
  }
  
  async updateTitle(userId: string) {
    const dailyStats = await this.getDailyStats(userId);
    const pvpStats = await this.getPvPStats(userId);
    const collectionStats = await this.getCollectionStats(userId);
    
    const newTitle = this.titleCalculator.calculateTitle({
      dailyStats,
      pvpStats,
      collectionStats,
    });
    
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    
    if (profile.currentTitle !== newTitle) {
      // Title changed - save to history
      await this.prisma.$transaction([
        this.prisma.userProfile.update({
          where: { userId },
          data: {
            currentTitle: newTitle,
            titleUpdatedAt: new Date(),
          },
        }),
        this.prisma.titleHistory.create({
          data: {
            profileId: profile.id,
            title: newTitle,
          },
        }),
      ]);
    }
    
    return newTitle;
  }
}
```

---

## Frontend Implementation

### Profile Store (Zustand)

```typescript
// apps/frontend/src/stores/profileStore.ts

interface ProfileStore {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  loading: false,
  error: null,
  
  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const response = await profileApi.getProfile();
      set({ profile: response.data, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement du profil', loading: false });
    }
  },
  
  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await profileApi.updateProfile(data);
      set({ profile: response.data, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour', loading: false });
    }
  },
}));
```

### ProfilePage Component

```typescript
// apps/frontend/src/pages/ProfilePage.tsx

export default function ProfilePage() {
  const { profile, loading, fetchProfile } = useProfileStore();
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (!profile) return <Error />;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileHeader profile={profile} />
      <DailyStatsCard stats={profile.dailyStats} />
      <PvPStatsCard stats={profile.pvpStats} />
      <CollectionStatsCard stats={profile.collectionStats} />
      <BadgesSection badges={profile.badges} />
      <TitleHistory history={profile.titleHistory} />
    </div>
  );
}
```

---

## Métriques à Tracker

- Évolution du surnom au fil du temps
- Surnoms les plus courants (distribution)
- Temps moyen pour passer de "Explorateur" au premier surnom avancé
- Joueurs ayant débloqué "Divinité Absolue"
- Taux de changement de surnom (fréquence)

---

## Next Steps

1. **Backend:**
   - [ ] Migration Prisma (UserProfile, TitleHistory)
   - [ ] TitleCalculatorService implementation
   - [ ] ProfileService implementation
   - [ ] GET /api/profile endpoint
   - [ ] PATCH /api/profile endpoint

2. **Frontend:**
   - [ ] ProfileStore (Zustand)
   - [ ] ProfilePage component
   - [ ] Stats cards (Daily, PvP, Collection)
   - [ ] Title display avec badge/emoji
   - [ ] Title history timeline

3. **UX:**
   - [ ] Animation changement de surnom
   - [ ] Notification "Nouveau surnom débloqué !"
   - [ ] Tooltip explication conditions surnom
   - [ ] Share card avec surnom

---

**Auteur:** Spec basée sur système de surnoms dynamiques  
**Prochaine étape:** Review + implémentation backend

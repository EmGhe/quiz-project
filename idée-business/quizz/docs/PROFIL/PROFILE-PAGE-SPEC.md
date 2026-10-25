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
┌─────────────────────────────────────────────────┐
│                    PROFIL                        │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │                                             │ │
│  │    [Photo]     Nom du joueur                │ │
│  │   de profil                                 │ │
│  │    (cercle)    "Explorateur"  ← Surnom     │ │
│  │                                             │ │
│  │                ◇ Silver 2 ◇  ← Badge PvP   │ │
│  │              (nom rang + logo)              │ │
│  │                 ELO: 1,285                  │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │              MES STATS                      │ │
│  │                                             │ │
│  │  Daily Challenge:                           │ │
│  │  • Streak: 7 jours 🔥                      │ │
│  │  • Record: 15 jours                         │ │
│  │  • Complétés: 32                           │ │
│  │  • Réussite: 85%                           │ │
│  │  • Gold gagné: 1,450                       │ │
│  │                                             │ │
│  │  PvP:                                       │ │
│  │  • Rang: Silver 2                          │ │
│  │  • V/D: 23/18 (56%)                        │ │
│  │  • Série: 3 victoires 🔥                   │ │
│  │                                             │ │
│  │  Collection:                                │ │
│  │  • Cartes: 42                              │ │
│  │  • Common: 18 | Rare: 15                   │ │
│  │  • Epic: 7 | Legendary: 2                  │ │
│  │  • Favoris: 8 ⭐                           │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │              MA VITRINE                     │ │
│  │                                             │ │
│  │  [Carte 1] [Carte 2] [Carte 3] [Carte 4]   │ │
│  │  [Carte 5] [Carte 6] [Carte 7] [Carte 8]   │ │
│  │  [Carte 9] [Carte 10]                      │ │
│  │                                             │ │
│  │  (Max 10 cartes favorites à exhiber)       │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  [Voir toute ma collec] [Retour à l'accueil]    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Notes de Design

**Section En-tête:**
- Photo de profil circulaire (avatar)
- Nom d'utilisateur
- Surnom dynamique (calculé selon perfs)
- Badge PvP en forme de losange avec:
  - Nom du rang (ex: "Silver 2")
  - Logo/icône du rang
  - ELO en dessous

**Section "Mes Stats":**
- Une seule zone regroupant TOUTES les stats
- Organisées par domaine (Daily, PvP, Collection)
- Stats essentielles uniquement (pas de surcharge)

**Section "Ma Vitrine":**
- Affiche les **cartes favorites** (marquées ⭐ dans la collection)
- Maximum 10 cartes affichées
- Grid responsive (5 cols desktop, 3 cols tablet, 2 cols mobile)
- Le joueur choisit les cartes à exhiber dans son profil
- Permet de montrer ses plus belles cartes (Legendary, rares, préférées)

**Boutons d'action:**
- "Voir toute ma collec" → Redirige vers `/collec`
- "Retour à la page d'accueil" → Redirige vers `/`

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

### Showcase (Vitrine)

```typescript
interface ShowcaseCard {
  id: string;
  imageUrl: string;
  rarity: string;
  entity: {
    label: string;
  };
}

interface Showcase {
  cards: ShowcaseCard[];           // Max 10 cartes
  lastUpdated: Date;               // Dernière modification
}
```

**Règles:**
- Seulement les cartes **possédées** par l'utilisateur
- Maximum 10 cartes dans la vitrine
- Par défaut: affiche les 10 premières cartes favorites
- Utilisateur peut réorganiser l'ordre (drag & drop future feature)
- Si < 10 favoris: affiche slots vides

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
  
  // Vitrine (showcase)
  showcaseCardIds      String[] // Array de cardIds (max 10)
  
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

**Note:** `showcaseCardIds` est un array de cardIds. Le frontend récupère ensuite les détails des cartes via les UserCards.

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
      return this.createProfile(userId);
    }
    
    // Recalculate title
    await this.updateTitle(userId);
    
    // Get showcase cards
    const showcaseCards = await this.getShowcaseCards(userId, profile.showcaseCardIds);
    
    return {
      ...profile,
      showcaseCards,
    };
  }
  
  async getShowcaseCards(userId: string, cardIds: string[]) {
    if (!cardIds || cardIds.length === 0) {
      // Default: get first 10 favorite cards
      const favorites = await this.prisma.userCard.findMany({
        where: { userId, isFavorite: true },
        take: 10,
        include: { card: { include: { entity: true } } },
        orderBy: { createdAt: 'desc' },
      });
      
      return favorites.map(uc => ({
        id: uc.card.id,
        imageUrl: uc.card.imageUrl,
        rarity: uc.card.rarity,
        entity: uc.card.entity,
      }));
    }
    
    // Get specific cards in order
    const userCards = await this.prisma.userCard.findMany({
      where: { userId, cardId: { in: cardIds } },
      include: { card: { include: { entity: true } } },
    });
    
    // Preserve order from showcaseCardIds
    return cardIds
      .map(id => userCards.find(uc => uc.card.id === id))
      .filter(Boolean)
      .map(uc => ({
        id: uc.card.id,
        imageUrl: uc.card.imageUrl,
        rarity: uc.card.rarity,
        entity: uc.card.entity,
      }));
  }
  
  async updateShowcase(userId: string, cardIds: string[]) {
    if (cardIds.length > 10) {
      throw new Error('Maximum 10 cartes dans la vitrine');
    }
    
    // Verify user owns all cards
    const userCards = await this.prisma.userCard.findMany({
      where: { userId, cardId: { in: cardIds } },
    });
    
    if (userCards.length !== cardIds.length) {
      throw new Error('Certaines cartes ne sont pas possédées');
    }
    
    await this.prisma.userProfile.update({
      where: { userId },
      data: { showcaseCardIds: cardIds },
    });
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
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (!profile) return <Error />;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">PROFIL</h1>
        
        {/* Header: Photo + Nom + Surnom + Badge PvP */}
        <ProfileHeader 
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
          title={profile.currentTitle}
          rank={profile.pvpStats.currentRank}
          elo={profile.pvpStats.currentElo}
        />
        
        {/* Mes Stats (tout en un) */}
        <StatsCard 
          dailyStats={profile.dailyStats}
          pvpStats={profile.pvpStats}
          collectionStats={profile.collectionStats}
        />
        
        {/* Ma Vitrine (10 cartes favorites) */}
        <ShowcaseSection 
          cards={profile.showcaseCards}
          maxCards={10}
        />
        
        {/* Boutons */}
        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => navigate('/collec')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voir toute ma collec
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Retour à la page d'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
```

### ProfileHeader Component

```typescript
// apps/frontend/src/components/profile/ProfileHeader.tsx

interface ProfileHeaderProps {
  avatarUrl?: string;
  displayName: string;
  title: string;
  rank: string;
  elo: number;
}

export default function ProfileHeader({ 
  avatarUrl, 
  displayName, 
  title, 
  rank, 
  elo 
}: ProfileHeaderProps) {
  const rankBadge = getRankBadge(rank); // Returns logo + color
  
  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              👤
            </div>
          )}
        </div>
        
        {/* Nom + Surnom */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <p className="text-lg text-gray-600 mt-1">"{title}"</p>
        </div>
        
        {/* Badge PvP (losange) */}
        <div className="relative">
          <div 
            className="w-24 h-24 transform rotate-45 flex items-center justify-center"
            style={{ backgroundColor: rankBadge.color }}
          >
            <div className="transform -rotate-45 text-center">
              <div className="text-2xl">{rankBadge.icon}</div>
              <div className="text-xs font-bold text-white mt-1">
                {rankBadge.name}
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-gray-600">ELO: {elo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### StatsCard Component

```typescript
// apps/frontend/src/components/profile/StatsCard.tsx

export default function StatsCard({ dailyStats, pvpStats, collectionStats }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <h3 className="text-2xl font-bold mb-6 text-center">MES STATS</h3>
      
      <div className="space-y-6">
        {/* Daily Challenge */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-blue-600">Daily Challenge</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Streak" value={`${dailyStats.currentStreak} jours 🔥`} />
            <StatItem label="Record" value={`${dailyStats.longestStreak} jours`} />
            <StatItem label="Complétés" value={dailyStats.totalDailyCompleted} />
            <StatItem label="Réussite" value={`${dailyStats.averageSuccessRate}%`} />
            <StatItem label="Gold gagné" value={dailyStats.totalGoldEarned} />
          </div>
        </div>
        
        {/* PvP */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-purple-600">PvP</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Rang" value={pvpStats.currentRank} />
            <StatItem label="V/D" value={`${pvpStats.totalVictories}/${pvpStats.totalDefeats} (${pvpStats.winrate}%)`} />
            <StatItem label="Série" value={`${pvpStats.currentWinStreak} victoires 🔥`} />
          </div>
        </div>
        
        {/* Collection */}
        <div>
          <h4 className="font-semibold text-lg mb-3 text-green-600">Collection</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Cartes" value={collectionStats.totalCards} />
            <StatItem label="Common" value={collectionStats.commonCount} />
            <StatItem label="Rare" value={collectionStats.rareCount} />
            <StatItem label="Epic" value={collectionStats.epicCount} />
            <StatItem label="Legendary" value={collectionStats.legendaryCount} />
            <StatItem label="Favoris" value={`${collectionStats.favoriteCount} ⭐`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="ml-2 font-medium">{value}</span>
    </div>
  );
}
```

### ShowcaseSection Component

```typescript
// apps/frontend/src/components/profile/ShowcaseSection.tsx

export default function ShowcaseSection({ cards, maxCards = 10 }) {
  const emptySlots = maxCards - cards.length;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h3 className="text-2xl font-bold mb-6 text-center">MA VITRINE</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* Cartes favorites */}
        {cards.map((card) => (
          <ShowcaseCard key={card.id} card={card} />
        ))}
        
        {/* Slots vides */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
      
      <p className="text-center text-sm text-gray-500 mt-4">
        {cards.length}/{maxCards} cartes • Les cartes favorites s'affichent automatiquement
      </p>
    </div>
  );
}

function ShowcaseCard({ card }) {
  return (
    <div className="relative group cursor-pointer">
      <div className={`rounded-lg overflow-hidden border-2 ${getRarityBorder(card.rarity)}`}>
        <img 
          src={card.imageUrl} 
          alt={card.entity.label}
          className="w-full aspect-[3/4] object-cover"
        />
      </div>
      {/* Tooltip on hover */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
        <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {card.entity.label}
        </span>
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-[3/4] flex items-center justify-center">
      <span className="text-4xl text-gray-300">+</span>
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
   - [ ] Migration Prisma (UserProfile avec showcaseCardIds, TitleHistory)
   - [ ] TitleCalculatorService implementation
   - [ ] ProfileService implementation (getProfile, updateTitle, updateShowcase)
   - [ ] GET /api/profile endpoint
   - [ ] PATCH /api/profile endpoint
   - [ ] PATCH /api/profile/showcase endpoint (update vitrine)
   - [ ] Auto-update stats (Daily completion, PvP match end, Collection change)

2. **Frontend:**
   - [ ] ProfileStore (Zustand)
   - [ ] ProfilePage component
   - [ ] ProfileHeader component (avatar + surnom + badge PvP)
   - [ ] StatsCard component (tout-en-un Daily/PvP/Collection)
   - [ ] ShowcaseSection component (10 cartes favorites)
   - [ ] EmptySlot component (slots vides vitrine)
   - [ ] Rank badge helper (getRankBadge avec couleur + icône)
   - [ ] Navigation buttons (Voir collec, Retour accueil)

3. **UX:**
   - [ ] Animation changement de surnom
   - [ ] Notification "Nouveau surnom débloqué !"
   - [ ] Tooltip explication conditions surnom
   - [ ] Badge PvP en losange (transform rotate-45)
   - [ ] Hover effect sur cartes vitrine (affiche nom)
   - [ ] Responsive grid vitrine (2 cols mobile → 5 cols desktop)

---

**Auteur:** Spec basée sur système de surnoms dynamiques  
**Prochaine étape:** Review + implémentation backend

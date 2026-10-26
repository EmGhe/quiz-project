# Page Profil - Design Document

**Date:** 2026-10-26  
**Status:** Draft  
**Version:** 1.0

---

## Intent & Why

Créer une page profil personnalisée permettant aux joueurs de :
- Visualiser leurs performances globales (Daily, PvP, Collection)
- Exhiber leurs meilleures cartes dans une vitrine publique
- Consulter leur progression et statistiques centralisées

**Pourquoi maintenant :**
- Les joueurs accumulent des stats éparpillées (Daily streaks, PvP rank, cartes) sans vue d'ensemble
- Le système de collection existe mais les joueurs ne peuvent pas mettre en valeur leurs cartes favorites
- Base nécessaire pour futures fonctionnalités sociales (profils publics, comparaison entre joueurs)

**Contexte :**
- Basé sur `docs/PROFIL/PROFILE-PAGE-SPEC.md` mais **SANS le système de surnoms dynamiques** pour l'instant
- Le titre reste fixe à "Explorateur" pour tous les joueurs
- Infrastructure prête pour ajouter le calcul automatique de titres plus tard

---

## Goals

1. **Page profil fonctionnelle** affichant les stats du joueur de manière claire et organisée
2. **Vitrine automatique** affichant jusqu'à 10 cartes marquées favorites (⭐) dans la collection
3. **Stats agrégées** depuis les modèles existants (pas de duplication)
4. **Structure extensible** pour ajouter le système de surnoms dynamiques ultérieurement

---

## Non-Goals

- ❌ Calcul automatique de surnoms/titres basé sur les performances
- ❌ Historique des titres débloqués (`TitleHistory`)
- ❌ Profils publics visibles par d'autres joueurs
- ❌ Édition avancée du profil (upload avatar, bio riche)
- ❌ Comparaison entre joueurs
- ❌ Système de badges/achievements
- ❌ Graphiques de progression temporelle

---

## Anti-Goals (à éviter absolument)

- ❌ **Dupliquer les stats** : Ne pas copier currentStreak, wins, etc. dans UserProfile
- ❌ **Créer des incohérences** : Les stats affichées doivent toujours refléter l'état réel
- ❌ **Surcharger le modèle User** : Créer un modèle UserProfile séparé
- ❌ **Casser l'architecture existante** : Suivre les patterns NestJS du projet

---

## Constraints

### Techniques
- Stack : NestJS + Prisma (backend), React + Vite + Tailwind (frontend)
- Zustand pour l'état global frontend
- Monorepo pnpm workspaces
- PostgreSQL 15

### Architecture
- Backend organisé par modules NestJS (`/modules/profile`)
- Frontend avec pages/components/stores
- Respect du `CLAUDE.md` du projet

### Performance
- Les stats sont calculées à la volée (pas de cache pour MVP)
- La vitrine charge max 10 cartes (acceptable sans pagination)

### UX
- Page responsive (mobile-first)
- Affichage par défaut des 10 premières cartes favorites si `showcaseCardIds` vide
- Badge PvP en forme de losange (design distinctif)

---

## Data Model

### Nouveau modèle : UserProfile

```prisma
model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  
  // Données UI profil
  displayName String?
  bio         String?
  avatarUrl   String?
  
  // Titre (pour l'instant fixe)
  currentTitle String @default("Explorateur")
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("user_profiles")
}
```

### Modification du modèle User existant

**Ajouter la relation inverse dans le modèle User :**

```prisma
model User {
  // ... champs existants ...
  
  // Ajouter cette ligne avec les autres relations
  profile              UserProfile?
  
  // ... autres relations existantes ...
}
```

**Décisions prises :**
- `currentTitle` par défaut "Explorateur" (prépare le système de surnoms)
- `displayName` optionnel (si null, utilise `User.username`)
- Relation 1:1 avec User via `userId` unique
- **Relation inverse ajoutée dans User** (suit le pattern du projet : User.streaks, User.submissions, etc.)
- Pas de `TitleHistory` pour l'instant (sera ajouté avec le système de surnoms)
- **Pas de champ showcaseCardIds** : la vitrine affiche automatiquement les cartes favorites

**Relations avec modèles existants :**
- `User` ←→ 1:1 ←→ `UserProfile` (bidirectionnelle)
- La vitrine utilise directement `UserCard.isFavorite=true`

---

## Stats Calculation (Aggregation Layer)

Les stats sont calculées à la volée depuis les modèles existants :

### Daily Stats

**Source :** `UserStreak` + `DailySubmission` + `GoldTransaction`

```typescript
interface DailyStats {
  currentStreak: number;        // UserStreak.currentStreak
  longestStreak: number;        // UserStreak.longestStreak
  totalDailyCompleted: number;  // COUNT(DailySubmission WHERE userId)
  averageSuccessRate: number;   // AVG(DailySubmission.correctCount) / 10 * 100
  totalGoldEarned: number;      // SUM(GoldTransaction WHERE reason='daily_completion')
}
```

**Calcul :**
- `currentStreak` / `longestStreak` : lecture directe depuis `UserStreak`
- `totalDailyCompleted` : count des soumissions du user
- `averageSuccessRate` : moyenne de (correctCount/10) sur tous les Daily complétés
- `totalGoldEarned` : somme des transactions gold avec reason='daily_completion'

### PvP Stats

**Source :** `UserElo` + `PvpMatch`

```typescript
interface PvPStats {
  currentRank: string;          // UserElo.rank (Bronze, Silver, Gold, etc.)
  currentDivision: number;      // UserElo.division (3, 2, 1)
  currentElo: number;           // UserElo.elo
  totalVictories: number;       // UserElo.wins
  totalDefeats: number;         // UserElo.losses
  winrate: number;              // (wins / totalMatches) * 100
  currentWinStreak: number;     // UserElo.winStreak
}
```

**Calcul :**
- Toutes les valeurs principales viennent de `UserElo` (déjà calculées)
- `winrate` = (wins / (wins + losses)) * 100

### Collection Stats

**Source :** `UserCard`

```typescript
interface CollectionStats {
  totalCards: number;           // COUNT(UserCard WHERE userId)
  commonCount: number;          // COUNT(UserCard WHERE userId AND rarity='common')
  rareCount: number;            // COUNT(UserCard WHERE userId AND rarity='rare')
  epicCount: number;            // COUNT(UserCard WHERE userId AND rarity='epic')
  legendaryCount: number;       // COUNT(UserCard WHERE userId AND rarity='legendary')
  favoriteCount: number;        // COUNT(UserCard WHERE userId AND isFavorite=true)
}
```

**Calcul :**
- Group by sur `UserCard` avec count par rareté
- Count séparé pour `isFavorite`

### Showcase Cards

**Source :** `UserCard` (where `isFavorite=true`) → `Card` → `Entity`

```typescript
interface ShowcaseCard {
  id: string;                   // Card.id
  imageUrl: string;             // Card.imageUrl
  rarity: string;               // UserCard.rarity (rareté actuelle, peut être upgradée)
  entityLabel: string;          // Entity.label
}
```

**Logique :**
1. Récupérer toutes les cartes du user avec `isFavorite=true`
2. Trier par `obtainedAt DESC` (les plus récentes en premier)
3. Limiter à 10 cartes max
4. Si < 10 favoris → la vitrine affiche des slots vides
5. Si 0 favoris → vitrine complètement vide avec message d'aide

---

## Backend Implementation

### Module Structure

```
apps/backend/src/modules/profile/
├── profile.module.ts
├── profile.controller.ts
├── profile.service.ts
├── dto/
│   ├── profile-response.dto.ts
│   └── update-profile.dto.ts
```

### Endpoints

#### 1. GET /api/profile

**Description :** Récupère le profil complet du user authentifié + stats + showcase

**Auth :** Required (JWT)

**Response :**
```typescript
{
  profile: {
    id: string;
    userId: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    currentTitle: string; // "Explorateur"
  },
  dailyStats: DailyStats,
  pvpStats: PvPStats,
  collectionStats: CollectionStats,
  showcaseCards: ShowcaseCard[] // Max 10 cartes favorites
}
```

**Logique :**
1. Récupérer ou créer le `UserProfile` si absent
2. Calculer `dailyStats` depuis UserStreak + DailySubmission + GoldTransaction
3. Calculer `pvpStats` depuis UserElo
4. Calculer `collectionStats` depuis UserCard
5. Récupérer `showcaseCards` : les 10 dernières cartes avec `isFavorite=true`, triées par `obtainedAt DESC`
6. Retourner tout en une seule réponse

#### 2. PATCH /api/profile

**Description :** Met à jour les infos du profil (displayName, bio, avatarUrl)

**Auth :** Required (JWT)

**Body :**
```typescript
{
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}
```

**Validation :**
- `displayName` : max 50 caractères, alphanumerique + espaces
- `bio` : max 500 caractères
- `avatarUrl` : URL valide (optionnel, pas de validation stricte pour MVP)

**Response :** UserProfile mis à jour

### Service Implementation

**ProfileService :**

```typescript
@Injectable()
export class ProfileService {
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    // Récupère ou crée le profil avec valeurs par défaut
  }
  
  async getCompleteProfile(userId: string): Promise<CompleteProfileDto> {
    // Agrège profil + stats + showcase
  }
  
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfile> {
    // Met à jour displayName/bio/avatarUrl
  }
  
  // Private helpers
  private async calculateDailyStats(userId: string): Promise<DailyStats> { }
  private async calculatePvPStats(userId: string): Promise<PvPStats> { }
  private async calculateCollectionStats(userId: string): Promise<CollectionStats> { }
  private async getShowcaseCards(userId: string): Promise<ShowcaseCard[]> {
    // Récupère les 10 dernières cartes favorites (isFavorite=true)
    // Triées par obtainedAt DESC
    // Include Card + Entity pour avoir imageUrl et label
  }
}
```

**Décisions laissées au builder :**
- Optimisation des queries Prisma (nombre de requêtes, include vs select)
- Gestion du cas où UserElo n'existe pas (user n'a jamais joué PvP)
- Gestion du cas où UserStreak n'existe pas (user n'a jamais fait de Daily)
- Format exact des erreurs (BadRequestException, NotFoundException)

---

## Frontend Implementation

### Routes

Ajouter dans `App.tsx` :
```typescript
<Route path="/profil" element={<ProfilePage />} />
```

### Store (Zustand)

```typescript
// stores/profileStore.ts

interface ProfileState {
  profile: UserProfile | null;
  dailyStats: DailyStats | null;
  pvpStats: PvPStats | null;
  collectionStats: CollectionStats | null;
  showcaseCards: ShowcaseCard[];
  loading: boolean;
  error: string | null;
  
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
}
```

**Note :** La vitrine se met à jour automatiquement quand le user marque/démarque une carte favorite dans la collection. Pas besoin d'action spécifique pour gérer la vitrine.

### Page Structure

```
pages/ProfilePage.tsx
  → components/profile/ProfileHeader.tsx (photo + nom + titre + badge PvP)
  → components/profile/StatsCard.tsx (toutes les stats en une carte)
  → components/profile/ShowcaseSection.tsx (vitrine 10 cartes)
```

### Components

#### ProfileHeader

**Props :**
```typescript
{
  avatarUrl?: string;
  displayName: string;
  username: string; // fallback si displayName null
  title: string;
  rank: string;
  division: number;
  elo: number;
}
```

**Layout :**
- Avatar circulaire (128px) centré
- Nom affiché (displayName ou username)
- Titre entre guillemets : `"Explorateur"`
- Badge PvP en losange avec rank + division + elo

**Badge PvP :**
- Forme : div avec `transform: rotate(45deg)`
- Couleurs par rang :
  - Bronze : #CD7F32
  - Silver : #C0C0C0
  - Gold : #FFD700
  - Platinum : #E5E4E2
  - Diamond : #B9F2FF
  - Master : #9B30FF
  - Grandmaster : #FF4500
- Texte centré avec transform inverse (`-rotate-45deg`)
- ELO affiché en dessous du losange

**Décisions laissées au builder :**
- Icône/emoji par rang (optionnel pour MVP)
- Animation hover sur le badge
- Taille exacte du losange (responsive)

#### StatsCard

**Props :**
```typescript
{
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
}
```

**Layout :**
- Une seule carte blanche avec ombre
- Titre "MES STATS" centré
- 3 sections : Daily Challenge, PvP, Collection
- Chaque section avec titre coloré + grid 2 colonnes

**Daily Challenge section :**
- Streak actuel avec emoji 🔥
- Record de streak
- Total Daily complétés
- Taux de réussite en %
- Gold total gagné

**PvP section :**
- Rang actuel (ex: "Silver 2")
- V/D avec winrate (ex: "23/18 (56%)")
- Série de victoires actuelle avec 🔥 si > 0

**Collection section :**
- Total cartes
- Répartition : Common | Rare | Epic | Legendary
- Nombre de favoris avec ⭐

**Décisions laissées au builder :**
- Espacement exact entre sections
- Responsive breakpoints (grid → stack sur mobile)
- Affichage si stat manquante (ex: user n'a jamais fait de Daily)

#### ShowcaseSection

**Props :**
```typescript
{
  showcaseCards: ShowcaseCard[];
  maxCards: number; // 10
}
```

**Layout :**
- Grid responsive :
  - Mobile : 2 colonnes
  - Tablet : 3 colonnes
  - Desktop : 5 colonnes
- Carte aspect-ratio 3:4
- Border colorée selon rareté
- Hover affiche le nom de la carte en overlay

**Empty slots :**
- Si < 10 cartes : afficher slots vides avec `+` grisé
- Border dashed pour indiquer "vide"

**Texte d'aide :**
- En bas : "X/10 cartes • Les cartes favorites s'affichent automatiquement"
- Si 0 favoris : "Aucune carte favorite. Marquez des cartes en favori dans votre collection pour les afficher ici ⭐"

**Décisions laissées au builder :**
- Transition/animation du hover
- Style exact du message "0 favoris" (centré, grisé, avec icône)
- Tooltip exact (nom simple ou nom + rareté)

### Navigation Buttons

En bas de la page :
- "Voir toute ma collec" → navigate('/collec') → bouton bleu primaire
- "Retour à la page d'accueil" → navigate('/') → bouton gris secondaire

Flex centré avec gap

---

## Migration Path

### Database Migration

1. Créer la migration Prisma pour `UserProfile`
2. Pas de migration de données nécessaire (profils créés à la demande)
3. `currentTitle` par défaut "Explorateur" dans le schema

### Seeding (optionnel)

Créer les profils pour les users de test existants :

```typescript
// scripts/seed-profiles.ts
const users = await prisma.user.findMany();
for (const user of users) {
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
}
```

---

## Testing Strategy

### Backend Tests (à implémenter)

**ProfileService :**
- ✅ `getOrCreateProfile` crée un profil si absent
- ✅ `getCompleteProfile` agrège correctement les stats
- ✅ `calculateDailyStats` retourne 0 si aucun Daily complété
- ✅ `calculatePvPStats` retourne valeurs par défaut si UserElo absent
- ✅ `getShowcaseCards` retourne les 10 dernières cartes favorites
- ✅ `getShowcaseCards` retourne array vide si aucune carte favorite

**ProfileController :**
- ✅ `GET /api/profile` retourne 401 si non authentifié
- ✅ `GET /api/profile` retourne profil complet
- ✅ `PATCH /api/profile` valide displayName max 50 chars

### Frontend Tests (optionnel pour MVP)

- Test de rendu de ProfilePage
- Test que les stats s'affichent correctement
- Test que la vitrine affiche les cartes

---

## Future Extensions (hors scope)

- Système de surnoms dynamiques (selon performances)
- `TitleHistory` table pour historique des titres débloqués
- Profils publics (`/profil/:userId`)
- Sélection manuelle des cartes de la vitrine (overrider les favoris automatiques)
- Upload avatar custom
- Bio avec markdown
- Graphiques de progression (streak chart, ELO history)
- Badges/achievements
- Comparaison entre joueurs

---

## Open Questions for Builder

1. **UserElo/UserStreak manquants :** Comment gérer l'affichage si le user n'a jamais joué PvP ou Daily ? Retourner des valeurs à 0 ou null ?

2. **Optimisation queries :** Utiliser `include` imbriqués ou queries séparées pour les stats ? (performance vs lisibilité)

3. **Avatar par défaut :** URL d'un avatar placeholder ou emoji 👤 si `avatarUrl` null ?

4. **displayName validation :** Accepter les caractères spéciaux/emoji ou seulement alphanumerique + espaces ?

---

## Success Criteria

✅ Un user peut accéder à `/profil` et voir ses stats complètes  
✅ Les stats Daily/PvP/Collection sont exactes et à jour  
✅ La vitrine affiche automatiquement les 10 dernières cartes favorites (marquées ⭐ dans la collection)  
✅ Le user peut modifier displayName/bio/avatarUrl  
✅ La vitrine se met à jour automatiquement quand le user marque/démarque des favoris  
✅ Le badge PvP affiche le bon rang et ELO  
✅ Le titre "Explorateur" s'affiche pour tous les users  
✅ La page est responsive (mobile → desktop)  
✅ Aucune duplication de stats (source de vérité unique)  
✅ Message d'aide affiché si 0 cartes favorites

---

**Prochaine étape :** Plan d'implémentation détaillé (tasks, ordre, dépendances)

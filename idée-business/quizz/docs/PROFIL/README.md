# Page Profil - Documentation

## Vue d'ensemble

Page de profil utilisateur affichant les statistiques de progression et une vitrine de cartes favorites.

**Route :** `/profil` (protégée par authentification)

## Fonctionnalités

### 1. Header Profil
- Avatar (ou emoji par défaut)
- Nom d'utilisateur (displayName ou username)
- Titre actuel : "Explorateur" (fixe pour MVP)
- Badge PvP losange avec rang, division et ELO

### 2. Statistiques
**Daily Challenge**
- Streak actuelle 🔥 / Record
- Total complétés / Taux de réussite
- Gold gagné total

**PvP**
- Rang et Division
- Victoires / Défaites / Winrate
- Série de victoires 🔥

**Collection**
- Total de cartes possédées
- Répartition par rareté (Commune, Rare, Épique, Légendaire)
- Nombre de favoris ⭐

### 3. Vitrine de Cartes
- Affiche les 10 dernières cartes marquées comme favorites
- Bordure colorée selon la rareté
- Clic sur une carte → popup avec détails :
  - Image pleine résolution
  - Nom et rareté
  - Description
  - Lien Wikipédia

### 4. Navigation
- Bouton "Voir toute ma collec" → `/collec`
- Bouton "Retour" → `/`

## Architecture Technique

### Backend

**Module :** `ProfileModule`
- `ProfileController` : GET/PATCH `/api/profile`
- `ProfileService` : calcul des stats et récupération vitrine
- DTOs : `ProfileResponseDto`, `UpdateProfileDto`

**Base de données :**
- Table `user_profiles` (displayName, bio, avatarUrl, currentTitle)
- Calculs à la volée depuis `UserStreak`, `UserElo`, `UserCard`

### Frontend

**Composants :**
- `ProfilePage` : page principale
- `ProfileHeader` : avatar + nom + titre + badge PvP
- `StatsCard` : grille 2 colonnes avec stats Daily/PvP/Collection
- `ShowcaseSection` : grid responsive des cartes favorites
- `CardModal` : popup détails carte

**State Management :**
- `profileStore` (Zustand) : gère le fetch et update du profil

**Types :**
- `CompleteProfile`, `UserProfile`, `DailyStats`, `PvPStats`, `CollectionStats`, `ShowcaseCard`

## Points Clés

### Authentification
⚠️ **Ce projet utilise des cookies HTTP-only, pas localStorage.**

- Backend : `JwtAuthGuard` + `@CurrentUser()` decorator
- Frontend : toujours utiliser `apiClient` de `src/api/client.ts`
- Voir `docs/ARCHITECTURE.md` pour les patterns

### Responsive Design
- Mobile (< 768px) : 2 colonnes vitrine
- Tablet (768-1024px) : 3 colonnes vitrine
- Desktop (> 1024px) : 5 colonnes vitrine

## Migration DB

**Migration :** `20261026182011_add_user_profile`

Ajoute la table `user_profiles` avec :
- Clé étrangère vers `users`
- Champs : `displayName`, `bio`, `avatarUrl`, `currentTitle`

## Futures Améliorations

- [ ] Système de titres dynamiques basé sur performances
- [ ] Profils publics (`/profil/:userId`)
- [ ] Édition avatar/bio depuis l'interface
- [ ] Sélection manuelle des cartes vitrine (drag & drop)
- [ ] Graphiques de progression temporelle
- [ ] Historique des titres débloqués

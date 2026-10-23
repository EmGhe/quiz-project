# Quiz Game Platform - Daily Challenge + PvP + Collection

Application de quiz quotidien avec système de streak, PvP compétitif, collection de cartes et économie virtuelle.

## 🎮 Fonctionnalités Actuelles

### ✅ MVP1 - Daily Challenge (Complete)
- **Authentification sécurisée** - JWT avec HTTP-only cookies
- **Quiz quotidien** - 10 questions générées automatiquement à minuit UTC
- **Timer intelligent** - 25 secondes par question avec code couleur
- **Système de scoring** - Bonus vitesse + multiplicateur consécutif
- **Streak tracker** - Suivi jours consécutifs (🔥 current / 🏆 longest)
- **Leaderboard** - Classement quotidien avec médailles 🥇🥈🥉
- **Partage social** - Carte de partage pour réseaux sociaux
- **Navigation clavier** - Support touche Enter
- **Système de signalement** - Report questions problématiques

### ✅ MVP2 - PvP Competition (80% Complete)
- **Matchmaking 1v1** - WebSocket temps réel
- **Système ELO** - Classement compétitif (1000-2500)
- **Ranks & Divisions** - Bronze → Grandmaster (3 divisions chacun)
- **Match synchronisé** - 10 questions MCQ, timer partagé
- **Rematch system** - Rejouer contre le même adversaire
- **Match statistics** - Stats détaillées post-match

### ✅ MVP3 Phase 1 - Collection (Read-only)
- **52 cartes** - Entities Wikidata avec images
- **Système de raretés** - Common, Uncommon, Rare, Epic, Legendary
- **Filtres & recherche** - Par rareté, type d'entité, texte
- **Card detail modal** - Infos éducatives sur chaque entité (Wikidata)
- **Responsive design** - Mobile, tablet, desktop
- **Distribution algorithmique** - Raretés basées sur pageviews + profondeur wiki

### ✅ Gold Economy System (Complete)
- **Monnaie virtuelle** - Gold gagné en jouant
- **Récompenses Daily** - Gold basé sur score (formule: bonnes réponses × 3 + bonus temps × 2)
- **Bonus Streak** - Paliers de 5, 10, 20, 30, 50, 75, 100 jours
- **Transaction tracking** - Historique complet Gold gagné/dépensé
- **3 types de packs** - Bronze (500G), Silver (1200G), Gold (3000G)
- **Pity system** - Garanties progressives pour cartes rares
- **Système Fragments** - Destruction/amélioration de cartes
- **Boutique de packs** - Achat et ouverture avec animation

## 🚀 Installation Rapide

### Prérequis
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15.0
- Docker (optionnel, pour PostgreSQL)

### 1. Installation

```bash
# Cloner le repository
git clone <repo-url>
cd idée-business/quizz

# Installer les dépendances
pnpm install
```

### 2. Base de données

#### Option A: Avec Docker (Recommandé)
```bash
# Démarrer PostgreSQL
docker compose up -d

# Vérifier que la DB tourne
docker ps
```

#### Option B: PostgreSQL local
```bash
createdb quiz_db
```

### 3. Configuration Backend

```bash
cd apps/backend

# Générer le client Prisma et exécuter les migrations
pnpm prisma:migrate:dev

# Seed des configurations de packs
npx tsx scripts/setup/seed-pack-configs.ts

# (Optionnel) Seed des questions de test
npx tsx prisma/seed-questions.ts
```

### 4. Lancer l'application

```bash
# Terminal 1: Backend (port 3000)
cd apps/backend
pnpm dev

# Terminal 2: Frontend (port 5173)
cd apps/frontend
pnpm dev
```

🎉 **Application prête !**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📖 Guide d'Utilisation

### Flow Utilisateur Complet

```
1. Register/Login → Créer compte ou se connecter
   ↓
2. Daily Challenge → Répondre aux 10 questions (25s chacune)
   ↓ (gagner Gold selon performance)
3. Results → Voir score + Gold gagné
   ↓
4. Shop → Dépenser Gold pour acheter des packs
   ↓
5. Ouvrir packs → Obtenir des cartes aléatoires
   ↓
6. Collection → Consulter ses cartes
   ↓
7. PvP → Affronter d'autres joueurs en 1v1
   ↓
8. Leaderboard → Comparer avec la communauté
```

### Système de Gold 💰

**Comment gagner du Gold :**
- **Daily Challenge** : Formule = (Bonnes réponses × 3) + (Bonus temps × 2)
  - Max théorique : 50 Gold/quiz (10/10 parfait)
  - Expert réaliste : ~46 Gold/quiz
- **Bonus Streak** : Paliers progressifs jusqu'à 500G (100 jours)
- **PvP** (futur) : Victoire/défaite

**Comment dépenser du Gold :**
- **Pack Bronze** : 500 Gold (5 cartes)
- **Pack Silver** : 1200 Gold (5 cartes)
- **Pack Gold** : 3000 Gold (5 cartes)

### Système de Fragments ✨

- **Destruction de cartes** : Récupérer des fragments (10-400 selon rareté)
- **Amélioration de cartes** : Dépenser des fragments pour upgrader
  - Common → Rare : 30 fragments
  - Rare → Epic : 100 fragments
  - Epic → Legendary : 300 fragments

## 🛠️ Commandes Utiles

### Backend
```bash
cd apps/backend
pnpm dev                      # Développement
pnpm build                    # Build production
pnpm start                    # Démarrer production

# Prisma
pnpm prisma:studio            # Interface DB visuelle
pnpm prisma:migrate:dev       # Créer migration
npx prisma db push            # Sync schema (dev rapide)

# Seeds
npx tsx scripts/setup/seed-pack-configs.ts       # Configs packs
npx tsx scripts/ingest/quizzapi-import.ts        # Import QuizzAPI
npx tsx scripts/qa/detect-duplicate-questions.ts # QA doublons
```

### Frontend
```bash
cd apps/frontend
pnpm dev                      # Développement
pnpm build                    # Build production
pnpm preview                  # Preview du build
```

## 📁 Structure

```
idée-business/quizz/
├── apps/
│   ├── backend/              # NestJS API
│   │   ├── prisma/           # Modèles DB & migrations
│   │   ├── src/modules/      
│   │   │   ├── auth/         # Authentification JWT
│   │   │   ├── daily/        # Daily Challenge
│   │   │   ├── questions/    # Questions DB
│   │   │   ├── pvp/          # PvP matchmaking & WebSocket
│   │   │   ├── collection/   # Collection cards & albums
│   │   │   ├── gold/         # Gold economy
│   │   │   ├── fragments/    # Fragment system
│   │   │   └── packs/        # Pack purchase & opening
│   │   └── scripts/
│   │       ├── setup/        # Seeds & initialization
│   │       ├── ingest/       # Import questions
│   │       ├── fixes/        # Data fixes
│   │       └── qa/           # Quality assurance
│   └── frontend/             # React + Vite
│       └── src/
│           ├── pages/        # DailyPage, ShopPage, CollectionPage, PvP
│           ├── components/   # UI components
│           │   └── economy/  # Gold, Fragments, Packs UI
│           ├── api/          # API clients
│           └── store/        # Zustand stores
├── docs/                     # Documentation complète
│   ├── GOLD/                 # Gold economy guide
│   ├── COLLEC/               # Collection specs
│   ├── ARCHITECTURE.md       # Architecture technique
│   ├── DATABASE.md           # Modèle de données
│   ├── QUESTION-QUALITY-GUIDELINES.md
│   ├── ROADMAP.md            # Roadmap développement
│   └── SESSION-SUMMARY-*.md  # Résumés de sessions
└── docker-compose.yml        # PostgreSQL container
```

## 🧪 Développement

### Scripts Disponibles

**Import de contenu :**
```bash
# Import 87 questions de QuizzAPI.fr
npx tsx scripts/ingest/quizzapi-import.ts

# Fixes distracteurs
npx tsx scripts/fixes/fix-quizzapi-distractors.ts
```

**Quality Assurance :**
```bash
# Détection doublons intelligente
npx tsx scripts/qa/detect-duplicate-questions.ts
```

**Admin Tools :**
- Interface admin : `http://localhost:5173/admin`
- Prisma Studio : `npx prisma studio` (port 5555)

### Testing Gold Economy

1. **Créer un utilisateur de test**
2. **Jouer un Daily** → Gagner du Gold
3. **Aller sur `/shop`** → Voir son solde
4. **Acheter un pack** → Dépenser du Gold
5. **Ouvrir le pack** → Voir l'animation et les cartes

Pour tester avec plus de Gold :
```bash
npx prisma studio
# → Modifier users.gold manuellement
```

## 🐛 Dépannage

**Backend ne démarre pas**  
→ `docker ps` puis `docker compose up -d`

**"No questions for daily"**  
→ `cd apps/backend && npx tsx scripts/ingest/quizzapi-import.ts`

**Erreur "Cannot read properties of undefined"**  
→ Backend redémarré après modifications auth ? Ctrl+C puis `pnpm dev`

**Frontend déconnecté**  
→ Vérifier `CORS_ORIGIN` dans `apps/backend/.env`

**Gold balance ne s'affiche pas**  
→ Rafraîchir la page, vérifier que le backend tourne

## 📚 Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Architecture technique
- **[DATABASE.md](./docs/DATABASE.md)** - Schéma base de données
- **[ROADMAP.md](./docs/ROADMAP.md)** - Roadmap complète MVP1-V3
- **[QUESTION-QUALITY-GUIDELINES.md](./docs/QUESTION-QUALITY-GUIDELINES.md)** - Guidelines qualité
- **[docs/GOLD/README.md](./docs/GOLD/README.md)** - Guide système économique (38 pages)
- **[apps/frontend/ECONOMY_GUIDE.md](./apps/frontend/ECONOMY_GUIDE.md)** - Guide frontend économie

## 🗺️ Roadmap

### ✅ Complété
- **MVP1** - Daily Challenge, authentification, streaks, leaderboard
- **POST-MVP1** - Import 87 questions QuizzAPI, admin dashboard, QA tools
- **MVP2** - PvP matchmaking, ELO, ranks (80% complet)
- **MVP3 Phase 1** - Collection 52 cartes, albums, raretés (read-only)
- **Gold Economy** - Système complet Gold + Fragments + Packs

### 🚧 En cours
- **MVP2** - Finitions UI ranks, missions hebdomadaires
- **POST-MVP1** - Import 400+ questions supplémentaires (objectif 500+)

### 📅 À venir
- **MVP3 Phase 2** - Ownership layer (user ↔ cards), pack opening rewards
- **V2** - Achievements, personnalisation profil
- **V3** - Marketplace, trading, tournois

## 📊 Statistiques Actuelles

- **Questions** : ~147 (87 QuizzAPI + 60 existantes)
- **Cartes Collection** : 52 entités Wikidata avec images
- **Raretés** : 5 niveaux (Common → Legendary)
- **Packs** : 3 types (Bronze/Silver/Gold)
- **Types d'entités** : Personnalités, lieux emblématiques, symboles, monuments

## 🎯 Objectif Court Terme

**Semaines 1-2 :**
- [ ] Importer 400+ questions supplémentaires
- [ ] Atteindre 500+ questions publiées
- [ ] Finir UI ranks PvP
- [ ] Tests de charge WebSocket

**Semaines 3-4 :**
- [ ] Polish esthétique (cartes, raretés, gold UI)
- [ ] Beta testing 20-50 utilisateurs
- [ ] Mesurer métriques de rétention

## 📝 Licence

© 2026 Quiz Game Platform - All rights reserved

---

**Version** : MVP3 Phase 1 + Gold Economy Complete  
**Dernière mise à jour** : 2026-10-23  
**Stack** : NestJS 12 + React 18 + PostgreSQL 15 + Socket.io + Prisma

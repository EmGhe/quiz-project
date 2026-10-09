# Quiz Game Platform - Daily Challenge

Application de quiz quotidien avec système de streak, leaderboard et partage social.

## 🎮 Fonctionnalités MVP1 ✅

- ✅ **Authentification sécurisée** - JWT avec HTTP-only cookies
- ✅ **Quiz quotidien** - 10 questions générées automatiquement à minuit UTC
- ✅ **Timer intelligent** - 25 secondes par question avec code couleur (bleu/orange/rouge)
- ✅ **Système de scoring** - Bonus vitesse (0-3s: +100pts → 23-25s: +40pts) + multiplicateur consécutif (1.0x → 1.5x)
- ✅ **Streak tracker** - Suivi des jours consécutifs avec 🔥 current streak et 🏆 longest streak
- ✅ **Leaderboard** - Classement quotidien avec médailles (🥇🥈🥉) pour le top 3
- ✅ **Résultats détaillés** - Breakdown par question avec points gagnés et temps
- ✅ **Partage social** - Carte de partage pour Twitter avec score et statistiques
- ✅ **Navigation clavier** - Support de la touche Enter pour avancer

## 🚀 Installation Rapide

### Prérequis
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15.0
- Docker (optionnel, pour PostgreSQL)

### 1. Installation

```bash
# Naviguer vers le projet
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
# Créer la base de données
createdb quiz_db
```

### 3. Configuration Backend

```bash
cd apps/backend

# Le fichier .env existe déjà avec la config par défaut
# Générer le client Prisma et exécuter les migrations
pnpm prisma:migrate:dev

# (Optionnel) Seed des questions de test
pnpm tsx prisma/seed-questions.ts
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

### Flow Utilisateur

```
1. Register/Login → Créer compte ou se connecter
   ↓
2. Daily Challenge → Répondre aux 10 questions (25s chacune)
   ↓
3. Submit Quiz → Voir vos résultats et votre score
   ↓
4. Leaderboard → Comparer avec les autres joueurs
   ↓
5. Share → Partager votre score sur les réseaux
```

### Scoring Intelligent

- **Base**: 100 points par bonne réponse
- **Bonus vitesse**: 0-3s = +100pts, 3-7s = +90pts, ..., 22-25s = +40pts
- **Multiplicateur**: Bonnes réponses consécutives donnent un multiplicateur jusqu'à 1.5x

### Système de Streak 🔥

- Complétez le daily chaque jour pour maintenir votre streak
- La streak se réinitialise si vous sautez un jour (23h59 UTC)
- Visible en haut de la page Daily Challenge

## 🛠️ Commandes Utiles

### Backend
```bash
cd apps/backend
pnpm dev                    # Développement
pnpm prisma:studio          # Interface DB visuelle
pnpm prisma:migrate:dev     # Créer migration
pnpm build                  # Build production
pnpm start                  # Démarrer production
```

### Frontend
```bash
cd apps/frontend
pnpm dev                    # Développement
pnpm build                  # Build production
pnpm preview                # Preview du build
```

## 📁 Structure

```
idée-business/quizz/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── prisma/       # Modèles DB & migrations
│   │   └── src/modules/  # auth, daily, questions
│   └── frontend/         # React + Vite
│       └── src/          # pages, components, api, store
├── docs/                 # Documentation & roadmaps
└── docker-compose.yml    # PostgreSQL
```

## 🐛 Dépannage

**Backend ne démarre pas**: `docker ps` puis `docker compose up -d`  
**No questions for daily**: `cd apps/backend && pnpm tsx prisma/seed-questions.ts`  
**Frontend déconnecté**: Vérifier CORS_ORIGIN dans `apps/backend/.env`

Pour plus de détails, voir [DEVELOPMENT.md](./DEVELOPMENT.md)

## 🗺️ Roadmap

### ✅ MVP1 - Daily Challenge (Complété)
- Authentification, quiz quotidien, scoring, streaks, leaderboard, partage social

### 🚧 MVP2 - PvP (À venir)
- Matchmaking 1v1, système ELO, missions hebdomadaires

### 📅 V2 - Collection
- Cartes à collectionner, packs, économie Gold

### 📅 V3 - Social & Marketplace
- Trading, ligues privées, tournois

## 📝 Licence

© 2026 Quiz Game Platform - All rights reserved

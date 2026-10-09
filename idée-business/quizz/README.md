# Quiz Game Platform

A competitive quiz game with Daily challenges, PvP, card collection, and social features.

## 🎯 Vision

Create an addictive general knowledge game combining:
- **Daily challenges** (core loop)
- **PvP competition** (ELO, ranks, seasons)
- **Card collection** (educational + prestige)
- **Social features** (friends, private leagues)
- **Progression** (streaks, achievements, Gold economy)

See [vision_globale.md](./brainstorm/vision_globale.md) for full game design.

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** NestJS + Prisma
- **Database:** PostgreSQL 15
- **Monorepo:** pnpm workspaces

## 📁 Project Structure

```
quiz-game-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite
├── docs/                 # Documentation
└── docker-compose.yml    # Dev services
```

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d

# Setup database
cd apps/backend
cp .env.example .env
pnpm prisma:migrate:dev

# Start all services
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📚 Documentation

- [Development Guide](./docs/DEVELOPMENT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
- [Vision & Game Design](./brainstorm/vision_globale.md)

## 🗺️ Roadmap

### MVP1 (Foundation)
- ✅ Project initialization
- ⏳ Daily challenge (10 questions)
- ⏳ Scoring & timer
- ⏳ Streak system
- ⏳ Daily leaderboard
- ⏳ Share results

### MVP2 (Competition)
- PvP matchmaking
- ELO system
- Category bans
- Weekly missions

### V2 (Collection)
- Card system
- Packs & albums
- Gold economy
- Achievements

### V3 (Social & Endgame)
- Marketplace
- Private leagues
- "Nuit des Érudits" tournament
- Seasonal rewards

## 📊 Database Strategy

Facts-first approach:
```
Reliable Source → Structured Fact → Generated Question → Validation → Publication
```

See [stratégie_bdd_quiz.md](./brainstorm/stratégie_bdd_quiz.md).

## 💰 Budget-Friendly Hosting

- **Database:** Supabase (free tier: 500MB)
- **Backend:** Railway (free tier: 512MB RAM)
- **Frontend:** Vercel (free tier: unlimited)
- **Storage:** Cloudinary (free tier: 25GB)

Total: **$0/month** for MVP testing.

## 🧪 Development

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Database studio
cd apps/backend && pnpm prisma:studio
```

## 📝 License

Private - All rights reserved

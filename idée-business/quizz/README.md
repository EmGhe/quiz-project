# Quiz Game Platform

A competitive quiz game with Daily challenges, PvP, card collection, and social features.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** NestJS + Prisma + PostgreSQL
- **Monorepo:** pnpm workspaces

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

## Quick Start

```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d

# Run migrations
cd apps/backend && pnpm prisma:migrate:dev

# Start development servers
pnpm dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Project Structure

```
quiz-game-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite
├── packages/             # Shared packages (future)
└── docs/                 # Documentation
```

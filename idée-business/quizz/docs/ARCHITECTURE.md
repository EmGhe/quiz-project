# Architecture Overview

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** NestJS + Prisma
- **Database:** PostgreSQL 15
- **Monorepo:** pnpm workspaces

## Project Structure

\`\`\`
quiz-game-platform/
├── apps/
│   ├── backend/              # NestJS API
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── questions/
│   │   │   │   ├── daily/    # (future MVP1)
│   │   │   │   ├── pvp/      # (future MVP2)
│   │   │   │   └── ...
│   │   │   ├── common/       # Shared utilities
│   │   │   ├── prisma/       # Database service
│   │   │   └── main.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── frontend/             # React SPA
│       ├── src/
│       │   ├── api/          # API clients
│       │   ├── components/   # UI components
│       │   ├── pages/        # Route pages
│       │   ├── config/       # Configuration
│       │   └── types/        # TypeScript types
│       └── ...
│
├── docs/                     # Documentation
└── docker-compose.yml        # Local dev services
\`\`\`

## Backend Architecture

### Modular Design

Each feature is a NestJS module with:
- Controller (routes)
- Service (business logic)
- DTOs (validation)
- Tests

### Database Layer

- **Prisma ORM** for type-safe queries
- **Global PrismaModule** injected everywhere
- Migrations tracked in \`prisma/migrations/\`

### Planned Modules (MVP1-V3)

\`\`\`
modules/
├── auth/         # JWT authentication
├── users/        # User management
├── questions/    # ✅ Question CRUD
├── daily/        # Daily challenge
├── pvp/          # PvP matchmaking
├── collection/   # Card collection
├── economy/      # Gold system
└── notifications/
\`\`\`

## Frontend Architecture

### Component Structure

\`\`\`
components/
├── ui/           # Reusable UI (Button, Card, Input)
├── features/     # Feature-specific (DailyQuiz, PvPMatch)
└── layout/       # Layout components (Header, Sidebar)
\`\`\`

### State Management

- **Zustand** for global state
- **React Query** for server state (future)

### API Layer

- Centralized \`apiClient\` with Axios
- Typed API functions (e.g., \`questionsApi.getAll()\`)

## Database Schema

See [DATABASE.md](./DATABASE.md) for full schema.

### Core Entities

\`\`\`
sources → faits → questions → reponses_acceptees
           ↓
      categories
\`\`\`

### Fact-First Approach

1. Extract data from reliable source (Wikidata, data.gouv.fr)
2. Create structured fact (subject-property-object)
3. Generate questions from fact
4. Validate and publish

This ensures:
- ✅ Traceability (source + last verification date)
- ✅ No duplicates (1 fact → multiple question formulations)
- ✅ Easy updates (change fact → all questions updated)

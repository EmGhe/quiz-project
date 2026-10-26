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

### Authentication

**⚠️ IMPORTANT : Le projet utilise l'authentification par cookies HTTP-only, PAS localStorage.**

#### Backend
- JWT stocké dans un cookie HTTP-only (sécurisé, non accessible en JS)
- `JwtAuthGuard` vérifie automatiquement le cookie sur les routes protégées
- Routes protégées : utilisent `@UseGuards(JwtAuthGuard)` et `@CurrentUser()`

#### Frontend
- **Toujours utiliser `apiClient`** de `src/api/client.ts`
- `apiClient` est configuré avec `withCredentials: true` pour envoyer les cookies
- ❌ **NE JAMAIS** utiliser `axios` directement ou chercher un token dans localStorage
- ✅ **TOUJOURS** importer et utiliser `apiClient`

#### Pattern pour une nouvelle API
```typescript
// ✅ BON - apps/frontend/src/api/myfeature.ts
import { apiClient } from './client';

export const myFeatureApi = {
  getData: async () => {
    const response = await apiClient.get('/api/myfeature');
    return response.data;
  },
};

// ❌ MAUVAIS - N'utilise pas axios directement
import axios from 'axios';
const token = localStorage.getItem('token'); // ❌ Le token n'est pas là
```

#### Pattern pour un nouveau module backend
```typescript
// Controller
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/myfeature')  // ⚠️ Toujours préfixer par 'api/'
@UseGuards(JwtAuthGuard)
export class MyFeatureController {
  @Get()
  async getData(@CurrentUser() userId: string) {
    // userId est automatiquement extrait du JWT
    return this.service.getData(userId);
  }
}

// Module
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; // ⚠️ IMPORTANT

@Module({
  imports: [AuthModule], // ⚠️ Requis pour JwtAuthGuard
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
})
export class MyFeatureModule {}
```

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

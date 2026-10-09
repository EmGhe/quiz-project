# Quiz Game Platform - Project Initialization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a monorepo project with React+Vite frontend, NestJS backend, PostgreSQL database, and development tooling for a competitive quiz game platform.

**Architecture:** Monorepo using pnpm workspaces with separate frontend and backend packages. Backend uses modular NestJS architecture. Database schema follows the fact-first approach (sources → facts → questions → accepted answers). Docker Compose for local development.

**Tech Stack:** 
- Frontend: React 18, Vite, Tailwind CSS, TypeScript
- Backend: NestJS, Prisma, TypeScript
- Database: PostgreSQL 15
- Dev Tools: pnpm, Docker, ESLint, Prettier

**Spec:** `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/vision_globale.md` and `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/stratégie_bdd_quiz.md`

## Global Constraints

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- PostgreSQL >= 15.0
- pnpm >= 8.0.0 (monorepo workspace management)
- All packages must use strict TypeScript mode
- Budget-friendly: use free tiers (Supabase, Vercel, Railway)
- No placeholder code or TODOs in production code

## Review Focus

1. **Database transactions for Gold economy** - All Gold transfers must be atomic (buy/sell/tax) to prevent duplication exploits
2. **Timer manipulation in Daily/PvP** - Client cannot be source of truth for answer timestamps; server validates all timing
3. **Case-insensitive answer matching** - "États-Unis", "USA", "Etats-Unis" must all be accepted without false negatives
4. **Concurrent Daily completion** - Two users completing Daily #142 simultaneously must both get valid, independent scores
5. **ELO calculation edge cases** - Matchmaking with large ELO gaps must not create negative ELO or integer overflow

---

## Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `README.md`
- Create: `apps/backend/package.json`
- Create: `apps/frontend/package.json`

**Interfaces:**
- Consumes: None (first task)
- Produces: Monorepo workspace structure with `apps/backend` and `apps/frontend` packages

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "quiz-game-platform",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "pnpm -r type-check"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm workspace configuration**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create .nvmrc for Node version**

```
18.19.0
```

- [ ] **Step 4: Create .gitignore**

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
postgres-data/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Cache
.turbo/
.next/
.cache/
```

- [ ] **Step 5: Create root README.md**

```markdown
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

\`\`\`bash
# Install dependencies
pnpm install

# Start database
docker compose up -d

# Run migrations
cd apps/backend && pnpm prisma:migrate:dev

# Start development servers
pnpm dev
\`\`\`

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Project Structure

\`\`\`
quiz-game-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite
├── packages/             # Shared packages (future)
└── docs/                 # Documentation
\`\`\`
```

- [ ] **Step 6: Verify structure**

```bash
ls -la
```

Expected: root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.nvmrc`, `README.md` exist

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo structure"
```

---

## Task 2: Initialize NestJS Backend

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/nest-cli.json`
- Create: `apps/backend/.env.example`
- Create: `apps/backend/src/main.ts`
- Create: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/app.controller.ts`
- Create: `apps/backend/src/app.service.ts`

**Interfaces:**
- Consumes: Monorepo structure from Task 1
- Produces: NestJS backend running at `http://localhost:3000` with health check endpoint `GET /health`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "@quiz/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.2.10",
    "@nestjs/core": "^10.2.10",
    "@nestjs/platform-express": "^10.2.10",
    "@nestjs/config": "^3.1.1",
    "@prisma/client": "^5.7.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.2.1",
    "@nestjs/schematics": "^10.0.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "eslint": "^8.55.0",
    "prisma": "^5.7.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.2"
  }
}
```

- [ ] **Step 2: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create .env.example**

```
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quiz_db?schema=public"

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 5: Create src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN'),
    credentials: true,
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 6: Create src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Create src/app.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
```

- [ ] **Step 8: Create src/app.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'quiz-backend',
    };
  }
}
```

- [ ] **Step 9: Install backend dependencies**

```bash
cd apps/backend
pnpm install
```

Expected: `node_modules` created, no errors

- [ ] **Step 10: Verify backend builds**

```bash
cd apps/backend
pnpm build
```

Expected: `dist/` folder created with compiled JS

- [ ] **Step 11: Commit**

```bash
git add apps/backend
git commit -m "feat(backend): initialize NestJS application"
```

---

## Task 3: Initialize React + Vite Frontend

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/index.html`
- Create: `apps/frontend/src/main.tsx`
- Create: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/vite-env.d.ts`
- Create: `apps/frontend/.env.example`
- Create: `apps/frontend/tailwind.config.js`
- Create: `apps/frontend/postcss.config.js`
- Create: `apps/frontend/src/index.css`

**Interfaces:**
- Consumes: Monorepo structure from Task 1
- Produces: React frontend running at `http://localhost:5173` with Tailwind CSS configured

- [ ] **Step 1: Create frontend package.json**

```json
{
  "name": "@quiz/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.2",
    "vite": "^5.0.7",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quiz Game - Culture Générale</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create .env.example**

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 8: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 9: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 10: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}
```

- [ ] **Step 11: Create src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 12: Create src/App.tsx**

```typescript
import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not running:', err));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Quiz Game Platform
        </h1>
        <p className="text-gray-600 mb-8">
          Frontend + Backend initialized successfully
        </p>
        {health && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
            <p className="text-green-800 font-medium">
              ✓ Backend Status: {health.status}
            </p>
            <p className="text-green-600 text-sm mt-1">
              {health.service} • {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 13: Install frontend dependencies**

```bash
cd apps/frontend
pnpm install
```

Expected: `node_modules` created, no errors

- [ ] **Step 14: Verify frontend builds**

```bash
cd apps/frontend
pnpm build
```

Expected: `dist/` folder created with bundled assets

- [ ] **Step 15: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): initialize React + Vite with Tailwind CSS"
```

---

## Task 4: Setup PostgreSQL with Prisma

**Files:**
- Create: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/src/prisma/prisma.module.ts`
- Create: `apps/backend/src/prisma/prisma.service.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Backend from Task 2, database schema from `/Users/hichamghermani/Desktop/projects/idée-business/quizz/database/schema.sql`
- Produces: Prisma client with models: `Source`, `Category`, `Fact`, `Question`, `AcceptedAnswer`, `DetectedDuplicate`, `FactHistory`

- [ ] **Step 1: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Source {
  id          String   @id @default(uuid())
  name        String
  type        String   // 'wikidata', 'data_gouv', 'api', 'manuel'
  url         String?
  reliability Int?     // 1-5
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  facts Fact[]

  @@map("sources")
}

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  parentId    String?
  icon        String?
  createdAt   DateTime @default(now())

  parent    Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryHierarchy")
  facts     Fact[]
  questions Question[]

  @@map("categories")
}

model Fact {
  id                   String   @id @default(uuid())
  subject              String
  property             String
  object               String
  sourceId             String
  sourceReference      String?
  lastVerification     DateTime @default(now())
  categoryId           String?
  tags                 String[]
  geoRegion            String?  // 'france', 'europe', 'amerique_nord', 'reste_monde'
  data                 Json?
  interestScore        Int?     // 1-10
  active               Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  createdBy            String?

  source    Source        @relation(fields: [sourceId], references: [id])
  category  Category?     @relation(fields: [categoryId], references: [id])
  questions Question[]
  history   FactHistory[]

  @@unique([subject, property, object])
  @@map("faits")
}

model Question {
  id                      String   @id @default(uuid())
  factId                  String
  text                    String   @unique
  questionType            String   @default("texte") // 'texte', 'image', 'carte'
  mediaUrl                String?
  mediaType               String?
  difficulty              String?  // 'facile', 'moyen', 'difficile'
  difficultyScore         Int?     // 1-100
  categoryId              String?
  qualityScore            Int?     // 1-100
  ambiguous               Boolean  @default(false)
  displayCount            Int      @default(0)
  correctAnswersCount     Int      @default(0)
  incorrectAnswersCount   Int      @default(0)
  successRate             Decimal? @db.Decimal(5, 2)
  status                  String   @default("brouillon") // 'brouillon', 'valide', 'publie', 'archive'
  validatedBy             String?
  validatedAt             DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  fact             Fact              @relation(fields: [factId], references: [id])
  category         Category?         @relation(fields: [categoryId], references: [id])
  acceptedAnswers  AcceptedAnswer[]
  duplicates1      DetectedDuplicate[] @relation("Question1")
  duplicates2      DetectedDuplicate[] @relation("Question2")

  @@map("questions")
}

model AcceptedAnswer {
  id           String   @id @default(uuid())
  questionId   String
  answer       String
  isPrimary    Boolean  @default(false)
  variantType  String?  // 'exacte', 'accent', 'abreviation', 'orthographe'
  createdAt    DateTime @default(now())

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("reponses_acceptees")
}

model DetectedDuplicate {
  id                String    @id @default(uuid())
  question1Id       String
  question2Id       String
  similarityScore   Decimal   @db.Decimal(5, 2)
  duplicateType     String    // 'exact', 'reformulation', 'partiel'
  resolved          Boolean   @default(false)
  action            String?   // 'fusionnee', 'conservee', 'supprimee'
  resolvedBy        String?
  resolvedAt        DateTime?
  createdAt         DateTime  @default(now())

  question1 Question @relation("Question1", fields: [question1Id], references: [id], onDelete: Cascade)
  question2 Question @relation("Question2", fields: [question2Id], references: [id], onDelete: Cascade)

  @@map("doublons_detectes")
}

model FactHistory {
  id         String   @id @default(uuid())
  factId     String
  oldObject  String?
  newObject  String?
  reason     String?
  modifiedBy String?
  modifiedAt DateTime @default(now())

  fact Fact @relation(fields: [factId], references: [id], onDelete: Cascade)

  @@map("historique_faits")
}
```

- [ ] **Step 2: Create src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✓ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: Create src/prisma/prisma.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Update src/app.module.ts to import PrismaModule**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Create .env file from example**

```bash
cd apps/backend
cp .env.example .env
```

- [ ] **Step 6: Generate Prisma client**

```bash
cd apps/backend
pnpm prisma:generate
```

Expected: Prisma Client generated in `node_modules/@prisma/client`

- [ ] **Step 7: Commit**

```bash
git add apps/backend/prisma apps/backend/src/prisma apps/backend/src/app.module.ts
git commit -m "feat(backend): setup Prisma with database schema"
```

---

## Task 5: Docker Compose for Development

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/backend/.dockerignore`
- Create: `.env.docker`

**Interfaces:**
- Consumes: Backend from Task 2, Prisma schema from Task 4
- Produces: Docker Compose stack with PostgreSQL at `localhost:5432`, accessible via `DATABASE_URL` in backend

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: quiz-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: quiz_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

- [ ] **Step 2: Create apps/backend/.dockerignore**

```
node_modules
dist
.env
.env.local
*.log
coverage
.git
```

- [ ] **Step 3: Start PostgreSQL container**

```bash
docker compose up -d
```

Expected: Container `quiz-postgres` running, PostgreSQL accessible at `localhost:5432`

- [ ] **Step 4: Verify database connection**

```bash
docker compose exec postgres psql -U postgres -d quiz_db -c "SELECT version();"
```

Expected: PostgreSQL version output

- [ ] **Step 5: Run Prisma migrations**

```bash
cd apps/backend
pnpm prisma:migrate:dev --name init
```

Expected: Migration files created in `prisma/migrations/`, tables created in database

- [ ] **Step 6: Verify tables created**

```bash
docker compose exec postgres psql -U postgres -d quiz_db -c "\dt"
```

Expected: Tables `sources`, `categories`, `faits`, `questions`, `reponses_acceptees`, `doublons_detectes`, `historique_faits` listed

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml apps/backend/.dockerignore apps/backend/prisma/migrations
git commit -m "feat: add Docker Compose for PostgreSQL development"
```

---

## Task 6: Backend Module Architecture

**Files:**
- Create: `apps/backend/src/common/interfaces/index.ts`
- Create: `apps/backend/src/modules/questions/questions.module.ts`
- Create: `apps/backend/src/modules/questions/questions.controller.ts`
- Create: `apps/backend/src/modules/questions/questions.service.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Backend from Task 2, Prisma from Task 4
- Produces: Modular backend structure with `/api/questions` endpoint returning `GET /api/questions` → `{ data: Question[], total: number }`

- [ ] **Step 1: Create src/common/interfaces/index.ts**

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

- [ ] **Step 2: Create directory structure**

```bash
cd apps/backend/src
mkdir -p modules/questions
```

- [ ] **Step 3: Create modules/questions/questions.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginatedResponse } from '@/common/interfaces';
import { Question } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Question>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        skip,
        take: limit,
        where: { status: 'publie' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where: { status: 'publie' } }),
    ]);

    return { data, total, page, limit };
  }
}
```

- [ ] **Step 4: Create modules/questions/questions.controller.ts**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { ApiResponse, PaginatedResponse } from '@/common/interfaces';
import { Question } from '@prisma/client';

@Controller('api/questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<ApiResponse<PaginatedResponse<Question>>> {
    const result = await this.questionsService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { success: true, data: result };
  }
}
```

- [ ] **Step 5: Create modules/questions/questions.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
```

- [ ] **Step 6: Update src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './modules/questions/questions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Test questions endpoint**

Start backend:
```bash
cd apps/backend
pnpm dev
```

Test in another terminal:
```bash
curl http://localhost:3000/api/questions
```

Expected: `{"success":true,"data":{"data":[],"total":0,"page":1,"limit":20}}`

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src
git commit -m "feat(backend): add modular architecture with questions module"
```

---

## Task 7: Frontend API Layer & Environment Setup

**Files:**
- Create: `apps/frontend/src/config/env.ts`
- Create: `apps/frontend/src/api/client.ts`
- Create: `apps/frontend/src/api/questions.ts`
- Create: `apps/frontend/.env`

**Interfaces:**
- Consumes: Frontend from Task 3, Backend Questions API from Task 6
- Produces: API client with `questionsApi.getAll(page, limit)` returning `Promise<PaginatedResponse<Question>>`

- [ ] **Step 1: Create .env file**

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 2: Create src/config/env.ts**

```typescript
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
};
```

- [ ] **Step 3: Create src/api/client.ts**

```typescript
import axios from 'axios';
import { env } from '@/config/env';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  },
);
```

- [ ] **Step 4: Create src/types/api.ts**

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Question {
  id: string;
  factId: string;
  text: string;
  questionType: string;
  difficulty?: string;
  categoryId?: string;
  status: string;
  createdAt: string;
}
```

- [ ] **Step 5: Create src/api/questions.ts**

```typescript
import { apiClient } from './client';
import { ApiResponse, PaginatedResponse, Question } from '@/types/api';

export const questionsApi = {
  async getAll(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Question>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Question>>>(
      '/api/questions',
      { params: { page, limit } },
    );
    return response.data.data!;
  },
};
```

- [ ] **Step 6: Update src/App.tsx to test API**

```typescript
import { useState, useEffect } from 'react';
import { questionsApi } from '@/api/questions';
import type { Question } from '@/types/api';

function App() {
  const [health, setHealth] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not running:', err));
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const result = await questionsApi.getAll();
      setQuestions(result.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Quiz Game Platform
        </h1>
        
        {health && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-800 font-medium">
              ✓ Backend Status: {health.status}
            </p>
          </div>
        )}

        <button
          onClick={loadQuestions}
          disabled={loading}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Questions'}
        </button>

        <div className="mt-4">
          <p className="text-gray-600">
            Questions loaded: {questions.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Test frontend with backend**

Start both servers:
```bash
# Terminal 1
cd apps/backend && pnpm dev

# Terminal 2
cd apps/frontend && pnpm dev
```

Open http://localhost:5173, click "Load Questions"

Expected: "Questions loaded: 0" (no error in console)

- [ ] **Step 8: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): add API client and questions integration"
```

---

## Task 8: Development Scripts & Documentation

**Files:**
- Create: `docs/DEVELOPMENT.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/DATABASE.md`
- Modify: `README.md` (root)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Complete development documentation with setup instructions, architecture overview, and database schema reference

- [ ] **Step 1: Create docs/DEVELOPMENT.md**

```markdown
# Development Guide

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

## Initial Setup

\`\`\`bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Start database
docker compose up -d

# Setup database
cd apps/backend
cp .env.example .env
pnpm prisma:migrate:dev
pnpm prisma:generate
\`\`\`

## Development

\`\`\`bash
# Start all services
pnpm dev

# Or start individually
cd apps/backend && pnpm dev  # Backend: http://localhost:3000
cd apps/frontend && pnpm dev # Frontend: http://localhost:5173
\`\`\`

## Database

\`\`\`bash
# Run migrations
cd apps/backend && pnpm prisma:migrate:dev

# Open Prisma Studio
cd apps/backend && pnpm prisma:studio

# Reset database (WARNING: deletes all data)
cd apps/backend && pnpm prisma:migrate:reset
\`\`\`

## Testing

\`\`\`bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
\`\`\`

## Troubleshooting

### Database connection failed

\`\`\`bash
# Restart database
docker compose restart postgres

# Check logs
docker compose logs postgres
\`\`\`

### Port already in use

\`\`\`bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in apps/backend/.env
PORT=3001
\`\`\`
```

- [ ] **Step 2: Create docs/ARCHITECTURE.md**

```markdown
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
- Migrations tracked in `prisma/migrations/`

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
```

- [ ] **Step 3: Create docs/DATABASE.md**

```markdown
# Database Schema

## Design Principles

### Fact-First Architecture

\`\`\`
SOURCE → FACT → QUESTION → PUBLICATION
\`\`\`

Never generate questions from LLM memory. Always:
1. Verify fact from reliable source
2. Store structured fact
3. Generate question from fact

### Traceability

Every fact includes:
- \`sourceId\` (Wikidata, data.gouv.fr, etc.)
- \`sourceReference\` (e.g., "Q90" for Paris in Wikidata)
- \`lastVerification\` (date fact was last checked)

## Core Tables

### sources

Reliable data sources.

\`\`\`sql
id, name, type, url, reliability (1-5), description
\`\`\`

### categories

Hierarchical categories (Geography, History, etc.).

\`\`\`sql
id, name, slug, description, parentId, icon
\`\`\`

### faits (facts)

Source of truth. Subject-property-object triplets.

\`\`\`sql
subject: "Paris"
property: "est la capitale de"
object: "France"
sourceId: wikidata-uuid
geoRegion: "france"
\`\`\`

### questions

Generated from facts.

\`\`\`sql
id, factId, text, difficulty, status, successRate
\`\`\`

### reponses_acceptees (accepted answers)

All valid answer variants.

\`\`\`sql
questionId, answer, isPrimary, variantType
\`\`\`

Example:
- "États-Unis" (primary)
- "USA" (abbreviation)
- "Etats-Unis" (no accent)

### doublons_detectes

Duplicate question detection.

\`\`\`sql
question1Id, question2Id, similarityScore, resolved
\`\`\`

## Geographic Distribution

\`geoRegion\` field ensures balanced content:
- \`france\`: 35%
- \`europe\`: 25%
- \`amerique_nord\`: 20%
- \`reste_monde\`: 20%

## Difficulty Distribution

- \`facile\`: 20%
- \`moyen\`: 60%
- \`difficile\`: 20%

## Example Query

Get random easy geography questions:

\`\`\`sql
SELECT q.*, array_agg(ra.answer) as accepted_answers
FROM questions q
JOIN categories c ON q.categoryId = c.id
JOIN reponses_acceptees ra ON q.id = ra.questionId
WHERE q.status = 'publie'
  AND q.difficulty = 'facile'
  AND c.slug = 'geographie'
GROUP BY q.id
ORDER BY RANDOM()
LIMIT 10;
\`\`\`
```

- [ ] **Step 4: Update root README.md**

```markdown
# Quiz Game Platform

A competitive quiz game with Daily challenges, PvP matchmaking, card collection, and social features.

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

\`\`\`
quiz-game-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite
├── docs/                 # Documentation
└── docker-compose.yml    # Dev services
\`\`\`

## 🚀 Quick Start

\`\`\`bash
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
\`\`\`

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
\`\`\`
Reliable Source → Structured Fact → Generated Question → Validation → Publication
\`\`\`

See [stratégie_bdd_quiz.md](./brainstorm/stratégie_bdd_quiz.md).

## 💰 Budget-Friendly Hosting

- **Database:** Supabase (free tier: 500MB)
- **Backend:** Railway (free tier: 512MB RAM)
- **Frontend:** Vercel (free tier: unlimited)
- **Storage:** Cloudinary (free tier: 25GB)

Total: **$0/month** for MVP testing.

## 🧪 Development

\`\`\`bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Database studio
cd apps/backend && pnpm prisma:studio
\`\`\`

## 📝 License

Private - All rights reserved
```

- [ ] **Step 5: Verify all docs created**

```bash
ls -la docs/
```

Expected: `DEVELOPMENT.md`, `ARCHITECTURE.md`, `DATABASE.md` exist

- [ ] **Step 6: Commit**

```bash
git add docs/ README.md
git commit -m "docs: add comprehensive development and architecture documentation"
```

---

## Final Verification Steps

- [ ] **Test full stack**

Terminal 1:
```bash
docker compose up -d
```

Terminal 2:
```bash
cd apps/backend
pnpm dev
```

Terminal 3:
```bash
cd apps/frontend
pnpm dev
```

Expected:
- PostgreSQL running at `localhost:5432`
- Backend running at `http://localhost:3000`
- Frontend running at `http://localhost:5173`
- Frontend displays green "Backend Status: ok"
- Click "Load Questions" shows "Questions loaded: 0"

- [ ] **Verify Prisma Studio**

```bash
cd apps/backend
pnpm prisma:studio
```

Expected: Opens `http://localhost:5555` with database tables visible

- [ ] **Final commit**

```bash
git add .
git commit -m "chore: complete project initialization"
git tag v0.1.0-init
```

---

## Next Steps (Not in this plan)

After initialization is complete, create separate plans for:

1. **MVP1 Plan** - Daily challenge implementation
2. **Question Generation Pipeline** - Wikidata integration + LLM question generation
3. **Authentication System** - JWT + user management
4. **MVP2 Plan** - PvP matchmaking + ELO

Each plan should reference this initialization as the foundation.

# Development Guide

Guide for developers working on the Quiz Game Platform.

------------------------------------------------------------------------

## 1. Project Structure

The project is organized as a pnpm monorepo:

``` text
quizz/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React application
│
├── brainstorm/            # Product, UX and strategy work
│   ├── guideline-webdesign/
│   ├── steps.md
│   ├── stratégie_bdd_quiz.md
│   └── vision_globale.md
│
├── docs/                  # Technical documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DECISIONS.md
│   ├── DEVELOPMENT.md
│   ├── QUESTION-INVENTORY.md
│   ├── QUESTION-QUALITY-GUIDELINE.md
│   └── ROADMAP.md
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

### Documentation responsibilities

-   `docs/ARCHITECTURE.md` --- application architecture and major
    technical components
-   `docs/DATABASE.md` --- database model and data principles
-   `docs/DECISIONS.md` --- important technical and product decisions
-   `docs/DEVELOPMENT.md` --- local development workflow
-   `docs/QUESTION-INVENTORY.md` --- question inventory
-   `docs/QUESTION-QUALITY-GUIDELINE.md` --- rules for question quality
-   `docs/ROADMAP.md` --- project roadmap
-   `brainstorm/` --- product and UX exploration

The repository and its documentation are the source of truth for the
implementation.

------------------------------------------------------------------------

## 2. Technical Stack

### Backend

-   **Framework:** NestJS
-   **Language:** TypeScript
-   **ORM:** Prisma
-   **Database:** PostgreSQL
-   **Authentication:** JWT with HTTP-only cookies
-   **Validation:** `class-validator` and `class-transformer`
-   **Scheduling:** `@nestjs/schedule` when scheduled jobs are required

### Frontend

-   **Framework:** React
-   **Build tool:** Vite
-   **Language:** TypeScript
-   **Routing:** React Router
-   **State management:** Zustand
-   **Styling:** Tailwind CSS
-   **HTTP client:** Axios

### Development Infrastructure

-   **Monorepo:** pnpm workspaces
-   **Database container:** Docker / Docker Compose
-   **Database migrations:** Prisma Migrate

------------------------------------------------------------------------

## 3. Prerequisites

Install:

-   Node.js \>= 18.0.0
-   pnpm \>= 8.0.0
-   Docker
-   Docker Compose

Check the installed versions:

``` bash
node --version
pnpm --version
docker --version
docker compose version
```

------------------------------------------------------------------------

## 4. Initial Setup

From the project root:

``` bash
pnpm install
```

Start PostgreSQL:

``` bash
docker compose up -d
```

Configure the backend environment:

``` bash
cd apps/backend
cp .env.example .env
```

Then initialize the database:

``` bash
pnpm prisma:migrate:dev
pnpm prisma:generate
```

Return to the repository root when needed:

``` bash
cd ../..
```

------------------------------------------------------------------------

## 5. Running the Application

### Start all services

From the repository root:

``` bash
pnpm dev
```

### Start the backend only

``` bash
cd apps/backend
pnpm dev
```

Backend:

``` text
http://localhost:3000
```

### Start the frontend only

``` bash
cd apps/frontend
pnpm dev
```

Frontend:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

## 6. Database Development

### Run migrations

``` bash
cd apps/backend
pnpm prisma:migrate:dev
```

### Create a named migration

``` bash
cd apps/backend
pnpm prisma:migrate:dev --name add_my_field
```

### Generate Prisma Client

``` bash
cd apps/backend
pnpm prisma:generate
```

### Open Prisma Studio

``` bash
cd apps/backend
pnpm prisma:studio
```

### Reset the local database

**WARNING: this deletes local database data.**

``` bash
cd apps/backend
pnpm prisma:migrate:reset
```

For the database model and data architecture, see:

``` text
docs/DATABASE.md
```

------------------------------------------------------------------------

## 7. Testing

### Backend

``` bash
cd apps/backend

pnpm test
pnpm test:watch
pnpm test:cov
```

### Frontend

``` bash
cd apps/frontend

pnpm test
```

### Type checking

From the repository root:

``` bash
pnpm type-check
```

### Linting

``` bash
pnpm lint
```

### Formatting

``` bash
pnpm format
```

------------------------------------------------------------------------

## 8. Recommended E2E Coverage

The main user flow should eventually be covered by an end-to-end test.

Recommended flow:

``` text
Register
   ↓
Login
   ↓
Load Daily Challenge
   ↓
Answer questions
   ↓
Submit quiz
   ↓
View results
   ↓
Check leaderboard
   ↓
Share result
```

Playwright or Cypress can be used for E2E testing.

------------------------------------------------------------------------

## 9. Development Workflow

### Create a feature branch

``` bash
git checkout -b feat/my-feature
```

Use a branch name that clearly describes the change.

### Before modifying code

1.  Check the current repository state.
2.  Read the relevant documentation.
3.  Inspect the existing implementation.
4.  Understand the impact of the change.
5.  Avoid modifying unrelated files.

Useful commands:

``` bash
git status
git diff
git log --oneline -10
```

### Develop

Make the smallest coherent change necessary to implement the feature.

Keep frontend and backend responsibilities separated.

### Test locally

Run the relevant tests, type checks and linting before committing.

### Review the diff

``` bash
git status
git diff
```

Make sure the diff contains only the intended changes.

### Commit

``` bash
git add .
git commit -m "feat: add my feature"
```

### Push

``` bash
git push origin feat/my-feature
```

------------------------------------------------------------------------

## 10. Changing the Database Schema

When a database change is required:

1.  Update `apps/backend/prisma/schema.prisma`.
2.  Create a named migration.
3.  Review the generated migration.
4.  Regenerate Prisma Client.
5.  Run the relevant tests.
6.  Commit the schema and migration together.

Example:

``` bash
cd apps/backend

pnpm prisma:migrate:dev --name add_my_field
pnpm prisma:generate
```

Check the resulting migration under:

``` text
apps/backend/prisma/migrations/
```

------------------------------------------------------------------------

## 11. Debugging

### Backend logs

``` bash
cd apps/backend
pnpm dev
```

Inspect the terminal output for API and application errors.

### Prisma Studio

Use Prisma Studio to inspect the local database:

``` bash
cd apps/backend
pnpm prisma:studio
```

### Frontend

Use the browser developer tools:

-   Console --- JavaScript and React errors
-   Network --- API requests and responses
-   React DevTools --- component and state inspection

------------------------------------------------------------------------

## 12. Docker / PostgreSQL Troubleshooting

### Restart PostgreSQL

``` bash
docker compose restart postgres
```

### Check PostgreSQL logs

``` bash
docker compose logs postgres
```

### Check running containers

``` bash
docker compose ps
```

------------------------------------------------------------------------

## 13. Port Already in Use

Find and terminate the process using port 3000:

``` bash
lsof -ti:3000 | xargs kill -9
```

Alternatively, change the backend port in:

``` text
apps/backend/.env
```

For example:

``` env
PORT=3001
```

------------------------------------------------------------------------

## 14. Common Development Pitfalls

### Validate on the server

Client-side validation improves UX, but server-side validation is
mandatory.

### Send credentials when using HTTP-only cookies

When the frontend communicates with an authenticated backend, ensure
requests are configured to send credentials where required.

For Axios:

``` typescript
withCredentials: true
```

### Do not hardcode environment-specific URLs

Use environment variables for configurable endpoints and
environment-specific values.

### Keep scoring server-side

Quiz scoring must be performed by the backend rather than trusted to the
client.

This prevents the client from being the source of truth for the final
score.

### Respect time validation

If the API defines a maximum allowed answer time, validate it on the
server.

------------------------------------------------------------------------

## 15. Working With the Documentation

Before making a significant change, identify which documentation is
relevant.

For example:

``` text
Database change
→ docs/DATABASE.md
→ docs/DECISIONS.md

Architecture change
→ docs/ARCHITECTURE.md
→ docs/DECISIONS.md

Question-generation change
→ docs/DATABASE.md
→ docs/QUESTION-QUALITY-GUIDELINE.md
→ docs/QUESTION-INVENTORY.md

Product/feature planning
→ docs/ROADMAP.md
→ brainstorm/
```

When an important architectural or product decision is made, document it
in the appropriate file rather than relying only on chat history.

------------------------------------------------------------------------

## 16. Documentation Principle

The repository should remain understandable without access to previous
chat conversations.

If an important implementation decision, workflow, constraint, or
project rule is introduced, it should be recorded in the appropriate
repository documentation.

The goal is:

``` text
Conversation
    ↓
Decision / implementation
    ↓
Repository
    ↓
Future development sessions
```

This allows a new development session to reconstruct the current project
state from the repository itself.

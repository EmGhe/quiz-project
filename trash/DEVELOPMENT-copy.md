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

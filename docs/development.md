# Development Guide

## Initial Setup

```bash
# Clone repository
git clone git@github.com:korih/stock-analyzer.git
cd stock-analyzer

# Install dependencies
pnpm install

# Start local PostgreSQL
docker-compose up -d

# Run database migrations
pnpm --filter backend db:migrate

# Seed initial stock data (optional)
pnpm --filter backend db:seed
```

## Development Workflow

### Running the Application

```bash
# Backend only (runs on :3001)
pnpm --filter backend dev

# Frontend only (runs on :3000)
pnpm --filter frontend dev

# Run both in parallel
pnpm dev
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# All checks before commit
pnpm validate
```

## Database Management

### Direct PostgreSQL Access

```bash
# Connect to local database
docker exec -it stock-analyzer-db psql -U postgres -d stock_intelligence

# Run SQL file
psql -f packages/backend/src/db/schema.sql

# Backup database
pg_dump stock_intelligence > backup.sql
```

### Common Queries

```sql
-- Check candle data count
SELECT COUNT(*) FROM price_candles;

-- Check recent news ingestion
SELECT COUNT(*) FROM news_items
WHERE created_at > NOW() - INTERVAL '1 day';

-- View ingestion errors
SELECT * FROM error_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check LLM usage this month
SELECT SUM(estimated_cost) as total
FROM llm_usage
WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
```

### Migrations

```bash
# Create new migration
pnpm --filter backend db:migration:create add_new_table

# Run pending migrations
pnpm --filter backend db:migrate

# Rollback last migration
pnpm --filter backend db:rollback
```

## Environment Variables

### Backend (`packages/backend/.env`)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/stock_intelligence
FINNHUB_API_KEY=your_finnhub_key
ANTHROPIC_API_KEY=your_anthropic_key  # Only needed Phase 4+
PORT=3001
NODE_ENV=development
```

### Frontend (`packages/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:
- **Backend**: Fastify restarts on file changes
- **Frontend**: Next.js Fast Refresh

### Debug Mode

```bash
# Backend with debug logging
DEBUG=* pnpm --filter backend dev

# Frontend with verbose logging
NEXT_PUBLIC_LOG_LEVEL=debug pnpm --filter frontend dev
```

### Testing Ingestion Manually

```bash
# Trigger stock data ingestion
curl -X POST http://localhost:3001/admin/ingest/stocks

# Trigger news ingestion
curl -X POST http://localhost:3001/admin/ingest/news

# Check ingestion status
curl http://localhost:3001/admin/status
```

## Common Development Tasks

### Adding a New Stock

```sql
INSERT INTO stocks (symbol, name, sector)
VALUES ('TSLA', 'Tesla Inc.', 'Automotive');
```

### Adding a New Indicator

1. Create calculation function in `packages/backend/src/services/indicators.ts`
2. Add to ingestion pipeline in `packages/backend/src/services/ingestion.ts`
3. Update API endpoint in `packages/backend/src/routes/stocks.ts`
4. Add unit tests in `packages/backend/tests/indicators.test.ts`

### Adding a New API Endpoint

1. Create route in `packages/backend/src/routes/`
2. Register route in `packages/backend/src/server.ts`
3. Add integration test in `packages/backend/tests/api.test.ts`
4. Update frontend hook in `packages/frontend/hooks/`

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-bollinger-bands

# Make changes, commit
git add .
git commit -m "feat: add Bollinger Bands indicator"

# Push and create PR
git push origin feature/add-bollinger-bands
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart db

# View PostgreSQL logs
docker logs stock-analyzer-db
```

### Dependency Issues

```bash
# Clear all node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install

# Clear pnpm cache
pnpm store prune
```

### TypeScript Errors

```bash
# Rebuild all packages
pnpm build

# Clean and rebuild
pnpm clean && pnpm build
```

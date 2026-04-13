# Stock Intelligence Platform

A comprehensive stock analysis platform that explains **why** stocks move, not just **how** they move.

## Overview

This platform combines price data, technical indicators, news sentiment, SEC filings, and insider trading into a unified intelligence system that provides complete market context. Built with TypeScript, it features a Fastify backend, Next.js frontend, and PostgreSQL database optimized for daily stock data analysis.

**Key Features:**
- Real-time stock price charts with technical indicators (SMA, RSI, MACD)
- Multi-stock comparison and analysis
- Automated daily data ingestion
- News sentiment analysis (Phase 3+)
- SEC filing integration (Phase 5+)
- LLM-powered market intelligence (Phase 4+)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ ([download](https://nodejs.org/))
- **pnpm** 8+ (install: `npm install -g pnpm`)
- **Docker** ([download](https://www.docker.com/get-started))
- **Finnhub API Key** - Free tier at [finnhub.io](https://finnhub.io)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Finnhub API key:

```bash
FINNHUB_API_KEY=your_actual_api_key_here
```

### 3. Start Database

```bash
docker-compose up -d
```

Wait ~10 seconds for PostgreSQL to initialize.

### 4. Run Migrations

```bash
pnpm --filter backend db:migrate
```

This creates the database schema and seeds 10 initial stocks.

### 5. Load Historical Data

```bash
cd packages/backend
pnpm tsx src/scripts/ingest-historical.ts 365
```

This fetches 1 year of data for 10 stocks and calculates indicators. Takes ~5-10 minutes due to API rate limits (60 req/min).

### 6. Start Development Servers

```bash
cd ../..  # Return to project root
pnpm dev
```

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:3001/health

### 7. Verify Setup

1. Visit http://localhost:3001/health - Should return `{"status":"ok","database":"connected",...}`
2. Visit http://localhost:3001/stocks - Should return list of 10 stocks
3. Visit http://localhost:3000 - Select stocks to view interactive charts

**Estimated setup time**: 15-20 minutes

## Project Structure

```
stock-analyzer/
├── packages/
│   ├── backend/          # Fastify API (TypeScript)
│   └── frontend/         # Next.js app (React + TypeScript)
├── docs/                 # Documentation
├── docker-compose.yml    # PostgreSQL setup
└── CLAUDE.md            # Quick reference for AI assistance
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Quick reference dictionary
- **[Architecture](docs/architecture.md)** - System design decisions
- **[Development Guide](docs/development.md)** - Setup and workflow
- **[Database](docs/database.md)** - Schema and patterns
- **[API](docs/api.md)** - REST endpoints
- **[Testing](docs/testing.md)** - Tests and troubleshooting
- **[Deployment](docs/deployment.md)** - Railway + Vercel setup
- **[Phases](docs/phases.md)** - 6-phase roadmap

## Current Status

**Phase 1: Core Platform** ✅ Complete

Features implemented:
- ✅ Project structure and monorepo configuration
- ✅ PostgreSQL database with optimized schema
- ✅ Fastify REST API with caching
- ✅ Daily stock data ingestion (10 stocks)
- ✅ Technical indicators (SMA, RSI, MACD)
- ✅ Next.js 14 frontend with Lightweight Charts
- ✅ Interactive stock selector and comparison

**Next**: Phase 2 - Performance optimization (caching, query optimization, lazy loading)

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Database**: PostgreSQL 15
- **Scheduling**: node-cron
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS
- **Charts**: Lightweight Charts
- **Language**: TypeScript

### Data Sources
- **Stock Prices**: Finnhub Free Tier (60 req/min)
- **News**: RSS feeds (Bloomberg, Reuters, MarketWatch) - Phase 3
- **SEC Filings**: SEC EDGAR API - Phase 5
- **Sentiment**: Regex (Phase 3) → LLM (Phase 4)

## Development

### Common Commands

```bash
# Development servers
pnpm dev                              # Run both backend + frontend
pnpm --filter backend dev             # Backend only
pnpm --filter frontend dev            # Frontend only

# Database
docker-compose up -d                  # Start PostgreSQL
docker-compose down                   # Stop PostgreSQL
pnpm --filter backend db:migrate      # Run migrations
docker exec -it stock-analyzer-db psql -U postgres -d stock_intelligence  # DB shell

# Testing
pnpm test                             # Run all tests
pnpm --filter backend test            # Backend tests only

# Build
pnpm build                            # Build all packages
```

### Enable Daily Auto-Ingestion

To automatically fetch new data daily at 5 PM ET:

```bash
# Add to .env
ENABLE_SCHEDULER=true
```

Restart the backend server after enabling.

### Database Queries

```bash
# Connect to database
docker exec -it stock-analyzer-db psql -U postgres -d stock_intelligence

# Check data
SELECT COUNT(*) FROM price_candles;  -- Should be 2500+ rows (10 stocks × 252 days)

# View latest data per stock
SELECT s.symbol, MAX(pc.date) as latest_date
FROM stocks s
LEFT JOIN price_candles pc ON s.id = pc.stock_id
GROUP BY s.symbol;
```

## Troubleshooting

### Database connection refused

```bash
# Restart PostgreSQL
docker-compose restart db

# Check logs
docker logs stock-analyzer-db
```

### Finnhub rate limit errors

Wait 1 minute between ingestion attempts. The free tier allows 60 requests/minute.

### Frontend won't start

```bash
# Clear Next.js cache
cd packages/frontend
rm -rf .next
pnpm dev
```

### Missing data in charts

Verify ingestion completed successfully:

```bash
docker exec -it stock-analyzer-db psql -U postgres -d stock_intelligence

SELECT COUNT(*) FROM price_candles;
-- Should return 2500+ rows for 10 stocks with 1 year of data
```

See [docs/testing.md](docs/testing.md) for more troubleshooting guides.

## Budget

**Target**: $0-50/month across all phases

| Service | Cost | Notes |
|---------|------|-------|
| Finnhub API (free tier) | $0 | 60 req/min limit |
| PostgreSQL (Railway) | $0-15 | Free $5 credit |
| Next.js hosting (Vercel) | $0 | Free tier |
| Claude Haiku LLM (Phase 4+) | $0-30 | Hard cap with fallback |
| **TOTAL** | **$0-50** | ✅ Within budget |

## Roadmap

- **Phase 1** (Weeks 1-4): Core platform with charts ✅ Complete
- **Phase 2** (Weeks 5-6): Performance optimization ← **Next**
- **Phase 3** (Weeks 7-10): News + sentiment analysis
- **Phase 4** (Weeks 11-14): LLM-powered sentiment
- **Phase 5** (Weeks 15-20): SEC filings + insider trades
- **Phase 6** (Weeks 21-26): Unified intelligence summary

See [docs/phases.md](docs/phases.md) for detailed roadmap.

## Contributing

This is a personal project, but feedback and suggestions are welcome via GitHub issues.

## License

MIT License - See LICENSE file for details.

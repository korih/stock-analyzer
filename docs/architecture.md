# Architecture

## Overview

Stock Intelligence Platform is a budget-conscious ($0-50/month) financial analysis system that explains *why* stocks move using multiple data sources.

**Data Granularity**: Daily candles (~252 data points/year per stock)

## System Architecture

```
Data Sources (Finnhub, RSS, SEC EDGAR)
    ↓
Ingestion Services (cron-scheduled)
    ↓
PostgreSQL (single source of truth)
    ↓
API Layer (Fastify REST endpoints)
    ↓
Frontend (Next.js + Lightweight Charts)
```

## Critical Decision: No Queue System

**Decision**: Use direct database writes with cron-based scheduling instead of job queues (BullMQ/Redis).

**Rationale**:
- Daily data ingestion is **predictable** (happens once per day at market close)
- Not event-driven, so queues add complexity without benefit
- Avoids operational overhead of Redis clustering
- Simpler error handling and debugging
- Lower infrastructure costs

**When to introduce queues**: Phase 4+ when processing LLM sentiment with variable execution times.

**Alternative considered**: BullMQ + Redis was in original plan but deemed over-engineering for MVP.

## Monorepo Structure

```
packages/
├── backend/      # Fastify API + data ingestion services
│   ├── src/
│   │   ├── server.ts           # Fastify app initialization
│   │   ├── db/                 # Schema, migrations, client
│   │   ├── services/           # Ingestion, indicators, sentiment
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Caching, error handling
│   │   └── clients/            # External API clients
│   └── tests/                  # Unit & integration tests
│
└── frontend/     # Next.js dashboard
    ├── app/                    # Next.js 13+ app directory
    ├── components/             # React components
    └── hooks/                  # React Query hooks
```

## Data Flow Patterns

### Ingestion → Storage → API

1. **Ingestion**: Cron jobs fetch data from external APIs
2. **Validation**: Data validated before database write
3. **Storage**: PostgreSQL stores raw data + computed indicators
4. **Materialization**: Daily refresh of materialized views for performance
5. **API**: Fastify serves cached data with HTTP headers
6. **Frontend**: React Query fetches with automatic revalidation

### Indicator Calculation Pattern

Indicators are **pre-computed during ingestion** and stored in the database:

```typescript
// Pattern: Pure functions for testability
export async function calculateSMA(stockId: string, period: number): Promise<number> {
  const candles = await db.query(`
    SELECT close FROM price_candles
    WHERE stock_id = $1
    ORDER BY date DESC
    LIMIT $2
  `, [stockId, period]);

  const sum = candles.rows.reduce((acc, c) => acc + parseFloat(c.close), 0);
  return sum / period;
}
```

**Why pre-compute?**
- Avoids expensive calculations on every API request
- Enables fast API responses (<100ms target)
- Materialized views for stock summaries refreshed daily
- HTTP caching headers (1 hour TTL) further reduce database load

## Budget-Conscious Design

### Free Data Sources

| Data Type | Source | Rate Limit | Cost |
|-----------|--------|------------|------|
| Stock prices | Finnhub Free Tier | 60 req/min | $0 |
| News | RSS feeds | Unlimited | $0 |
| SEC filings | SEC EDGAR API | 10 req/sec | $0 |
| Insider trades | SEC Form 4 RSS | Unlimited | $0 |
| Sentiment (Phase 1-3) | Regex | N/A | $0 |
| Sentiment (Phase 4+) | Claude Haiku | 25k tokens/mo free | $0-30/mo |

### Budget Safeguards

Hard limits enforced in code:

```typescript
// LLM cost tracking (src/services/usage-tracking.ts)
if (monthlyUsage.rows[0].total > 30) {
  console.warn('⚠️  LLM cost exceeded $30 this month!');
  // Disable LLM processing, fallback to regex
}
```

**Stock universe limits**:
- Initial: 10-20 blue chips (AAPL, MSFT, GOOGL, etc.)
- Prevents Finnhub rate limit issues
- Keeps storage costs manageable

## Technology Stack

### Backend
- **Node.js + TypeScript**: Type safety, modern async/await
- **Fastify**: Lightweight, fast API framework
- **PostgreSQL**: Reliable relational database
- **node-cron**: Scheduling (no external dependencies)

### Frontend
- **Next.js 13+**: App directory, server components
- **TypeScript**: Type safety across the stack
- **Lightweight Charts**: Performant charting library
- **React Query**: Server state management

### Infrastructure
- **Railway**: Backend + PostgreSQL hosting (~$15/month)
- **Vercel**: Frontend hosting (free tier)
- **Docker Compose**: Local development

## Scalability Considerations

### Current Limitations (By Design)
- 10-20 stocks maximum initially
- Daily updates only (no real-time)
- Single PostgreSQL instance (no replication)
- No CDN (Vercel Edge handles this)

### Future Scaling Path
1. **Phase 2**: Add materialized views + HTTP caching
2. **Phase 3**: Horizontal scaling: Multiple Fastify instances behind load balancer
3. **Phase 4**: Read replicas for PostgreSQL
4. **Phase 5**: Introduce Redis for hot data (top 10 stocks)
5. **Phase 6**: Upgrade to hourly candles (requires paid data sources)

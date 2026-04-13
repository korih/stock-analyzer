# Development Phases

## Overview

The project is built in **6 independent phases**. Each phase is deployable and adds incremental value.

**Total Timeline**: 26 weeks (6+ months)

**Budget Constraint**: $0-50/month across all phases

---

## Phase 1: Core Platform (Weeks 1-4)

### Goal
Ingest daily stock data, display price charts with basic indicators, establish solid foundation.

### Features
- Daily OHLCV data ingestion (10 stocks: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, AMD, JPM)
- Technical indicators: SMA (20, 50, 200), RSI (14), MACD
- REST API with PostgreSQL storage
- Next.js frontend with interactive charts
- Stock selector dropdown

### Success Criteria
- ✅ 10 stocks ingesting daily without errors
- ✅ Charts display correctly with 1-year historical data
- ✅ SMA, RSI, MACD indicators calculated accurately (match TradingView)
- ✅ API response times < 100ms
- ✅ All unit tests passing

### Deliverables
- PostgreSQL database with schema
- Fastify API with CRUD endpoints
- Daily ingestion cron job
- Indicator calculation service
- Next.js frontend with Lightweight Charts
- Basic error logging

### Week 1 Tasks
1. Initialize monorepo: `pnpm init` + workspace structure
2. Set up PostgreSQL: `docker-compose up -d`
3. Run schema migrations
4. Create Fastify server boilerplate
5. Implement Finnhub client + basic ingestion

### Week 2 Tasks
1. Complete indicator calculations (SMA, RSI, MACD)
2. Build API endpoints
3. Set up Next.js frontend
4. Integrate Lightweight Charts
5. First E2E test: Select AAPL, view 1-year chart

---

## Phase 2: Caching & Performance (Weeks 5-6)

### Goal
Optimize API response times, add PostgreSQL query optimization, implement HTTP caching.

### Features
- Materialized views for frequently accessed data
- API response caching headers
- Database query optimization (indexes, query planning)
- Lazy-load indicators (calculate on-demand vs pre-compute)

### Success Criteria
- ✅ API response times < 50ms (50% improvement)
- ✅ Database queries < 30ms
- ✅ Materialized views refresh successfully

### Deliverables
- Materialized views for stock summaries
- HTTP caching headers (1 hour TTL)
- Database index optimization
- Query performance monitoring

---

## Phase 3: News Integration (Weeks 7-10)

### Goal
Add news feeds with basic sentiment analysis using regex (no LLM costs).

### Features
- RSS feed ingestion (Bloomberg, Reuters, MarketWatch)
- Regex-based sentiment scoring
- News sidebar in frontend
- Sentiment badges (bullish/neutral/bearish)

### Success Criteria
- ✅ 20+ news articles ingested daily
- ✅ Regex sentiment accuracy > 60% (manual validation)
- ✅ News sidebar displays recent articles
- ✅ Sentiment badges match article tone

### Deliverables
- RSS feed parser
- Sentiment calculation service
- News API endpoints
- Frontend news sidebar
- Symbol extraction from articles

### Budget
$0/month (RSS feeds are free)

---

## Phase 4: LLM-Powered Sentiment (Weeks 11-14)

### Goal
Upgrade from regex to LLM-based sentiment analysis while staying within budget ($30/month).

### Features
- Claude 3.5 Haiku sentiment analysis
- Batch processing (once daily)
- Budget monitoring with auto-fallback to regex
- A/B comparison: regex vs LLM accuracy

### Success Criteria
- ✅ LLM sentiment accuracy > 80% (vs 60% regex)
- ✅ Monthly cost < $30
- ✅ Auto-fallback works when budget exceeded
- ✅ Cost tracking dashboard functional

### Deliverables
- LLM sentiment service
- Budget tracking in database
- Cost monitoring dashboard
- Automatic fallback logic

### Budget
$0-30/month (Claude Haiku free tier: 25k tokens/month)

**Safeguards**:
- Batch process 50 articles/day max
- Only analyze top 10 stocks
- Hard $30/month cap with auto-disable

---

## Phase 5: SEC Filings & Insider Trading (Weeks 15-20)

### Goal
Integrate SEC filings (8-K, 10-K, 10-Q) and insider trading data (Form 4).

### Features
- SEC EDGAR API integration
- 8-K, 10-K, 10-Q filing ingestion
- Form 4 insider trade parsing
- Filing summarization (regex or LLM)
- Insider trade alerts

### Success Criteria
- ✅ SEC filings ingested daily
- ✅ Form 4 trades parsed correctly (~80% success rate)
- ✅ Frontend displays filings and trades
- ✅ Filing summaries are coherent

### Deliverables
- SEC ingestion service
- Form 4 XML parser
- Filing/insider API endpoints
- Frontend filings/insider sidebar

### Budget
$0/month (SEC EDGAR is free)

**Challenges**:
- Form 4 XML parsing is complex (accept 20% failure rate)
- SEC requires User-Agent header
- Rate limit: 10 req/sec

---

## Phase 6: Unified Intelligence Summary (Weeks 21-26)

### Goal
Combine all data sources into a single "Stock Intelligence Summary" that explains market movements.

### Features
- Event timeline (chronological view of all events)
- AI-generated daily summaries
- Confidence scoring
- "What Happened Today?" panel

### Success Criteria
- ✅ Intelligence summary generated daily for all stocks
- ✅ Event timeline displays all data sources correctly
- ✅ Confidence scores align with data availability
- ✅ Monthly costs remain under $50

### Deliverables
- Intelligence summary API
- Event timeline aggregation
- Confidence scoring algorithm
- LLM-generated summaries (budget-aware)
- Frontend intelligence panel

### Budget
$0-50/month (LLM summaries ~$20/month additional)

---

## Phase Progression

### MVP Definition

**Minimum**: Phase 1-2 (Weeks 1-6)
- Core platform with charts and indicators
- Performance optimizations

**Recommended**: Phase 1-3 (Weeks 1-10)
- Add news and sentiment
- Provides complete "intelligence" narrative

**Full Vision**: Phase 1-6 (Weeks 1-26)
- Complete platform with all data sources
- AI-generated insights

### Independent Deployment

Each phase can be shipped independently:
- Phase 1: Deploy basic charting platform
- Phase 2: Improve performance
- Phase 3: Add news (new feature)
- Phase 4: Upgrade sentiment (enhancement)
- Phase 5: Add filings (new feature)
- Phase 6: Unified summary (enhancement)

---

## Technical Debt Management

### Deferred Features

**Phase 1 Deferrals**:
- ~~BullMQ/Redis~~ → node-cron (re-evaluate in Phase 4)
- ~~Real-time data~~ → Daily candles only
- ~~Authentication~~ → Public API initially

**Phase 3 Deferrals**:
- ~~NewsAPI~~ → Free RSS feeds
- ~~LLM sentiment~~ → Regex (upgrade in Phase 4)

**Phase 5 Deferrals**:
- ~~10-K/10-Q parsing~~ → Focus on 8-K initially
- ~~LLM summarization~~ → Regex extraction (upgrade in Phase 6)

### When to Introduce Deferred Features

**BullMQ/Redis**: When processing times become variable (Phase 4+)
**Real-time data**: When budget allows paid data sources ($200+/month)
**Authentication**: When monetization is needed (freemium model)

---

## Risk Management

### Phase 1 Risks
- **Risk**: Finnhub rate limits
- **Mitigation**: Start with 10 stocks, batch ingestion

### Phase 3 Risks
- **Risk**: RSS feeds unreliable
- **Mitigation**: Use 3-5 sources, graceful fallback

### Phase 4 Risks
- **Risk**: LLM costs spiral
- **Mitigation**: Hard $30 cap, auto-fallback to regex

### Phase 5 Risks
- **Risk**: Form 4 parsing too complex
- **Mitigation**: Accept 20% failure rate, log for review

### Phase 6 Risks
- **Risk**: Summary quality poor
- **Mitigation**: Human review initially, tune prompts

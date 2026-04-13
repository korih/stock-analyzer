# Stock Analyzer - Sprint Milestones

Sprint-based implementation plan with actionable deliverables and acceptance criteria.

**Sprint Duration**: 2 weeks
**Total Duration**: 26 weeks (13 sprints)
**Team Size**: 1-2 developers
**Budget**: $0-50/month

---

## 🎯 Phase 1: Core Platform (Sprints 1-2)

### Sprint 1: Foundation & Data Ingestion (Weeks 1-2)

**Goal**: Set up infrastructure, ingest historical stock data

#### Deliverables
- [ ] Monorepo structure with pnpm workspaces
- [ ] PostgreSQL database running in Docker
- [ ] Database schema with migrations
- [ ] Finnhub API client with rate limiting
- [ ] Historical data ingestion script (1 year OHLCV)
- [ ] Basic error logging and monitoring

#### Tasks
**Backend**
- [ ] Create `docker-compose.yml` for PostgreSQL
- [ ] Write `schema.sql` with tables: `stocks`, `daily_candles`
- [ ] Implement `db/client.ts` connection pool
- [ ] Implement `db/migrate.ts` migration runner
- [ ] Create `clients/finnhub.ts` with retry logic
- [ ] Build `scripts/ingest-historical.ts` for backfill
- [ ] Add `.env.example` with required variables

**DevOps**
- [ ] Set up `.gitignore` for secrets
- [ ] Create npm scripts: `dev`, `build`, `test`, `db:migrate`
- [ ] Configure TypeScript for both packages
- [ ] Add Vitest for testing

#### Acceptance Criteria
- ✅ `docker-compose up -d` starts PostgreSQL successfully
- ✅ `pnpm db:migrate` creates all tables without errors
- ✅ Historical data for 10 stocks (1 year) ingested in < 5 minutes
- ✅ Database contains ~2,520 candles per stock (252 trading days/year)
- ✅ No duplicate entries in `daily_candles` table
- ✅ Environment variables documented in `.env.example`

#### Dependencies
- PostgreSQL 15+
- Node.js 20+
- pnpm 8+
- Finnhub API key (free tier)

---

### Sprint 2: API & Frontend Charts (Weeks 3-4)

**Goal**: Build REST API and display interactive stock charts

#### Deliverables
- [ ] Fastify REST API with CORS
- [ ] Technical indicator calculations (SMA, RSI, MACD)
- [ ] API endpoints for stock data + indicators
- [ ] Next.js frontend with App Router
- [ ] Interactive chart with TradingView Lightweight Charts
- [ ] Stock selector dropdown

#### Tasks
**Backend**
- [ ] Create `server.ts` with Fastify setup
- [ ] Implement `services/indicators.ts` (SMA, RSI, MACD formulas)
- [ ] Add `routes/stocks.ts` with endpoints:
  - `GET /stocks` - List all stocks
  - `GET /stocks/:symbol` - OHLCV data
  - `GET /stocks/:symbol/indicators` - Calculated indicators
- [ ] Add unit tests for indicator calculations
- [ ] Implement request logging middleware
- [ ] Add health check endpoint

**Frontend**
- [ ] Initialize Next.js 14 with App Router
- [ ] Set up Tailwind CSS
- [ ] Create `components/StockChart.tsx` with Lightweight Charts
- [ ] Create `components/StockSelector.tsx` dropdown
- [ ] Implement `lib/api.ts` client for backend calls
- [ ] Build responsive layout

#### Acceptance Criteria
- ✅ API responds to `GET /stocks/AAPL` in < 100ms
- ✅ SMA(20, 50, 200) values match TradingView within 0.01%
- ✅ RSI(14) values match TradingView within 1%
- ✅ MACD values match TradingView within 0.01%
- ✅ Chart displays 1-year data with smooth scrolling
- ✅ Selecting new stock updates chart in < 500ms
- ✅ All indicator unit tests passing (>95% coverage)
- ✅ Frontend responsive on mobile/tablet/desktop

#### Testing
```bash
# Backend
pnpm --filter backend test

# Frontend
pnpm --filter frontend dev
# Manual: Select AAPL, verify chart displays 252 candles
```

---

## 🚀 Phase 2: Performance & Scaling (Sprint 3)

### Sprint 3: Caching & Optimization (Weeks 5-6)

**Goal**: Optimize database queries and add caching

#### Deliverables
- [ ] Database indexes on frequently queried columns
- [ ] Materialized views for stock summaries
- [ ] HTTP caching headers on API responses
- [ ] Query performance monitoring
- [ ] Lazy indicator calculation (on-demand)

#### Tasks
**Backend**
- [ ] Add indexes on `daily_candles(symbol, date)`
- [ ] Create materialized view `stock_summaries` with latest prices
- [ ] Add `Cache-Control` headers (1 hour TTL)
- [ ] Implement query timing logging
- [ ] Refactor indicators to calculate only requested ones
- [ ] Add `EXPLAIN ANALYZE` to slow queries

**Database**
- [ ] Analyze query plans for all endpoints
- [ ] Create partial indexes for common filters
- [ ] Set up connection pooling (max 20 connections)
- [ ] Add database health check

**Monitoring**
- [ ] Log API response times
- [ ] Track cache hit rates
- [ ] Monitor database connection pool usage

#### Acceptance Criteria
- ✅ API response times < 50ms (50% improvement)
- ✅ Database queries execute in < 30ms
- ✅ Cache hit rate > 80% for repeated requests
- ✅ Materialized views refresh successfully via cron
- ✅ No N+1 query problems in stock list endpoint
- ✅ Connection pool never exhausted under load

#### Performance Benchmarks
```bash
# Before optimization
GET /stocks/AAPL: ~95ms

# After optimization
GET /stocks/AAPL: <50ms (cached)
GET /stocks/AAPL?days=30: <30ms (indexed query)
```

---

## 📰 Phase 3: News Integration (Sprints 4-5)

### Sprint 4: RSS Feed Ingestion (Weeks 7-8)

**Goal**: Ingest news articles from RSS feeds

#### Deliverables
- [ ] RSS feed parser service
- [ ] News database schema
- [ ] News ingestion cron job (every 4 hours)
- [ ] Symbol extraction from article text
- [ ] News API endpoints

#### Tasks
**Backend**
- [ ] Install RSS parser library (`rss-parser`)
- [ ] Create `news` table schema
- [ ] Implement `services/news.ts` with feed fetching
- [ ] Add symbol extraction regex (e.g., "$AAPL", "Apple Inc.")
- [ ] Create `scripts/ingest-news.ts` for manual testing
- [ ] Schedule cron job for news ingestion
- [ ] Add `routes/news.ts` with endpoints:
  - `GET /news` - Recent articles (paginated)
  - `GET /news/stock/:symbol` - News for specific stock

**Data Sources**
- [ ] Bloomberg RSS (free tier)
- [ ] Reuters Business RSS
- [ ] MarketWatch RSS
- [ ] Yahoo Finance RSS

#### Acceptance Criteria
- ✅ Ingests 20+ articles every 4 hours
- ✅ Symbol extraction accuracy > 70% (manual validation)
- ✅ Duplicate articles filtered out
- ✅ News API returns articles in < 100ms
- ✅ Handles feed downtime gracefully (retry logic)
- ✅ Articles stored with published date, source, URL

#### Testing
```bash
# Run manual ingestion
pnpm --filter backend tsx src/scripts/ingest-news.ts

# Verify data
psql -d stockanalyzer -c "SELECT COUNT(*) FROM news WHERE created_at > NOW() - INTERVAL '1 day';"
```

---

### Sprint 5: Sentiment Analysis (Weeks 9-10)

**Goal**: Add regex-based sentiment scoring

#### Deliverables
- [ ] Sentiment calculation service (regex-based)
- [ ] Sentiment scores stored in database
- [ ] Frontend news sidebar with sentiment badges
- [ ] Sentiment API endpoints

#### Tasks
**Backend**
- [ ] Add `sentiment` column to `news` table (-1.0 to 1.0)
- [ ] Implement `services/sentiment.ts` with keyword matching:
  - Bullish: "surge", "rally", "beat", "upgraded", "growth"
  - Bearish: "drop", "miss", "downgrade", "warning", "loss"
  - Neutral: default if no strong signals
- [ ] Calculate sentiment during news ingestion
- [ ] Add sentiment filter to news endpoints

**Frontend**
- [ ] Create `components/NewsSidebar.tsx`
- [ ] Add sentiment badges (green/yellow/red)
- [ ] Display article title, source, date
- [ ] Link to original article

**Validation**
- [ ] Manually validate 100 articles
- [ ] Compare regex sentiment vs human judgment
- [ ] Target: 60%+ accuracy

#### Acceptance Criteria
- ✅ Sentiment calculated for all articles
- ✅ Regex accuracy > 60% (vs manual validation)
- ✅ News sidebar displays recent articles
- ✅ Sentiment badges match article tone
- ✅ Frontend filters news by sentiment
- ✅ Click article opens source URL in new tab

#### Sentiment Formula (v1)
```typescript
// Simplified keyword-based scoring
const bullishWords = ['surge', 'rally', 'beat', 'upgraded', 'growth'];
const bearishWords = ['drop', 'miss', 'downgrade', 'warning', 'loss'];

score = (bullish_count - bearish_count) / total_words
// Clamp to [-1.0, 1.0]
```

---

## 🤖 Phase 4: LLM Sentiment (Sprints 6-7)

### Sprint 6: LLM Integration (Weeks 11-12)

**Goal**: Replace regex with LLM-powered sentiment analysis

#### Deliverables
- [ ] Claude 3.5 Haiku API integration
- [ ] LLM sentiment service with prompt engineering
- [ ] Budget tracking in database
- [ ] Batch processing (once daily at midnight)
- [ ] A/B comparison dashboard (regex vs LLM)

#### Tasks
**Backend**
- [ ] Install Anthropic SDK
- [ ] Create `clients/anthropic.ts` with API client
- [ ] Implement `services/llm-sentiment.ts`:
  - Batch analyze 50 articles/day
  - Track token usage
  - Store cost per analysis
- [ ] Add `llm_sentiment_scores` table
- [ ] Create cron job for daily batch processing
- [ ] Add `/api/sentiment/compare` endpoint (regex vs LLM)

**Prompt Engineering**
```
Analyze the sentiment of this financial news article for {symbol}.
Return ONLY a JSON object: {"sentiment": <-1.0 to 1.0>, "confidence": <0.0 to 1.0>}

Article: {text}
```

**Budget Control**
- [ ] Hard cap at $30/month
- [ ] Auto-fallback to regex if budget exceeded
- [ ] Daily cost tracking dashboard

#### Acceptance Criteria
- ✅ LLM sentiment accuracy > 80% (vs manual validation)
- ✅ Monthly cost < $30
- ✅ Batch processing completes in < 10 minutes
- ✅ Auto-fallback triggers when budget hit
- ✅ Token usage logged for each request
- ✅ Confidence scores correlate with accuracy

#### Cost Estimation
```
Claude 3.5 Haiku: $0.25/1M input tokens, $1.25/1M output tokens
Average article: ~500 tokens
Output: ~20 tokens

50 articles/day * 30 days = 1,500 articles/month
1,500 * 500 = 750k input tokens = $0.19
1,500 * 20 = 30k output tokens = $0.04
Total: ~$0.23/month (well under budget)
```

---

### Sprint 7: Cost Monitoring (Weeks 13-14)

**Goal**: Build cost tracking and automatic safeguards

#### Deliverables
- [ ] Real-time cost dashboard
- [ ] Budget alerts (email/Slack)
- [ ] Automatic service degradation
- [ ] Cost projection model

#### Tasks
**Backend**
- [ ] Create `llm_usage` table (timestamp, tokens, cost)
- [ ] Implement `/api/admin/costs` endpoint
- [ ] Add budget threshold checks before LLM calls
- [ ] Create fallback chain: LLM → Regex → None
- [ ] Set up email alerts at 75% budget

**Frontend**
- [ ] Create admin dashboard at `/admin/costs`
- [ ] Display daily/weekly/monthly costs
- [ ] Show token usage trends
- [ ] Alert banner when near budget limit

**Monitoring**
- [ ] Track LLM vs Regex accuracy over time
- [ ] A/B test results visualization
- [ ] Export cost reports (CSV)

#### Acceptance Criteria
- ✅ Cost dashboard updates in real-time
- ✅ Email alert sent at 75% and 100% budget
- ✅ Auto-fallback to regex when budget exceeded
- ✅ Cost projections accurate within 10%
- ✅ No manual intervention needed for budget management
- ✅ Export monthly cost report

---

## 📊 Phase 5: SEC Filings (Sprints 8-10)

### Sprint 8: SEC EDGAR Integration (Weeks 15-16)

**Goal**: Ingest SEC filings (8-K, 10-K, 10-Q)

#### Deliverables
- [ ] SEC EDGAR API client
- [ ] Filings database schema
- [ ] Daily ingestion cron job
- [ ] Filing search and retrieval

#### Tasks
**Backend**
- [ ] Create `sec_filings` table
- [ ] Implement `clients/sec-edgar.ts`:
  - Respect rate limits (10 req/sec)
  - Set User-Agent header (required by SEC)
  - Handle CIK lookup for symbols
- [ ] Build filing download service
- [ ] Create `scripts/ingest-filings.ts`
- [ ] Add cron job for daily checks
- [ ] Store filing metadata (not full text yet)

**Data Points**
- [ ] Filing type (8-K, 10-K, 10-Q)
- [ ] Filing date
- [ ] Accession number
- [ ] URL to full document

#### Acceptance Criteria
- ✅ Ingest filings for 10 stocks daily
- ✅ No rate limit violations (max 10 req/sec)
- ✅ User-Agent header included in all requests
- ✅ Filings stored with correct metadata
- ✅ Handles SEC downtime gracefully
- ✅ No duplicate filings

#### API Endpoints
```
GET /api/filings/:symbol - Recent filings for stock
GET /api/filings/:symbol/type/:type - Filter by filing type
```

---

### Sprint 9: Form 4 Insider Trading (Weeks 17-18)

**Goal**: Parse Form 4 insider transactions

#### Deliverables
- [ ] Form 4 XML parser
- [ ] Insider trades database schema
- [ ] Insider transaction API
- [ ] Frontend insider trades table

#### Tasks
**Backend**
- [ ] Create `insider_trades` table
- [ ] Implement XML parser for Form 4:
  - Extract transaction date, shares, price
  - Parse insider name and title
  - Handle buy/sell/grant types
- [ ] Build `services/form4-parser.ts`
- [ ] Add error logging for unparseable forms
- [ ] Accept 20% failure rate (complex XML)

**Frontend**
- [ ] Create `components/InsiderTrades.tsx`
- [ ] Display recent transactions in table
- [ ] Highlight large trades (>$1M)
- [ ] Color-code buy (green) vs sell (red)

#### Acceptance Criteria
- ✅ Parse Form 4s with ~80% success rate
- ✅ Extract transaction details correctly
- ✅ Store insider name, title, relationship
- ✅ Frontend displays trades sorted by date
- ✅ Large trades highlighted visually
- ✅ Failed parses logged for review

#### Form 4 Challenges
- Complex nested XML structure
- Multiple transaction blocks per filing
- Inconsistent formatting across companies
- Need to handle derivative vs non-derivative securities

---

### Sprint 10: Filing Summaries (Weeks 19-20)

**Goal**: Summarize key points from SEC filings

#### Deliverables
- [ ] Filing text extraction
- [ ] Regex-based summary extraction
- [ ] Frontend filing viewer with summaries
- [ ] Search filings by keyword

#### Tasks
**Backend**
- [ ] Download full filing HTML from EDGAR
- [ ] Extract text from HTML (strip tables/formatting)
- [ ] Implement `services/filing-summary.ts`:
  - Use regex to extract key sections
  - For 8-K: Item numbers (e.g., "Item 2.02: Results of Operations")
  - For 10-K: Risk Factors, MD&A excerpts
- [ ] Store summaries in database
- [ ] Add full-text search on filings

**Frontend**
- [ ] Create filing detail page
- [ ] Display extracted summaries
- [ ] Link to original SEC document
- [ ] Add keyword search

#### Acceptance Criteria
- ✅ 8-K summaries extract correct Item numbers
- ✅ 10-K summaries identify key sections
- ✅ Full-text search returns relevant results
- ✅ Filing viewer responsive and readable
- ✅ Link to SEC.gov works correctly
- ✅ Summaries load in < 500ms

---

## 🧠 Phase 6: Intelligence Summary (Sprints 11-13)

### Sprint 11: Event Timeline (Weeks 21-22)

**Goal**: Build unified event timeline across all data sources

#### Deliverables
- [ ] Event aggregation service
- [ ] Unified event schema
- [ ] Timeline API endpoint
- [ ] Frontend timeline component

#### Tasks
**Backend**
- [ ] Create `events` table with polymorphic structure:
  - `event_type`: 'price_move', 'news', 'filing', 'insider_trade'
  - `event_date`: Date of event
  - `symbol`: Stock ticker
  - `data`: JSONB with event-specific details
- [ ] Build `services/event-aggregator.ts`:
  - Combine price moves (>5% change)
  - News articles with high sentiment
  - SEC filings
  - Insider trades (>$1M)
- [ ] Create `/api/events/:symbol` endpoint
- [ ] Sort events chronologically

**Frontend**
- [ ] Create `components/EventTimeline.tsx`
- [ ] Display events in chronological order
- [ ] Color-code by event type
- [ ] Show event details on hover/click

#### Acceptance Criteria
- ✅ Timeline shows all event types for a stock
- ✅ Events sorted correctly by date
- ✅ No duplicate events
- ✅ Timeline updates when new data ingested
- ✅ Frontend loads timeline in < 500ms
- ✅ Mobile-responsive timeline

---

### Sprint 12: AI-Generated Summaries (Weeks 23-24)

**Goal**: Generate daily intelligence summaries using LLM

#### Deliverables
- [ ] Intelligence summary service
- [ ] Daily summary generation cron
- [ ] Summary API endpoint
- [ ] Frontend intelligence panel

#### Tasks
**Backend**
- [ ] Create `intelligence_summaries` table
- [ ] Implement `services/intelligence.ts`:
  - Fetch all events for past 24 hours
  - Generate prompt with context
  - Call Claude 3.5 Haiku
  - Store summary + confidence score
- [ ] Add budget controls (similar to sentiment)
- [ ] Create `/api/intelligence/:symbol/today` endpoint

**LLM Prompt**
```
Generate a concise intelligence summary for {symbol} based on these events:

Price: {price_change}%
News: {news_articles}
Filings: {sec_filings}
Insider trades: {insider_trades}

Explain what happened and why. Focus on actionable insights.
Max 3 paragraphs.
```

**Frontend**
- [ ] Create `components/IntelligenceSummary.tsx`
- [ ] Display summary with confidence score
- [ ] Show "What Happened Today?" panel
- [ ] Auto-refresh daily

#### Acceptance Criteria
- ✅ Summaries generated daily for all 10 stocks
- ✅ Summaries coherent and accurate
- ✅ Confidence scores align with data availability
- ✅ Monthly LLM costs < $50 (including sentiment)
- ✅ Frontend displays summary prominently
- ✅ Summary updates automatically at market close

#### Cost Control
```
10 stocks * 1 summary/day * 30 days = 300 summaries/month
Avg prompt: 1,000 tokens
Avg response: 200 tokens

300 * 1,000 = 300k input tokens = $0.08
300 * 200 = 60k output tokens = $0.08
Total: ~$0.16/month (+ $0.23 sentiment = $0.39 total)

Well under $50 budget!
```

---

### Sprint 13: Refinement & Launch (Weeks 25-26)

**Goal**: Polish, test, and deploy production-ready platform

#### Deliverables
- [ ] Comprehensive E2E tests
- [ ] Error monitoring (Sentry)
- [ ] Production deployment (Railway + Vercel)
- [ ] Documentation updates
- [ ] Performance tuning

#### Tasks
**Testing**
- [ ] Write E2E tests for all user flows
- [ ] Load test API endpoints (100 req/sec)
- [ ] Test cron jobs in staging
- [ ] Validate all LLM prompts
- [ ] Security audit (SQL injection, XSS)

**DevOps**
- [ ] Set up Railway for backend + PostgreSQL
- [ ] Deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Enable CDN for static assets

**Monitoring**
- [ ] Integrate Sentry for error tracking
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure log aggregation
- [ ] Create Slack alerts for critical errors

**Documentation**
- [ ] Update all docs in `docs/` folder
- [ ] Record demo video
- [ ] Write user guide
- [ ] Document API endpoints (OpenAPI)

**Performance**
- [ ] Optimize bundle size (<300KB)
- [ ] Enable Lighthouse score >90
- [ ] Reduce API response times
- [ ] Database query optimization

#### Acceptance Criteria
- ✅ All E2E tests passing
- ✅ Production deployment successful
- ✅ Lighthouse score >90 (Performance, Accessibility, Best Practices)
- ✅ API uptime >99.5%
- ✅ Error rate <0.1%
- ✅ Page load time <2 seconds
- ✅ All documentation updated

---

## 📈 Success Metrics

### Sprint-Level KPIs

**Technical Metrics**
- Unit test coverage >80%
- API response time <100ms (P95)
- Database query time <50ms (P95)
- Error rate <1%
- Uptime >99%

**Business Metrics**
- Data freshness <24 hours
- Sentiment accuracy >80% (LLM) / >60% (regex)
- Filing parse success rate >80%
- Monthly costs <$50

### Phase Completion Criteria

**Phase 1 Complete**
- 10 stocks ingesting daily
- Charts displaying with indicators
- API functional and tested

**Phase 2 Complete**
- API response times <50ms
- Database optimized
- Caching implemented

**Phase 3 Complete**
- News ingesting every 4 hours
- Sentiment displayed on frontend
- >20 articles/day

**Phase 4 Complete**
- LLM sentiment >80% accuracy
- Costs <$30/month
- Auto-fallback working

**Phase 5 Complete**
- SEC filings ingesting daily
- Form 4 parsing >80% success
- Filings displayed on frontend

**Phase 6 Complete**
- Intelligence summaries generated daily
- Event timeline functional
- Full platform deployed

---

## 🚨 Risk Mitigation

### Sprint-Level Risks

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Finnhub rate limits | 1 | Batch requests, add retry logic |
| Indicator accuracy | 2 | Unit test against TradingView data |
| Database slow queries | 3 | Add indexes, use EXPLAIN ANALYZE |
| RSS feeds down | 4 | Multiple sources, graceful fallback |
| LLM costs high | 6 | Hard budget cap, token tracking |
| Form 4 parsing fails | 9 | Accept 20% failure, log for review |
| Timeline performance | 11 | Pagination, lazy loading |
| Summary quality poor | 12 | Prompt engineering, A/B testing |

---

## 📝 Definition of Done (DoD)

Every sprint deliverable must meet these criteria:

**Code Quality**
- [ ] All tests passing (unit + integration)
- [ ] Code reviewed (if team >1)
- [ ] No linting errors
- [ ] TypeScript strict mode enabled
- [ ] No console.log in production code

**Documentation**
- [ ] Code comments for complex logic
- [ ] API endpoints documented
- [ ] README updated if needed
- [ ] Decision log updated (docs/decisions.md)

**Testing**
- [ ] Unit tests for new functions
- [ ] Integration tests for API endpoints
- [ ] Manual testing completed
- [ ] Edge cases handled

**Performance**
- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] Bundle size monitored
- [ ] Lighthouse score maintained

**Deployment**
- [ ] Runs locally without errors
- [ ] Environment variables documented
- [ ] Database migrations successful
- [ ] No breaking changes (or documented)

---

## 🎯 Sprint Velocity Tracking

Track completed story points per sprint to estimate future capacity.

**Story Point Scale**: Fibonacci (1, 2, 3, 5, 8, 13)

**Example Sprint 1 Breakdown**:
- Set up database: 3 points
- Create migrations: 2 points
- Build Finnhub client: 5 points
- Ingest historical data: 8 points
- Add tests: 3 points
**Total**: 21 points

Track velocity sprint-over-sprint:
```
Sprint 1: 21 points
Sprint 2: 24 points (improving)
Sprint 3: 19 points (slight dip)
```

Use historical velocity to plan future sprints and adjust estimates.

---

**Last Updated**: 2024-04-13
**Next Review**: After Sprint 1 completion

# Testing & Troubleshooting

## Testing Strategy

### Unit Tests (Priority: High)

**Critical path**: Indicator calculations must be tested exhaustively.

**Location**: `packages/backend/tests/indicators.test.ts`

```typescript
describe('calculateSMA', () => {
  it('calculates 20-period SMA correctly', async () => {
    const stockId = await createTestStock('AAPL');
    await seedCandles(stockId, 20);

    const sma = await calculateSMA(stockId, 20);
    expect(sma).toBeCloseTo(150.23, 2);
  });
});

describe('calculateRSI', () => {
  it('calculates RSI correctly for overbought condition', async () => {
    const stockId = await createTestStock('AAPL');
    await seedCandlesWithTrend(stockId, 'bullish', 14);

    const rsi = await calculateRSI(stockId, 14);
    expect(rsi).toBeGreaterThan(70); // Overbought
  });
});
```

**Testing against known values**: Use Yahoo Finance or TradingView as reference.

---

### Integration Tests (Priority: Medium)

**Location**: `packages/backend/tests/api.test.ts`

```typescript
describe('GET /stocks/:symbol/candles', () => {
  it('returns 1 year of daily candles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/stocks/AAPL/candles?range=1y'
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(252); // ~252 trading days
  });

  it('returns 404 for invalid symbol', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/stocks/INVALID/candles'
    });

    expect(res.statusCode).toBe(404);
  });
});
```

---

### E2E Tests (Priority: Low)

**Tools**: Playwright or Cypress

**Location**: `packages/frontend/e2e/`

```typescript
test('displays stock chart', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Select stock
  await page.selectOption('[data-testid="stock-selector"]', 'AAPL');

  // Wait for chart to render
  await page.waitForSelector('[data-testid="stock-chart"]');

  // Verify chart displays
  const chart = await page.$('[data-testid="stock-chart"]');
  expect(chart).toBeTruthy();
});
```

---

### Running Tests

```bash
# All tests
pnpm test

# Backend only
pnpm --filter backend test

# Frontend only
pnpm --filter frontend test

# Watch mode
pnpm --filter backend test --watch

# Coverage
pnpm --filter backend test --coverage

# Specific test file
pnpm --filter backend test indicators.test.ts
```

---

## Manual Testing Checklist

### Phase 1 (Core Platform)

- [ ] Run `pnpm test` - all tests pass
- [ ] Visit `http://localhost:3000` - frontend loads
- [ ] Select AAPL from dropdown - chart displays
- [ ] Toggle SMA indicator - line appears on chart
- [ ] Toggle RSI indicator - RSI panel appears
- [ ] Check API: `curl http://localhost:3001/stocks/AAPL/candles?range=1y`
- [ ] Verify database: `SELECT COUNT(*) FROM price_candles;` returns 2520+ rows

### Phase 3 (News Integration)

- [ ] Check news count: `SELECT COUNT(*) FROM news_items;`
- [ ] Manually review 20 articles - sentiment matches expectation
- [ ] Visit `/stocks/AAPL` - news sidebar displays
- [ ] Verify sentiment badges (bullish/neutral/bearish) are correct

### Phase 6 (Intelligence Summary)

- [ ] Visit `/stocks/AAPL` - intelligence panel appears
- [ ] Verify "What Happened Today?" summary is coherent
- [ ] Check event timeline - all events display chronologically
- [ ] Verify confidence score increases with more data sources

---

## Troubleshooting

### Ingestion Not Running

**Symptom**: No new candle data appearing

**Diagnosis**:
```sql
SELECT s.symbol, MAX(pc.created_at) as last_update
FROM stocks s
LEFT JOIN price_candles pc ON s.id = pc.stock_id
GROUP BY s.symbol;
```

**Solutions**:

1. **Check cron schedule syntax**:
```typescript
cron.schedule('0 17 * * 1-5', ...) // 5 PM ET, Monday-Friday
```

2. **Verify server timezone**:
```bash
date
timedatectl
```

3. **Check error logs**:
```sql
SELECT * FROM error_logs
WHERE service = 'ingestion'
ORDER BY created_at DESC
LIMIT 10;
```

---

### Missing Candle Data

**Symptom**: Gaps in price data

**Diagnosis**:
```sql
SELECT date FROM price_candles
WHERE stock_id = (SELECT id FROM stocks WHERE symbol = 'AAPL')
ORDER BY date DESC
LIMIT 30;
```

**Solutions**:

1. **Check Finnhub API**:
```bash
curl "https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1609459200&to=1640995200&token=YOUR_KEY"
```

2. **If 429 (rate limit)**:
   - Wait 1 minute
   - Check if you exceeded 60 req/min
   - Implement rate limiting (see `docs/ingestion.md`)

3. **If 401 (unauthorized)**:
   - Verify `FINNHUB_API_KEY` in `.env`
   - Check API key validity at finnhub.io

---

### News Sentiment Inaccurate

**Symptom**: Sentiment scores don't match article tone

**Diagnosis**:
```sql
SELECT title, sentiment_score, sentiment_method
FROM news_items
WHERE sentiment_method = 'regex'
ORDER BY published_at DESC
LIMIT 20;
```

**Solutions**:

1. **Tune keyword lists** (`packages/backend/src/services/sentiment.ts`):
   - Add domain-specific keywords
   - Remove false positives

2. **Enable LLM sentiment** (Phase 4+):
   - More accurate (~80% vs ~60%)
   - Check budget: `SELECT SUM(estimated_cost) FROM llm_usage WHERE date >= DATE_TRUNC('month', CURRENT_DATE);`

3. **Manual labeling**:
   - Update `sentiment_method = 'manual'` for important articles
   - Build training set for future ML model

---

### LLM Cost Spiraling

**Symptom**: Monthly LLM costs exceed $30

**Diagnosis**:
```sql
SELECT date, tokens_used, estimated_cost
FROM llm_usage
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY date DESC;
```

**Solutions**:

1. **Check auto-disable logic** (`packages/backend/src/services/llm-sentiment.ts`):
```typescript
if (monthlyUsage.rows[0].total > 30) {
  console.warn('⚠️  LLM cost exceeded $30 this month!');
  // Should fallback to regex automatically
}
```

2. **Reduce batch size**:
   - Change from 50 articles/day to 25
   - Only analyze top 10 stocks

3. **Manual override**:
```sql
UPDATE news_items
SET sentiment_method = 'regex'
WHERE sentiment_method = 'llm' AND published_at > CURRENT_DATE;
```

---

### Database Performance Issues

**Symptom**: API responses slow (>200ms)

**Diagnosis**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:

1. **Add indexes**:
```sql
CREATE INDEX idx_candles_stock_date ON price_candles(stock_id, date DESC);
```

2. **Refresh materialized views**:
```sql
REFRESH MATERIALIZED VIEW stock_summary;
```

3. **Check connection pool**:
```typescript
// packages/backend/src/db/client.ts
const pool = new Pool({
  max: 20, // Increase if needed
  connectionTimeoutMillis: 5000
});
```

---

### Frontend Not Loading

**Symptom**: Blank page or build errors

**Diagnosis**:
```bash
# Check frontend logs
pnpm --filter frontend dev

# Check API connectivity
curl http://localhost:3001/stocks
```

**Solutions**:

1. **Verify API URL** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. **Clear Next.js cache**:
```bash
rm -rf packages/frontend/.next
pnpm --filter frontend dev
```

3. **Check CORS** (if API returns 403):
```typescript
// packages/backend/src/server.ts
fastify.register(cors, {
  origin: '*' // Development only
});
```

---

### Docker PostgreSQL Issues

**Symptom**: Database connection refused

**Diagnosis**:
```bash
docker ps | grep postgres
docker logs stock-analyzer-db
```

**Solutions**:

1. **Restart PostgreSQL**:
```bash
docker-compose restart db
```

2. **Check port conflict**:
```bash
lsof -ti:5432 | xargs kill -9
docker-compose up -d
```

3. **Reset database**:
```bash
docker-compose down -v
docker-compose up -d
psql < packages/backend/src/db/schema.sql
```

---

## Performance Benchmarking

### API Response Times

```bash
# Benchmark candles endpoint
ab -n 1000 -c 10 http://localhost:3001/stocks/AAPL/candles?range=1y

# Expected results:
# Mean: <50ms
# 95th percentile: <100ms
```

### Database Query Times

```sql
EXPLAIN ANALYZE
SELECT pc.*, i.value as sma_20
FROM price_candles pc
LEFT JOIN indicators i ON pc.id = i.candle_id AND i.indicator_type = 'SMA_20'
WHERE pc.stock_id = (SELECT id FROM stocks WHERE symbol = 'AAPL')
AND pc.date >= NOW() - INTERVAL '1 year'
ORDER BY pc.date ASC;

-- Expected: <50ms execution time
```

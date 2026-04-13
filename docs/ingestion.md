# Data Ingestion

## Overview

All data ingestion runs via **node-cron** inside the Fastify process. No external queue system (BullMQ/Redis) is used initially.

## Ingestion Schedule

| Service | Schedule | Cron | File |
|---------|----------|------|------|
| Stock prices | Daily 5 PM ET | `0 17 * * 1-5` | `services/ingestion.ts` |
| News (RSS) | Every 6 hours | `0 */6 * * *` | `services/news-ingestion.ts` |
| SEC filings | Daily 6 PM ET | `0 18 * * *` | `services/sec-ingestion.ts` |
| Insider trades | Daily 7 PM ET | `0 19 * * *` | `services/insider-ingestion.ts` |
| LLM sentiment | Daily midnight | `0 0 * * *` | `services/llm-sentiment.ts` |

**Note**: All times assume server is in ET timezone. Adjust if deployed elsewhere.

## Stock Price Ingestion

**Source**: Finnhub Free Tier (60 req/min)

**File**: `packages/backend/src/services/ingestion.ts`

```typescript
import cron from 'node-cron';
import { db } from '../db';
import { finnhubClient } from '../clients/finnhub';

// Run daily at 5 PM ET (after market close)
cron.schedule('0 17 * * 1-5', async () => {
  const stocks = await db.query('SELECT id, symbol FROM stocks');

  for (const stock of stocks.rows) {
    try {
      const candle = await finnhubClient.getDailyCandle(stock.symbol);

      await db.query(`
        INSERT INTO price_candles (stock_id, date, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (stock_id, date) DO UPDATE
        SET open = $3, high = $4, low = $5, close = $6, volume = $7
      `, [stock.id, candle.date, candle.open, candle.high, candle.low, candle.close, candle.volume]);

      // Calculate indicators immediately
      await calculateIndicators(stock.id, candle.id);

    } catch (error) {
      await logError('ingestion', stock.symbol, error);
    }
  }
});
```

**Error handling**: Individual stock failures don't stop the entire job. Errors are logged to `error_logs` table.

## News Ingestion

**Source**: RSS feeds (free, unlimited)

**Feeds**:
- Bloomberg: `https://www.bloomberg.com/feed/podcast/etf-report.xml`
- Reuters: `https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best`
- MarketWatch: `https://www.marketwatch.com/rss/topstories`

**File**: `packages/backend/src/services/news-ingestion.ts`

### Stock Symbol Extraction

News articles don't always include clean stock symbols. The extraction regex handles multiple formats:

```typescript
function extractStockSymbols(text: string): string[] {
  // Matches: $AAPL, AAPL, (NASDAQ: AAPL), (NYSE: AAPL)
  const matches = text.match(/\$([A-Z]{1,5})\b|NASDAQ:\s*([A-Z]{1,5})|NYSE:\s*([A-Z]{1,5})/gi);
  return [...new Set(matches?.map(m => m.replace(/[$():NASDQYE\s]/g, '')) || [])];
}
```

**Limitation**: May miss some symbols or extract false positives. Manual validation recommended for critical stocks.

### Sentiment Analysis (Phase 1-3)

**Method**: Regex-based keyword matching

```typescript
const POSITIVE_KEYWORDS = [
  'surge', 'jump', 'rally', 'gain', 'beat', 'bullish', 'upgrade', 'profit',
  'growth', 'upbeat', 'optimistic', 'strong', 'outperform', 'buy', 'rise'
];

const NEGATIVE_KEYWORDS = [
  'plunge', 'drop', 'fall', 'bearish', 'downgrade', 'loss', 'decline',
  'pessimistic', 'weak', 'underperform', 'sell', 'crash', 'miss', 'cut'
];

export function calculateRegexSentiment(text: string): number {
  const lowerText = text.toLowerCase();

  let score = 0;
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) score += 0.1;
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) score -= 0.1;
  }

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, score));
}
```

**Accuracy**: ~60% accurate. Good enough for MVP. Upgrade to LLM in Phase 4.

## SEC Filings Ingestion

**Source**: SEC EDGAR API (free, 10 req/sec)

**Critical requirement**: Must include User-Agent header with contact info.

```typescript
const response = await fetch(url, {
  headers: { 'User-Agent': 'StockIntelligence/1.0 (contact@example.com)' }
});
```

**Without this**: Requests will be rate-limited or blocked by SEC.

### Filing Types

- **8-K**: Current reports (material events)
- **10-K**: Annual reports
- **10-Q**: Quarterly reports
- **Form 4**: Insider trading transactions

**Focus**: Start with 8-K filings (most actionable for daily movements).

## Insider Trading Ingestion

**Source**: SEC Form 4 XML

**File**: `packages/backend/src/services/insider-ingestion.ts`

### Form 4 Parsing Complexity

Form 4 XML structure is inconsistent across companies. Accept parsing errors gracefully:

```typescript
try {
  const details = await parseForm4(form4.link);
} catch (error) {
  await logError('form4_parse', stock.symbol, error);
  continue; // Skip this filing, don't fail entire job
}
```

**Strategy**: Capture ~80% of filings correctly. Log failures for manual review.

## LLM Sentiment (Phase 4+)

**Source**: Claude 3.5 Haiku via Anthropic API

**Budget**: $30/month hard cap (enforced in code)

**File**: `packages/backend/src/services/llm-sentiment.ts`

### Batch Processing Strategy

```typescript
export async function analyzeSentimentBatch(newsItems: NewsItem[]) {
  const batches = chunk(newsItems, 10); // Process 10 at a time

  for (const batch of batches) {
    const prompt = `Analyze sentiment for these financial news headlines.
Return JSON array with sentiment scores (-1 to 1):

${batch.map((item, i) => `${i}. ${item.title}`).join('\n')}

Return format: [{"index": 0, "score": 0.7, "reasoning": "positive earnings"}, ...]`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const results = JSON.parse(message.content[0].text);

    // Update database with LLM sentiment
    for (const result of results) {
      await db.query(`
        UPDATE news_items
        SET sentiment_score = $1, sentiment_method = 'llm'
        WHERE id = $2
      `, [result.score, batch[result.index].id]);
    }
  }
}
```

**Key points**:
- Batch 10 articles per API call (reduces cost)
- Only analyze news from previous day (not real-time)
- Update `sentiment_method = 'llm'` to distinguish from regex

### Budget Monitoring

```typescript
export async function trackLLMUsage(tokens: number, cost: number) {
  await db.query(`
    INSERT INTO llm_usage (date, tokens_used, estimated_cost)
    VALUES (CURRENT_DATE, $1, $2)
    ON CONFLICT (date) DO UPDATE
    SET tokens_used = llm_usage.tokens_used + $1,
        estimated_cost = llm_usage.estimated_cost + $2
  `, [tokens, cost]);

  // Alert if monthly cost exceeds $30
  const monthlyUsage = await db.query(`
    SELECT SUM(estimated_cost) as total FROM llm_usage
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  if (monthlyUsage.rows[0].total > 30) {
    console.warn('⚠️  LLM cost exceeded $30 this month!');
    // Disable LLM processing, fallback to regex
    return false; // Signal to stop processing
  }

  return true; // Continue processing
}
```

## Error Handling

### Retry Logic

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();

      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

### Error Logging

All ingestion errors are logged to database:

```sql
CREATE TABLE error_logs (
  id BIGSERIAL PRIMARY KEY,
  service VARCHAR(50), -- 'ingestion', 'news', 'sec', etc.
  symbol VARCHAR(10),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Query recent errors:

```sql
SELECT * FROM error_logs
ORDER BY created_at DESC
LIMIT 20;
```

## Monitoring

### Check Ingestion Health

```sql
-- Last successful ingestion per stock
SELECT s.symbol, MAX(pc.created_at) as last_update
FROM stocks s
LEFT JOIN price_candles pc ON s.id = pc.stock_id
GROUP BY s.symbol
ORDER BY last_update DESC;

-- News articles ingested today
SELECT COUNT(*) FROM news_items
WHERE created_at > CURRENT_DATE;
```

### Rate Limit Monitoring

```typescript
// Track Finnhub API calls
let apiCallCount = 0;
const resetTime = Date.now() + 60000; // 1 minute

async function rateLimitedFetch(url: string) {
  if (apiCallCount >= 60 && Date.now() < resetTime) {
    await sleep(resetTime - Date.now());
    apiCallCount = 0;
  }

  apiCallCount++;
  return fetch(url);
}
```

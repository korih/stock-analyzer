# Database Schema & Patterns

## Schema Overview

The database uses a **normalized star pattern** with time-series optimization.

### Core Tables

#### `stocks`
```sql
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255),
  sector VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Central registry of all tracked stocks.

#### `price_candles`
```sql
CREATE TABLE price_candles (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stocks(id),
  date DATE NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stock_id, date)
);

CREATE INDEX idx_candles_stock_date ON price_candles(stock_id, date DESC);
```

**Purpose**: OHLCV daily candle data.

**Critical constraint**: `UNIQUE(stock_id, date)` prevents duplicate ingestion via `ON CONFLICT` upserts.

#### `indicators`
```sql
CREATE TABLE indicators (
  id BIGSERIAL PRIMARY KEY,
  candle_id BIGINT NOT NULL REFERENCES price_candles(id),
  indicator_type VARCHAR(50) NOT NULL, -- 'SMA_20', 'SMA_50', 'RSI_14', 'MACD'
  value DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candle_id, indicator_type)
);

CREATE INDEX idx_indicators_candle ON indicators(candle_id);
```

**Purpose**: Pre-computed technical indicators.

**Pattern**: Each indicator stored as separate row, not columns (easier to add/remove indicators).

#### `news_items`
```sql
CREATE TABLE news_items (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id),
  title VARCHAR(500),
  url VARCHAR(2048) UNIQUE,
  source VARCHAR(100),
  published_at TIMESTAMP,
  sentiment_score DECIMAL(3,2) DEFAULT 0, -- -1 (bearish) to 1 (bullish)
  sentiment_method VARCHAR(20) DEFAULT 'regex', -- 'regex', 'llm', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_stock_date ON news_items(stock_id, published_at DESC);
CREATE INDEX idx_news_published ON news_items(published_at DESC);
```

**Purpose**: News articles with sentiment analysis.

**Tracking**: `sentiment_method` indicates whether regex or LLM was used.

#### `sec_filings`
```sql
CREATE TABLE sec_filings (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id),
  filing_type VARCHAR(10), -- '8-K', '10-K', '10-Q', '4'
  filed_at TIMESTAMP,
  accession_number VARCHAR(50) UNIQUE,
  document_url VARCHAR(2048),
  summary TEXT,
  importance_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_filings_stock ON sec_filings(stock_id, filed_at DESC);
```

#### `insider_trades`
```sql
CREATE TABLE insider_trades (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id),
  insider_name VARCHAR(255),
  insider_role VARCHAR(100), -- 'CEO', 'CFO', 'Director'
  transaction_type VARCHAR(10), -- 'BUY', 'SELL'
  shares BIGINT,
  price DECIMAL(10,2),
  transaction_date DATE,
  filed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_stock ON insider_trades(stock_id, transaction_date DESC);
```

#### `llm_usage`
```sql
CREATE TABLE llm_usage (
  date DATE PRIMARY KEY,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Track LLM API usage for budget monitoring.

## Materialized Views

### `stock_summary`
```sql
CREATE MATERIALIZED VIEW stock_summary AS
SELECT
  s.symbol,
  s.name,
  pc.close as current_price,
  LAG(pc.close) OVER (PARTITION BY s.id ORDER BY pc.date) as prev_close,
  ((pc.close - prev_close) / prev_close * 100) as pct_change
FROM stocks s
JOIN price_candles pc ON s.id = pc.stock_id
WHERE pc.date = (SELECT MAX(date) FROM price_candles WHERE stock_id = s.id);

-- Refresh daily after ingestion
REFRESH MATERIALIZED VIEW stock_summary;
```

**Purpose**: Fast lookups for current stock prices and daily % change.

**Refresh strategy**: Triggered after daily ingestion completes.

## Query Patterns

### Fetch Candles with Indicators

```sql
SELECT
  pc.date,
  pc.open,
  pc.high,
  pc.low,
  pc.close,
  pc.volume,
  sma20.value as sma_20,
  sma50.value as sma_50,
  rsi.value as rsi_14
FROM price_candles pc
LEFT JOIN indicators sma20 ON pc.id = sma20.candle_id AND sma20.indicator_type = 'SMA_20'
LEFT JOIN indicators sma50 ON pc.id = sma50.candle_id AND sma50.indicator_type = 'SMA_50'
LEFT JOIN indicators rsi ON pc.id = rsi.candle_id AND rsi.indicator_type = 'RSI_14'
WHERE pc.stock_id = (SELECT id FROM stocks WHERE symbol = 'AAPL')
AND pc.date >= NOW() - INTERVAL '1 year'
ORDER BY pc.date ASC;
```

### Sentiment Aggregation

```sql
SELECT
  AVG(sentiment_score) as avg_sentiment,
  COUNT(*) as article_count,
  DATE_TRUNC('day', published_at) as date
FROM news_items
WHERE stock_id = (SELECT id FROM stocks WHERE symbol = 'AAPL')
AND published_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', published_at)
ORDER BY date DESC;
```

### Upsert Pattern (Prevent Duplicates)

```sql
INSERT INTO price_candles (stock_id, date, open, high, low, close, volume)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (stock_id, date) DO UPDATE
SET open = $3, high = $4, low = $5, close = $6, volume = $7;
```

**Why**: Handles re-runs of ingestion jobs without creating duplicates.

## Indexing Strategy

### Time-Series Optimization

```sql
-- Optimized for range queries (most common pattern)
CREATE INDEX idx_candles_stock_date ON price_candles(stock_id, date DESC);

-- Composite index for news lookups
CREATE INDEX idx_news_stock_date ON news_items(stock_id, published_at DESC);
```

### Avoid Over-Indexing

**Don't index**:
- Columns with low cardinality (`sentiment_method`, `filing_type`)
- Rarely queried columns (`importance_score`, `insider_role`)
- Computed columns in materialized views

## Performance Considerations

### Query Performance Targets

- Simple stock lookup: <10ms
- Candles with indicators (1 year): <50ms
- Sentiment aggregation: <30ms
- Full intelligence summary: <100ms

### Optimization Techniques

1. **Materialized views**: Pre-compute expensive aggregations
2. **Partial indexes**: Index only recent data if queries are time-bound
3. **Connection pooling**: Use `pg-pool` (max 20 connections)
4. **Query planning**: Use `EXPLAIN ANALYZE` to identify slow queries

### Monitoring

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

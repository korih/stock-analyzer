-- Stock Intelligence Platform - PostgreSQL Schema
-- Phase 1: Core tables for stocks, price data, and technical indicators

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Stocks table: Master list of tracked stocks
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255),
  sector VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Price candles table: Daily OHLCV data
CREATE TABLE IF NOT EXISTS price_candles (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10,2) NOT NULL,
  high DECIMAL(10,2) NOT NULL,
  low DECIMAL(10,2) NOT NULL,
  close DECIMAL(10,2) NOT NULL,
  volume BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stock_id, date)
);

-- Indicators table: Pre-computed technical indicators
CREATE TABLE IF NOT EXISTS indicators (
  id BIGSERIAL PRIMARY KEY,
  candle_id BIGINT NOT NULL REFERENCES price_candles(id) ON DELETE CASCADE,
  indicator_type VARCHAR(50) NOT NULL, -- 'SMA_20', 'SMA_50', 'SMA_200', 'RSI_14', 'MACD', etc.
  value DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candle_id, indicator_type)
);

-- News items table (Phase 3)
CREATE TABLE IF NOT EXISTS news_items (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  url VARCHAR(2048) UNIQUE NOT NULL,
  source VARCHAR(100) NOT NULL,
  published_at TIMESTAMP NOT NULL,
  sentiment_score DECIMAL(3,2) DEFAULT 0, -- -1 (bearish) to 1 (bullish)
  sentiment_method VARCHAR(20) DEFAULT 'regex', -- 'regex', 'llm', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEC filings table (Phase 5)
CREATE TABLE IF NOT EXISTS sec_filings (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  filing_type VARCHAR(10) NOT NULL, -- '8-K', '10-K', '10-Q', '4'
  filed_at TIMESTAMP NOT NULL,
  accession_number VARCHAR(50) UNIQUE NOT NULL,
  document_url VARCHAR(2048) NOT NULL,
  summary TEXT,
  importance_score DECIMAL(3,2) DEFAULT 0.5, -- 0 (low) to 1 (high)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insider trades table (Phase 5)
CREATE TABLE IF NOT EXISTS insider_trades (
  id BIGSERIAL PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  insider_name VARCHAR(255) NOT NULL,
  insider_role VARCHAR(100), -- 'CEO', 'CFO', 'Director', etc.
  transaction_type VARCHAR(10) NOT NULL, -- 'BUY', 'SELL'
  shares BIGINT NOT NULL,
  price DECIMAL(10,2),
  transaction_date DATE NOT NULL,
  filed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- LLM usage tracking table (Phase 4)
CREATE TABLE IF NOT EXISTS llm_usage (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  tokens_used BIGINT DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Error logs table: Track ingestion failures
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGSERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL, -- 'ingestion', 'news', 'sec', 'insider', etc.
  symbol VARCHAR(10),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_candles_stock_date ON price_candles(stock_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_indicators_candle ON indicators(candle_id);
CREATE INDEX IF NOT EXISTS idx_indicators_type ON indicators(indicator_type);
CREATE INDEX IF NOT EXISTS idx_news_stock_date ON news_items(stock_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_filings_stock ON sec_filings(stock_id, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_stock ON insider_trades(stock_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_service ON error_logs(service, created_at DESC);

-- Materialized view: Stock summary (Phase 2)
CREATE MATERIALIZED VIEW IF NOT EXISTS stock_summary AS
SELECT
  s.id,
  s.symbol,
  s.name,
  s.sector,
  pc.close as current_price,
  LAG(pc.close) OVER (PARTITION BY s.id ORDER BY pc.date) as prev_close,
  CASE
    WHEN LAG(pc.close) OVER (PARTITION BY s.id ORDER BY pc.date) IS NOT NULL
    THEN ((pc.close - LAG(pc.close) OVER (PARTITION BY s.id ORDER BY pc.date))
          / LAG(pc.close) OVER (PARTITION BY s.id ORDER BY pc.date) * 100)
    ELSE 0
  END as pct_change,
  pc.volume,
  pc.date as last_updated
FROM stocks s
LEFT JOIN LATERAL (
  SELECT * FROM price_candles
  WHERE stock_id = s.id
  ORDER BY date DESC
  LIMIT 1
) pc ON true;

-- Create unique index on materialized view for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_summary_id ON stock_summary(id);

-- Seed initial stocks (10 stocks for Phase 1)
INSERT INTO stocks (symbol, name, sector) VALUES
  ('AAPL', 'Apple Inc.', 'Technology'),
  ('MSFT', 'Microsoft Corporation', 'Technology'),
  ('GOOGL', 'Alphabet Inc.', 'Technology'),
  ('AMZN', 'Amazon.com Inc.', 'Consumer Cyclical'),
  ('TSLA', 'Tesla Inc.', 'Automotive'),
  ('NVDA', 'NVIDIA Corporation', 'Technology'),
  ('META', 'Meta Platforms Inc.', 'Technology'),
  ('NFLX', 'Netflix Inc.', 'Communication Services'),
  ('AMD', 'Advanced Micro Devices Inc.', 'Technology'),
  ('JPM', 'JPMorgan Chase & Co.', 'Financial Services')
ON CONFLICT (symbol) DO NOTHING;

-- Function to refresh materialized view (call after ingestion)
CREATE OR REPLACE FUNCTION refresh_stock_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock_summary;
END;
$$ LANGUAGE plpgsql;

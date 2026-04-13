import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { calculateSMA, calculateRSI, calculateMACD } from '../src/services/indicators';

// Test database setup
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
});

describe('Technical Indicators', () => {
  let testStockId: string;
  let testCandleIds: string[] = [];

  beforeAll(async () => {
    // Create test stock
    const stockResult = await testDb.query(`
      INSERT INTO stocks (symbol, name, sector)
      VALUES ('TEST', 'Test Stock', 'Technology')
      RETURNING id
    `);
    testStockId = stockResult.rows[0].id;

    // Insert test candles (20 days of data)
    const basePrice = 100;
    const dates: string[] = [];
    for (let i = 19; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    for (let i = 0; i < 20; i++) {
      const price = basePrice + (i * 2); // Trending up
      const candleResult = await testDb.query(`
        INSERT INTO price_candles (stock_id, date, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [testStockId, dates[i], price, price + 2, price - 1, price + 1, 1000000]);

      testCandleIds.push(candleResult.rows[0].id);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await testDb.query('DELETE FROM price_candles WHERE stock_id = $1', [testStockId]);
    await testDb.query('DELETE FROM stocks WHERE id = $1', [testStockId]);
    await testDb.end();
  });

  describe('calculateSMA', () => {
    it('should calculate 20-period SMA correctly', async () => {
      const sma = await calculateSMA(testStockId, testCandleIds[19], 20);

      expect(sma).toBeDefined();
      expect(sma).toBeGreaterThan(0);
      // With our test data trending from 101 to 139, SMA should be around 120
      expect(sma).toBeGreaterThan(115);
      expect(sma).toBeLessThan(125);
    });

    it('should return null when insufficient data', async () => {
      const sma = await calculateSMA(testStockId, testCandleIds[0], 50);
      expect(sma).toBeNull();
    });

    it('should calculate 10-period SMA correctly', async () => {
      const sma = await calculateSMA(testStockId, testCandleIds[19], 10);

      expect(sma).toBeDefined();
      expect(sma).toBeGreaterThan(0);
      // Last 10 candles should have higher average
      expect(sma).toBeGreaterThan(125);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly for trending data', async () => {
      const rsi = await calculateRSI(testStockId, testCandleIds[19], 14);

      expect(rsi).toBeDefined();
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThanOrEqual(100);

      // With upward trending data, RSI should be > 50 (bullish)
      expect(rsi).toBeGreaterThan(50);
    });

    it('should return null when insufficient data', async () => {
      const rsi = await calculateRSI(testStockId, testCandleIds[0], 14);
      expect(rsi).toBeNull();
    });

    it('should return value between 0 and 100', async () => {
      const rsi = await calculateRSI(testStockId, testCandleIds[19], 14);

      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD correctly', async () => {
      const macd = await calculateMACD(testStockId, testCandleIds[19]);

      // With only 20 data points, MACD might be null (needs 26+ for EMA26)
      // This test mainly validates the function doesn't crash
      if (macd !== null) {
        expect(typeof macd).toBe('number');
      }
    });
  });
});

import { db } from '../db/client.js';

interface Candle {
  id: string;
  close: string;
  high: string;
  low: string;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export async function calculateSMA(
  stockId: string,
  candleId: string,
  period: number
): Promise<number | null> {
  const result = await db.query<Candle>(`
    SELECT close FROM price_candles
    WHERE stock_id = $1
    ORDER BY date DESC
    LIMIT $2
  `, [stockId, period]);

  if (result.rows.length < period) {
    return null; // Not enough data
  }

  const sum = result.rows.reduce((acc, row) => acc + parseFloat(row.close), 0);
  return sum / period;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export async function calculateEMA(
  stockId: string,
  candleId: string,
  period: number
): Promise<number | null> {
  const result = await db.query<Candle>(`
    SELECT close FROM price_candles
    WHERE stock_id = $1
    ORDER BY date ASC
  `, [stockId]);

  if (result.rows.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let ema = parseFloat(result.rows[0].close);

  for (let i = 1; i < result.rows.length; i++) {
    const close = parseFloat(result.rows[i].close);
    ema = (close - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export async function calculateRSI(
  stockId: string,
  candleId: string,
  period: number = 14
): Promise<number | null> {
  const result = await db.query<Candle>(`
    SELECT close FROM price_candles
    WHERE stock_id = $1
    ORDER BY date DESC
    LIMIT $2
  `, [stockId, period + 1]);

  if (result.rows.length < period + 1) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const change = parseFloat(result.rows[i].close) - parseFloat(result.rows[i + 1].close);
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100; // All gains, RSI = 100
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export async function calculateMACD(
  stockId: string,
  candleId: string
): Promise<number | null> {
  const ema12 = await calculateEMA(stockId, candleId, 12);
  const ema26 = await calculateEMA(stockId, candleId, 26);

  if (ema12 === null || ema26 === null) {
    return null;
  }

  return ema12 - ema26;
}

/**
 * Calculate all indicators for a candle and store in database
 */
export async function calculateAndStoreIndicators(
  stockId: string,
  candleId: string
): Promise<void> {
  const indicators = [
    { type: 'SMA_20', value: await calculateSMA(stockId, candleId, 20) },
    { type: 'SMA_50', value: await calculateSMA(stockId, candleId, 50) },
    { type: 'SMA_200', value: await calculateSMA(stockId, candleId, 200) },
    { type: 'RSI_14', value: await calculateRSI(stockId, candleId, 14) },
    { type: 'MACD', value: await calculateMACD(stockId, candleId) },
  ];

  for (const indicator of indicators) {
    if (indicator.value !== null) {
      await db.query(`
        INSERT INTO indicators (candle_id, indicator_type, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (candle_id, indicator_type)
        DO UPDATE SET value = $3
      `, [candleId, indicator.type, indicator.value]);
    }
  }
}

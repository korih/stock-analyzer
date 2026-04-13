import cron from 'node-cron';
import { db } from '../db/client.js';
import { finnhubClient } from '../clients/finnhub.js';
import { calculateAndStoreIndicators } from './indicators.js';

/**
 * Log errors to database
 */
async function logError(
  service: string,
  symbol: string,
  error: Error
): Promise<void> {
  await db.query(`
    INSERT INTO error_logs (service, symbol, error_message, error_stack)
    VALUES ($1, $2, $3, $4)
  `, [service, symbol, error.message, error.stack || '']);
}

/**
 * Ingest daily candle data for all stocks
 */
export async function ingestDailyCandles(): Promise<void> {
  console.log('📊 Starting daily candle ingestion...');

  const stocks = await db.query('SELECT id, symbol FROM stocks');
  let successCount = 0;
  let errorCount = 0;

  for (const stock of stocks.rows) {
    try {
      console.log(`  Fetching ${stock.symbol}...`);
      const candle = await finnhubClient.getDailyCandle(stock.symbol);

      const result = await db.query(`
        INSERT INTO price_candles (stock_id, date, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (stock_id, date) DO UPDATE
        SET open = $3, high = $4, low = $5, close = $6, volume = $7
        RETURNING id
      `, [
        stock.id,
        candle.date,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
      ]);

      const candleId = result.rows[0].id;

      // Calculate and store indicators
      await calculateAndStoreIndicators(stock.id, candleId);

      successCount++;
      console.log(`  ✅ ${stock.symbol} ingested successfully`);

    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error ingesting ${stock.symbol}:`, error);
      await logError('ingestion', stock.symbol, error as Error);
    }
  }

  // Refresh materialized view
  try {
    await db.query('SELECT refresh_stock_summary()');
    console.log('✅ Stock summary refreshed');
  } catch (error) {
    console.error('❌ Error refreshing stock summary:', error);
  }

  console.log(`\n📊 Ingestion complete: ${successCount} success, ${errorCount} errors\n`);
}

/**
 * Initial historical data ingestion (run once)
 */
export async function ingestHistoricalData(days: number = 365): Promise<void> {
  console.log(`📊 Starting historical data ingestion (${days} days)...`);

  const stocks = await db.query('SELECT id, symbol FROM stocks');

  for (const stock of stocks.rows) {
    try {
      console.log(`  Fetching historical data for ${stock.symbol}...`);
      const candles = await finnhubClient.getHistoricalCandles(stock.symbol, days);

      for (const candle of candles) {
        const result = await db.query(`
          INSERT INTO price_candles (stock_id, date, open, high, low, close, volume)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (stock_id, date) DO NOTHING
          RETURNING id
        `, [
          stock.id,
          candle.date,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
        ]);

        if (result.rows.length > 0) {
          const candleId = result.rows[0].id;
          await calculateAndStoreIndicators(stock.id, candleId);
        }
      }

      console.log(`  ✅ ${stock.symbol}: ${candles.length} candles ingested`);

    } catch (error) {
      console.error(`  ❌ Error ingesting ${stock.symbol}:`, error);
      await logError('historical_ingestion', stock.symbol, error as Error);
    }
  }

  // Refresh materialized view
  await db.query('SELECT refresh_stock_summary()');

  console.log('\n✅ Historical data ingestion complete\n');
}

/**
 * Schedule daily ingestion at 5 PM ET (after market close)
 * Cron: '0 17 * * 1-5' = Monday-Friday at 5:00 PM
 */
export function scheduleDailyIngestion(): void {
  cron.schedule('0 17 * * 1-5', async () => {
    console.log(`\n⏰ Scheduled ingestion triggered at ${new Date().toISOString()}`);
    await ingestDailyCandles();
  }, {
    timezone: 'America/New_York', // ET timezone
  });

  console.log('📅 Daily ingestion scheduled for 5:00 PM ET (Monday-Friday)');
}

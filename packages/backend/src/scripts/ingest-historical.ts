#!/usr/bin/env tsx

/**
 * One-time script to ingest historical data for all stocks
 *
 * Usage:
 *   pnpm tsx src/scripts/ingest-historical.ts [days]
 *
 * Example:
 *   pnpm tsx src/scripts/ingest-historical.ts 365
 */

import { ingestHistoricalData } from '../services/ingestion.js';
import { db } from '../db/client.js';

const days = parseInt(process.argv[2] || '365', 10);

console.log(`Starting historical data ingestion for ${days} days...\n`);

try {
  await ingestHistoricalData(days);
  console.log('\n✅ Historical data ingestion complete!');
  await db.end();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Historical data ingestion failed:', error);
  await db.end();
  process.exit(1);
}

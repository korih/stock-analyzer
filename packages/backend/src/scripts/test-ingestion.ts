#!/usr/bin/env tsx

/**
 * Test script to manually trigger daily ingestion
 *
 * Usage:
 *   pnpm tsx src/scripts/test-ingestion.ts
 */

import { ingestDailyCandles } from '../services/ingestion.js';
import { db } from '../db/client.js';

console.log('Testing daily candle ingestion...\n');

try {
  await ingestDailyCandles();
  console.log('\n✅ Test ingestion complete!');
  await db.end();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test ingestion failed:', error);
  await db.end();
  process.exit(1);
}

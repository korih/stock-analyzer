import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { z } from 'zod';

const candlesQuerySchema = z.object({
  range: z.enum(['1d', '1w', '1m', '3m', '1y', '5y']).default('1y'),
});

export const stockRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /stocks - List all stocks
  fastify.get('/', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache

    const result = await db.query(`
      SELECT id, symbol, name, sector
      FROM stocks
      ORDER BY symbol ASC
    `);

    return result.rows;
  });

  // GET /stocks/:symbol - Get stock details
  fastify.get<{ Params: { symbol: string } }>(
    '/:symbol',
    async (request, reply) => {
      reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      const { symbol } = request.params;

      const result = await db.query(`
        SELECT
          s.id,
          s.symbol,
          s.name,
          s.sector,
          ss.current_price,
          ss.pct_change,
          ss.volume,
          ss.last_updated
        FROM stocks s
        LEFT JOIN stock_summary ss ON s.id = ss.id
        WHERE s.symbol = $1
      `, [symbol.toUpperCase()]);

      if (result.rows.length === 0) {
        reply.status(404);
        throw new Error(`Stock symbol '${symbol}' not found`);
      }

      return result.rows[0];
    }
  );

  // GET /stocks/:symbol/candles - Get price candles with indicators
  fastify.get<{
    Params: { symbol: string };
    Querystring: { range?: string };
  }>(
    '/:symbol/candles',
    async (request, reply) => {
      reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      const { symbol } = request.params;
      const query = candlesQuerySchema.parse(request.query);

      // Map range to SQL interval
      const intervalMap: Record<string, string> = {
        '1d': '1 day',
        '1w': '7 days',
        '1m': '1 month',
        '3m': '3 months',
        '1y': '1 year',
        '5y': '5 years',
      };

      const result = await db.query(`
        SELECT
          pc.date,
          pc.open,
          pc.high,
          pc.low,
          pc.close,
          pc.volume,
          MAX(CASE WHEN i.indicator_type = 'SMA_20' THEN i.value END) as sma_20,
          MAX(CASE WHEN i.indicator_type = 'SMA_50' THEN i.value END) as sma_50,
          MAX(CASE WHEN i.indicator_type = 'SMA_200' THEN i.value END) as sma_200,
          MAX(CASE WHEN i.indicator_type = 'RSI_14' THEN i.value END) as rsi_14,
          MAX(CASE WHEN i.indicator_type = 'MACD' THEN i.value END) as macd
        FROM price_candles pc
        LEFT JOIN indicators i ON pc.id = i.candle_id
        WHERE pc.stock_id = (SELECT id FROM stocks WHERE symbol = $1)
          AND pc.date >= NOW() - INTERVAL '${intervalMap[query.range]}'
        GROUP BY pc.id, pc.date, pc.open, pc.high, pc.low, pc.close, pc.volume
        ORDER BY pc.date ASC
      `, [symbol.toUpperCase()]);

      return result.rows;
    }
  );

  // GET /stocks/:symbol/indicators - Get latest indicator values
  fastify.get<{ Params: { symbol: string } }>(
    '/:symbol/indicators',
    async (request, reply) => {
      reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      const { symbol } = request.params;

      const result = await db.query(`
        SELECT
          i.indicator_type,
          i.value
        FROM indicators i
        JOIN price_candles pc ON i.candle_id = pc.id
        WHERE pc.stock_id = (SELECT id FROM stocks WHERE symbol = $1)
          AND pc.date = (
            SELECT MAX(date) FROM price_candles
            WHERE stock_id = (SELECT id FROM stocks WHERE symbol = $1)
          )
        ORDER BY i.indicator_type
      `, [symbol.toUpperCase()]);

      const indicators: Record<string, number> = {};
      result.rows.forEach(row => {
        indicators[row.indicator_type.toLowerCase()] = parseFloat(row.value);
      });

      return {
        symbol: symbol.toUpperCase(),
        indicators,
      };
    }
  );
};

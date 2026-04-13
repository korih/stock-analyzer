import { FastifyInstance } from 'fastify';
import { pool } from '../db/client';

export default async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Detailed health check with DB status
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      // Check database connection
      const result = await pool.query('SELECT NOW()');
      const dbConnected = !!result.rows[0];

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbConnected ? 'connected' : 'disconnected',
        },
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from './db/client.js';
import { stockRoutes } from './routes/stocks.js';
import { scheduleDailyIngestion } from './services/ingestion.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// CORS configuration
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://stockintelligence.app'
    : '*',
});

// Request logging
fastify.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

fastify.addHook('onResponse', (request, reply, done) => {
  const duration = Date.now() - (request.startTime || Date.now());
  fastify.log.info(
    `${request.method} ${request.url} - ${reply.statusCode} - ${duration}ms`
  );
  done();
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  reply.status(error.statusCode || 500).send({
    statusCode: error.statusCode || 500,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  });
});

// Health check endpoint
fastify.get('/health', async (req, reply) => {
  try {
    await db.query('SELECT 1');
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
});

// Register routes
await fastify.register(stockRoutes, { prefix: '/stocks' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`\n🚀 Stock Intelligence Platform API`);
    console.log(`📡 Server running at http://localhost:${port}`);
    console.log(`🔍 Health check: http://localhost:${port}/health\n`);

    // Start scheduled ingestion (only in production or when explicitly enabled)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
      scheduleDailyIngestion();
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    await fastify.close();
    await db.end();
    console.log('✅ Server closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

start();

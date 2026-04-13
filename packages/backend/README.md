# Stock Intelligence Platform - Backend

Fastify-based REST API for the Stock Intelligence Platform.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Edit .env with your API keys

# Start PostgreSQL
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Development

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report

## API Endpoints

- `GET /health` - Health check
- `GET /stocks` - List all stocks
- `GET /stocks/:symbol` - Get stock details
- `GET /stocks/:symbol/candles?range=1y` - Get price candles with indicators
- `GET /stocks/:symbol/indicators` - Get latest indicator values

## Architecture

See [docs/architecture.md](../../docs/architecture.md) for design decisions.

## Database

See [docs/database.md](../../docs/database.md) for schema and patterns.

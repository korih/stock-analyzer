# Stock Analyzer - Project Structure

```
stock-analyzer/
├── packages/
│   ├── backend/                    # Fastify API Server
│   │   ├── src/
│   │   │   ├── clients/           # External API clients
│   │   │   │   └── finnhub.ts     # Finnhub API client
│   │   │   ├── db/                # Database layer
│   │   │   │   ├── client.ts      # PostgreSQL connection pool
│   │   │   │   ├── migrate.ts     # Migration runner
│   │   │   │   └── schema.sql     # Database schema
│   │   │   ├── routes/            # API route handlers
│   │   │   │   ├── stocks.ts      # Stock data endpoints
│   │   │   │   └── health.ts      # Health check endpoint
│   │   │   ├── scripts/           # Standalone scripts
│   │   │   │   ├── ingest-historical.ts
│   │   │   │   └── test-ingestion.ts
│   │   │   ├── services/          # Business logic
│   │   │   │   ├── indicators.ts  # Technical indicators (SMA, EMA, etc.)
│   │   │   │   └── ingestion.ts   # Data ingestion service
│   │   │   ├── types/             # TypeScript type definitions
│   │   │   │   └── index.ts       # Shared types
│   │   │   ├── index.ts           # Application entry point
│   │   │   └── server.ts          # Fastify server setup
│   │   ├── tests/                 # Test files
│   │   │   └── indicators.test.ts
│   │   ├── .env.example           # Environment variables template
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── frontend/                   # Next.js 14 App Router
│       ├── src/
│       │   ├── app/               # App Router pages
│       │   │   ├── layout.tsx     # Root layout
│       │   │   ├── page.tsx       # Home page
│       │   │   └── globals.css    # Global styles
│       │   ├── components/        # React components
│       │   │   ├── StockChart.tsx # TradingView Lightweight Charts
│       │   │   └── StockSelector.tsx
│       │   ├── lib/              # Utility functions
│       │   │   └── api.ts        # API client
│       │   └── types/            # TypeScript types
│       │       └── index.ts      # Shared types
│       ├── public/               # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       └── postcss.config.js
│
├── docs/                          # Documentation
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── ingestion.md
│   ├── development.md
│   ├── testing.md
│   ├── deployment.md
│   ├── phases.md
│   └── decisions.md
│
├── docker-compose.yml            # PostgreSQL container
├── package.json                  # Root package.json (workspace)
├── pnpm-workspace.yaml
├── CLAUDE.md                     # Claude Code instructions
└── README.md
```

## Key Directories

### Backend (`packages/backend/src/`)
- **clients/** - External API integrations (Finnhub, Alpha Vantage)
- **db/** - Database connection, migrations, schema
- **routes/** - Fastify route handlers (REST endpoints)
- **services/** - Business logic (indicators, ingestion, caching)
- **scripts/** - Standalone utilities (data backfill, testing)
- **types/** - Shared TypeScript interfaces

### Frontend (`packages/frontend/src/`)
- **app/** - Next.js App Router pages and layouts
- **components/** - Reusable React components
- **lib/** - Utility functions, API client, helpers
- **types/** - TypeScript type definitions

## Technology Stack

**Backend:**
- Fastify (web framework)
- PostgreSQL (database)
- node-cron (scheduled jobs)
- pg (PostgreSQL client)

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TradingView Lightweight Charts
- Tailwind CSS

**Development:**
- TypeScript
- pnpm (package manager)
- tsx (dev server)
- Vitest (testing)

# Stock Intelligence Platform - Frontend

Next.js-based frontend for the Stock Intelligence Platform.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env.local
# Edit .env.local with API URL

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm lint` - Run linter

## Components

- `StockSelector` - Dropdown to select stocks
- `StockChart` - Interactive price chart with technical indicators (Lightweight Charts)
- More components coming in Phase 3+ (news sidebar, intelligence panel, etc.)

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS
- **Charts**: Lightweight Charts (TradingView)
- **State**: React Query

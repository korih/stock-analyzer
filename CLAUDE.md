# CLAUDE.md

**Purpose**: Quick index for Claude Code to find relevant documentation without loading full context.

## 📋 Instructions for Claude

**Always document**:
- Architectural decisions → [docs/decisions.md](docs/decisions.md)
- Design choices and trade-offs → [docs/decisions.md](docs/decisions.md)
- Implementation changes that affect system behavior → [docs/decisions.md](docs/decisions.md)
- New features, endpoints, or services → Relevant doc in `docs/` + [decisions.md](docs/decisions.md)
- Add changes summary to corresponding doc and link to decisions log in docs for each feature. Make a new file if the corresponding doc doesn't exist yet.

**Never load all docs at once**. Use this index to find the specific doc you need.

## 📚 Documentation Index

| Topic | File | When to Read |
|-------|------|--------------|
| System design, tech stack | [Architecture](docs/architecture.md) | Understanding overall system |
| Database schema, queries | [Database](docs/database.md) | Adding tables, writing queries |
| REST endpoints, caching | [API](docs/api.md) | Adding/modifying endpoints |
| Data sources, cron jobs | [Ingestion](docs/ingestion.md) | Working with data ingestion |
| Setup, commands, workflow | [Development](docs/development.md) | Developer onboarding, common tasks |
| Tests, troubleshooting | [Testing](docs/testing.md) | Debugging, writing tests |
| Production deployment | [Deployment](docs/deployment.md) | Deploying to Railway/Vercel |
| Project roadmap | [Phases](docs/phases.md) | Understanding feature timeline |
| **Design decisions log** | [Decisions](docs/decisions.md) | **Always update when making choices** |

## 🚀 Quick Start

```bash
pnpm install
docker-compose up -d
pnpm --filter backend db:migrate
pnpm dev  # Backend :3001 + Frontend :3000
```

## 🔑 Key Facts

- **Stack**: TypeScript monorepo, Fastify, Next.js 14, PostgreSQL, Lightweight Charts
- **Data**: Daily candles (not real-time)
- **Budget**: $0-50/month
- **No queues**: Direct DB writes + node-cron (see [Architecture](docs/architecture.md))
- **Current Phase**: Phase 1 foundation complete

## 📖 Common Tasks

| Task | Read |
|------|------|
| Add API endpoint | [API](docs/api.md), [Development](docs/development.md) |
| Add indicator | [Development](docs/development.md), [Database](docs/database.md) |
| Fix ingestion | [Testing](docs/testing.md), [Ingestion](docs/ingestion.md) |
| Database query | [Database](docs/database.md) |
| Deploy | [Deployment](docs/deployment.md) |

---

**Last updated**: Phase 1 foundation (2024-01-XX)

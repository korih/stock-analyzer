# Design Decisions & Changes Log

This document tracks architectural decisions, implementation choices, and significant changes made during development.

## Purpose

**When to update this file**:
- Making architectural decisions (queue system, caching strategy, etc.)
- Choosing between multiple implementation approaches
- Deviating from the original plan
- Discovering important constraints or limitations
- Adding new features or services
- Performance optimizations that affect design

**Format**: Add newest entries at the top with date and rationale.

---

## 2024-01-XX: Phase 1 Foundation Implementation

**Decision**: Implemented complete Phase 1 foundation with TypeScript monorepo

**Context**: Starting from empty repository, needed to establish core platform.

**What was built**:
- Backend: Fastify API with PostgreSQL database
- Frontend: Next.js 14 with Lightweight Charts
- Database: 8 tables, materialized views, indexes
- Services: Finnhub client, indicator calculations, ingestion service
- Documentation: 8 doc files covering architecture, API, testing, etc.

**Key architectural choices**:
1. **No queue system**: Direct database writes with node-cron scheduling
   - Rationale: Daily data ingestion is predictable, not event-driven
   - Deferred: BullMQ/Redis until Phase 4+ when LLM processing introduces variable timing

2. **Pre-computed indicators**: Calculate during ingestion, store in database
   - Rationale: Faster API responses, simpler frontend
   - Trade-off: More storage, but negligible for daily data

3. **Materialized views**: For stock summaries and aggregations
   - Rationale: Avoid expensive JOINs on every request
   - Refresh: Daily after ingestion completes

4. **HTTP caching**: 1-hour cache for historical data
   - Rationale: Price data doesn't change retroactively
   - News/sentiment: Shorter 15-minute cache (Phase 3+)

**Budget considerations**:
- Finnhub free tier: 60 req/min sufficient for 10-50 stocks
- PostgreSQL: Railway free tier ($5 credit/month)
- No LLM costs until Phase 4

**Files created**: See project structure in README.md

---

## 2024-04-13: Created Sprint-Based Milestone Plan

**Decision**: Created detailed 13-sprint implementation plan with actionable deliverables

**Context**: Needed granular project planning beyond high-level phases to track progress systematically and provide clear sprint goals with acceptance criteria.

**What was created**:
- **File**: `docs/milestones.md` - Comprehensive sprint breakdown
- **Structure**: 13 two-week sprints covering all 6 phases
- **Format**: Sprint-like planning with tasks, deliverables, acceptance criteria

**Key planning decisions**:

1. **Sprint duration**: 2 weeks per sprint
   - Rationale: Balance between agility and meaningful deliverables
   - Allows for regular retrospectives and course corrections

2. **Definition of Done (DoD)**: Strict criteria for sprint completion
   - Code quality: Tests passing, no linting errors, TypeScript strict mode
   - Documentation: API docs, decision log updates, README updates
   - Testing: Unit + integration tests, manual testing, edge cases
   - Performance: No regressions, optimized queries, monitored bundle size

3. **Story point estimation**: Fibonacci scale (1, 2, 3, 5, 8, 13)
   - Rationale: Track velocity and improve future estimates
   - Example Sprint 1: 21 points across 5 major tasks

4. **Risk mitigation per sprint**: Identified specific risks and mitigations
   - Finnhub rate limits → Batch requests, retry logic
   - LLM cost overruns → Hard budget caps, auto-fallback
   - Form 4 parsing complexity → Accept 20% failure rate

5. **Budget tracking**: Cost estimates per sprint
   - Phase 4 LLM sentiment: ~$0.23/month
   - Phase 6 intelligence summaries: ~$0.16/month
   - Total: <$1/month (well under $50 budget)

**Sprint breakdown**:
- **Sprints 1-2**: Core platform (data ingestion, API, charts)
- **Sprint 3**: Performance optimization (caching, indexes)
- **Sprints 4-5**: News integration (RSS, sentiment)
- **Sprints 6-7**: LLM sentiment (upgrade from regex, cost monitoring)
- **Sprints 8-10**: SEC filings (EDGAR, Form 4, summaries)
- **Sprints 11-13**: Intelligence summary (timeline, AI summaries, launch)

**Success metrics defined**:
- Technical: Test coverage >80%, API <100ms, uptime >99%
- Business: Data freshness <24h, sentiment accuracy >80%, costs <$50/month

**Relationship to existing docs**:
- Complements `phases.md` (high-level) with sprint-level detail
- References `architecture.md`, `database.md`, `api.md` for technical decisions
- Uses same 6-phase structure for consistency

**Trade-offs**:
- Pros: Clear roadmap, trackable progress, realistic estimates
- Cons: Requires discipline to update, may need adjustments based on velocity
- Flexibility: Sprint scope can adjust based on actual velocity

**Related docs**:
- [Phases](phases.md) - High-level 6-phase overview
- [Milestones](milestones.md) - Detailed sprint-by-sprint plan (NEW)
- [Development](development.md) - Development workflow and commands

---

## Template for Future Entries

### YYYY-MM-DD: [Decision Title]

**Decision**: Brief one-line summary

**Context**: Why was this decision necessary? What problem does it solve?

**Alternatives considered**:
1. Option A - rejected because...
2. Option B - rejected because...
3. Option C - chosen because...

**Implementation details**:
- Key files/components affected
- Configuration changes
- Database migrations required

**Trade-offs**:
- Pros: ...
- Cons: ...
- Deferred considerations: ...

**Related docs**: Links to other documentation affected by this decision

---

## Guidelines for Future Updates

**Good entry example**:
```
### 2024-02-15: Switched from Regex to LLM Sentiment

**Decision**: Implemented Claude 3.5 Haiku for news sentiment analysis

**Context**: Regex sentiment accuracy was only 58%, missing nuanced financial language.

**Implementation**:
- Added `src/services/llm-sentiment.ts`
- Budget tracking in `llm_usage` table
- Hard $30/month cap with automatic fallback to regex

**Trade-offs**:
- Pros: 80%+ accuracy, captures context and sarcasm
- Cons: API costs, latency (batch process once daily)
- Mitigation: Only analyze top 10 stocks, batch 10 articles per request

**Files modified**: `src/services/news-ingestion.ts`, `src/db/schema.sql`
```

**Bad entry example** (too vague):
```
Changed sentiment to use AI. Works better now.
```

---

## Quick Reference: Where to Document What

| Change Type | Document In |
|-------------|-------------|
| Architectural decision | `decisions.md` (this file) |
| New API endpoint | `api.md` + this file |
| Database schema change | `database.md` + migration file + this file |
| Ingestion schedule change | `ingestion.md` + this file |
| Performance optimization | `decisions.md` if significant, otherwise commit message |
| Bug fix | Commit message only (unless reveals design flaw) |
| Configuration change | Relevant doc + `.env.example` |
| Dependency added | `package.json` + commit message explaining why |

---

## Index of Related Docs

- [Architecture](architecture.md) - High-level system design (mostly static)
- [Database](database.md) - Schema and query patterns (update on schema changes)
- [API](api.md) - Endpoint documentation (update on new endpoints)
- [Ingestion](ingestion.md) - Data source and scheduling logic (update on new sources)
- [Development](development.md) - Workflow and commands (update on new patterns)
- [Phases](phases.md) - Project roadmap (update on phase completion)

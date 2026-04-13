# Deployment

## Production Stack

- **Backend + Database**: Railway.app (~$15/month, includes $5 free credit)
- **Frontend**: Vercel (free tier)
- **Total Monthly Cost**: $0-20 (within budget)

## Railway Deployment (Backend + Database)

### Initial Setup

1. **Create Railway account**: https://railway.app
2. **Install Railway CLI**:
```bash
npm i -g @railway/cli
railway login
```

3. **Link project**:
```bash
cd packages/backend
railway init
```

4. **Provision PostgreSQL**:
```bash
railway add postgresql
```

5. **Set environment variables**:
```bash
railway variables set FINNHUB_API_KEY=your_key
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set PORT=3001
railway variables set NODE_ENV=production
```

6. **Deploy**:
```bash
railway up
```

### Automatic Deployments

Configure GitHub integration:

1. Connect Railway to GitHub repo
2. Select `main` branch
3. Set root directory to `packages/backend`
4. Railway auto-deploys on push to `main`

### Database Migrations

Run migrations after deployment:

```bash
railway run pnpm db:migrate
```

### Monitoring

View logs:
```bash
railway logs
```

View metrics:
```bash
railway status
```

---

## Vercel Deployment (Frontend)

### Initial Setup

1. **Create Vercel account**: https://vercel.com
2. **Install Vercel CLI**:
```bash
npm i -g vercel
vercel login
```

3. **Deploy**:
```bash
cd packages/frontend
vercel
```

4. **Set environment variables** (Vercel dashboard):
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Automatic Deployments

Vercel automatically deploys:
- Production: `main` branch → `stockintelligence.app`
- Preview: Pull requests → `pr-123.vercel.app`

### Preview Deployments

Every PR gets a preview URL:
```
https://stock-analyzer-git-feature-branch.vercel.app
```

---

## Environment Variables

### Backend (Railway)

Required:
```bash
DATABASE_URL=postgresql://user:password@host:5432/stock_intelligence  # Auto-set by Railway
FINNHUB_API_KEY=your_finnhub_key
PORT=3001
NODE_ENV=production
```

Optional (Phase 4+):
```bash
ANTHROPIC_API_KEY=your_anthropic_key
```

### Frontend (Vercel)

Required:
```bash
NEXT_PUBLIC_API_URL=https://api.stockintelligence.app
```

---

## Database Backups

### Automated Backups (Railway)

Railway automatically backs up PostgreSQL daily. Restore from dashboard.

### Manual Backup

```bash
# Backup to local file
railway run pg_dump stock_intelligence > backup.sql

# Restore from backup
railway run psql stock_intelligence < backup.sql
```

### Backup Strategy

- Daily automated backups (Railway built-in)
- Weekly manual exports to S3 (Phase 2+)
- Retention: 30 days

---

## Scaling

### Current Limits

- 10-20 stocks
- ~1,000 req/day
- Single PostgreSQL instance
- Single Fastify instance

### Horizontal Scaling (Phase 3+)

**Backend**:
1. Enable Railway auto-scaling (2-5 instances)
2. Add load balancer (Railway handles this)
3. Ensure stateless API (no in-memory sessions)

**Database**:
1. Add read replicas for heavy queries
2. Enable connection pooling (PgBouncer)
3. Consider managed PostgreSQL (Railway Pro)

**Frontend**:
- Vercel automatically handles scaling
- Edge caching for static assets
- Incremental Static Regeneration for dynamic pages

---

## Monitoring

### Railway Metrics

- CPU usage
- Memory usage
- Request count
- Error rate

**Alerts**: Configure in Railway dashboard for:
- High CPU (>80%)
- High memory (>80%)
- Error rate spike (>5%)

### Application Monitoring

**Logs**:
```typescript
// packages/backend/src/server.ts
fastify.addHook('onRequest', (request, reply, done) => {
  console.log(`${request.method} ${request.url}`);
  done();
});

fastify.addHook('onError', (request, reply, error, done) => {
  console.error(`Error on ${request.url}:`, error);
  done();
});
```

**Health Check Endpoint**:
```typescript
fastify.get('/health', async (req, reply) => {
  const dbHealthy = await db.query('SELECT 1');
  return {
    status: 'ok',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
});
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size('stock_intelligence'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Security

### API Security

- CORS: Whitelist frontend domain only
- Rate limiting: 100 req/min per IP (Phase 4+)
- Input validation: Zod schemas for all endpoints
- SQL injection: Parameterized queries only

### Database Security

- SSL/TLS required for connections
- Principle of least privilege (app user != admin user)
- Secrets in environment variables (never commit)

### Secrets Management

**Never commit**:
- `.env` files
- API keys
- Database credentials

**Use**:
- Railway environment variables
- Vercel environment variables
- `.env.example` for templates

---

## Rollback Procedure

### Railway

```bash
# List deployments
railway deployments

# Rollback to previous
railway deployment rollback <deployment-id>
```

### Vercel

1. Go to Vercel dashboard
2. Select deployment
3. Click "Promote to Production"

### Database Rollback

```bash
# Restore from backup
railway run psql stock_intelligence < backup-2024-01-15.sql
```

---

## Disaster Recovery

### RTO/RPO Targets

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours (daily backups)

### Recovery Steps

1. **Database corruption**:
   - Restore from latest Railway backup
   - Re-run ingestion for current day

2. **Backend outage**:
   - Redeploy from last known good commit
   - Verify health check endpoint

3. **Frontend outage**:
   - Redeploy from Vercel dashboard
   - Check environment variables

4. **Complete outage**:
   - Restore database from backup
   - Redeploy backend and frontend
   - Verify end-to-end functionality

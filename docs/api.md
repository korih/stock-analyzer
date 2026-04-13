# API Documentation

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.stockintelligence.app` (Railway deployment)

## Authentication

Phase 1-3: No authentication required (public API)

Phase 4+: Optional authentication for premium features

## Endpoints

### Stock List

```http
GET /stocks
```

**Response**:
```json
[
  {
    "id": "uuid",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology"
  }
]
```

**Caching**: 1 hour

---

### Stock Details

```http
GET /stocks/:symbol
```

**Response**:
```json
{
  "id": "uuid",
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "sector": "Technology",
  "current_price": 150.25,
  "pct_change": 2.34
}
```

**Caching**: 1 hour

---

### Price Candles

```http
GET /stocks/:symbol/candles?range=1y
```

**Query Parameters**:
- `range`: `1d`, `1w`, `1m`, `3m`, `1y`, `5y` (default: `1y`)

**Response**:
```json
[
  {
    "date": "2024-01-15",
    "open": 148.50,
    "high": 151.20,
    "low": 147.80,
    "close": 150.25,
    "volume": 52348900,
    "sma_20": 149.32,
    "sma_50": 147.88,
    "rsi_14": 65.4
  }
]
```

**Caching**: 1 hour

---

### Technical Indicators

```http
GET /stocks/:symbol/indicators
```

**Response**:
```json
{
  "symbol": "AAPL",
  "indicators": {
    "sma_20": 149.32,
    "sma_50": 147.88,
    "sma_200": 142.15,
    "rsi_14": 65.4,
    "macd": 2.34
  }
}
```

**Caching**: 1 hour

---

### News

```http
GET /stocks/:symbol/news?limit=20
```

**Query Parameters**:
- `limit`: Number of articles (default: 20, max: 100)

**Response**:
```json
[
  {
    "id": 123,
    "title": "Apple Reports Strong Q4 Earnings",
    "url": "https://...",
    "source": "Bloomberg",
    "published_at": "2024-01-15T14:30:00Z",
    "sentiment_score": 0.7,
    "sentiment_method": "llm"
  }
]
```

**Caching**: 15 minutes

---

### Sentiment Aggregation

```http
GET /stocks/:symbol/sentiment
```

Returns 7-day sentiment aggregation.

**Response**:
```json
[
  {
    "date": "2024-01-15",
    "avg_sentiment": 0.65,
    "article_count": 12
  }
]
```

**Caching**: 1 hour

---

### SEC Filings

```http
GET /stocks/:symbol/filings?limit=20
```

**Response**:
```json
[
  {
    "id": 456,
    "filing_type": "8-K",
    "filed_at": "2024-01-15T16:00:00Z",
    "document_url": "https://sec.gov/...",
    "summary": "Material event disclosure...",
    "importance_score": 0.8
  }
]
```

**Caching**: 1 hour

---

### Insider Trades

```http
GET /stocks/:symbol/insider-trades?limit=50
```

**Response**:
```json
[
  {
    "id": 789,
    "insider_name": "Tim Cook",
    "insider_role": "CEO",
    "transaction_type": "SELL",
    "shares": 100000,
    "price": 150.25,
    "transaction_date": "2024-01-14",
    "filed_at": "2024-01-15T18:00:00Z"
  }
]
```

**Caching**: 1 hour

---

### Intelligence Summary (Phase 6)

```http
GET /stocks/:symbol/summary?date=2024-01-15
```

**Query Parameters**:
- `date`: Date for summary (default: today)

**Response**:
```json
{
  "symbol": "AAPL",
  "date": "2024-01-15",
  "summary": "Apple rose 2.3% today driven by strong earnings report...",
  "confidence": 0.85,
  "events": [
    {
      "type": "news",
      "timestamp": "2024-01-15T14:30:00Z",
      "title": "Apple Reports Strong Q4 Earnings",
      "sentiment": 0.7
    },
    {
      "type": "filing",
      "timestamp": "2024-01-15T16:00:00Z",
      "filing_type": "8-K",
      "summary": "Earnings disclosure"
    }
  ]
}
```

**Caching**: 15 minutes

---

## Caching Strategy

### HTTP Headers

All endpoints include:

```
Cache-Control: public, max-age=3600
ETag: "abc123"
```

**Implementation** (`packages/backend/src/middleware/cache.ts`):

```typescript
export function cacheMiddleware(ttl: number) {
  return async (req, reply) => {
    reply.header('Cache-Control', `public, max-age=${ttl}`);
    reply.header('ETag', generateETag(req.url));
  };
}

// Usage
fastify.get('/stocks/:symbol/candles',
  { preHandler: cacheMiddleware(3600) }, // 1 hour
  async (req, reply) => { ... }
);
```

### Cache TTLs

| Endpoint | TTL | Rationale |
|----------|-----|-----------|
| `/stocks` | 1 hour | Stock list rarely changes |
| `/candles` | 1 hour | Daily data, updated once per day |
| `/indicators` | 1 hour | Derived from candles |
| `/news` | 15 min | More dynamic, updates every 6 hours |
| `/sentiment` | 1 hour | Aggregated data |
| `/filings` | 1 hour | Filed once, never changes |
| `/summary` | 15 min | AI-generated, may update |

## Error Responses

### Standard Error Format

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Stock symbol 'XYZ' not found"
}
```

### Error Codes

- `400`: Bad request (invalid parameters)
- `404`: Resource not found (invalid symbol)
- `429`: Rate limit exceeded
- `500`: Internal server error

## Rate Limiting

Phase 1-3: No rate limiting

Phase 4+: 100 requests per minute per IP

## CORS

Development: Allow all origins

Production: Whitelist frontend domain

```typescript
fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://stockintelligence.app'
    : '*'
});
```

## Performance Targets

- Simple lookups (`/stocks`, `/stocks/:symbol`): <10ms
- Time-series queries (`/candles`, `/news`): <50ms
- Aggregations (`/sentiment`): <100ms
- AI-generated summaries (`/summary`): <200ms

Monitor with:

```typescript
fastify.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

fastify.addHook('onResponse', (request, reply, done) => {
  const duration = Date.now() - request.startTime;
  console.log(`${request.method} ${request.url} - ${duration}ms`);
  done();
});
```

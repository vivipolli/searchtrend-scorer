# Trendom Backend

[![Google Trends](https://img.shields.io/badge/Google-Trends-blue?logo=google&logoColor=white)](https://trends.google.com)
[![DOMA Protocol](https://img.shields.io/badge/DOMA-Protocol-purple?logo=ethereum&logoColor=white)](https://doma.xyz)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green?logo=openai&logoColor=white)](https://openai.com)
[![Blockchain](https://img.shields.io/badge/Blockchain-Web3-orange?logo=ethereum&logoColor=white)](https://ethereum.org)

**Trendom Backend** powers the SearchTrend Scorer API. It unifies Google Trends demand signals (via SerpApi + AI fallback) with DOMA Protocol on-chain activity to generate 0-100 domain valuations, real-time analytics, and AI investment briefings.

---

## 📦 Active Capabilities
- **Comparative Trend Scoring**: Weighted mix of search volume, momentum, on-chain activity percentiles, and rarity
- **DOMA Synchronization**: Poll API + GraphQL to ingest finalized events, acknowledge offsets, and backfill domain metadata
- **SQLite Data Warehouse**: Structured tables for events, domains, cached scores, LLM responses, and API usage
- **Scheduler & Automation**: `node-cron` task triggers polling, refreshes stale scores, tracks API quotas
- **LLM Investment Briefings**: GPT-4 analysis (JSON output, cached via SQLite) with structured risk/recommendation fields
- **Observability**: Structured logging, health endpoints, manual poll triggers, and debug utilities (test DOMA endpoint)
- **Production Ready**: Railway deployment (Procfile + `tsc-alias`), CORS controls, rate limiting, graceful shutdown

---

## 🏗 Architecture Overview

```
┌───────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Google Trends     │     │ DOMA Protocol    │     │ OpenAI LLM      │
│ (SerpApi + AI)    │───▶ │ Poll + GraphQL   │───▶ │ GPT-4 Analysis  │
└───────────────────┘     └──────────────────┘     └─────────────────┘
          │                         │                        │
          ▼                         ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Trendom Backend                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │ serpApiService │  │ domaService    │  │ pollingService │          │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘          │
│           │                   │                   │                  │
│  ┌────────▼────────┐  ┌───────▼────────┐   ┌──────▼────────┐         │
│  │ trendScorerSvc  │  │ database utils │   │ routes/controllers │     │
│  └────────┬────────┘  └────────────────┘   └───────────────┬┘         │
│           │                                          ┌──────▼──────┐  │
│           ▼                                          │ API Clients │  │
│   Trend Score Cache                                  └────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure (TypeScript / src)
```
config/               Environment bootstrap & required variable checks
controllers/          HTTP handlers for domains and events
middleware/           Validation, async wrapper, error handling
routes/               REST endpoints grouped by resource
services/
  domaService.ts      Poll API + GraphQL domain queries + extract helpers
  serpApiService.ts   Google Trends data + OpenAI fallback + usage quotas
  trendScorerService.ts  Core scoring pipeline, AI orchestration, caching
  pollingService.ts   node-cron scheduler for DOMA ingestion & stale scores
  llmAnalysisService.ts OpenAI client (JSON mode, timeouts, caching logic)
types/                Shared interfaces (Domain, TrendScore, ApiResponse, ...)
utils/
  database.ts         SQLite bootstrap, schema migrations, statistics helpers
  domainAnalysis.ts   Scoring math (rarity, liquidity, on-chain percentiles)
  logger.ts           Structured console logger (info/warn/error/debug)
index.ts              Express app (CORS, rate limit, routes, graceful shutdown)
```

---

## ⚙️ Tech Stack & Integrations
### Core
- **Node.js 18 + Express** with TypeScript strict mode (`tsc-alias` post-build)
- **SQLite (better-sqlite3)** with auto directory creation & schema migrations
- **node-cron** for background jobs, `express-rate-limit`, `helmet`, `compression`
- **Custom CORS middleware** allowing Vercel production + local development

### External Services
- **DOMA Protocol**: `/v1/poll`, `/v1/poll/ack/:id`, `graphql` endpoint
- **SerpApi**: Google Trends; when disabled or rate-limited falls back to OpenAI
- **OpenAI GPT-4**: JSON-formatted investment analysis, cached <6h per domain
- **Railway**: Production hosting (`Procfile`, `PORT`, persistent SQLite volume)

### Key Dependencies
`axios`, `dotenv`, `joi`, `winston-style logger`, `sqlite3`, `ts-node`, `nodemon`

---

## 🚀 Getting Started
### Install & Configure
```bash
cd backend
yarn install
cp .env.example .env
yarn dev            # http://localhost:3001
yarn build && yarn start
```

`.env` highlights (see full example):
```
DOMA_API_BASE=https://api-testnet.doma.xyz
DOMA_API_KEY=***
DATABASE_PATH=./data/searchtrend.db
SERPAPI_ENABLED=false
SERPAPI_USE_MOCK=true
OPENAI_ENABLED=true
OPENAI_API_KEY=***
```

Ensure Railway/Vercel secrets mirror these settings (especially DOMA/OpenAI keys).

---

## 🔄 Data Flow Summary
1. **Polling** (`pollingService` @ cron interval)
   - Calls `domaService.pollEvents`
   - Deduplicates & persists events (`database.insertEvent`)
   - Triggers `trendScorerService.updateTrendScore` for affected domains
   - Acknowledges processed IDs back to DOMA (`ack/:lastId`)

2. **Trend Scoring** (`trendScorerService.calculateTrendScore`)
   - Fetches search metrics (SerpApi or AI fallback) + DOMA/DB activity
   - Builds comparative on-chain score using `database.getDomainActivityStats`
   - Persists score snapshot (`trend_scores` table)
   - Kicks off async LLM analysis (cached if <6h old)

3. **API Responses**
   - Controllers assemble trend score + cached AI + on-chain snapshot
   - Paginated, typed responses under `/api/v1/domains/*` and `/api/v1/events/*`

4. **LLM Insights** (`llmAnalysisService`)
   - GPT-4 JSON output enforced via `response_format`
   - Stored in `ai_insights` with createdAt for TTL logic

5. **Operational Instrumentation**
   - `/health` and `/api/v1/events/health` check DOMA + DB readiness
   - `/api/v1/domains/test-doma/:domain` debug endpoint exercises GraphQL path

---

## 📚 API Highlights
```
GET  /health                                   # service heartbeat
GET  /api                                      # API descriptor

POST /api/v1/domains/score                    # calculate & cache trend score
GET  /api/v1/domains/:domainName/score        # score + AI + on-chain snapshot
GET  /api/v1/domains/:domainName/ai-analysis  # cached LLM briefing
GET  /api/v1/domains/trending/top?limit=20    # leaderboard
GET  /api/v1/domains/test-doma/:domain        # verify DOMA GraphQL connectivity

POST /api/v1/events/poll?limit=25             # manual poll
GET  /api/v1/events/recent?limit=50
GET  /api/v1/events/domain/:domainName
GET  /api/v1/events/stats
GET  /api/v1/events/health
```
_All responses share `{ success, data?, error?, timestamp }` envelope with pagination where applicable._

---

## 📊 Trend Score Breakdown (0-100)
- **Search Volume (25%)**: Normalized Google Trends demand + keyword heuristics
- **Trend Direction (35%)**: Momentum derived from SerpApi timeline or fallback heuristics
- **On-chain Activity (25%)**: Percentile-based scoring using DOMA/DB statistics, liquidity adjustments, DOMA fetch when local data absent
- **Rarity (15%)**: Name length, TLD rarity, brandability, dictionary matches
- **Confidence**: Based on data density, recency, and on-chain activity breadth

SQLite tables: `events`, `domains`, `trend_scores`, `ai_insights`, `api_usage` with indexes for polling performance.

---

## 🛠 Development & Testing
```bash
yarn lint           # ESLint
yarn format         # Prettier
yarn test           # Jest (when specs exist)
```
- **Manual Poll**: `POST /api/v1/events/poll`
- **Trigger score refresh**: run polling service or call `/score`
- **Database Inspect**: sqlite browser on `data/searchtrend.db`

### Adding Features Checklist
1. Define types in `src/types`
2. Implement logic in `src/services`
3. Expose via controller + route + validation schema
4. Add logging + error handling
5. Update README / docs if behavior changes

---

## 🧾 Deployment Notes
- **Build**: `yarn build` → `dist/` with `tsc-alias`
- **Start**: `node dist/index.js` (Procfile: `web: yarn install && yarn build && yarn start`)
- **Graceful Shutdown**: SIGINT/SIGTERM stop polling & exit cleanly
- **Persistent Storage**: Ensure Railway volume mounted for `/data`

Environment checklist (production):
```
DOMA_API_BASE
DOMA_API_KEY
OPENAI_API_KEY (if LLM enabled)
SERPAPI_API_KEY (optional)
DATABASE_PATH=/app/data/searchtrend.db
PORT=3001
NODE_ENV=production
```

---

## 📎 Support & Troubleshooting
- **DOMA Connectivity**: Use `/api/v1/domains/test-doma/:domain`
- **CORS Issues**: Verify allowed origins in `src/index.ts`
- **On-chain Score Zero**: Check DOMA GraphQL response + local events table
- **LLM Disabled**: ensure `OPENAI_ENABLED=true` and key present
- **SerpApi Limit**: monitor `api_usage` table; fallback will auto-trigger

For issues, open a ticket or inspect logs (`logs/combined.log`, Railway console).

---

Built for the DOMA Hackathon — bridging Web2 demand with Web3 domain liquidity.

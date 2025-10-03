# Doma TrendScore — Trait Scoring & Analytics (Track 4)

A pragmatic, AI-assisted scoring engine that blends on-chain DOMA events with off-chain search-trend signals to rank domain opportunities and surface rarity-driven insights.

## Why this matters (Track 4 fit)
- **Innovation (40%)**: Unified scoring that fuses Web2 demand (Google Trends via SerpApi/mock) with Web3 activity (DOMA Poll API), plus optional LLM insights cached for repeatability.
- **Doma Integration & Onchain Impact (30%)**: Ingests DOMA events, persists them locally, and derives on-chain activity and liquidity signals; exposes programmatic APIs for downstream DeFi integrations.
- **Usability (20%)**: Simple web UI to calculate a domain’s TrendScore, view breakdown and highlights, and browse trending names.
- **Demo Quality (10%)**: Live-feel polling, cached AI analyses, and clean API endpoints for reproducibility.

## What’s included
- **Scoring engine**: Weighted score (0–100) combining search volume, trend direction, on-chain activity, and rarity.
- **On-chain ingestion**: Polls DOMA events and updates local scores incrementally.
- **Trend signals**: SerpApi Google Trends (with mock fallback) for volume, trajectory, geo distribution, and related queries.
- **LLM analysis (optional)**: Structured JSON insights that summarize opportunity, risks, and actions.
- **API + UI**: REST endpoints and a lightweight React UI for scoring and trending.

## Strengths
- **Well-structured services**: `pollingService`, `trendScorerService`, `serpApiService`, `llmAnalysisService` with clear separation and fail-safe fallbacks.
- **Resilient by design**: Works without external keys (mock trend data, optional LLM), ensuring demo reliability.
- **Deterministic AI layer**: AI insights are cached and versioned by inputs, increasing consistency across runs.
- **Composable for DeFi**: Clean endpoints and DB state enable downstream pricing, auctions and recommendation bots.

## What to improve next
- **Deeper DOMA graph usage**: Enrich `domaService.getDomainByName` with live GraphQL/tokens/owners to tighten rarity and activity signals.
- **Rarity modeling**: Add pattern dictionaries (LLD/number/emoji combos), TLD supply curves, and sales comps for finer rarity weights.
- **Market microstructure**: Incorporate time-decay on events, bid/ask spread proxies, and slippage to refine liquidity.
- **Ground LLM with retrieval**: Inject concrete sales comps and on-chain features into prompts; add guardrails and evaluation.
- **Benchmarking**: Create an evaluation harness comparing our TrendScore vs web2 baselines across a labeled set.

## Can it scale?
- **Data plane**: Batch polling with idempotent inserts; compute is O(n) over new events only; safe to shard by TLD.
- **Caching**: In-memory and DB caches for trend metrics and AI outputs reduce cost/latency; add Redis for horizontal scale.
- **APIs**: Stateless REST; can front with a queue for heavy rescoring; LLM calls are async and non-blocking.
- **Extensibility**: New signals (DEX txs, auctions, price oracles) fit into the weighted scheme without breaking the UI.

## Quickstart

### Backend
1. Create `/backend/.env` with at least:
```
PORT=3001
DOMA_API_BASE=<doma_base_url>
DOMA_API_KEY=<doma_api_key>
DATABASE_PATH=./data/searchtrend.db
SERPAPI_ENABLED=false
SERPAPI_USE_MOCK=true
OPENAI_ENABLED=false
```
2. Install and run:
```
cd backend
yarn
yarn build && yarn start
# or for dev: yarn dev
```

Key endpoints (prefixed with `/api/v1`):
- `POST /domains/score` { domainName, forceUpdate? }
- `GET /domains/:domainName/score`
- `GET /domains/:domainName/ai-analysis`
- `GET /domains/trending/top?limit=100`
- `POST /events/poll` (manual)
- `GET /events/health`

### Frontend
1. Configure `VITE_BACKEND_URL` if needed (defaults to `http://localhost:3001`).
2. Install and run:
```
cd frontend
yarn
yarn dev
```

## Architecture Overview
- `backend/src/services/pollingService.ts`: Polls DOMA, stores events, triggers rescoring.
- `backend/src/services/trendScorerService.ts`: Core scoring, persistence, async AI.
- `backend/src/services/serpApiService.ts`: Trends with caching and daily-limit tracking.
- `backend/src/utils/domainAnalysis.ts`: Rarity, liquidity, normalization and weighting.
- `frontend/src`: UI to score and browse trending domains.

## Notes for judges
- Runs fine in mock mode; enable real keys for full fidelity.
- Designed for productionization: swap SQLite for Postgres, add Redis, and scale workers.
- Clean seam-lines for auction strategies, alerting bots, and DeFi valuation tooling.

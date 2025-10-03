# Trendom — AI-Powered Domain Valuation

**Trendom** is an AI-assisted scoring engine that unifies Google Trends search data with DOMA Protocol blockchain activity to generate comprehensive domain valuations with actionable insights.

## 🎯 What We Solve
DomainFi lacks reliable valuation signals. Current domain scoring relies on outdated Web2 metrics or fragmented on-chain data. **Trendom** combines real search demand with blockchain activity to provide accurate, actionable domain valuations.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Google Trends │    │   DOMA Protocol  │    │   AI Analysis   │
│   (SerpApi)     │───▶│   (Poll API)     │───▶│   (OpenAI)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Trendom Engine                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │Search Volume│ │Trend Direction│ │On-chain Act.│ │  Rarity  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   DeFi Integration  │
                    │ • Pricing APIs     │
                    │ • Auction Bots     │
                    │ • Market Making    │
                    └─────────────────────┘
```

## 🛠️ Technologies

### Backend
- **Node.js + TypeScript**: Type-safe, scalable API
- **SQLite**: Local database for events and scores
- **DOMA Integration**: Poll API + GraphQL for blockchain data
- **SerpApi**: Google Trends integration
- **OpenAI**: AI insights generation

### Frontend
- **React + TypeScript**: Modern, responsive UI
- **Tailwind CSS**: Clean, professional design
- **Vite**: Fast development and build

## 🚀 Quick Start

### Backend Setup
1. **Install dependencies:**
```bash
cd backend
yarn install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Run backend:**
```bash
yarn dev    # Development
yarn build && yarn start  # Production
```

### Frontend Setup
1. **Install dependencies:**
```bash
cd frontend
yarn install
```

2. **Run frontend:**
```bash
yarn dev    # Development
yarn build  # Production
```

## 🧪 Testing Locally

### 1. Start Backend
```bash
cd backend
yarn dev
# Backend runs on http://localhost:3001
```

### 2. Start Frontend
```bash
cd frontend
yarn dev
# Frontend runs on http://localhost:5173
```

### 3. Test Domain Scoring
- Open http://localhost:5173
- Enter a domain (e.g., "crypto.eth")
- Click "Analyze" to see the score breakdown
- View AI insights and recommendations
### Demo

![Demo screenshot](./public/demo.png)


### 4. API Endpoints
- `GET /health` - Health check
- `POST /api/v1/domains/score` - Score a domain
- `GET /api/v1/domains/trending/top` - Trending domains
- `GET /api/v1/domains/:domainName/ai-analysis` - AI insights

## 🔮 Future Implementations

### Phase 2: Enhanced Data
- **Richer DOMA GraphQL**: More detailed blockchain metadata
- **Advanced Rarity Modeling**: Pattern-based rarity scoring
- **Time-decay Algorithms**: Event freshness weighting

### Phase 3: Social Sentiment
- **Twitter Integration**: Real-time sentiment analysis
- **Telegram Trends**: Community sentiment tracking
- **Reddit Analysis**: Subreddit sentiment scoring
- **Discord Activity**: Community engagement metrics

### Phase 4: Production Scale
- **Postgres Migration**: Production database
- **Redis Caching**: Performance optimization
- **Worker Scaling**: Horizontal scaling
- **DeFi Integration**: Auction bots, market making APIs

## 📊 Key Features

- **Unified Scoring (0-100)**: Combines search volume, trend direction, on-chain activity, and rarity
- **Real-time Updates**: Polls DOMA events and updates scores incrementally
- **AI Insights**: Cached LLM analysis providing strategic context and recommendations
- **DeFi Ready**: Clean APIs for pricing, auctions, and recommendation bots

---

*Built for the future of DomainFi. Powered by AI. Integrated with DOMA.*

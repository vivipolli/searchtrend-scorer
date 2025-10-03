# Trendom

## 🎯 The Problem
DomainFi lacks reliable, real-time valuation signals. Current domain scoring relies on outdated web2 metrics or fragmented on-chain data, creating blind spots for traders, market makers, and DeFi protocols.

## 💡 Our Solution
**Trendom** is an AI-assisted scoring engine that unifies Web2 demand signals (Google Trends) with Web3 activity (DOMA Protocol events) to generate actionable domain valuations.

### Key Features
- **Unified Scoring (0-100)**: Combines search volume, trend direction, on-chain activity, and rarity
- **Real-time Updates**: Polls DOMA events and updates scores incrementally
- **AI Insights**: Cached LLM analysis providing strategic context and recommendations
- **DeFi Ready**: Clean APIs for pricing, auctions, and recommendation bots

### Technical Architecture
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

## 🔍 How Search Volume Drives Domain Value

### Core Logic: "More Searches = Higher Value"
Our system implements a fundamental principle: **domains with higher Google search frequency are more valuable** because they represent real user intent and demand.

#### Search Volume Analysis Pipeline:
```
1. Extract Domain Keyword
   "crypto.eth" → "crypto"
   "nft.dao" → "nft"

2. Query Google Trends API
   - Volume: How many people search "crypto" monthly
   - Trend: Is "crypto" growing or declining?
   - Geography: Where is the demand coming from?
   - Related Queries: What else are people searching?

3. Calculate Search Score (0-100)
   - High volume + Growing trend = High score (80-100)
   - Medium volume + Stable trend = Medium score (40-70)
   - Low volume + Declining trend = Low score (0-40)

4. Weight in Final Score
   - Trend Direction: 35% of total score (MOST IMPORTANT)
   - Search Volume: 25% of total score
   - On-chain Activity: 25% of total score
   - Rarity: 15% of total score
```

#### Real Examples:
- **"ai.eth"**: 500K searches + 40% growth → Trend Score: 88/100 (HIGH)
- **"crypto.eth"**: 1M+ searches + 5% growth → Trend Score: 75/100 (MEDIUM)
- **"nft.eth"**: 800K searches + -30% decline → Trend Score: 45/100 (LOW)
- **"xyz123.eth"**: 100 searches + 0% change → Trend Score: 25/100 (LOW)

### Why This Works:
1. **Trend Momentum**: Growing trends = future value (most important)
2. **User Intent**: High search volume = real demand (secondary)
3. **Market Validation**: Google Trends reflects actual interest
4. **Predictive Power**: Search trends often precede price movements
5. **Global Scale**: Captures worldwide demand patterns

### AI Integration:
Our LLM analysis explicitly references trend metrics:
- "Trend Direction: 88.5/100 indicating strong uptrend"
- "Search Volume: 75.2/100 based on Google Trends"
- "Trend Strength: 68.4% momentum vs prior period"
- "Geographic diversity across 12 regions"

This creates a transparent connection between trend data and domain valuation, prioritizing momentum over static volume.

## 🎯 Impact & Use Cases

### For Traders
- **Discovery**: Find undervalued domains before they trend
- **Timing**: Identify optimal entry/exit points
- **Risk Assessment**: AI-powered insights on opportunity vs risk

### For Market Makers
- **Liquidity Management**: Real-time liquidity scoring
- **Spread Optimization**: Data-driven bid/ask pricing
- **Inventory Rotation**: Prioritize domains based on trend signals

### For DeFi Protocols
- **Collateral Valuation**: Accurate domain pricing for lending
- **Auction Strategies**: Optimal reserve pricing
- **Portfolio Management**: DAO treasury optimization

## 🛠️ Technical Implementation

### Backend Stack
- **Node.js + TypeScript**: Type-safe, scalable API
- **SQLite → Postgres**: Production-ready database
- **DOMA Integration**: Poll API + GraphQL for rich metadata
- **AI Pipeline**: OpenAI integration with intelligent caching

### Frontend Stack
- **React + TypeScript**: Modern, responsive UI
- **Tailwind CSS**: Clean, professional design
- **Real-time Updates**: Live trending dashboard

### Key Services
- `pollingService`: DOMA event ingestion
- `trendScorerService`: Core scoring algorithm
- `serpApiService`: Google Trends integration
- `llmAnalysisService`: AI insights generation

## 📊 Demo & Metrics

### Live Demo Features
- **Domain Scoring**: Enter any domain for instant analysis
- **Trending Dashboard**: Top-performing domains
- **AI Insights**: Strategic recommendations and risk factors
- **On-chain Data**: Owner, token ID, mint date, activity

### Sample Output
```json
{
  "domainName": "crypto.eth",
  "score": 87.3,
  "breakdown": {
    "searchVolume": 92.1,
    "trendDirection": 85.7,
    "onChainActivity": 78.9,
    "rarity": 91.2
  },
  "aiAnalysis": {
    "summary": "High-potential domain with strong crypto branding",
    "sentiment": "positive",
    "recommendations": ["Monitor for price dips", "Consider long-term hold"]
  }
}
```

## 🚀 Roadmap & Scalability

### Phase 1: MVP (Current)
- ✅ Core scoring engine
- ✅ DOMA integration
- ✅ React UI
- ✅ AI analysis

### Phase 2: Enhancement
- 🔄 Richer DOMA GraphQL data
- 🔄 Advanced rarity modeling
- 🔄 Time-decay algorithms
- 🔄 Sales comps integration

### Phase 3: Production
- 📋 Postgres migration
- 📋 Redis caching
- 📋 Worker scaling
- 📋 Performance optimization

### Phase 4: DeFi Ecosystem
- 📋 Auction bots
- 📋 Market making APIs
- 📋 DAO dashboards
- 📋 Cross-chain support

## 💰 Business Model

### Revenue Streams
1. **API Access**: Tiered pricing for scoring endpoints
2. **Premium Analytics**: Advanced AI insights and alerts
3. **White-label Solutions**: Custom scoring for protocols
4. **Data Licensing**: Anonymized trend data for research

### Market Opportunity
- **DomainFi Market**: $2B+ in domain transactions
- **DeFi Integration**: Growing need for RWA pricing
- **Trading Tools**: Professional-grade analytics gap


---

*Built for the future of DomainFi. Powered by AI. Integrated with DOMA.*

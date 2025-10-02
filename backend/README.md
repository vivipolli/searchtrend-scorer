# SearchTrend Scorer Backend

AI-driven analytics for domain valuation using DOMA Protocol.

## Overview

SearchTrend Scorer is a backend service that combines on-chain domain data from DOMA Protocol with web2 search analytics to generate comprehensive trend scores for domain names. This helps traders and investors make more informed decisions based on real market demand signals.

## Features

- **Real-time Event Monitoring**: Polls DOMA Protocol events in real-time
- **Trend Score Calculation**: Combines search volume, trend direction, on-chain activity, and rarity
- **Domain Analytics**: Comprehensive domain information and statistics
- **RESTful API**: Clean, well-documented API endpoints
- **TypeScript**: Full type safety and modern development experience
- **Database Integration**: SQLite for local data storage
- **Rate Limiting**: Built-in protection against abuse
- **Logging**: Comprehensive logging with Winston
- **Health Monitoring**: Health check endpoints and monitoring

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **Logging**: Winston
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet, CORS
- **Scheduling**: node-cron

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# DOMA API Configuration
DOMA_API_BASE=https://api-testnet.doma.xyz
DOMA_API_KEY=your-doma-api-key-here

# Database Configuration
DATABASE_PATH=./data/searchtrend.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Polling Configuration
POLL_INTERVAL_SECONDS=30
MAX_EVENTS_PER_POLL=50

# Scoring Configuration
SCORE_UPDATE_INTERVAL_HOURS=6
TREND_ANALYSIS_DAYS=30
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## API Endpoints

### Base URL
```
http://localhost:3001
```

### Health Check
```
GET /health
```

### API Information
```
GET /api
```

### Domains

#### Score a Domain
```http
POST /api/v1/domains/score
Content-Type: application/json

{
  "domainName": "example.eth",
  "forceUpdate": false
}
```

#### Get Domain Score
```http
GET /api/v1/domains/example.eth/score
```

#### Get Domain Details
```http
GET /api/v1/domains/example.eth
```

#### Get Top Trending Domains
```http
GET /api/v1/domains/trending/top?limit=100
```

#### Search Domains
```http
GET /api/v1/domains/search?query=crypto&limit=20
```

#### Get All Domains
```http
GET /api/v1/domains?page=1&limit=20&sortBy=score&sortOrder=desc
```

#### Get Domain Statistics
```http
GET /api/v1/domains/stats/overview
```

### Events

#### Poll Events
```http
POST /api/v1/events/poll?limit=25&finalizedOnly=true
```

#### Get Recent Events
```http
GET /api/v1/events/recent?limit=50
```

#### Get Events by Domain
```http
GET /api/v1/events/domain/example.eth?limit=100
```

#### Get Event Statistics
```http
GET /api/v1/events/stats
```

#### Health Check
```http
GET /api/v1/events/health
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Trend Score Calculation

The trend score combines multiple factors:

1. **Search Volume (30%)**: Estimated search volume based on domain characteristics
2. **Trend Direction (25%)**: Growth or decline trend over time
3. **On-Chain Activity (25%)**: Transaction count, liquidity, and price history
4. **Rarity (20%)**: Domain length, TLD rarity, and uniqueness

### Score Breakdown

```json
{
  "domainName": "example.eth",
  "score": 85.5,
  "breakdown": {
    "searchVolume": 75.0,
    "trendDirection": 90.0,
    "onChainActivity": 80.0,
    "rarity": 95.0
  },
  "metadata": {
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "dataPoints": 15,
    "confidence": 0.85
  }
}
```

## Database Schema

### Events Table
- `id`: Primary key
- `unique_id`: Unique event identifier
- `event_type`: Type of DOMA event
- `domain_name`: Domain name
- `price`: Transaction price (if applicable)
- `tx_hash`: Transaction hash
- `network_id`: Network identifier
- `created_at`: Event timestamp

### Trend Scores Table
- `id`: Primary key
- `domain_name`: Domain name (unique)
- `score`: Calculated trend score
- `search_volume`: Search volume component
- `trend_direction`: Trend direction component
- `on_chain_activity`: On-chain activity component
- `rarity`: Rarity component
- `last_updated`: Last update timestamp
- `data_points`: Number of data points used
- `confidence`: Confidence score

### Domains Table
- `id`: Primary key
- `name`: Domain name (unique)
- `token_id`: DOMA token ID
- `owner`: Domain owner address
- `claim_status`: Claim status
- `network_id`: Network identifier
- `token_address`: Token contract address
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Monitoring

### Health Checks

The service provides health check endpoints to monitor:

- DOMA API connectivity
- Database health
- Service uptime
- Overall system status

### Logging

Comprehensive logging includes:

- Request/response logging
- Error tracking
- Performance metrics
- Event processing logs

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

## Development

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Adding New Features

1. **Types**: Define TypeScript interfaces in `src/types/`
2. **Services**: Implement business logic in `src/services/`
3. **Controllers**: Create request handlers in `src/controllers/`
4. **Routes**: Define API routes in `src/routes/`
5. **Middleware**: Add validation and error handling in `src/middleware/`

### Testing

```bash
npm test
```

### Code Quality

```bash
npm run lint
npm run format
```

## Deployment

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables

Ensure all required environment variables are set in production:

- `DOMA_API_KEY`: Your DOMA API key
- `NODE_ENV`: Set to `production`
- `DATABASE_PATH`: Path to SQLite database file
- `PORT`: Server port (default: 3001)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and formatting
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- Create an issue in the repository
- Check the API documentation
- Review the logs for debugging information

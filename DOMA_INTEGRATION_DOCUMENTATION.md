# DOMA Protocol Integration Guide

## Overview

This document provides a comprehensive guide for integrating with the DOMA Protocol, including API configurations, client setup, and basic integration patterns for domain monitoring and event processing.

## Table of Contents

1. [API Configuration](#api-configuration)
2. [Client Setup](#client-setup)
3. [Basic Integration](#basic-integration)
4. [API Endpoints](#api-endpoints)
5. [Event Processing](#event-processing)
6. [Environment Configuration](#environment-configuration)

## API Configuration

### Base URLs and Endpoints

**Testnet Configuration:**
- Base URL: `https://api-testnet.doma.xyz`
- Poll API: `/v1/poll`
- GraphQL: `/graphql`

**Mainnet Configuration:**
- Base URL: `https://api.doma.xyz` (coming soon)
- GraphQL: `/graphql` (coming soon)

### API Key Configuration

```javascript
const baseUrl = process.env.DOMA_API_BASE || 'https://api-testnet.doma.xyz';
const apiKey = process.env.DOMA_API_KEY || '';
```

**Required Headers:**
```javascript
const headers = apiKey ? { 'Api-Key': apiKey } : {};
```

## Client Setup

### Basic Client Configuration

**Initialize DOMA Client:**
```javascript
import axios from 'axios';

const domaClient = {
  baseUrl: process.env.DOMA_API_BASE || 'https://api-testnet.doma.xyz',
  apiKey: process.env.DOMA_API_KEY || '',
  
  getHeaders() {
    return this.apiKey ? { 'Api-Key': this.apiKey } : {};
  }
};
```

### Event Polling Client

**Basic Polling Implementation:**
```javascript
async function pollDomaEvents(limit = 25, finalizedOnly = true) {
  const url = `${domaClient.baseUrl}/v1/poll`;
  const headers = domaClient.getHeaders();
  const params = { limit, finalizedOnly };
  
  try {
    const response = await axios.get(url, { headers, params });
    return response.data;
  } catch (error) {
    console.error('Error polling DOMA events:', error);
    throw error;
  }
}
```

### Event Processing

**Event Types:**
- `NAME_TOKEN_MINTED` - New domain tokenized
- `NAME_TOKEN_TRANSFERRED` - Domain ownership transfer
- `NAME_RENEWED` - Domain renewal
- `NAME_UPDATED` - Domain metadata update
- `NAME_DETOKENIZED` - Domain detokenized

**Event Data Structure:**
```javascript
{
  id: 64,
  type: 'NAME_TOKEN_MINTED',
  name: 'example.shib',
  eventData: {
    txHash: '0x...',
    tokenAddress: '0x...',
    tokenId: '123',
    networkId: 'eip155:84532',
    payment: {
      price: '1000000000000000000' // 1 ETH in wei
    }
  },
  uniqueId: 'unique-event-id'
}
```

## Basic Integration

### Event Monitoring

**Continuous Polling:**
```javascript
const pollInterval = 15000; // 15 seconds

setInterval(async () => {
  try {
    const result = await pollDomaEvents();
    if (result.events && result.events.length > 0) {
      console.log(`Fetched ${result.events.length} events`);
      processEvents(result.events);
    }
    
    // Acknowledge processed events
    if (result.lastId) {
      await acknowledgeEvents(result.lastId);
    }
  } catch (error) {
    console.error('Polling error:', error);
  }
}, pollInterval);
```

**Event Acknowledgment:**
```javascript
async function acknowledgeEvents(lastId) {
  const ackUrl = `${domaClient.baseUrl}/v1/poll/ack/${lastId}`;
  const headers = domaClient.getHeaders();
  
  try {
    await axios.post(ackUrl, null, { headers });
  } catch (error) {
    console.error('Acknowledgment failed:', error);
  }
}
```

### Data Processing

**Event Filtering:**
```javascript
function processEvents(events) {
  events.forEach(event => {
    // Extract relevant data
    const eventData = {
      type: event.type,
      name: event.name,
      price: extractPrice(event.eventData?.payment),
      txHash: event.eventData?.txHash,
      networkId: event.eventData?.networkId
    };
    
    // Apply your business logic
    handleEvent(eventData);
  });
}

function extractPrice(payment) {
  if (payment && typeof payment.price === 'string') {
    const parsed = Number(payment.price);
    return !Number.isNaN(parsed) ? parsed : null;
  }
  return null;
}
```

### Data Storage

**Basic Event Storage:**
```javascript
// Simple in-memory storage for events
const eventStorage = {
  events: [],
  processedIds: new Set(),
  
  addEvent(event) {
    this.events.push({
      ...event,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });
  },
  
  isProcessed(uniqueId) {
    return this.processedIds.has(uniqueId);
  },
  
  markProcessed(uniqueId) {
    this.processedIds.add(uniqueId);
  }
};
```

**Database Integration (Optional):**
```javascript
// Example with SQLite
import Database from 'better-sqlite3';

const db = new Database('doma_events.db');

// Create events table
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_id TEXT UNIQUE,
    event_type TEXT NOT NULL,
    name TEXT,
    price REAL,
    tx_hash TEXT,
    network_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Store event
function storeEvent(event) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events 
    (unique_id, event_type, name, price, tx_hash, network_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    event.uniqueId,
    event.type,
    event.name,
    event.price,
    event.txHash,
    event.networkId
  );
}
```

## API Endpoints

### Poll API

**Fetch Events:**
```javascript
GET /v1/poll
Headers: { 'Api-Key': 'your-api-key' }
Parameters: { limit: 25, finalizedOnly: true }
```

**Acknowledge Events:**
```javascript
POST /v1/poll/ack/{lastId}
Headers: { 'Api-Key': 'your-api-key' }
```

### GraphQL API

**Endpoint:** `https://api-testnet.doma.xyz/graphql`

**Query Domain Information:**
```graphql
query GetNames($skip: Int, $take: Int) {
  names(skip: $skip, take: $take) {
    data {
      id
      name
      tokenId
      owner
      claimStatus
    }
    total
  }
}
```

**Query with Filters:**
```graphql
query GetFilteredNames($ownedBy: [String!], $tlds: [String!]) {
  names(ownedBy: $ownedBy, tlds: $tlds) {
    data {
      name
      owner
      claimStatus
    }
  }
}
```


## Event Processing

### Event Filtering

**Basic Filtering:**
```javascript
function filterEvents(events, filters) {
  return events.filter(event => {
    // Event type filter
    if (filters.eventType && event.type !== filters.eventType) {
      return false;
    }
    
    // Price filter
    if (filters.priceRange) {
      const price = extractPrice(event.eventData?.payment);
      if (price && !isInPriceRange(price, filters.priceRange)) {
        return false;
      }
    }
    
    // Domain name filter
    if (filters.domainPattern) {
      const regex = new RegExp(filters.domainPattern, 'i');
      if (!regex.test(event.name)) {
        return false;
      }
    }
    
    return true;
  });
}

function isInPriceRange(price, range) {
  if (range.min && price < range.min) return false;
  if (range.max && price > range.max) return false;
  return true;
}
```

### Event Handlers

**Custom Event Processing:**
```javascript
const eventHandlers = {
  NAME_TOKEN_MINTED: (event) => {
    console.log(`New domain tokenized: ${event.name}`);
    // Handle new domain logic
  },
  
  NAME_TOKEN_TRANSFERRED: (event) => {
    console.log(`Domain transferred: ${event.name}`);
    // Handle transfer logic
  },
  
  NAME_RENEWED: (event) => {
    console.log(`Domain renewed: ${event.name}`);
    // Handle renewal logic
  }
};

function handleEvent(event) {
  const handler = eventHandlers[event.type];
  if (handler) {
    handler(event);
  } else {
    console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### Deduplication

**Prevent Duplicate Processing:**
```javascript
function processEventsWithDeduplication(events) {
  events.forEach(event => {
    if (eventStorage.isProcessed(event.uniqueId)) {
      return; // Skip already processed events
    }
    
    // Process the event
    handleEvent(event);
    
    // Mark as processed
    eventStorage.markProcessed(event.uniqueId);
    eventStorage.addEvent(event);
  });
}
```

### Error Handling

**Robust Error Management:**
```javascript
async function pollWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pollDomaEvents();
      return result;
    } catch (error) {
      console.error(`Polling attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to poll after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Rate Limiting:**
```javascript
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
```

## Environment Configuration

### Required Environment Variables

```bash
# DOMA API Configuration
DOMA_API_BASE=https://api-testnet.doma.xyz
DOMA_API_KEY=your-api-key-here

# Polling Configuration
POLL_INTERVAL_SECONDS=15
```

### Optional Environment Variables

```bash
# Debug Mode
DEBUG_POLLER=1

# Custom Configuration
MAX_RETRIES=3
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60000
```

## Error Handling

### Common Error Scenarios

1. **API Key Issues:**
   - Missing or invalid API key
   - Insufficient permissions

2. **Network Issues:**
   - Connection timeouts
   - Rate limiting

3. **Data Processing Issues:**
   - Invalid event format
   - Missing required fields

### Error Logging

```javascript
function logError(context, error) {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}
```

## Best Practices

### Security

1. **API Keys:** Store in environment variables, never in code
2. **Validation:** Validate all API responses and user inputs
3. **Rate Limiting:** Implement proper rate limiting to avoid API abuse

### Performance

1. **Polling:** Use appropriate polling intervals to avoid rate limits
2. **Deduplication:** Always check for duplicate events
3. **Error Handling:** Implement proper retry mechanisms with exponential backoff

### Monitoring

1. **Logging:** Log all important operations and errors
2. **Metrics:** Track success/failure rates for API calls
3. **Health Checks:** Monitor API health and connectivity

## Troubleshooting

### Common Issues

1. **Events Not Appearing:**
   - Check API key validity
   - Verify polling is running
   - Check network connectivity

2. **API Errors:**
   - Verify API endpoint URLs
   - Check request headers and parameters
   - Monitor rate limiting

### Debug Mode

Enable debug mode for detailed logging:
```bash
DEBUG_POLLER=1
```

This will log detailed information about:
- API responses
- Event processing
- Error details



import axios from 'axios';
import dotenv from 'dotenv';
import database from '../db.js';
import { getUserConnectedWallet } from './walletConnectService.js';
import { signOrder, checkUserBalance } from './signatureService.js';
// Import dinâmico para evitar problemas de resolução
let createDomaOrderbookClient, OrderbookType;

dotenv.config({ path: './config/.env' });

const baseUrl = process.env.DOMA_API_BASE || 'https://api-testnet.doma.xyz';
const apiKey = process.env.DOMA_API_KEY || '';

// Initialize Doma Orderbook SDK client
let domaClient;

async function initializeSDK() {
  try {
    const sdk = await import('@doma-protocol/orderbook-sdk');
    createDomaOrderbookClient = sdk.createDomaOrderbookClient;
    OrderbookType = sdk.OrderbookType;
    
    domaClient = createDomaOrderbookClient({
      apiClientOptions: {
        baseUrl: baseUrl,
        apiKey: apiKey
      }
    });
    
    console.log('[AUTO_BUY] SDK initialized successfully');
  } catch (error) {
    console.error('[AUTO_BUY] Failed to initialize SDK:', error);
    throw error;
  }
}

/**
 * Check if an alert should trigger auto-buy
 */
export function shouldAutoBuy(alert, eventData) {
  // Only auto-buy if the alert has auto_buy enabled
  if (!alert.auto_buy) {
    return false;
  }

  // Only auto-buy for NAME_TOKEN_MINTED events (new domains available for purchase)
  if (eventData.event_type !== 'NAME_TOKEN_MINTED') {
    return false;
  }

  // Check if price filter matches (if set)
  if (alert.filter_price && alert.filter_price.toLowerCase() !== 'none') {
    const price = eventData.price;
    if (price === null || price === undefined) {
      return false; // Can't auto-buy without price info
    }

    const m = alert.filter_price.match(/([<>]=?|==)\s*(\d*\.?\d+)/);
    if (m) {
      const op = m[1];
      const val = Number(m[2]);
      if (Number.isFinite(val) && Number.isFinite(price)) {
        if (op === '<' && !(price < val)) return false;
        if (op === '<=' && !(price <= val)) return false;
        if (op === '>' && !(price > val)) return false;
        if (op === '>=' && !(price >= val)) return false;
        if (op === '==' && !(price === val)) return false;
      }
    }
  }

  // Check domain filter (if set)
  if (alert.domain_filter && alert.domain_filter.toLowerCase() !== 'none') {
    const needle = String(alert.domain_filter).toLowerCase();
    const hay = String(eventData.name || '').toLowerCase();
    if (!hay.includes(needle)) {
      return false;
    }
  }

  return true;
}

/**
 * Create an offer for a domain using the Doma Orderbook SDK
 */
export async function createAutoBuyOffer(alert, eventData) {
  try {
    console.log(`[AUTO_BUY] Creating offer for ${eventData.name} by user ${alert.user_id}`);

    // Initialize SDK if not already done
    if (!domaClient) {
      await initializeSDK();
    }

    // Get user's connected wallet
    const wallet = getUserConnectedWallet(alert.user_id);
    if (!wallet) {
      throw new Error('No connected wallet found for user. Please connect your wallet first.');
    }

    // Get the token address and chain ID from event data
    const tokenAddress = eventData.eventData?.tokenAddress || '0x2f45DfC5f4c9473fa72aBdFbd223d0979B265046';
    const networkId = eventData.eventData?.networkId || 'eip155:84532'; // Default to Base Sepolia
    const tokenId = eventData.eventData?.tokenId;

    if (!tokenAddress || !networkId || !tokenId) {
      throw new Error('Missing required token information for auto-buy');
    }

    // Calculate offer amount based on price filter
    let offerAmount = '1000000000000000000'; // Default: 1 ETH (in wei)
    if (alert.filter_price && alert.filter_price.toLowerCase() !== 'none') {
      const m = alert.filter_price.match(/([<>]=?|==)\s*(\d*\.?\d+)/);
      if (m) {
        const val = Number(m[2]);
        if (Number.isFinite(val)) {
          // Convert to wei (assuming ETH)
          offerAmount = (val * Math.pow(10, 18)).toString();
        }
      }
    }

    // Check user balance before proceeding
    const balanceCheck = await checkUserBalance(wallet.wallet_address, offerAmount, 'ETH');
    if (!balanceCheck.hasBalance) {
      throw new Error(`Insufficient balance. Required: ${offerAmount} ETH`);
    }

    // Create a mock signer for the SDK (in production, this would be the actual connected wallet signer)
    const mockSigner = {
      getAddress: () => wallet.wallet_address,
      signMessage: async (message) => {
        // In production, this would use the actual wallet to sign
        return '0x' + '0'.repeat(130); // Mock signature
      }
    };

    // Use the Doma Orderbook SDK to create an offer
    const offerResult = await domaClient.createOffer({
      params: {
        items: [
          {
            contract: tokenAddress,
            tokenId: tokenId,
            currencyContractAddress: '0x0000000000000000000000000000000000000000', // ETH
            price: offerAmount,
          },
        ],
        orderbook: OrderbookType.DOMA,
        expirationTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      },
      signer: mockSigner,
      chainId: networkId,
      onProgress: (step, progress) => {
        console.log(`[AUTO_BUY] Creating offer: ${step} (${progress}%)`);
      },
    });

    if (offerResult && offerResult.orderId) {
      // Log successful auto-buy attempt
      logAutoBuyAttempt(alert.user_id, eventData.name, offerResult.orderId, offerAmount, true);
      
      return {
        success: true,
        orderId: offerResult.orderId,
        domain: eventData.name,
        amount: offerAmount
      };
    } else {
      throw new Error('Failed to create offer via Doma Orderbook SDK');
    }
    
  } catch (error) {
    console.error(`[AUTO_BUY] Error creating offer:`, error);
    
    // Log failed auto-buy attempt
    logAutoBuyAttempt(alert.user_id, eventData.name, null, null, false, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log auto-buy attempt to database
 */
function logAutoBuyAttempt(userId, domainName, orderId, amount, success, error = null) {
  try {
    const stmt = database.prepare(`
      INSERT INTO auto_buy_logs (user_id, domain_name, order_id, amount, success, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      userId,
      domainName,
      orderId,
      amount,
      success ? 1 : 0,
      error,
      new Date().toISOString()
    );
  } catch (dbError) {
    console.error('[AUTO_BUY] Error logging attempt:', dbError);
  }
}

/**
 * Get user's wallet address
 */
export function getUserWalletAddress(userId) {
  const wallet = getUserConnectedWallet(userId);
  return wallet ? wallet.wallet_address : null;
}

export default {
  shouldAutoBuy,
  createAutoBuyOffer,
  getUserWalletAddress
};
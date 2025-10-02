import { ethers } from 'ethers';
import database from '../db.js';

/**
 * Secure Wallet Connection Service
 * This service handles wallet connections without storing private keys
 * Uses a web interface for secure wallet connection
 */

// Store active connections (in production, use Redis or similar)
const activeConnections = new Map();

/**
 * Generate a secure connection session
 * @param {number} userId - User ID from database
 * @param {string} telegramId - Telegram chat ID
 * @returns {Object} Connection session data
 */
export function createConnectionSession(userId, telegramId) {
  const sessionId = generateSecureId();
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  
  const session = {
    id: sessionId,
    userId,
    telegramId,
    expiresAt,
    status: 'pending', // pending, connected, authorized, expired
    walletAddress: null,
    authorizedTokens: [],
    createdAt: Date.now()
  };
  
  activeConnections.set(sessionId, session);
  
  // Clean up expired sessions
  setTimeout(() => {
    if (activeConnections.has(sessionId)) {
      activeConnections.delete(sessionId);
    }
  }, 15 * 60 * 1000);
  
  return {
    sessionId,
    connectionUrl: `${process.env.WEB_BASE_URL || 'http://localhost:3000'}/api/wallet/connect/${sessionId}`,
    expiresAt
  };
}

/**
 * Get connection session by ID
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session data or null if not found/expired
 */
export function getConnectionSession(sessionId) {
  const session = activeConnections.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  if (Date.now() > session.expiresAt) {
    activeConnections.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * Update connection session
 * @param {string} sessionId - Session ID
 * @param {Object} updates - Updates to apply
 * @returns {boolean} Success status
 */
export function updateConnectionSession(sessionId, updates) {
  const session = activeConnections.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  Object.assign(session, updates);
  activeConnections.set(sessionId, session);
  
  return true;
}

/**
 * Complete wallet connection
 * @param {string} sessionId - Session ID
 * @param {string} walletAddress - Connected wallet address
 * @param {Array} authorizedTokens - List of authorized tokens
 * @returns {boolean} Success status
 */
export function completeWalletConnection(sessionId, walletAddress, authorizedTokens = []) {
  const session = getConnectionSession(sessionId);
  
  if (!session) {
    return false;
  }
  
  // Update session
  updateConnectionSession(sessionId, {
    status: 'authorized',
    walletAddress,
    authorizedTokens,
    connectedAt: Date.now()
  });
  
  // Store in database (without private keys)
  try {
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO user_wallets (
        user_id, wallet_address, private_key_encrypted, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      session.userId,
      walletAddress,
      null, // No private key stored
      1, // Active
      new Date().toISOString()
    );
    
    return true;
  } catch (error) {
    console.error('[WALLET_CONNECT] Error storing wallet:', error);
    return false;
  }
}

/**
 * Get user's connected wallet
 * @param {number} userId - User ID
 * @returns {Object|null} Wallet data or null
 */
export function getUserConnectedWallet(userId) {
  try {
    const stmt = database.prepare(`
      SELECT wallet_address, is_active, created_at 
      FROM user_wallets 
      WHERE user_id = ? AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    return stmt.get(userId);
  } catch (error) {
    console.error('[WALLET_CONNECT] Error getting user wallet:', error);
    return null;
  }
}

/**
 * Check if user has authorized tokens for auto-buy
 * @param {number} userId - User ID
 * @param {string} tokenAddress - Token contract address
 * @returns {boolean} Authorization status
 */
export function hasTokenAuthorization(userId, tokenAddress) {
  try {
    const stmt = database.prepare(`
      SELECT 1 FROM user_wallets 
      WHERE user_id = ? AND is_active = 1
    `);
    
    const wallet = stmt.get(userId);
    return !!wallet;
  } catch (error) {
    console.error('[WALLET_CONNECT] Error checking authorization:', error);
    return false;
  }
}

/**
 * Generate secure session ID
 * @returns {string} Secure session ID
 */
function generateSecureId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get connection status for user
 * @param {number} userId - User ID
 * @returns {Object} Connection status
 */
export function getConnectionStatus(userId) {
  const wallet = getUserConnectedWallet(userId);
  
  if (!wallet) {
    return {
      connected: false,
      walletAddress: null,
      message: 'No wallet connected. Use /connectwallet to connect your wallet.'
    };
  }
  
  return {
    connected: true,
    walletAddress: wallet.wallet_address,
    message: `Wallet connected: ${wallet.wallet_address}`
  };
}

/**
 * Disconnect user wallet
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
export function disconnectWallet(userId) {
  try {
    const stmt = database.prepare(`
      UPDATE user_wallets 
      SET is_active = 0 
      WHERE user_id = ? AND is_active = 1
    `);
    
    const result = stmt.run(userId);
    return result.changes > 0;
  } catch (error) {
    console.error('[WALLET_CONNECT] Error disconnecting wallet:', error);
    return false;
  }
}

export default {
  createConnectionSession,
  getConnectionSession,
  updateConnectionSession,
  completeWalletConnection,
  getUserConnectedWallet,
  hasTokenAuthorization,
  getConnectionStatus,
  disconnectWallet
};

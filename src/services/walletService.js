import crypto from 'crypto';
import database from '../db.js';

// Simple encryption/decryption for demo purposes
// In production, use proper key management and encryption
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'demo-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Add a wallet for a user
 */
export function addUserWallet(userId, walletAddress, privateKey) {
  try {
    const encryptedPrivateKey = encrypt(privateKey);
    const insert = database.prepare(`
      INSERT INTO user_wallets (user_id, wallet_address, private_key_encrypted)
      VALUES (?, ?, ?)
    `);
    insert.run(userId, walletAddress, encryptedPrivateKey);
    return { success: true };
  } catch (error) {
    console.error('[WALLET] Error adding wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's active wallet
 */
export function getUserWallet(userId) {
  try {
    const wallet = database.prepare(`
      SELECT * FROM user_wallets 
      WHERE user_id = ? AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(userId);
    
    if (!wallet) {
      return null;
    }
    
    return {
      id: wallet.id,
      address: wallet.wallet_address,
      privateKey: decrypt(wallet.private_key_encrypted)
    };
  } catch (error) {
    console.error('[WALLET] Error getting wallet:', error);
    return null;
  }
}

/**
 * List user's wallets
 */
export function getUserWallets(userId) {
  try {
    const wallets = database.prepare(`
      SELECT id, wallet_address, is_active, created_at
      FROM user_wallets 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    return wallets;
  } catch (error) {
    console.error('[WALLET] Error listing wallets:', error);
    return [];
  }
}

/**
 * Set active wallet
 */
export function setActiveWallet(userId, walletId) {
  try {
    // Deactivate all wallets
    database.prepare('UPDATE user_wallets SET is_active = 0 WHERE user_id = ?').run(userId);
    
    // Activate selected wallet
    const result = database.prepare(`
      UPDATE user_wallets 
      SET is_active = 1 
      WHERE id = ? AND user_id = ?
    `).run(walletId, userId);
    
    return { success: result.changes > 0 };
  } catch (error) {
    console.error('[WALLET] Error setting active wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove wallet
 */
export function removeWallet(userId, walletId) {
  try {
    const result = database.prepare(`
      DELETE FROM user_wallets 
      WHERE id = ? AND user_id = ?
    `).run(walletId, userId);
    
    return { success: result.changes > 0 };
  } catch (error) {
    console.error('[WALLET] Error removing wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a new wallet (for demo purposes)
 * In production, this should be done client-side for security
 */
export function generateNewWallet() {
  // This is a simplified version for demo
  // In production, use proper wallet generation libraries
  const privateKey = '0x' + crypto.randomBytes(32).toString('hex');
  const address = '0x' + crypto.randomBytes(20).toString('hex');
  
  return {
    address,
    privateKey
  };
}

export default {
  addUserWallet,
  getUserWallet,
  getUserWallets,
  setActiveWallet,
  removeWallet,
  generateNewWallet
};

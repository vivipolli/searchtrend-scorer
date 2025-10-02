import { Router } from 'express';
import { getConnectionSession, updateConnectionSession, completeWalletConnection } from '../services/walletConnectService.js';

const router = Router();

// Test route
router.get('/test', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send('<h1>Wallet Route Test - Working!</h1>');
});

/**
 * Serve the wallet connection page
 */
router.get('/connect/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`[WALLET] Connection request for session: ${sessionId}`);
  
  // Get session
  const session = getConnectionSession(sessionId);
  
  if (!session) {
    console.log(`[WALLET] Session not found: ${sessionId}`);
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Expired</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Connection Expired</h1>
        <p>This connection link has expired. Please try again from your Telegram bot.</p>
        <p>Session ID: ${sessionId}</p>
      </body>
      </html>
    `);
  }
  
  // Redirect to static HTML file with session ID as query parameter
  res.redirect(`/wallet-connect.html?sessionId=${sessionId}`);
});

/**
 * Handle wallet connection callback
 */
router.post('/callback/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { walletAddress, chainId, status, authorizedToken, authorizedAmount } = req.body;
  
  console.log(`[WALLET] Callback received for session ${sessionId}:`, { walletAddress, chainId, status, authorizedToken, authorizedAmount });

  try {
    const success = await completeWalletConnection(sessionId, walletAddress, chainId, status, authorizedToken, authorizedAmount);
    if (success) {
      res.status(200).json({ message: 'Connection status updated successfully' });
    } else {
      res.status(400).json({ error: 'Failed to update connection status or session expired' });
    }
  } catch (error) {
    console.error('[WALLET] Error processing callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
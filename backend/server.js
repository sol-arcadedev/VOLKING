import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with Redis/DB for production)
let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();

// Helper: Get current 15-min round start
function getCurrentRoundStart() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;
  now.setMinutes(roundStart, 0, 0);
  return now.getTime();
}

// Reset volume data every 15 minutes
setInterval(() => {
  const newRoundStart = getCurrentRoundStart();
  if (newRoundStart !== currentRoundStart) {
    console.log('🔄 New round started, resetting volume data');
    volumeData.clear();
    currentRoundStart = newRoundStart;
  }
}, 60000); // Check every minute

// Webhook endpoint - Helius will POST here
app.post('/api/webhook/transactions', (req, res) => {
  try {
    const transactions = req.body;

    console.log(`📨 Received ${transactions.length} transactions from Helius`);

    // Process each transaction
    for (const tx of transactions) {
      processTransaction(tx);
    }

    res.status(200).json({ success: true, processed: transactions.length });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Process individual transaction
function processTransaction(tx) {
  const tokenMint = process.env.TOKEN_ADDRESS;

  // Filter for token transfers related to our token
  const tokenTransfers = tx.tokenTransfers?.filter(
      transfer => transfer.mint === tokenMint
  ) || [];

  for (const transfer of tokenTransfers) {
    const amount = parseFloat(transfer.tokenAmount || 0);
    if (amount === 0) continue;

    const buyer = transfer.toUserAccount;
    const seller = transfer.fromUserAccount;
    const timestamp = tx.timestamp * 1000;

    // Update buyer volume
    if (buyer) {
      updateVolume(buyer, amount, timestamp);
    }

    // Update seller volume (avoid double counting)
    if (seller && seller !== buyer) {
      updateVolume(seller, amount, timestamp);
    }
  }
}

// Update volume for a wallet
function updateVolume(wallet, amount, timestamp) {
  const existing = volumeData.get(wallet) || {
    wallet,
    volume: 0,
    trades: 0,
    lastTrade: 0,
  };

  existing.volume += amount;
  existing.trades += 1;
  existing.lastTrade = Math.max(existing.lastTrade, timestamp);

  volumeData.set(wallet, existing);
}

// API endpoint: Get current leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10); // Top 10

  res.json({
    roundStart: currentRoundStart,
    leaderboard,
    totalTraders: volumeData.size,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roundStart: new Date(currentRoundStart).toISOString(),
    traders: volumeData.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Current round: ${new Date(currentRoundStart).toISOString()}`);
});
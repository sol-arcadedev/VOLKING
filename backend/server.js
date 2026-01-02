import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Middleware must come BEFORE routes
app.use(cors());
app.use(express.json()); // This is crucial for parsing webhook data

// In-memory storage
let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();

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
}, 60000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roundStart: new Date(currentRoundStart).toISOString(),
    traders: volumeData.size
  });
});

// Webhook endpoint - THIS IS WHAT HELIUS CALLS
app.post('/api/webhook/transactions', (req, res) => {
  try {
    console.log('📨 Webhook received!');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const transactions = Array.isArray(req.body) ? req.body : [req.body];

    console.log(`Processing ${transactions.length} transactions`);

    // Process each transaction
    for (const tx of transactions) {
      processTransaction(tx);
    }

    res.status(200).json({
      success: true,
      processed: transactions.length,
      traders: volumeData.size
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

function processTransaction(tx) {
  const tokenMint = process.env.TOKEN_ADDRESS;

  console.log('Processing tx:', tx.signature);

  // Helius enhanced webhooks provide tokenTransfers array
  const tokenTransfers = tx.tokenTransfers || [];

  const relevantTransfers = tokenTransfers.filter(
      transfer => transfer.mint === tokenMint
  );

  console.log(`Found ${relevantTransfers.length} relevant transfers`);

  for (const transfer of relevantTransfers) {
    const amount = parseFloat(transfer.tokenAmount || 0);
    if (amount === 0) continue;

    const buyer = transfer.toUserAccount;
    const seller = transfer.fromUserAccount;
    const timestamp = tx.timestamp * 1000;

    // Update buyer volume
    if (buyer) {
      updateVolume(buyer, amount, timestamp);
    }

    // Update seller volume
    if (seller && seller !== buyer) {
      updateVolume(seller, amount, timestamp);
    }
  }
}

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

  console.log(`Updated ${wallet.substring(0, 8)}...: ${existing.volume} volume, ${existing.trades} trades`);
}

// Get leaderboard endpoint
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

  res.json({
    roundStart: currentRoundStart,
    leaderboard,
    totalTraders: volumeData.size,
  });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API',
    endpoints: {
      health: '/api/health',
      leaderboard: '/api/leaderboard',
      webhook: '/api/webhook/transactions (POST)'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Current round: ${new Date(currentRoundStart).toISOString()}`);
  console.log(`🌐 Public URL: https://volking-production.up.railway.app`);
});
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection (support both MONGODB_URL and MONGODB_URI)
const mongoUri = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MongoDB connection string missing. Set MONGODB_URL or MONGODB_URI in .env');
} else {
  mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 20000
  })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
      console.error('❌ MongoDB Error:', err.message);
      console.error('💡 Check your MONGODB_URL / MONGODB_URI in .env and ensure network access to MongoDB.');
    });
}
    
    // Check Ollama health on startup
    if (process.env.OLLAMA_ENABLED === 'true') {
      const ollamaHealth = require('./utils/ollamaHealth');
      
      setTimeout(async () => {
        const health = await ollamaHealth.ensureReady();
        
        if (health.status === 'healthy') {
          console.log(`🎉 Phi 2.7b AI is ready to generate quizzes!`);
          console.log('💰 Cost: $0 (100% Free Forever)');
        } else {
          console.log('\n⚠️  AI Generation: BASIC MODE');
          console.log('   Quizzes will use simple question generation');
          console.log('   Fix Ollama for AI-powered questions\n');
        }
      }, 1500);
    
  }
 

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/upload', require('./routes/upload'));

// Health endpoint
app.get('/api/health', async (req, res) => {
  const ollamaHealth = require('./utils/ollamaHealth');
  const aiHealth = await ollamaHealth.checkHealth();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai: aiHealth,
    environment: process.env.NODE_ENV,
    features: {
      ai: process.env.OLLAMA_ENABLED === 'true',
      model: process.env.OLLAMA_MODEL
    }
  });
});

// Socket.io
require('./sockets/quizSocket')(io);

// Start server with simple retry on EADDRINUSE
const BASE_PORT = Number(process.env.PORT) || 5000;
const MAX_TRIES = 3;

function startServer(port, attempt = 1) {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_TRIES) {
      const nextPort = port + 1;
      console.error(`Port ${port} in use, retrying on ${nextPort} (attempt ${attempt + 1}/${MAX_TRIES})`);
      startServer(nextPort, attempt + 1);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  });
}

startServer(BASE_PORT);
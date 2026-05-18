const express = require('express');
const cors = require('cors');

// Import your server modules
const { setupAuth } = require('../server/auth');
const { registerRoutes } = require('../server/routes');

const app = express();

// CORS configuration for Vercel
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Setup authentication
setupAuth(app);

// Register API routes
registerRoutes(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', vercel: true, timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Vercel API error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;
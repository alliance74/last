require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const creditsRoutes = require('./routes/credits.routes');
const referralRoutes = require('./routes/referral.routes');
const chatRoutes = require('./routes/chat.routes');

// Initialize Firebase Admin
require('./config/firebase-simple');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const whitelist = [
  'https://rizz-front.onrender.com',  // your deployed frontend
  'http://localhost:3000',             // for local dev
  'http://localhost:8080'              // optional extra dev port
];


const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'X-Remaining-Messages',
    'X-Message-Limit'
  ],
  exposedHeaders: [
    'X-Remaining-Messages',
    'X-Message-Limit',
    'Set-Cookie'
  ],
  credentials: true,
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  maxAge: 86400, // Cache preflight requests for 24 hours (browsers cap at 2 hours)
  preflightContinue: false
};

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with CORS options
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/users', cors(corsOptions), userRoutes);
app.use('/api/subscriptions', cors(corsOptions), subscriptionRoutes);
app.use('/api/credits', cors(corsOptions), creditsRoutes);
app.use('/api/referrals', cors(corsOptions), referralRoutes);
app.use('/api/chat', cors(corsOptions), chatRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    error: `Cannot ${req.method} ${req.path}`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated!');
  });
});

module.exports = app;


const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const { pool, dbConfig, testConnection, isUsingMemoryStore } = require('./config/db');
const csrfProtection = require('./middleware/csrf');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const voteRoutes = require('./routes/voteRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security HTTP headers with helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing (CORS) support for local development and VS Code Live Server
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-CSRF-Token');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session store (Memory store by default for instant zero-hang execution, upgraded to MySQL if enabled)
let sessionStore;
if (process.env.USE_MYSQL_SESSION === 'true') {
  try {
    sessionStore = new MySQLStore({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000,
      createDatabaseTable: true
    });
    sessionStore.on('error', (err) => {
      console.warn('[Session Store Warning]', err.message);
    });
  } catch (err) {
    sessionStore = undefined;
  }
}

app.use(
  session({
    key: 'voting_session_id',
    secret: process.env.SESSION_SECRET || 'dev_secret_online_voting_system_change_in_prod',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// CSRF Protection middleware
app.use(csrfProtection);

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server listening when not executed as a test runner module
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  Online Voting System running on port: ${PORT}`);
      console.log(`  Access URL: http://localhost:${PORT}`);
      console.log(`  Database Mode: ${isUsingMemoryStore() ? 'In-Memory Relational Engine' : 'MySQL 8 Production Engine'}`);
      console.log(`====================================================`);
    });
  })();
}

module.exports = app;

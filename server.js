const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const hbs = require("hbs");
const { connectDB } = require("./config/sequelize");
const { validateEnv } = require("./config/env");
const { requireHTTPS, setHSTSHeader } = require("./middleware/httpsRedirect");
const { csrfProtection, csrfErrorHandler, injectCsrfToken } = require("./middleware/csrf");
const logger = require("./utils/logger");

// Load and validate environment variables
require("dotenv").config();
validateEnv();

// Initialize Express app
const app = express();

// Trust proxy (important for Heroku, AWS, etc.)
app.set('trust proxy', 1);

// HTTPS redirect middleware (production only)
app.use(requireHTTPS);
app.use(setHSTSHeader);

// Security middleware - Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5000',
  credentials: true
}));

// Rate limiting - Global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting - Authentication routes (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Session configuration
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session', // PostgreSQL table name for sessions
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Custom name instead of default 'connect.sid'
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // Prevent XSS
      sameSite: 'lax', // CSRF protection
    },
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware - prevent hanging requests
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  next();
});

// View engine setup
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
hbs.registerPartials(path.join(__dirname, "views/partials"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Load Handlebars helpers
require("./utils/hbs-helpers");

// CSRF Protection for state-changing routes
app.use(['/auth/register', '/auth/login', '/auth/profile'], csrfProtection, injectCsrfToken);
app.use('/products', csrfProtection, injectCsrfToken);
app.use('/cart', csrfProtection, injectCsrfToken);
app.use('/orders', csrfProtection, injectCsrfToken);
app.use('/admin', csrfProtection, injectCsrfToken);
app.use('/products/admin', csrfProtection, injectCsrfToken);

// Inject CSRF token for GET requests that need forms
app.use((req, res, next) => {
  if (req.method === 'GET' && req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// Middleware to set cart item count for authenticated users (only on key routes)
// TODO: Optimize this - currently disabled to prevent performance issues
// app.use((req, res, next) => {
//   if (req.session.user && ['/','/', '/products', '/cart', '/orders', '/admin'].some(p => req.path.startsWith(p))) {
//     const Cart = require('./models/Cart');
//     Cart.getCartItemCount(req.session.user.id)
//       .then(itemCount => {
//         res.locals.itemCount = itemCount;
//         next();
//       })
//       .catch(error => {
//         logger.error('Error fetching cart count:', {
//           userId: req.session.user.id,
//           error: error.message
//         });
//         res.locals.itemCount = 0;
//         next();
//       });
//   } else {
//     res.locals.itemCount = 0;
//     next();
//   }
// });

app.use((req, res, next) => {
  res.locals.itemCount = 0;
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
});

// Routes
// Apply auth rate limiter to login/register routes
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

app.use('/products', require('./routes/product.route'));
app.use('/auth', require('./routes/auth.route'));
app.use('/admin', require('./routes/admin.route'));
app.use('/cart', require('./routes/cart.route'));
app.use('/orders', require('./routes/order.route'));

// Home route
app.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user,
    csrfToken: req.csrfToken?.()
  });
});

// Health check endpoint (no CSRF needed)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// CSRF error handler (must be after routes)
app.use(csrfErrorHandler);

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found', { url: req.url, method: req.method, ip: req.ip });
  res.status(404).render('error', {
    message: "Page not found",
    user: req.session?.user
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  logger.error('Application Error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.session?.user?.email
  });

  // Send generic error to client (don't leak sensitive info)
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Something went wrong!';

  res.status(statusCode).render('error', {
    message,
    user: req.session?.user
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, async () => {
  logger.info(`🚀 Server started on port ${port}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 URL: http://localhost:${port}`);

  try {
    await connectDB();
    logger.info('✅ Server is ready to accept connections');
  } catch (error) {
    logger.error('❌ Failed to connect to database', { error: error.message });
    process.exit(1);
  }
});

module.exports = app; // Export for testing
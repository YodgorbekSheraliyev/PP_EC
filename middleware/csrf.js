/**
 * CSRF Protection Configuration
 * Protects against Cross-Site Request Forgery attacks
 */

const csrf = require("csurf");
const logger = require("../utils/logger");

// Configure CSRF protection
// Using session-based storage (not cookie-based for better security)
const csrfProtection = csrf({
  cookie: false, // Use session instead of cookies
  sessionKey: "session", // Default session key
});

/**
 * Custom CSRF error handler
 * Provides user-friendly error messages for CSRF failures
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code !== "EBADCSRFTOKEN") {
    return next(err);
  }

  // Log CSRF violation attempt
  logger.warn("CSRF token validation failed", {
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get("user-agent"),
    referer: req.get("referer"),
  });

  // Handle based on request type
  if (req.xhr || req.headers.accept?.indexOf("json") > -1) {
    // JSON API request
    res.status(403).json({
      message: "Invalid CSRF token. Please refresh the page and try again.",
    });
  } else {
    // Form submission
    res.status(403).render("error", {
      message: "Invalid security token. Please refresh the page and try again.",
      user: req.session?.user,
    });
  }
}

/**
 * Middleware to inject CSRF token into response locals
 * Makes token available in all templates
 */
function injectCsrfToken(req, res, next) {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
}

/**
 * Skip CSRF for specific routes (like webhooks, API endpoints with other auth)
 * Usage: app.post('/webhook', skipCsrf, webhookHandler)
 */
const skipCsrf = (req, res, next) => {
  req.csrfToken = () => ""; // Return empty token
  next();
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  injectCsrfToken,
  skipCsrf,
};

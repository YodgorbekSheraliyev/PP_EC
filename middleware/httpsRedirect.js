/**
 * HTTPS Redirect Middleware
 * Forces HTTPS in production environment
 */

const logger = require('../utils/logger');

/**
 * Middleware to redirect HTTP requests to HTTPS in production
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireHTTPS(req, res, next) {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    // Check if request is already HTTPS
    // Works with load balancers and reverse proxies (like Heroku, AWS, etc.)
    const isSecure = req.secure ||
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';

    if (!isSecure) {
      const httpsUrl = `https://${req.hostname}${req.url}`;
      logger.info(`Redirecting HTTP to HTTPS: ${req.url}`);
      return res.redirect(301, httpsUrl);
    }
  }

  next();
}

/**
 * Middleware to set HSTS (HTTP Strict Transport Security) header
 * Tells browsers to always use HTTPS for future requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function setHSTSHeader(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    // HSTS header: max-age is 1 year (31536000 seconds)
    // includeSubDomains: apply to all subdomains
    // preload: allow inclusion in browser HSTS preload lists
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
}

module.exports = {
  requireHTTPS,
  setHSTSHeader
};
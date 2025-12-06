/**
 * Login Attempts Tracker and Account Lockout System
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

const loginAttempts = new Map();
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = 5; // Maximum failed attempts before lockout
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up old entries every hour

/**
 * Record a failed login attempt
 * @param {string} email - User's email address
 */
function recordFailedAttempt(email) {
  const normalizedEmail = email.toLowerCase();
  const attempts = loginAttempts.get(normalizedEmail) || {
    count: 0,
    lockedUntil: null,
    lastAttempt: null
  };

  attempts.count++;
  attempts.lastAttempt = Date.now();

  // Lock account if max attempts reached
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  loginAttempts.set(normalizedEmail, attempts);
}

/**
 * Check if an account is currently locked
 * @param {string} email - User's email address
 * @returns {boolean} - True if account is locked
 */
function isLocked(email) {
  const normalizedEmail = email.toLowerCase();
  const attempts = loginAttempts.get(normalizedEmail);

  if (!attempts || !attempts.lockedUntil) {
    return false;
  }

  // Check if lockout period has expired
  if (Date.now() < attempts.lockedUntil) {
    return true;
  }

  // Lockout expired, reset attempts
  loginAttempts.delete(normalizedEmail);
  return false;
}

/**
 * Get remaining lockout time in minutes
 * @param {string} email - User's email address
 * @returns {number} - Minutes until unlock (0 if not locked)
 */
function getRemainingLockoutTime(email) {
  const normalizedEmail = email.toLowerCase();
  const attempts = loginAttempts.get(normalizedEmail);

  if (!attempts || !attempts.lockedUntil) {
    return 0;
  }

  const remaining = attempts.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

/**
 * Reset login attempts for a user (called on successful login)
 * @param {string} email - User's email address
 */
function resetAttempts(email) {
  const normalizedEmail = email.toLowerCase();
  loginAttempts.delete(normalizedEmail);
}

/**
 * Get current attempt count for a user
 * @param {string} email - User's email address
 * @returns {number} - Number of failed attempts
 */
function getAttemptCount(email) {
  const normalizedEmail = email.toLowerCase();
  const attempts = loginAttempts.get(normalizedEmail);
  return attempts ? attempts.count : 0;
}

/**
 * Clean up old entries (called periodically)
 */
function cleanup() {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  for (const [email, attempts] of loginAttempts.entries()) {
    // Remove entries where lockout expired and no recent attempts
    if (attempts.lockedUntil && attempts.lockedUntil < now && attempts.lastAttempt < oneHourAgo) {
      loginAttempts.delete(email);
    }
    // Remove unlocked entries with no recent attempts
    else if (!attempts.lockedUntil && attempts.lastAttempt < oneHourAgo) {
      loginAttempts.delete(email);
    }
  }
}

// Run cleanup every hour
setInterval(cleanup, CLEANUP_INTERVAL);

module.exports = {
  recordFailedAttempt,
  isLocked,
  getRemainingLockoutTime,
  resetAttempts,
  getAttemptCount,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION
};
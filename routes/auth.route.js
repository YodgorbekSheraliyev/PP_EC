const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Router } = require('express');
const logger = require('../utils/logger');
const {
  recordFailedAttempt,
  isLocked,
  getRemainingLockoutTime,
  resetAttempts
} = require('../utils/loginAttempts');

const router = Router();

// Register route
router.get('/register', (req, res) => {
  res.render('auth/register', { errors: null, csrfToken: req.csrfToken?.() });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render('auth/register', {
        errors: [{ msg: 'User already exists with this email' }],
        csrfToken: req.csrfToken?.()
      });
    }

    // Create user
    const user = await User.createUser({ username, email, password });

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration error on registration: %o', err);
        return res.render('auth/register', {
          errors: [{ msg: 'Registration failed. Please try again.' }],
          csrfToken: req.csrfToken?.()
        });
      }

      // Create session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      };

      logger.info(`User registered successfully: ${email}, IP: ${req.ip}`);
      res.redirect('/');
    });
  } catch (error) {
    logger.error('Registration error: %o', error);
    res.render('auth/register', {
      errors: [{ msg: 'Registration failed. Please try again.' }],
      csrfToken: req.csrfToken?.()
    });
  }
});

// Login route
router.get('/login', (req, res) => {
  res.render('auth/login', { errors: null, csrfToken: req.csrfToken?.() });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if account is locked
    if (isLocked(email)) {
      const remainingMinutes = getRemainingLockoutTime(email);
      logger.warn(`Login attempt on locked account: ${email}, IP: ${req.ip}, Remaining: ${remainingMinutes} minutes`);

      return res.render('auth/login', {
        errors: [{
          msg: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
        }],
        csrfToken: req.csrfToken?.()
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      recordFailedAttempt(email);
      logger.warn(`Failed login attempt - invalid email: ${email}, IP: ${req.ip}`);
      return res.render('auth/login', {
        errors: [{ msg: 'Invalid email or password' }],
        csrfToken: req.csrfToken?.()
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      recordFailedAttempt(email);
      logger.warn(`Failed login attempt - invalid password for: ${email}, IP: ${req.ip}`);
      return res.render('auth/login', {
        errors: [{ msg: 'Invalid email or password' }],
        csrfToken: req.csrfToken?.()
      });
    }

    // Successful login - reset failed attempts
    resetAttempts(email);

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration error on login: %o', err);
        return res.render('auth/login', {
          errors: [{ msg: 'Login failed. Please try again.' }],
          csrfToken: req.csrfToken?.()
        });
      }

      // Create new session with user data
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      };

      logger.info(`User logged in successfully: ${email}, IP: ${req.ip}`);
      res.redirect('/');
    });
  } catch (error) {
    logger.error('Login error: %o', error);
    res.render('auth/login', {
      errors: [{ msg: 'Login failed. Please try again.' }],
      csrfToken: req.csrfToken?.()
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  const userEmail = req.session?.user?.email;

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error: %o', err);
    } else {
      logger.info(`User logged out: ${userEmail || 'unknown'}`);
    }
    res.redirect('/');
  });
});

// Profile route
router.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('auth/profile', {
    user: req.session.user,
    errors: null,
    success: null,
    csrfToken: req.csrfToken?.()
  });
});

router.post('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  try {
    const { username, email } = req.body;
    const userId = req.session.user.id;

    const updatedUser = await User.updateProfile(userId, { username, email });

    // Update session
    req.session.user = {
      ...req.session.user,
      username: updatedUser.username,
      email: updatedUser.email
    };

    logger.info(`User profile updated: ${email}, IP: ${req.ip}`);

    res.render('auth/profile', {
      user: req.session.user,
      errors: null,
      success: 'Profile updated successfully',
      csrfToken: req.csrfToken?.()
    });
  } catch (error) {
    logger.error('Profile update error: %o', error);
    res.render('auth/profile', {
      user: req.session.user,
      errors: [{ msg: 'Profile update failed' }],
      success: null,
      csrfToken: req.csrfToken?.()
    });
  }
});

// API routes for JWT (if needed for future API expansion)
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if account is locked
    if (isLocked(email)) {
      const remainingMinutes = getRemainingLockoutTime(email);
      logger.warn(`API login attempt on locked account: ${email}, IP: ${req.ip}`);
      return res.status(429).json({
        message: `Account locked. Try again in ${remainingMinutes} minute(s).`,
        lockedUntil: remainingMinutes
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      recordFailedAttempt(email);
      logger.warn(`API failed login attempt - invalid email: ${email}, IP: ${req.ip}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      recordFailedAttempt(email);
      logger.warn(`API failed login attempt - invalid password: ${email}, IP: ${req.ip}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login - reset attempts
    resetAttempts(email);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`API user logged in successfully: ${email}, IP: ${req.ip}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('API login error: %o', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;

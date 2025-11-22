const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Router } = require('express');
const logger = require('../utils/logger');

const router = Router();

// Register route
router.get('/register', (req, res) => {
  res.render('auth/register', { errors: null });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render('auth/register', { errors: [{ msg: 'User already exists with this email' }] });
    }

    // Create user
    const user = await User.createUser({ username, email, password });

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    logger.info(`User registered: ${email}`);

    res.redirect('/');
  } catch (error) {
    logger.error('Registration error: %o', error);
    res.render('auth/register', { errors: [{ msg: 'Registration failed. Please try again.' }] });
  }
});

// Login route
router.get('/login', (req, res) => {
  res.render('auth/login', { errors: null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn(`Failed login attempt - invalid email: ${email}, IP: ${req.ip}`);
      return res.render('auth/login', { errors: [{ msg: 'Invalid email or password' }] });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt - invalid password: ${email}, IP: ${req.ip}`);
      return res.render('auth/login', { errors: [{ msg: 'Invalid email or password' }] });
    }

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    logger.info(`User logged in successfully: ${email}, IP: ${req.ip}`);

    res.redirect('/');
  } catch (error) {
    logger.error('Login error: %o', error);
    res.render('auth/login', { errors: [{ msg: 'Login failed. Please try again.' }] });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error: %o', err);
    } else {
      logger.info(`User logged out: ${req.session?.user?.email || 'unknown'}`);
    }
    res.redirect('/');
  });
});

// Profile route
router.get('/profile', (req, res) => {
  res.render('auth/profile', { user: req.session.user, errors: null, success: null });
});

router.post('/profile', async (req, res) => {
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

    logger.info(`User profile updated: ${email}`);

    res.render('auth/profile', { user: req.session.user, errors: null, success: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Profile update error: %o', error);
    res.render('auth/profile', { user: req.session.user, errors: [{ msg: 'Profile update failed' }], success: null });
  }
});

// API routes for JWT (if needed for future API expansion)
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn(`API failed login attempt - invalid email: ${email}, IP: ${req.ip}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      logger.warn(`API failed login attempt - invalid password: ${email}, IP: ${req.ip}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`API user logged in successfully: ${email}, IP: ${req.ip}`);

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    logger.error('API login error: %o', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;

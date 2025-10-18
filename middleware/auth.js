const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is authenticated via session
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect('/auth/login');
  }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).render('error', { message: 'Access denied. Admin role required.' });
  }
};

// Middleware to check customer role
const requireCustomer = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'customer') {
    return next();
  } else {
    return res.status(403).render('error', { message: 'Access denied. Customer role required.' });
  }
};

module.exports = {
  verifyToken,
  requireAuth,
  requireAdmin,
  requireCustomer
};

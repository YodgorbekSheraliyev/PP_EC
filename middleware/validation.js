const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors (JSON response)
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Middleware to check validation errors for forms (HTML response)
const handleFormValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.validationErrors = errors.array();
  }
  next();
};

// Validation rules for user registration
const validateRegistrationRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Validation rules for user registration (with JSON error handling)
const validateRegistration = [
  ...validateRegistrationRules,
  handleValidationErrors
];

// Validation rules for user registration (with form error handling)
const validateRegistrationForm = [
  ...validateRegistrationRules,
  handleFormValidationErrors
];

// Validation rules for login
const validateLoginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for login (with JSON error handling)
const validateLogin = [
  ...validateLoginRules,
  handleValidationErrors
];

// Validation rules for login (with form error handling)
const validateLoginForm = [
  ...validateLoginRules,
  handleFormValidationErrors
];

// Validation rules for product creation/update
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock_quantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  handleValidationErrors
];

// Validation rules for cart operations
const validateCartItem = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

// Validation rules for order creation (without error handling for form rendering)
const validateOrder = [
  body('shipping_address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Shipping address must be between 10 and 500 characters'),
  body('payment_method')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer'])
    .withMessage('Invalid payment method')
];

// Validation rules for updating user role
const validateRoleUpdate = [
  body('role')
    .isIn(['customer', 'admin'])
    .withMessage('Role must be either "customer" or "admin"'),
  handleValidationErrors
];

// Improved sanitization middleware - only trim, let Handlebars handle HTML escaping
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs - only trim whitespace
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

module.exports = {
  validateRegistration,
  validateRegistrationForm,
  validateLogin,
  validateLoginForm,
  validateProduct,
  validateCartItem,
  validateOrder,
  validateRoleUpdate,
  sanitizeInput,
  handleValidationErrors,
  handleFormValidationErrors
};

/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before application starts
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = {
  PORT: '5000',
  BCRYPT_ROUNDS: '12',
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '300',
  AUTH_RATE_LIMIT_MAX: '5',
  SESSION_MAX_AGE: '86400000'
};

/**
 * Validate that all required environment variables are present
 * @throws {Error} If any required variables are missing
 */
function validateEnv() {
  console.log('\n🔍 Validating environment variables...\n');

  // Check for missing required variables
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:\n');
    missing.forEach(varName => console.error(`   ✗ ${varName}`));
    console.error('\n💡 Create a .env file with these variables. See .env.example for reference.\n');
    process.exit(1);
  }

  // Validate specific requirements
  const errors = [];

  // Session secret length
  if (process.env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long (current: ' + process.env.SESSION_SECRET.length + ')');
  }

  // JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long (current: ' + process.env.JWT_SECRET.length + ')');
  }

  // NODE_ENV validation
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    errors.push(`NODE_ENV must be one of: ${validEnvs.join(', ')} (current: ${process.env.NODE_ENV})`);
  }

  // Database URL format
  if (!process.env.DATABASE_URL.startsWith('postgres://') && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  if (errors.length > 0) {
    console.error('❌ Environment variable validation errors:\n');
    errors.forEach(error => console.error(`   ✗ ${error}`));
    console.error('');
    process.exit(1);
  }

  // Set defaults for optional variables
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      console.log(`   ℹ Using default for ${key}: ${defaultValue}`);
    }
  }

  // Security warnings for production
  if (process.env.NODE_ENV === 'production') {
    console.log('\n⚠️  Production Environment Checks:\n');

    if (process.env.SESSION_SECRET.includes('change') || process.env.SESSION_SECRET.includes('secret')) {
      console.warn('   ⚠️  SESSION_SECRET appears to be a default value. Use a strong random string!');
    }

    if (process.env.JWT_SECRET.includes('change') || process.env.JWT_SECRET.includes('secret')) {
      console.warn('   ⚠️  JWT_SECRET appears to be a default value. Use a strong random string!');
    }

    if (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')) {
      console.warn('   ⚠️  DATABASE_URL points to localhost. Ensure this is intended for production.');
    }
  }

  console.log('\n✅ All environment variables validated successfully\n');

  // Log configuration (without sensitive data)
  console.log('📋 Configuration:');
  console.log(`   • Environment: ${process.env.NODE_ENV}`);
  console.log(`   • Port: ${process.env.PORT}`);
  console.log(`   • Database: ${maskConnectionString(process.env.DATABASE_URL)}`);
  console.log(`   • Log Level: ${process.env.LOG_LEVEL}`);
  console.log('');
}

/**
 * Mask sensitive parts of database connection string for logging
 * @param {string} connectionString - Database connection string
 * @returns {string} - Masked connection string
 */
function maskConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}`;
  } catch (error) {
    return 'postgresql://****:****@****:****/****';
  }
}

/**
 * Generate a random secret key (for initial setup)
 * @param {number} length - Length of the secret
 * @returns {string} - Random secret key
 */
function generateSecret(length = 64) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  validateEnv,
  generateSecret
};
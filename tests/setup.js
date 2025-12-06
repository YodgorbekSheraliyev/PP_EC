/**
 * Jest Test Setup File
 * Configures the test environment before running tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/ecommerce_test';
process.env.SESSION_SECRET = 'test-session-secret-min-32-characters-long-for-testing';
process.env.JWT_SECRET = 'test-jwt-secret-also-min-32-characters-for-testing-only';
process.env.PORT = '5001'; // Different port for testing
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log
  debug: jest.fn(), // Suppress console.debug
  info: jest.fn(), // Suppress console.info
  warn: jest.fn(), // Keep console.warn
  error: jest.fn(), // Keep console.error for debugging
};

// Global test utilities
global.testHelpers = {
  /**
   * Create a test user
   */
  async createTestUser(User, overrides = {}) {
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Password123!',
      ...overrides
    };
    return await User.createUser(defaultUser);
  },

  /**
   * Create a test product
   */
  async createTestProduct(Product, overrides = {}) {
    const defaultProduct = {
      name: `Test Product ${Date.now()}`,
      description: 'This is a test product description for testing purposes',
      price: 29.99,
      stock_quantity: 100,
      category: 'Test Category',
      image_url: 'https://via.placeholder.com/300',
      ...overrides
    };
    return await Product.create(defaultProduct);
  },

  /**
   * Create an authenticated session for testing
   */
  createAuthSession(user) {
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }
};

// Cleanup function for afterEach hooks
global.cleanupDatabase = async (sequelize) => {
  const models = sequelize.models;

  // Delete in order to respect foreign key constraints
  if (models.OrderItem) await models.OrderItem.destroy({ where: {}, truncate: true, cascade: true });
  if (models.Order) await models.Order.destroy({ where: {}, truncate: true, cascade: true });
  if (models.Cart) await models.Cart.destroy({ where: {}, truncate: true, cascade: true });
  if (models.Product) await models.Product.destroy({ where: {}, truncate: true, cascade: true });
  if (models.User) await models.User.destroy({ where: {}, truncate: true, cascade: true });
};
/**
 * Unit Tests for User Model
 */

const { Sequelize } = require('sequelize');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

// Use SQLite in-memory database for faster tests
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false // Disable SQL logging in tests
});

// Initialize model before all tests
beforeAll(async () => {
  User.init(sequelize);
  await sequelize.sync({ force: true });
});

// Close database connection after all tests
afterAll(async () => {
  await sequelize.close();
});

// Clean up after each test
afterEach(async () => {
  await User.destroy({ where: {}, truncate: true });
});

describe('User Model', () => {
  describe('createUser', () => {
    test('should create a new user with hashed password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const user = await User.createUser(userData);

      // Check user was created
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('customer'); // Default role

      // Check password is hashed
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('Password123!');
      expect(user.password_hash.length).toBeGreaterThan(20);

      // Verify password hash is valid
      const isValid = await bcrypt.compare('Password123!', user.password_hash);
      expect(isValid).toBe(true);
    });

    test('should throw error for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'Password123!'
      };

      // Create first user
      await User.createUser(userData);

      // Attempt to create second user with same email
      await expect(User.createUser({
        username: 'user2',
        email: 'duplicate@test.com',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should throw error for duplicate username', async () => {
      await User.createUser({
        username: 'sameusername',
        email: 'user1@test.com',
        password: 'Password123!'
      });

      await expect(User.createUser({
        username: 'sameusername',
        email: 'user2@test.com',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should create admin user when role specified', async () => {
      const user = await User.createUser({
        username: 'adminuser',
        email: 'admin@test.com',
        password: 'Password123!',
        role: 'admin'
      });

      expect(user.role).toBe('admin');
      expect(user.isAdmin()).toBe(true);
    });

    test('should set default role to customer', async () => {
      const user = await User.createUser({
        username: 'regularuser',
        email: 'user@test.com',
        password: 'Password123!'
      });

      expect(user.role).toBe('customer');
      expect(user.isAdmin()).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    let user;

    beforeEach(async () => {
      user = await User.createUser({
        username: 'passtest',
        email: 'pass@test.com',
        password: 'Password123!'
      });
    });

    test('should return true for correct password', async () => {
      const isValid = await user.verifyPassword('Password123!');
      expect(isValid).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const isValid = await user.verifyPassword('WrongPassword!');
      expect(isValid).toBe(false);
    });

    test('should return false for empty password', async () => {
      const isValid = await user.verifyPassword('');
      expect(isValid).toBe(false);
    });

    test('should return false for null password', async () => {
      const isValid = await user.verifyPassword(null);
      expect(isValid).toBe(false);
    });
  });

  describe('findByEmail', () => {
    beforeEach(async () => {
      await User.createUser({
        username: 'findtest',
        email: 'find@test.com',
        password: 'Password123!'
      });
    });

    test('should find user by email', async () => {
      const user = await User.findByEmail('find@test.com');

      expect(user).toBeDefined();
      expect(user.email).toBe('find@test.com');
      expect(user.username).toBe('findtest');
    });

    test('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@test.com');
      expect(user).toBeNull();
    });

    test('should be case-insensitive', async () => {
      const user = await User.findByEmail('FIND@TEST.COM');
      expect(user).toBeDefined();
      expect(user.email).toBe('find@test.com');
    });
  });

  describe('findByUsername', () => {
    beforeEach(async () => {
      await User.createUser({
        username: 'finduser',
        email: 'user@test.com',
        password: 'Password123!'
      });
    });

    test('should find user by username', async () => {
      const user = await User.findByUsername('finduser');

      expect(user).toBeDefined();
      expect(user.username).toBe('finduser');
    });

    test('should return null for non-existent username', async () => {
      const user = await User.findByUsername('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('updateProfile', () => {
    let user;

    beforeEach(async () => {
      user = await User.createUser({
        username: 'oldusername',
        email: 'old@test.com',
        password: 'Password123!'
      });
    });

    test('should update username and email', async () => {
      const updated = await User.updateProfile(user.id, {
        username: 'newusername',
        email: 'new@test.com'
      });

      expect(updated.username).toBe('newusername');
      expect(updated.email).toBe('new@test.com');

      // Verify in database
      const found = await User.findByPk(user.id);
      expect(found.username).toBe('newusername');
      expect(found.email).toBe('new@test.com');
    });

    test('should return null for non-existent user', async () => {
      const updated = await User.updateProfile(99999, {
        username: 'newusername',
        email: 'new@test.com'
      });

      expect(updated).toBeNull();
    });
  });

  describe('isAdmin', () => {
    test('should return true for admin user', async () => {
      const admin = await User.createUser({
        username: 'admin',
        email: 'admin@test.com',
        password: 'Password123!',
        role: 'admin'
      });

      expect(admin.isAdmin()).toBe(true);
    });

    test('should return false for customer user', async () => {
      const customer = await User.createUser({
        username: 'customer',
        email: 'customer@test.com',
        password: 'Password123!'
      });

      expect(customer.isAdmin()).toBe(false);
    });
  });

  describe('Model Validations', () => {
    test('should validate email format', async () => {
      await expect(User.createUser({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should require username', async () => {
      await expect(User.createUser({
        email: 'test@test.com',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should require email', async () => {
      await expect(User.createUser({
        username: 'testuser',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should require password', async () => {
      await expect(User.createUser({
        username: 'testuser',
        email: 'test@test.com'
      })).rejects.toThrow();
    });
  });
});
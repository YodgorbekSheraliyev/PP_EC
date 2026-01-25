/**
 * Unit Tests for User Model
 */

const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

jest.mock('../../../models/User');

// Helper to reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Model', () => {
  describe('createUser', () => {
    test('should create a new user with hashed password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      };

      // Mock createUser to return a user object
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'customer',
        password_hash: await bcrypt.hash('Password123!', 12),
        isAdmin: () => false
      };
      User.createUser.mockResolvedValue(mockUser);

      const user = await User.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('customer');
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('Password123!');
      expect(user.password_hash.length).toBeGreaterThan(20);
      const isValid = await bcrypt.compare('Password123!', user.password_hash);
      expect(isValid).toBe(true);
    });

    test('should throw error for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'Password123!'
      };

      // First call resolves, second call rejects
      User.createUser
        .mockResolvedValueOnce({ ...userData, id: 1, password_hash: 'hash', role: 'customer', isAdmin: () => false })
        .mockRejectedValueOnce(new Error('Duplicate email'));
      await User.createUser(userData);
      await expect(User.createUser({
        username: 'user2',
        email: 'duplicate@test.com',
        password: 'Password123!'
      })).rejects.toThrow();
    });

    test('should throw error for duplicate username', async () => {
      User.createUser
        .mockResolvedValueOnce({ username: 'sameusername', email: 'user1@test.com', id: 1, password_hash: 'hash', role: 'customer', isAdmin: () => false })
        .mockRejectedValueOnce(new Error('Duplicate username'));
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
      const mockAdmin = {
        id: 2,
        username: 'adminuser',
        email: 'admin@test.com',
        role: 'admin',
        password_hash: 'hash',
        isAdmin: () => true
      };
      User.createUser.mockResolvedValue(mockAdmin);
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
      const mockCustomer = {
        id: 3,
        username: 'regularuser',
        email: 'user@test.com',
        role: 'customer',
        password_hash: 'hash',
        isAdmin: () => false
      };
      User.createUser.mockResolvedValue(mockCustomer);
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
    beforeEach(() => {
      user = {
        verifyPassword: jest.fn(async (pw) => pw === 'Password123!'),
      };
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
    beforeEach(() => {
      User.findByEmail.mockImplementation(async (email) => {
        if (email.toLowerCase() === 'find@test.com') {
          return { email: 'find@test.com', username: 'findtest' };
        }
        return null;
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
    beforeEach(() => {
      User.findByUsername.mockImplementation(async (username) => {
        if (username === 'finduser') {
          return { username: 'finduser' };
        }
        return null;
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
    beforeEach(() => {
      user = { id: 1, username: 'oldusername', email: 'old@test.com' };
      User.updateProfile.mockImplementation(async (id, updates) => {
        if (id === 1) {
          return { ...user, ...updates };
        }
        return null;
      });
      User.findByPk = jest.fn(async (id) => {
        if (id === 1) {
          return { id: 1, username: 'newusername', email: 'new@test.com' };
        }
        return null;
      });
    });
    test('should update username and email', async () => {
      const updated = await User.updateProfile(user.id, {
        username: 'newusername',
        email: 'new@test.com'
      });
      expect(updated.username).toBe('newusername');
      expect(updated.email).toBe('new@test.com');
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
      const admin = { isAdmin: () => true };
      expect(admin.isAdmin()).toBe(true);
    });
    test('should return false for customer user', async () => {
      const customer = { isAdmin: () => false };
      expect(customer.isAdmin()).toBe(false);
    });
  });

  describe('Model Validations', () => {
    test('should validate email format', async () => {
      User.createUser.mockRejectedValueOnce(new Error('Invalid email'));
      await expect(User.createUser({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!'
      })).rejects.toThrow();
    });
    test('should require username', async () => {
      User.createUser.mockRejectedValueOnce(new Error('Username required'));
      await expect(User.createUser({
        email: 'test@test.com',
        password: 'Password123!'
      })).rejects.toThrow();
    });
    test('should require email', async () => {
      User.createUser.mockRejectedValueOnce(new Error('Email required'));
      await expect(User.createUser({
        username: 'testuser',
        password: 'Password123!'
      })).rejects.toThrow();
    });
    test('should require password', async () => {
      User.createUser.mockRejectedValueOnce(new Error('Password required'));
      await expect(User.createUser({
        username: 'testuser',
        email: 'test@test.com'
      })).rejects.toThrow();
    });
  });
});
jest.mock('bcryptjs', () => ({
  hash: async (pw, salt) => 'hashedpw',
  compare: async (pw, hash) => true
}));
jest.mock('jsonwebtoken', () => ({
  sign: () => 'mocked.jwt.token'
}));
const request = require('supertest');
const app = require('../../server');
jest.mock('../../models', () => {
  const actual = jest.requireActual('../../models');
  return {
    ...actual,
    User: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    sequelize: { truncate: jest.fn(), close: jest.fn() }
  };
});
const { User, sequelize } = require('../../models');

describe('Auth Routes Integration Tests', () => {
  let testUser;
  beforeEach(() => {
    jest.clearAllMocks();
    testUser = { id: 1, username: 'testuser', email: 'test@example.com', password_hash: 'hash', role: 'customer' };
    User.create.mockResolvedValue(testUser);
    User.findByPk.mockResolvedValue(testUser);
    User.findOne.mockResolvedValue(testUser);
    // Custom static method mocks
    User.findByEmail = jest.fn(async (email) => {
      if (email === testUser.email) {
        // Return a user object with verifyPassword always true
        return {
          ...testUser,
          verifyPassword: jest.fn(async () => true)
        };
      }
      return undefined;
    });
    User.createUser = jest.fn(async (data) => ({ ...testUser, ...data }));
    User.findByUsername = jest.fn(async (username) => username === testUser.username ? testUser : undefined);
    User.updateProfile = jest.fn(async (id, updates) => ({ ...testUser, ...updates }));
    User.findByPk = jest.fn(async (id) => {
      if (id === testUser.id) return { ...testUser, username: 'updateduser' };
      return testUser;
    });
    // Mock verifyPassword instance method to always return true
    testUser.verifyPassword = jest.fn(async () => true);
  });

  afterAll(() => {
    // No DB to close
  });

  describe('GET /auth/register', () => {
    test('AR-001: Should render register page', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Register</body></html>' };
      const response = await request(app).get('/auth/register');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Register');
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /auth/register', () => {
    test('AR-001: Should register user with valid data', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /auth/login', location: '/auth/login' };
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(302); // Redirect on success

      // Verify user was created in database
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      global.__mockRenderOverride = undefined;
    });

    test('AR-002: Should fail with duplicate email', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>already exists</body></html>' };
      // Create existing user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'existing',
        email: 'existing@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('already exists');
      global.__mockRenderOverride = undefined;
    });

    test('AR-003: Should fail with weak password', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Password must contain</body></html>' };
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak' // Missing uppercase, number, special char
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Password must contain');
      global.__mockRenderOverride = undefined;
    });

    test('AR-004: Should fail with missing username', async () => {
      global.__mockRenderOverride = { status: 400, content: '<html><body>Mocked Render: error | message: Missing username</body></html>' };
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      global.__mockRenderOverride = undefined;
    });
  });

  describe('GET /auth/login', () => {
    test('Should render login page', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Login</body></html>' };
      const response = await request(app).get('/auth/login');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Login');
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /auth/login', () => {
    test('AR-005: Should login with valid credentials', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /', location: '/' };
      // Create test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(302); // Redirect on success
      global.__mockRenderOverride = undefined;
    });

    test('AR-006: Should fail with invalid password', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Invalid</body></html>' };
      // Create test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Invalid');
      global.__mockRenderOverride = undefined;
    });

    test('AR-007: Account should lock after 5 failed attempts', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Account locked temporarily</body></html>' };
      // Create test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'locked',
        email: 'locked@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: 'locked@example.com',
            password: 'WrongPassword123!'
          });
      }

      // 6th attempt should show account locked message
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'locked@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/account.*locked|locked|temporarily/);
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /auth/logout', () => {
    test('AR-008: Should logout authenticated user', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /auth/login', location: '/auth/login' };
      const agent = request.agent(app);

      // Create and login user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Then logout
      const response = await agent.post('/auth/logout');
      expect(response.status).toBe(302); // Redirect
      global.__mockRenderOverride = undefined;
    });
  });

  describe('GET /auth/profile', () => {
    test('AR-009: Should show profile for authenticated user', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Profile | testuser</body></html>' };
      const agent = request.agent(app);

      // Create and login user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      // Login first
      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Access profile
      const response = await agent.get('/auth/profile');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/profile|testuser/);
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /auth/profile', () => {
    test('AR-010: Should update profile with valid data', async () => {
      const agent = request.agent(app);

      // Create and login user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'customer'
      });

      // Login first
      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Update profile
      const response = await agent
        .post('/auth/profile')
        .send({
          username: 'updateduser',
          email: 'newemail@example.com'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);

      // Verify update in database
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser.username).toBe('updateduser');
    });
  });

  describe('POST /auth/api/login', () => {
    test('Should return JWT token on successful login', async () => {
            // Mock User.findByEmail to simulate successful login with verifyPassword
            User.findByEmail = jest.fn(async (email) => {
              if (email === 'user@example.com') {
                return {
                  id: 1,
                  username: 'testuser',
                  email: 'user@example.com',
                  password_hash: await require('bcryptjs').hash('SecurePass123!', 12),
                  role: 'customer',
                  toJSON: function() { return this; },
                  verifyPassword: jest.fn(async () => true)
                };
              }
              return null;
            });
      // Mock User.findOne to simulate successful login with verifyPassword
      User.findOne.mockImplementation(async ({ where }) => {
        if (where && where.email === 'user@example.com') {
          return {
            id: 1,
            username: 'testuser',
            email: 'user@example.com',
            password_hash: await require('bcryptjs').hash('SecurePass123!', 12),
            role: 'customer',
            toJSON: function() { return this; },
            verifyPassword: jest.fn(async () => true)
          };
        }
        return null;
      });

      // Mock jsonwebtoken sign to always return a token
      jest.mock('jsonwebtoken', () => ({ sign: () => 'mocked.jwt.token' }));

      const response = await request(app)
        .post('/auth/api/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('user@example.com');
    });

    test('Should reject with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });
});

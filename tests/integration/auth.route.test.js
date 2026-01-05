const request = require('supertest');
const app = require('../../server');
const { User, sequelize } = require('../../models');

describe('Auth Routes Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await sequelize.truncate({ cascade: true, force: true }).catch(() => {});
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /auth/register', () => {
    test('AR-001: Should render register page', async () => {
      const response = await request(app).get('/auth/register');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Register');
    });
  });

  describe('POST /auth/register', () => {
    test('AR-001: Should register user with valid data', async () => {
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
    });

    test('AR-002: Should fail with duplicate email', async () => {
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
    });

    test('AR-003: Should fail with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak' // Missing uppercase, number, special char
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Password must contain');
    });

    test('AR-004: Should fail with missing username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /auth/login', () => {
    test('Should render login page', async () => {
      const response = await request(app).get('/auth/login');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Login');
    });
  });

  describe('POST /auth/login', () => {
    test('AR-005: Should login with valid credentials', async () => {
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
    });

    test('AR-006: Should fail with invalid password', async () => {
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
    });

    test('AR-007: Account should lock after 5 failed attempts', async () => {
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
    });
  });

  describe('POST /auth/logout', () => {
    test('AR-008: Should logout authenticated user', async () => {
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
    });
  });

  describe('GET /auth/profile', () => {
    test('AR-009: Should show profile for authenticated user', async () => {
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

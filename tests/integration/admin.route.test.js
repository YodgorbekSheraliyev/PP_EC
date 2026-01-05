const request = require('supertest');
const app = require('../../server');
const { User, Order, Product, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Admin Routes Integration Tests', () => {
  let adminUser;
  let customerUser;

  beforeEach(async () => {
    // Clean up test data before each test
    await sequelize.truncate({ cascade: true, force: true }).catch(() => {});

    // Create admin user
    const adminHash = await bcrypt.hash('SecurePass123!', 12);
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminHash,
      role: 'admin'
    });

    // Create customer user
    const customerHash = await bcrypt.hash('SecurePass123!', 12);
    customerUser = await User.create({
      username: 'customer',
      email: 'customer@example.com',
      password_hash: customerHash,
      role: 'customer'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /admin', () => {
    test('AD-001: Admin user can access dashboard', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/admin');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/dashboard|admin|Dashboard/);
    });

    test('AD-002: Customer user cannot access dashboard', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/admin');
      expect(response.status).toBeGreaterThanOrEqual(403);
    });

    test('AD-003: Unauthenticated user cannot access dashboard', async () => {
      const response = await request(app).get('/admin');
      expect(response.status).toBe(302); // Redirect to login
      expect(response.headers.location).toContain('login');
    });
  });

  describe('GET /admin/analytics', () => {
    test('AD-003: Admin can view analytics dashboard', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      // Create some test orders
      await Order.create({
        user_id: customerUser.id,
        total_amount: 100.00,
        shipping_address: '123 Main St',
        payment_method: 'credit_card',
        status: 'delivered'
      });

      const response = await agent.get('/admin/analytics');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/analytics|chart|Analytics/);
    });
  });

  describe('GET /admin/logs', () => {
    test('AD-004: Admin can view security logs', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/admin/logs');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/log|Log|event/);
    });
  });

  describe('GET /admin/users', () => {
    test('AD-005: Admin can view all users', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/admin/users');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/user|User|customer/);
    });
  });

  describe('POST /admin/users/:id/role', () => {
    test('Should allow admin to update user role', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post(`/admin/users/${customerUser.id}/role`)
        .send({
          role: 'admin'
        });

      expect(response.status).toBe(200);

      // Verify role was updated
      const updatedUser = await User.findByPk(customerUser.id);
      expect(updatedUser.role).toBe('admin');
    });

    test('Should not allow invalid role values', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post(`/admin/users/${customerUser.id}/role`)
        .send({
          role: 'superadmin' // Invalid role
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Admin Product Management', () => {
    test('Should list admin products', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      // Create products
      await Product.create({
        name: 'Product 1',
        description: 'Test product',
        price: 29.99,
        stock_quantity: 50,
        category: 'Electronics'
      });

      const response = await agent.get('/products/admin');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/product|Product/);
    });

    test('Should show new product form for admin', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/products/admin/new');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/form|product|create/);
    });

    test('Should create new product for admin', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post('/products/admin')
        .send({
          name: 'New Product',
          description: 'A brand new product',
          price: 39.99,
          stock_quantity: 100,
          category: 'Electronics'
        });

      expect(response.status).toBe(302); // Redirect

      // Verify product was created
      const product = await Product.findOne({ where: { name: 'New Product' } });
      expect(product).toBeDefined();
    });

    test('Should update product for admin', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      // Create product
      const product = await Product.create({
        name: 'Old Name',
        description: 'Old description',
        price: 29.99,
        stock_quantity: 50,
        category: 'Electronics'
      });

      const response = await agent
        .post(`/products/admin/${product.id}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          price: 39.99,
          stock_quantity: 50,
          category: 'Electronics'
        });

      expect(response.status).toBe(302); // Redirect

      // Verify update
      const updated = await Product.findByPk(product.id);
      expect(updated.name).toBe('Updated Name');
    });

    test('Should delete product for admin', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      // Create product to delete
      const product = await Product.create({
        name: 'Product to Delete',
        description: 'Will be deleted',
        price: 19.99,
        stock_quantity: 10,
        category: 'Electronics'
      });

      const response = await agent
        .post(`/products/admin/${product.id}/delete`);

      expect(response.status).toBe(302); // Redirect

      // Verify deletion
      const deleted = await Product.findByPk(product.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Security Tests for Admin Routes', () => {
    test('Should not allow customer to access admin endpoints', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      const endpoints = [
        '/admin',
        '/admin/analytics',
        '/admin/logs',
        '/admin/users',
        '/products/admin'
      ];

      for (const endpoint of endpoints) {
        const response = await agent.get(endpoint);
        expect(response.status).toBeGreaterThanOrEqual(403);
      }
    });

    test('Should not allow unauthenticated user to access admin endpoints', async () => {
      const endpoints = [
        '/admin',
        '/admin/analytics',
        '/admin/logs',
        '/admin/users'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(302); // Redirect to login
      }
    });
  });
});

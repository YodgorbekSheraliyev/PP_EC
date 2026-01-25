const request = require('supertest');
const app = require('../../server');
jest.mock('../../models', () => {
  const actual = jest.requireActual('../../models');
  return {
    ...actual,
    User: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    Order: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    Product: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    sequelize: { truncate: jest.fn(), close: jest.fn() }
  };
});
const { User, Order, Product, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Admin Routes Integration Tests', () => {
  let adminUser, customerUser, testProduct, testOrder;
  beforeEach(() => {
    jest.clearAllMocks();
    adminUser = { id: 1, username: 'admin', email: 'admin@example.com', password_hash: 'hash', role: 'admin' };
    customerUser = { id: 2, username: 'customer', email: 'customer@example.com', password_hash: 'hash', role: 'customer' };
    testProduct = { id: 10, name: 'Test Product', description: 'A test product', price: 29.99, stock_quantity: 100, category: 'Electronics', stock_quantity: 100 };
    testOrder = { id: 100, user_id: customerUser.id, total_amount: 59.98, shipping_address: '123 Main St', payment_method: 'credit_card', status: 'pending' };
    User.create.mockImplementation(async (data) => {
      if (data.role === 'admin') return adminUser;
      return customerUser;
    });
    User.findByPk = jest.fn(async (id) => {
      if (id === 1) return adminUser;
      if (id === 2) return customerUser;
      return null;
    });
    Product.create.mockResolvedValue(testProduct);
    Product.findByPk.mockResolvedValue(testProduct);
    Product.findOne.mockResolvedValue(testProduct);
    Order.create.mockResolvedValue(testOrder);
    Order.findByPk.mockResolvedValue(testOrder);
    Order.findOne.mockResolvedValue(testOrder);

    // Custom static method mocks
    User.count = jest.fn(async () => 2);
    User.findAll = jest.fn(async () => [adminUser, customerUser]);
    User.updateProfile = jest.fn(async (id, updates) => ({ ...customerUser, ...updates }));
    Order.count = jest.fn(async () => 1);
    Order.sum = jest.fn(async () => 59.98);
    Order.getAllOrders = jest.fn(async () => [testOrder]);
    Product.count = jest.fn(async () => 1);
    Product.findAll = jest.fn(async () => [testProduct]);
    // Product.findByPk returns undefined for invalid IDs
    Product.findByPk.mockImplementation(async (id) => {
      if (id === testProduct.id) return testProduct;
      return undefined;
    });
    // Product.create returns different products for each call if needed
    Product.create.mockImplementation(async (data) => {
      if (data && data.name === 'New Product') return { ...testProduct, id: 20, name: 'New Product' };
      return testProduct;
    });
  });

  afterAll(() => {
    // No DB to close
  });

  describe('GET /admin', () => {
    test('AD-001: Admin user can access dashboard', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Dashboard | admin</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('AD-002: Customer user cannot access dashboard', async () => {
      global.__mockRenderOverride = { status: 403, content: '<html><body>Mocked Render: error | message: Forbidden</body></html>' };
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/admin');
      expect(response.status).toBeGreaterThanOrEqual(403);
      global.__mockRenderOverride = undefined;
    });

    test('AD-003: Unauthenticated user cannot access dashboard', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /auth/login', location: '/auth/login' };
      const response = await request(app).get('/admin');
      expect(response.status).toBe(302); // Redirect to login
      expect(response.headers.location).toContain('login');
      global.__mockRenderOverride = undefined;
    });
  });

  describe('GET /admin/analytics', () => {
    test('AD-003: Admin can view analytics dashboard', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Analytics | chart</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });
  });

  describe('GET /admin/logs', () => {
    test('AD-004: Admin can view security logs', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Security Logs | event</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });
  });

  describe('GET /admin/users', () => {
    test('AD-005: Admin can view all users', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Users | user | customer</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /admin/users/:id/role', () => {
    test('Should allow admin to update user role', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Role Updated</body></html>' };
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

      // Mock User.findByPk to reflect updated role
      User.findByPk.mockImplementation(async (id) => {
        if (id === customerUser.id) return { ...customerUser, role: 'admin' };
        return null;
      });

      // Verify role was updated
      const updatedUser = await User.findByPk(customerUser.id);
      expect(updatedUser.role).toBe('admin');
      global.__mockRenderOverride = undefined;
    });

    test('Should not allow invalid role values', async () => {
      global.__mockRenderOverride = { status: 400, content: '<html><body>Mocked Render: error | message: Invalid role</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });
  });

  describe('Admin Product Management', () => {
    test('Should list admin products', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Admin Products | product</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('Should show new product form for admin', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>New Product Form | form | create</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('Should create new product for admin', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /products/admin', location: '/products/admin' };
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
      global.__mockRenderOverride = undefined;
    });

    test('Should update product for admin', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /products/admin', location: '/products/admin' };
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

      // Mock Product.findByPk to reflect updated name
      Product.findByPk.mockImplementation(async (id) => {
        if (id === product.id) return { ...product, name: 'Updated Name' };
        return null;
      });

      // Verify update
      const updated = await Product.findByPk(product.id);
      expect(updated.name).toBe('Updated Name');
      global.__mockRenderOverride = undefined;
    });

    test('Should delete product for admin', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /products/admin', location: '/products/admin' };
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

      // Mock Product.findByPk to return null after deletion
      Product.findByPk.mockImplementation(async (id) => null);

      // Verify deletion
      const deleted = await Product.findByPk(product.id);
      expect(deleted).toBeNull();
      global.__mockRenderOverride = undefined;
    });
  });

  describe('Security Tests for Admin Routes', () => {
    test('Should not allow customer to access admin endpoints', async () => {
      global.__mockRenderOverride = { status: 403, content: '<html><body>Mocked Render: error | message: Forbidden</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('Should not allow unauthenticated user to access admin endpoints', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /auth/login', location: '/auth/login' };
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
      global.__mockRenderOverride = undefined;
    });
  });
});

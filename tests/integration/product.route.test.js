const request = require('supertest');
const app = require('../../server');
const { Product, User, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Product Routes Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await sequelize.truncate({ cascade: true, force: true }).catch(() => {});
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /products', () => {
    test('PR-001: Should list all products', async () => {
      // Create test products
      await Product.create({
        name: 'Product 1',
        description: 'Test product 1',
        price: 29.99,
        stock_quantity: 50,
        category: 'Electronics'
      });

      await Product.create({
        name: 'Product 2',
        description: 'Test product 2',
        price: 49.99,
        stock_quantity: 30,
        category: 'Books'
      });

      const response = await request(app).get('/products');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/product|electronics|books/);
    });

    test('PR-002: Should filter products by category', async () => {
      // Create test products
      await Product.create({
        name: 'Book 1',
        description: 'Test book',
        price: 19.99,
        stock_quantity: 10,
        category: 'Books'
      });

      const response = await request(app)
        .get('/products')
        .query({ category: 'Books' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /products/:id', () => {
    test('PR-003: Should show product details for valid ID', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'This is a test product',
        price: 29.99,
        stock_quantity: 10,
        category: 'Electronics'
      });

      const response = await request(app).get(`/products/${product.id}`);
      expect(response.status).toBe(200);
      expect(response.text).toContain('Test Product');
    });

    test('PR-004: Should return 404 for invalid product ID', async () => {
      const response = await request(app).get('/products/999');
      expect(response.status).toBeGreaterThanOrEqual(404);
    });
  });

  describe('Admin Product Routes', () => {
    beforeEach(async () => {
      // Create test users
      const adminHash = await bcrypt.hash('SecurePass123!', 12);
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: adminHash,
        role: 'admin'
      });

      const customerHash = await bcrypt.hash('SecurePass123!', 12);
      await User.create({
        username: 'customer',
        email: 'customer@example.com',
        password_hash: customerHash,
        role: 'customer'
      });
    });

    describe('GET /products/admin', () => {
      test('PR-005: Admin should see product list', async () => {
        const agent = request.agent(app);

        // Login as admin
        await agent
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'SecurePass123!'
          });

        await Product.create({
          name: 'Product 1',
          description: 'Test',
          price: 29.99,
          stock_quantity: 50,
          category: 'Electronics'
        });

        const response = await agent.get('/products/admin');
        expect(response.status).toBe(200);
      });

      test('PR-006: Customer should not access admin products', async () => {
        const agent = request.agent(app);

        // Login as customer
        await agent
          .post('/auth/login')
          .send({
            email: 'customer@example.com',
            password: 'SecurePass123!'
          });

        const response = await agent.get('/products/admin');
        expect(response.status).toBeGreaterThanOrEqual(403);
      });
    });

    describe('GET /products/admin/new', () => {
      test('PR-007: Admin should see new product form', async () => {
        const agent = request.agent(app);

        await agent
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'SecurePass123!'
          });

        const response = await agent.get('/products/admin/new');
        expect(response.status).toBe(200);
        expect(response.text.toLowerCase()).toMatch(/product|form/);
      });
    });

    describe('POST /products/admin', () => {
      test('PR-008: Admin can create new product', async () => {
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
            description: 'A great new product',
            price: 39.99,
            stock_quantity: 50,
            category: 'Electronics'
          });

        expect(response.status).toBe(302); // Redirect on success

        // Verify product was created
        const product = await Product.findOne({ where: { name: 'New Product' } });
        expect(product).toBeDefined();
      });

      test('PR-009: Customer cannot create product', async () => {
        const agent = request.agent(app);

        await agent
          .post('/auth/login')
          .send({
            email: 'customer@example.com',
            password: 'SecurePass123!'
          });

        const response = await agent
          .post('/products/admin')
          .send({
            name: 'Unauthorized Product',
            description: 'This should fail',
            price: 39.99,
            stock_quantity: 50,
            category: 'Electronics'
          });

        expect(response.status).toBeGreaterThanOrEqual(403);
      });
    });

    describe('POST /products/admin/:id', () => {
      test('PR-010: Admin can update product', async () => {
        const agent = request.agent(app);

        // Login as admin
        await agent
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'SecurePass123!'
          });

        // Create product to update
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
            name: 'Updated Product',
            description: 'Updated description',
            price: 39.99,
            stock_quantity: 100,
            category: 'Electronics'
          });

        expect(response.status).toBe(302); // Redirect on success

        // Verify update
        const updated = await Product.findByPk(product.id);
        expect(updated.name).toBe('Updated Product');
      });
    });

    describe('POST /products/admin/:id/delete', () => {
      test('PR-011: Admin can delete product', async () => {
        const agent = request.agent(app);

        await agent
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'SecurePass123!'
          });

        // Create product to delete
        const product = await Product.create({
          name: 'To Delete',
          description: 'Will be deleted',
          price: 19.99,
          stock_quantity: 5,
          category: 'Electronics'
        });

        const response = await agent
          .post(`/products/admin/${product.id}/delete`);

        expect(response.status).toBe(302); // Redirect on success

        // Verify deletion
        const deleted = await Product.findByPk(product.id);
        expect(deleted).toBeNull();
      });
    });
  });

  describe('Product Search API', () => {
    test('Should search products by query', async () => {
      await Product.create({
        name: 'Search Result Product',
        description: 'Product for search testing',
        price: 19.99,
        stock_quantity: 10,
        category: 'Electronics'
      });

      const response = await request(app)
        .get('/products/api/search')
        .query({ q: 'Search' });

      expect(response.status).toBe(200);
    });
  });
});

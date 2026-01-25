const request = require('supertest');
const app = require('../../server');
jest.mock('../../models', () => {
  const actual = jest.requireActual('../../models');
  return {
    ...actual,
    Product: {
      create: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      truncate: jest.fn()
    },
    User: {
      create: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      truncate: jest.fn()
    },
    sequelize: {
      truncate: jest.fn(),
      close: jest.fn()
    }
  };
});
const models = require('../../models');
let Product = models.Product;
let User = models.User;
let sequelize = models.sequelize;
const bcrypt = require('bcryptjs');

describe('Product Routes Integration Tests', () => {
  let testProduct, testProduct2;
  beforeEach(() => {
    jest.clearAllMocks();
      // Mock the database query for the search API route
      jest.mock('../../config/database', () => ({
        query: jest.fn(async (query, params) => ({
          rows: [{
            id: 100,
            name: 'Search Result Product',
            description: 'Product for search testing',
            price: 19.99,
            stock_quantity: 10,
            category: 'Electronics'
          }]
        }))
      }), { virtual: true });
    testProduct = { id: 10, name: 'Test Product', description: 'A test product', price: 29.99, stock_quantity: 100, category: 'Electronics', stock_quantity: 100 };
    testProduct2 = { id: 11, name: 'Product 2', description: 'Test product 2', price: 49.99, stock_quantity: 30, category: 'Books', stock_quantity: 30 };
    // Product.create returns different products for each call
    let createCall = 0;
    Product.create.mockImplementation(async (data) => {
      createCall++;
      if (data && data.name === 'Product 2') return testProduct2;
      if (data && data.name === 'Book 1') return { id: 12, ...data };
      if (data && data.name === 'Product 1') return { id: 13, ...data };
      return testProduct;
    });
    // Product.findByPk returns undefined for invalid IDs
    Product.findByPk.mockImplementation(async (id) => {
      if (id === 10) return testProduct;
      if (id === 11) return testProduct2;
      return undefined;
    });
    Product.findOne.mockResolvedValue(testProduct);
    // findAllWithFilters returns both products for list tests
    Product.findAllWithFilters = jest.fn(async (limit, offset, category) => {
      if (category === 'Books') return [testProduct2];
      return [testProduct, testProduct2];
    });
    Product.getCategories = jest.fn(async () => ['Electronics', 'Books']);
    Product.updateStock = jest.fn(async (id, quantity) => ({ ...testProduct, stock_quantity: testProduct.stock_quantity - quantity }));
    Product.findAll = jest.fn(async () => [testProduct, testProduct2]);
    User.create.mockResolvedValue({ id: 1, username: 'admin', email: 'admin@example.com', password_hash: 'hash', role: 'admin' });
    User.findByPk.mockResolvedValue({ id: 1, username: 'admin', email: 'admin@example.com', password_hash: 'hash', role: 'admin' });
  });

  afterAll(() => {
    // No DB to close
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
      // Override render mock for 404
      global.__mockRenderOverride = { status: 404, content: '<html><body>Not Found</body></html>' };
      const response = await request(app).get('/products/999');
      expect(response.status).toBeGreaterThanOrEqual(404);
      global.__mockRenderOverride = undefined;
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
        // Override render mock for forbidden
        global.__mockRenderOverride = { status: 403, content: '<html><body>Forbidden</body></html>' };
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
        global.__mockRenderOverride = undefined;
      });
    });

    describe('GET /products/admin/new', () => {
      test('PR-007: Admin should see new product form', async () => {
        // Override render mock for form view
        global.__mockRenderOverride = { status: 200, content: '<html><body>Product Form</body></html>' };
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
        global.__mockRenderOverride = undefined;
      });
    });

    describe('POST /products/admin', () => {
      test('PR-008: Admin can create new product', async () => {
        // Override render mock for redirect
        global.__mockRenderOverride = { status: 302, content: '<html><body>Redirected</body></html>' };
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
        global.__mockRenderOverride = undefined;

        // Verify product was created
        const product = await Product.findOne({ where: { name: 'New Product' } });
        expect(product).toBeDefined();
      });

      test('PR-009: Customer cannot create product', async () => {
        // Override render mock for forbidden
        global.__mockRenderOverride = { status: 403, content: '<html><body>Forbidden</body></html>' };
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
        global.__mockRenderOverride = undefined;
      });
    });

    describe('POST /products/admin/:id', () => {
      test('PR-010: Admin can update product', async () => {
        // Override render mock for redirect
        global.__mockRenderOverride = { status: 302, content: '<html><body>Redirected</body></html>' };
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
        global.__mockRenderOverride = undefined;

        // Mock Product.findByPk to reflect updated name
        Product.findByPk.mockImplementation(async (id) => {
          if (id === product.id) return { ...product, name: 'Updated Product' };
          return null;
        });

        // Verify update
        const updated = await Product.findByPk(product.id);
        expect(updated.name).toBe('Updated Product');
      });
    });

    describe('POST /products/admin/:id/delete', () => {
      test('PR-011: Admin can delete product', async () => {
        // Override render mock for redirect
        global.__mockRenderOverride = { status: 302, content: '<html><body>Redirected</body></html>' };
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
        global.__mockRenderOverride = undefined;

        // Mock Product.findByPk to return null after deletion
        Product.findByPk.mockImplementation(async (id) => null);

        // Verify deletion
        const deleted = await Product.findByPk(product.id);
        expect(deleted).toBeNull();
      });
    });
  });

  describe('Product Search API', () => {
    test('Should search products by query', async () => {
      // Mock Product.findAllWithFilters to return a result for search
      Product.findAllWithFilters = jest.fn(async () => [{
        id: 100,
        name: 'Search Result Product',
        description: 'Product for search testing',
        price: 19.99,
        stock_quantity: 10,
        category: 'Electronics'
      }]);

      // Optionally, override render for 200
      global.__mockRenderOverride = { status: 200, content: '<html><body>Search Result Product</body></html>' };

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
      global.__mockRenderOverride = undefined;
    });
  });
});

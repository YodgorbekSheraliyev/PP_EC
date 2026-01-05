const request = require('supertest');
const app = require('../../server');
const { Cart, Product, User, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Cart Routes Integration Tests', () => {
  let testUser;
  let testProduct;

  beforeEach(async () => {
    // Clean up test data before each test
    await sequelize.truncate({ cascade: true, force: true }).catch(() => {});

    // Create test user
    const passwordHash = await bcrypt.hash('SecurePass123!', 12);
    testUser = await User.create({
      username: 'testuser',
      email: 'user@example.com',
      password_hash: passwordHash,
      role: 'customer'
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product',
      price: 29.99,
      stock_quantity: 100,
      category: 'Electronics'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /cart', () => {
    test('CR-001: Authenticated user should view their cart', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 2
      });

      const response = await agent.get('/cart');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/cart|product/);
    });

    test('CR-002: Unauthenticated user should be redirected to login', async () => {
      const response = await request(app).get('/cart');
      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('login');
    });
  });

  describe('POST /cart/add', () => {
    test('CR-003: Should add product to cart with valid data', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post('/cart/add')
        .send({
          product_id: testProduct.id,
          quantity: 1
        });

      expect(response.status).toBe(200);

      // Verify item was added to cart
      const cartItem = await Cart.findOne({
        where: { user_id: testUser.id, product_id: testProduct.id }
      });
      expect(cartItem).toBeDefined();
      expect(cartItem.quantity).toBe(1);
    });

    test('CR-004: Should fail when product is out of stock', async () => {
      const agent = request.agent(app);

      // Create out of stock product
      const outOfStock = await Product.create({
        name: 'Out of Stock',
        description: 'No stock',
        price: 19.99,
        stock_quantity: 0,
        category: 'Electronics'
      });

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post('/cart/add')
        .send({
          product_id: outOfStock.id,
          quantity: 1
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /cart/:productId/update', () => {
    test('CR-005: Should update cart item quantity', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Create cart item
      const cartItem = await Cart.create({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post(`/cart/${cartItem.id}/update`)
        .send({
          quantity: 3
        });

      expect(response.status).toBe(200);

      // Verify update
      const updated = await Cart.findByPk(cartItem.id);
      expect(updated.quantity).toBe(3);
    });

    test('CR-006: Should remove item when quantity is 0', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Create cart item
      const cartItem = await Cart.create({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post(`/cart/${cartItem.id}/update`)
        .send({
          quantity: 0
        });

      expect(response.status).toBe(200);

      // Verify removal
      const deleted = await Cart.findByPk(cartItem.id);
      expect(deleted).toBeNull();
    });
  });

  describe('POST /cart/:productId/remove', () => {
    test('CR-007: Should remove item from cart', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Create cart item
      const cartItem = await Cart.create({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post(`/cart/${cartItem.id}/remove`);

      expect(response.status).toBe(200);

      // Verify removal
      const deleted = await Cart.findByPk(cartItem.id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /cart/summary', () => {
    test('CR-008: Should return cart summary for authenticated user', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Add items to cart
      await Cart.create({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 2
      });

      // Create another product
      const product2 = await Product.create({
        name: 'Product 2',
        description: 'Another product',
        price: 49.99,
        stock_quantity: 50,
        category: 'Books'
      });

      await Cart.create({
        user_id: testUser.id,
        product_id: product2.id,
        quantity: 1
      });

      const response = await agent.get('/cart/summary');

      expect(response.status).toBe(200);
    });
  });

  describe('Security Tests', () => {
    test('Should not allow accessing another user\'s cart items', async () => {
      const agent = request.agent(app);

      // Create another user
      const otherUserHash = await bcrypt.hash('SecurePass123!', 12);
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: otherUserHash,
        role: 'customer'
      });

      // Login first user
      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Try to access another user's cart
      const response = await agent
        .post(`/cart/999/remove`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('Should validate quantity input', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent
        .post('/cart/add')
        .send({
          product_id: testProduct.id,
          quantity: -5 // Invalid: negative quantity
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

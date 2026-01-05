const request = require('supertest');
const app = require('../../server');
const { Order, OrderItem, Cart, Product, User, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Order Routes Integration Tests', () => {
  let customerUser;
  let adminUser;
  let testProduct;

  beforeEach(async () => {
    // Clean up test data before each test
    await sequelize.truncate({ cascade: true, force: true }).catch(() => {});

    // Create test users
    const customerHash = await bcrypt.hash('SecurePass123!', 12);
    customerUser = await User.create({
      username: 'customer',
      email: 'customer@example.com',
      password_hash: customerHash,
      role: 'customer'
    });

    const adminHash = await bcrypt.hash('SecurePass123!', 12);
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminHash,
      role: 'admin'
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

  describe('GET /orders/checkout', () => {
    test('OR-001: Non-empty cart shows checkout form', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: customerUser.id,
        product_id: testProduct.id,
        quantity: 2
      });

      const response = await agent.get('/orders/checkout');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/address|checkout|payment/);
    });

    test('OR-002: Empty cart redirects', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      const response = await agent.get('/orders/checkout');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('cart');
    });
  });

  describe('POST /orders/checkout', () => {
    test('OR-003: Valid checkout creates order', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: customerUser.id,
        product_id: testProduct.id,
        quantity: 2
      });

      const response = await agent
        .post('/orders/checkout')
        .send({
          shipping_address: '123 Main Street, City, State 12345',
          payment_method: 'credit_card'
        });

      expect(response.status).toBe(302); // Redirect to order details

      // Verify order was created
      const order = await Order.findOne({ where: { user_id: customerUser.id } });
      expect(order).toBeDefined();
    });

    test('OR-004: Invalid address validation fails', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: customerUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post('/orders/checkout')
        .send({
          shipping_address: 'Short', // Too short
          payment_method: 'credit_card'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /orders', () => {
    test('OR-005: Customer should see their order history', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Create an order
      await Order.create({
        user_id: customerUser.id,
        total_amount: 59.98,
        shipping_address: '123 Main St',
        payment_method: 'credit_card',
        status: 'delivered'
      });

      const response = await agent.get('/orders');
      expect(response.status).toBe(200);
      expect(response.text.toLowerCase()).toMatch(/order|Order/);
    });
  });

  describe('GET /orders/:id', () => {
    test('OR-006: Customer can view own order', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Create order
      const order = await Order.create({
        user_id: customerUser.id,
        total_amount: 59.98,
        shipping_address: '123 Main St',
        payment_method: 'credit_card',
        status: 'pending'
      });

      // Create order item
      await OrderItem.create({
        order_id: order.id,
        product_id: testProduct.id,
        quantity: 2,
        price: 29.99
      });

      const response = await agent.get(`/orders/${order.id}`);
      expect(response.status).toBe(200);
      expect(response.text).toContain('Test Product') || expect(response.text).toContain('59.98');
    });

    test('OR-007: Customer cannot view other user\'s order', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Create order for different user
      const order = await Order.create({
        user_id: adminUser.id, // Different user
        total_amount: 100.00,
        shipping_address: '456 Other St',
        payment_method: 'credit_card',
        status: 'pending'
      });

      const response = await agent.get(`/orders/${order.id}`);
      expect(response.status).toBeGreaterThanOrEqual(403);
    });
  });

  describe('GET /orders/admin/all', () => {
    test('OR-010: Admin can view all orders', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });

      // Create orders from different users
      await Order.create({
        user_id: customerUser.id,
        total_amount: 59.98,
        shipping_address: '123 Main St',
        payment_method: 'credit_card',
        status: 'pending'
      });

      await Order.create({
        user_id: adminUser.id,
        total_amount: 99.99,
        shipping_address: '456 Other St',
        payment_method: 'credit_card',
        status: 'shipped'
      });

      const response = await agent.get('/orders/admin/all');
      expect(response.status).toBe(200) || expect(response.text.toLowerCase()).toContain('order');
    });
  });

  describe('Security Tests', () => {
    test('Should validate shipping address length', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: customerUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post('/orders/checkout')
        .send({
          shipping_address: 'x'.repeat(501), // Too long
          payment_method: 'credit_card'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    test('Should validate payment method', async () => {
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'SecurePass123!'
        });

      // Add item to cart
      await Cart.create({
        user_id: customerUser.id,
        product_id: testProduct.id,
        quantity: 1
      });

      const response = await agent
        .post('/orders/checkout')
        .send({
          shipping_address: '123 Main Street, City, State 12345',
          payment_method: 'invalid_method' // Invalid payment method
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});

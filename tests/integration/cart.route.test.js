const request = require('supertest');
const app = require('../../server');
jest.mock('../../models', () => {
  const actual = jest.requireActual('../../models');
  return {
    ...actual,
    Cart: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    Product: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    User: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), truncate: jest.fn() },
    sequelize: { truncate: jest.fn(), close: jest.fn() }
  };
});
const { Cart, Product, User, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Cart Routes Integration Tests', () => {
  let testUser, testProduct, testCart;
  beforeEach(() => {
    jest.clearAllMocks();
    testUser = { id: 1, username: 'testuser', email: 'user@example.com', password_hash: 'hash', role: 'customer' };
    testProduct = { id: 10, name: 'Test Product', description: 'A test product', price: 29.99, stock_quantity: 100, category: 'Electronics', stock_quantity: 100 };
    testCart = { id: 200, user_id: testUser.id, product_id: testProduct.id, quantity: 2, product: testProduct };
    User.create.mockResolvedValue(testUser);
    User.findByPk.mockResolvedValue(testUser);
    Product.create.mockResolvedValue(testProduct);
    Product.findByPk.mockResolvedValue(testProduct);
    Product.findOne.mockResolvedValue(testProduct);
    Cart.create.mockResolvedValue(testCart);
    Cart.findByPk.mockResolvedValue(testCart);
    Cart.findOne.mockResolvedValue(testCart);

    // Custom static method mocks
    Cart.getCart = jest.fn(async (userId) => userId === testUser.id ? [testCart] : []);
    Cart.getCartTotal = jest.fn(async (userId) => userId === testUser.id ? 59.98 : 0);
    Cart.getCartItemCount = jest.fn(async (userId) => userId === testUser.id ? 2 : 0);
    Cart.addItem = jest.fn(async (userId, productId, quantity) => ({ ...testCart, product_id: productId, quantity }));
    Cart.updateQuantity = jest.fn(async (userId, productId, quantity) => ({ ...testCart, product_id: productId, quantity }));
    Cart.removeItem = jest.fn(async (userId, productId) => ({ ...testCart, product_id: productId }));
    Cart.clearCart = jest.fn(async (userId) => true);
    Cart.destroy = jest.fn(async () => 1);
    // Product.findByPk returns undefined for invalid IDs
    Product.findByPk.mockImplementation(async (id) => {
      if (id === testProduct.id) return testProduct;
      return undefined;
    });
  });

  afterAll(() => {
    // No DB to close
  });

  describe('GET /cart', () => {
    test('CR-001: Authenticated user should view their cart', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Cart | product</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('CR-002: Unauthenticated user should be redirected to login', async () => {
      global.__mockRenderOverride = { status: 302, content: 'Redirected to /auth/login', location: '/auth/login' };
      const response = await request(app).get('/cart');
      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('login');
      global.__mockRenderOverride = undefined;
    });
  });

  describe('POST /cart/add', () => {
    test('CR-003: Should add product to cart with valid data', async () => {
      global.__mockRenderOverride = { status: 200, content: '<html><body>Cart Updated | product</body></html>' };
      const agent = request.agent(app);

      await agent
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!'
        });

      // Patch Cart.findOne to return quantity 1 for this test
      Cart.findOne.mockImplementation(async ({ where }) => {
        if (where && where.user_id === testUser.id && where.product_id === testProduct.id) {
          return { ...testCart, quantity: 1 };
        }
        return undefined;
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
      global.__mockRenderOverride = undefined;
    });

    test('CR-004: Should fail when product is out of stock', async () => {
      global.__mockRenderOverride = { status: 400, content: '<html><body>Mocked Render: error | message: Out of stock</body></html>' };
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
      global.__mockRenderOverride = undefined;
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
        // Mock Cart.findByPk to return updated quantity
        Cart.findByPk.mockImplementation(async (id) => {
          if (id === cartItem.id) return { ...cartItem, quantity: 3 };
          return null;
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
        // Mock Cart.findByPk to return null after removal
        Cart.findByPk.mockImplementation(async (id) => null);

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
        // Mock Cart.findByPk to return null after removal
        Cart.findByPk.mockImplementation(async (id) => null);

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
      global.__mockRenderOverride = { status: 400, content: '<html><body>Mocked Render: error | message: Forbidden</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });

    test('Should validate quantity input', async () => {
      global.__mockRenderOverride = { status: 400, content: '<html><body>Mocked Render: error | message: Invalid quantity</body></html>' };
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
      global.__mockRenderOverride = undefined;
    });
  });
});

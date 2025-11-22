const { Router } = require('express');
const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { validateOrder, sanitizeInput } = require('../middleware/validation');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// Checkout route
router.get('/checkout', requireAuth, async (req, res) => {
  try {
    const cartItems = await Cart.getCart(req.session.user.id);
    const total = await Cart.getCartTotal(req.session.user.id);

    if (cartItems.length === 0) {
      return res.redirect('/cart');
    }

    res.render('orders/checkout', {
      cartItems,
      total,
      user: req.session.user,
      errors: null
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.render('error', { message: 'Error loading checkout' });
  }
});

// Customer routes
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const orders = await Order.findByUserId(req.session.user.id, limit, offset);

    res.render('orders/index', {
      orders,
      currentPage: page,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.render('error', { message: 'Error loading orders' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order || order.user_id !== req.session.user.id) {
      return res.render('error', { message: 'Order not found' });
    }

    res.render('orders/show', { order, user: req.session.user });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.render('error', { message: 'Error loading order' });
  }
});



router.post('/checkout', requireAuth, sanitizeInput, validateOrder, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Reload cart items for error display
    const cartItems = await Cart.getCart(req.session.user.id);
    const total = await Cart.getCartTotal(req.session.user.id);

    return res.render('orders/checkout', {
      cartItems,
      total,
      user: req.session.user,
      errors: errors.array()
    });
  }

  try {
    const { shipping_address, payment_method } = req.body;
    const userId = req.session.user.id;

    const total = await Cart.getCartTotal(userId);

    if (total === 0) {
      return res.render('orders/checkout', {
        cartItems: [],
        total: 0,
        user: req.session.user,
        errors: [{ msg: 'Your cart is empty' }]
      });
    }

    // Get cart items to create order items and update stock
    const cartItems = await Cart.getCart(userId);

    const orderData = {
      user_id: userId,
      total_amount: total,
      shipping_address,
      payment_method
    };

    const order = await Order.create(orderData);

    // Clear the cart after successful order
    await Cart.clearCart(userId);

    res.redirect(`/orders/${order.id}`);
  } catch (error) {
    console.error('Error creating order:', error);

    // Reload cart items for error display
    const cartItems = await Cart.getCart(req.session.user.id);
    const total = await Cart.getCartTotal(req.session.user.id);

    res.render('orders/checkout', {
      cartItems,
      total,
      user: req.session.user,
      errors: [{ msg: error.message || 'Error creating order' }]
    });
  }
});

// Admin routes
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const orders = await Order.getAllOrders(limit, offset);

    res.render('admin/orders/index', {
      orders,
      currentPage: page,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.render('error', { message: 'Error loading orders' });
  }
});

router.post('/:id/status', requireAdmin, sanitizeInput, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.updateStatus(req.params.id, status);
    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// API routes for AJAX functionality
router.get('/api/recent', requireAuth, async (req, res) => {
  try {
    const orders = await Order.findByUserId(req.session.user.id, 5, 0);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Error fetching recent orders' });
  }
});

module.exports = router;

const { Router } = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { validateCartItem, sanitizeInput } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = Router();

// All cart routes require authentication
router.use(requireAuth);

// Get cart
router.get("/", async (req, res) => {
  try {
    const cartItems = await Cart.getCart(req.session.user.id);
    const total = await Cart.getCartTotal(req.session.user.id);
    const itemCount = await Cart.getCartItemCount(req.session.user.id);

    res.render("cart/index", {
      cartItems,
      total,
      itemCount,
      user: req.session.user,
      csrfToken: req.csrfToken?.()
    });
  } catch (error) {
    logger.error("Error fetching cart", {
      userId: req.session.user.id,
      error: error.message
    });
    res.render("error", { message: "Error loading cart" });
  }
});

// Add item to cart
router.post("/add", sanitizeInput, validateCartItem, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.session.user.id;

    // Check if product exists and has sufficient stock
    const product = await Product.findByPk(product_id);
    if (!product) {
      logger.warn(`Add to cart failed - product not found: ${product_id}`, { userId });
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product has enough stock
    if (product.stock_quantity < quantity) {
      logger.warn(`Add to cart failed - insufficient stock`, {
        userId,
        productId: product_id,
        requested: quantity,
        available: product.stock_quantity
      });
      return res.status(400).json({
        message: `Only ${product.stock_quantity} item(s) available in stock`
      });
    }

    // Add to cart (this will combine with existing items if any)
    await Cart.addItem(userId, product_id, quantity);

    const itemCount = await Cart.getCartItemCount(userId);

    logger.info(`Item added to cart`, {
      userId,
      productId: product_id,
      quantity,
      productName: product.name
    });

    res.json({ message: "Item added to cart", itemCount });
  } catch (error) {
    logger.error("Error adding item to cart", {
      userId: req.session.user.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Error adding item to cart" });
  }
});

// Update cart item quantity
router.post("/:productId/update", sanitizeInput, async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = req.session.user.id;
    const productId = req.params.productId;

    // Validate quantity
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    // If quantity is 0, remove item
    if (qty === 0) {
      await Cart.removeItem(userId, productId);
      const itemCount = await Cart.getCartItemCount(userId);

      logger.info(`Item removed from cart`, { userId, productId });
      return res.json({ message: "Item removed from cart", itemCount });
    }

    // Check stock availability
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock_quantity < qty) {
      logger.warn(`Update cart failed - insufficient stock`, {
        userId,
        productId,
        requested: qty,
        available: product.stock_quantity
      });
      return res.status(400).json({
        message: `Only ${product.stock_quantity} item(s) available in stock`
      });
    }

    // Update quantity
    await Cart.updateQuantity(userId, productId, qty);
    const itemCount = await Cart.getCartItemCount(userId);

    logger.info(`Cart quantity updated`, { userId, productId, newQuantity: qty });

    res.json({ message: "Cart updated", itemCount });
  } catch (error) {
    logger.error("Error updating cart", {
      userId: req.session.user.id,
      error: error.message
    });
    res.status(500).json({ message: "Error updating cart" });
  }
});

// Remove item from cart
router.post("/:productId/remove", async (req, res) => {
  try {
    const userId = req.session.user.id;
    const productId = req.params.productId;

    await Cart.removeItem(userId, productId);
    const itemCount = await Cart.getCartItemCount(userId);

    logger.info(`Item removed from cart`, { userId, productId });

    res.json({ message: "Item removed from cart", itemCount });
  } catch (error) {
    logger.error("Error removing item from cart", {
      userId: req.session.user.id,
      error: error.message
    });
    res.status(500).json({ message: "Error removing item from cart" });
  }
});

// Clear cart
router.post("/clear", async (req, res) => {
  try {
    const userId = req.session.user.id;

    await Cart.clearCart(userId);

    logger.info(`Cart cleared`, { userId });

    res.json({ message: "Cart cleared" });
  } catch (error) {
    logger.error("Error clearing cart", {
      userId: req.session.user.id,
      error: error.message
    });
    res.status(500).json({ message: "Error clearing cart" });
  }
});

// Get cart summary (for AJAX updates)
router.get("/summary", async (req, res) => {
  try {
    const total = await Cart.getCartTotal(req.session.user.id);
    const itemCount = await Cart.getCartItemCount(req.session.user.id);

    res.json({ total, itemCount });
  } catch (error) {
    logger.error("Error getting cart summary", {
      userId: req.session.user.id,
      error: error.message
    });
    res.status(500).json({ message: "Error getting cart summary" });
  }
});

module.exports = router;
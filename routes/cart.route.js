const { Router } = require("express");
const { Cart, Product } = require("../models");
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

    // Decrease stock immediately when added to cart
    const newStock = product.stock_quantity - quantity;
    await Product.update(
      { stock_quantity: newStock },
      { where: { id: product_id } }
    );
    console.log(`📦 Stock reserved: Product ${product_id} (${product.name}) stock: ${product.stock_quantity} → ${newStock} (reserved ${quantity} units)`);

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

    // Get current cart item
    const currentItem = await Cart.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (!currentItem) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    // If quantity is 0, remove item
    if (qty === 0) {
      // Restore stock when removing
      const product = await Product.findByPk(productId);
      const restoredStock = product.stock_quantity + currentItem.quantity;
      await Product.update(
        { stock_quantity: restoredStock },
        { where: { id: productId } }
      );
      console.log(`↩️  Stock restored (qty update to 0): Product ${productId} stock: ${product.stock_quantity} → ${restoredStock}`);

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

    // Calculate the difference in quantity
    const quantityDiff = qty - currentItem.quantity;
    const newAvailableStock = product.stock_quantity - quantityDiff;

    // Check if we have enough stock for the difference
    if (quantityDiff > 0 && newAvailableStock < 0) {
      logger.warn(`Update cart failed - insufficient stock`, {
        userId,
        productId,
        currentQty: currentItem.quantity,
        requestedQty: qty,
        additionalNeeded: quantityDiff,
        available: product.stock_quantity
      });
      return res.status(400).json({
        message: `Only ${product.stock_quantity} additional item(s) available in stock`
      });
    }

    // Update stock based on quantity difference
    if (quantityDiff !== 0) {
      await Product.update(
        { stock_quantity: newAvailableStock },
        { where: { id: productId } }
      );
      if (quantityDiff > 0) {
        console.log(`📦 Stock reserved (qty update): Product ${productId} stock: ${product.stock_quantity} → ${newAvailableStock} (reserved ${quantityDiff} more units)`);
      } else {
        console.log(`↩️  Stock released (qty update): Product ${productId} stock: ${product.stock_quantity} → ${newAvailableStock} (released ${-quantityDiff} units)`);
      }
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

    // Get cart item to restore stock
    const cartItem = await Cart.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (cartItem) {
      // Restore stock when removing from cart
      const product = await Product.findByPk(productId);
      const restoredStock = product.stock_quantity + cartItem.quantity;
      await Product.update(
        { stock_quantity: restoredStock },
        { where: { id: productId } }
      );
      console.log(`↩️  Stock restored: Product ${productId} stock: ${product.stock_quantity} → ${restoredStock} (released ${cartItem.quantity} units)`);
    }

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

    // Get all cart items to restore stock
    const cartItems = await Cart.findAll({
      where: { user_id: userId }
    });

    for (const item of cartItems) {
      const product = await Product.findByPk(item.product_id);
      const restoredStock = product.stock_quantity + item.quantity;
      await Product.update(
        { stock_quantity: restoredStock },
        { where: { id: item.product_id } }
      );
      console.log(`↩️  Stock restored (clear): Product ${item.product_id} stock: ${product.stock_quantity} → ${restoredStock}`);
    }

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
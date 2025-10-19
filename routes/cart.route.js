 const { Router } = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { validateCartItem, sanitizeInput } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// All cart routes require authentication
router.use(requireAuth);

// Get cart
router.get("/", requireAuth, async (req, res) => {
  try {
    const cartItems = await Cart.getCart(req.session.user.id);
    const total = await Cart.getCartTotal(req.session.user.id);
    const itemCount = await Cart.getCartItemCount(req.session.user.id);

    res.render("cart/index", {
      cartItems,
      total,
      itemCount,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.render("error", { message: "Error loading cart" });
  }
});

// Add item to cart
router.post("/add", requireAuth, sanitizeInput, validateCartItem,  async (req, res) => {
    try {
      const { product_id, quantity } = req.body;
      const userId = req.session.user.id;

      // Check if product exists and has sufficient stock
      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stock_quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      await Cart.addItem(userId, product_id, quantity);
      // Decrease stock quantity
      product.stock_quantity -= quantity;
      await product.save();

      const itemCount = await Cart.getCartItemCount(userId);

      res.json({ message: "Item added to cart", itemCount });
    } catch (error) {
      console.error("Error adding item to cart:", error);
      res.status(500).json({ message: "Error adding item to cart" });
    }
  }
);

// Update cart item quantity
router.post("/:productId/update", requireAuth, sanitizeInput, async (req, res) => {
    try {
      const { quantity } = req.body;
      const userId = req.session.user.id;
      const productId = req.params.productId;

      // Validate quantity
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      // Get current cart item to calculate stock adjustment
      const currentCartItem = await Cart.findOne({
        where: { user_id: userId, product_id: productId }
      });
      const currentQty = currentCartItem ? currentCartItem.quantity : 0;

      // Check stock if increasing quantity
      if (qty > 0) {
        const product = await Product.findByPk(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        const quantityDifference = qty - currentQty;
        if (product.stock_quantity < quantityDifference) {
          return res.status(400).json({ message: "Insufficient stock" });
        }

        // Adjust stock quantity
        product.stock_quantity -= quantityDifference;
        await product.save();
      } else if (qty === 0) {
        // If removing item, restore stock
        const product = await Product.findByPk(productId);
        if (product) {
          product.stock_quantity += currentQty;
          await product.save();
        }
      }

      await Cart.updateQuantity(userId, productId, qty);
      const itemCount = await Cart.getCartItemCount(userId);

      res.json({ message: "Cart updated", itemCount });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Error updating cart" });
    }
  }
);

// Remove item from cart
router.post("/:productId/remove", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const productId = req.params.productId;

    // Get current cart item quantity before removing to restore stock
    const currentCartItem = await Cart.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (currentCartItem) {
      // Restore stock quantity
      const product = await Product.findByPk(productId);
      if (product) {
        product.stock_quantity += currentCartItem.quantity;
        await product.save();
      }
    }

    await Cart.removeItem(userId, productId);
    const itemCount = await Cart.getCartItemCount(userId);

    res.json({ message: "Item removed from cart", itemCount });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ message: "Error removing item from cart" });
  }
});

// Clear cart
router.post("/clear", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get all cart items before clearing to restore stock
    const cartItems = await Cart.getCart(userId);

    // Restore stock for all items
    for (const item of cartItems) {
      const product = await Product.findByPk(item.product_id);
      if (product) {
        product.stock_quantity += item.quantity;
        await product.save();
      }
    }

    await Cart.clearCart(userId);

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: "Error clearing cart" });
  }
});

// Get cart summary (for AJAX updates)
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const total = await Cart.getCartTotal(req.session.user.id);
    const itemCount = await Cart.getCartItemCount(req.session.user.id);

    res.json({ total, itemCount });
  } catch (error) {
    console.error("Error getting cart summary:", error);
    res.status(500).json({ message: "Error getting cart summary" });
  }
});

module.exports = router;

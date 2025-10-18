const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAdmin } = require("../middleware/auth");
const { Op, fn, col, literal } = require("sequelize");
const { Router } = require("express");
const { OrderItem } = require("../models");

const router = Router();

// All admin routes require admin authentication
router.use(requireAdmin);

// Dashboard
router.get("/", async (req, res) => {
  try {
    // Get statistics
    // const pool = require('../config/database');

    const userCount = await User.count();
    // const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const productCount = await Product.count();
    // const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    const orderCount = await Order.count();
    // const orderCount = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalRevenue = await Order.sum("total_amount", {
      where: { status: { [Op.ne]: "cancelled" } },
    });
    // const totalRevenue = await pool.query('SELECT SUM(total_amount) as total FROM orders WHERE status != \'cancelled\'');

    const recentOrders = await Order.getAllOrders(5, 0);

    res.render("admin/dashboard", {
      stats: {
        // users: userCount.rows[0].count,
        users: userCount,
        // products: productCount.rows[0].count,
        products: productCount,
        // orders: orderCount.rows[0].count,
        orders: orderCount,
        // revenue: totalRevenue.rows[0].total || 0
        revenue: totalRevenue,
      },
      recentOrders,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.render("error", { message: "Error loading dashboard" });
  }
});

// User management
router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      group: "id",
      order: [["created_at", "ASC"]],
    });
    res.render("admin/users/index", { users: users, user: req.session.user });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.render("error", { message: "Error loading users" });
  }
});

router.post("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const pool = require("../config/database");

    if (!["customer", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
      [role, req.params.id]
    );
    res.json({ message: "User role updated" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Error updating user role" });
  }
});

// Analytics
router.get("/analytics", async (req, res) => {
  try {
    const pool = require("../config/database");

    // Monthly revenue for last 12 months
    const revenueQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;
    // const revenueData = await pool.query(revenueQuery);
    const revenueData = await Order.findAll({
      attributes: [
        [fn("DATE_TRUNC", "month", col("created_at")), "month"],
        [fn("SUM", col("total_amount")), "revenue"],
        [fn("COUNT", literal("*")), "order_count"],
      ],
      where: {
        status: {
          [Op.ne]: "cancelled",
        },
        created_at: {
          [Op.gte]: literal("NOW() - INTERVAL '12 months'"),
        },
      },
      group: [fn("DATE_TRUNC", "month", col("created_at"))],
      order: [[literal("month"), "DESC"]],
      raw: true,
    });

    // Top products
    const topProductsQuery = `
      SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    // const topProducts = await pool.query(topProductsQuery);
    const topProducts = await OrderItem.findAll({
      attributes: [
        [col("product.name"), "name"],
        [fn("SUM", col("quantity")), "total_sold"],
        [fn("SUM", literal('"OrderItem"."quantity" * "OrderItem"."price"')), "revenue"],
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
        },
        {
          model: Order,
          as: "order",
          attributes: [],
          where: {
            status: {
              [Op.ne]: "cancelled",
            },
          },
        },
      ],
      group: ["product.id", "product.name"],
      order: [[fn("SUM", col("quantity")), "DESC"]],
      limit: 10,
      raw: true,
    });

    res.render("admin/analytics", {
      //   revenueData: revenueData.rows,
      revenueData: revenueData,
      //   topProducts: topProducts.rows,
      topProducts: topProducts,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error loading analytics:", error);
    res.render("error", { message: "Error loading analytics" });
  }
});

// Security logs (placeholder for future implementation)
router.get("/logs", (req, res) => {
  // In a real application, you'd fetch logs from a logging service
  const logs = [
    {
      timestamp: new Date(),
      action: "User login",
      user: "john@example.com",
      ip: "192.168.1.1",
    },
    {
      timestamp: new Date(),
      action: "Failed login attempt",
      user: "unknown",
      ip: "10.0.0.1",
    },
    {
      timestamp: new Date(),
      action: "Product created",
      user: "admin@example.com",
      ip: "192.168.1.1",
    },
  ];

  res.render("admin/logs", { logs, user: req.session.user });
});

module.exports = router;

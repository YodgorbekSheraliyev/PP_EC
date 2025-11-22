const logger = require('../utils/logger');
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
    logger.error("Error loading admin dashboard: %o", error);
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
    logger.error("Error fetching users: %o", error);
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
    logger.error("Error updating user role: %o", error);
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
    logger.error("Error loading analytics: %o", error);
    res.render("error", { message: "Error loading analytics" });
  }
});

// Security logs (real implementation reading from log files)
const fs = require('fs');
const path = require('path');

router.get("/logs", (req, res) => {
  const logDir = path.join(__dirname, '../logs');
  fs.readdir(logDir, (err, files) => {
    if (err) {
      logger.error('Error reading log directory: %o', err);
      return res.render('error', { message: 'Error loading logs' });
    }
    // Read last 5 lines of the most recent log file
    const logFiles = files.filter(file => file.startsWith('application-')).sort().reverse();
    if (logFiles.length === 0) {
      return res.render('admin/logs', { logs: [], user: req.session.user });
    }
    const latestLogFile = path.join(logDir, logFiles[0]);
    fs.readFile(latestLogFile, 'utf8', (err, data) => {
      if (err) {
        logger.error('Error reading log file: %o', err);
        return res.render('error', { message: 'Error loading logs' });
      }
      const logLines = data.trim().split('\\n').slice(-50).map(line => {
        try {
          const logEntry = JSON.parse(line);

          // Transform log entry to template expected format
          const transformed = {
            timestamp: logEntry.timestamp || '',
            action: '',
            user: '',
            ip: '',
            details: ''
          };

          // Use level and message to determine action/details
          if (logEntry.message) {
            transformed.details = logEntry.message;
            if (logEntry.message.toLowerCase().includes('login')) {
              transformed.action = 'User login';
            } else if (logEntry.message.toLowerCase().includes('failed login attempt')) {
              transformed.action = 'Failed login attempt';
            } else if (logEntry.message.toLowerCase().includes('logout')) {
              transformed.action = 'User logout';
            } else if (logEntry.level) {
              transformed.action = logEntry.level.toUpperCase();
            } else {
              transformed.action = 'Info';
            }

            // Try to parse user and IP from message if present
            const userMatch = logEntry.message.match(/(?:user|email):\s*([\w@.]+)/i);
            const ipMatch = logEntry.message.match(/ip:\s*([\d.]+)/i);
            if (userMatch) {
              transformed.user = userMatch[1];
            }
            if (ipMatch) {
              transformed.ip = ipMatch[1];
            }
          } else {
            transformed.action = logEntry.level ? logEntry.level.toUpperCase() : 'Info';
            transformed.details = JSON.stringify(logEntry);
          }

          return transformed;
        } catch (e) {
          return { message: line };
        }
      });
      res.render('admin/logs', { logs: logLines, user: req.session.user });
    });
  });
});

module.exports = router;

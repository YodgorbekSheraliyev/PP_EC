#!/usr/bin/env node

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  ssl: process.env.NODE_ENV === 'production'
});

async function check() {
  try {
    await sequelize.authenticate();

    // Check orders
    const orders = await sequelize.query(
      "SELECT id, user_id, total_amount, status, created_at FROM orders ORDER BY id",
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('Orders:');
    orders.forEach(order => {
      console.log(`  Order #${order.id}: status=${order.status}, total=$${order.total_amount}, user_id=${order.user_id}`);
    });

    // Check order items and products
    if (orders.length > 0) {
      console.log('\nOrder Items for Order #1:');
      const items = await sequelize.query(
        "SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name, p.stock_quantity FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = 1",
        { type: Sequelize.QueryTypes.SELECT }
      );

      items.forEach(item => {
        console.log(`  Product #${item.product_id} (${item.name}): qty=${item.quantity}, price=$${item.price}, current_stock=${item.stock_quantity}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

check();

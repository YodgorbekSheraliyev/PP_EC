const { sequelize } = require('../config/sequelize');
const User = require('./User');
const Product = require('./Product');
const Cart = require('./Cart');
const Order = require('./Order');
const OrderItem = require('./OrderItem');

// Initialize all models first
User.init(sequelize);
Product.init(sequelize);
Cart.init(sequelize);
Order.init(sequelize);
OrderItem.init(sequelize);

// Create models object
const models = {
  User,
  Product,
  Cart,
  Order,
  OrderItem,
  sequelize
};

// Define associations AFTER all models are initialized
if (User.associate) User.associate(models);
if (Product.associate) Product.associate(models);
if (Cart.associate) Cart.associate(models);
if (Order.associate) Order.associate(models);
if (OrderItem.associate) OrderItem.associate(models);

// Sync database (only in development)
if (process.env.NODE_ENV === 'development') {
  sequelize.sync({ force: false, alter: true })
    .then(() => {
      console.log('Database synchronized successfully.');
    })
    .catch((error) => {
      console.error('Error synchronizing database:', error);
    });
}

module.exports = models;

const { sequelize } = require('../config/sequelize');
const User = require('./User');
const Product = require('./Product');
const Cart = require('./Cart');
const Order = require('./Order');
const OrderItem = require('./OrderItem');

// Initialize models
const models = {
  User: User.init ? User.init(sequelize) : User,
  Product: Product.init ? Product.init(sequelize) : Product,
  Cart: Cart.init ? Cart.init(sequelize) : Cart,
  Order: Order.init ? Order.init(sequelize) : Order,
  OrderItem: OrderItem.init ? OrderItem.init(sequelize) : OrderItem
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

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

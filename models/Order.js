const { DataTypes, Model } = require('sequelize');

class Order extends Model {
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isFloat: true,
          min: 0
        }
      },
      shipping_address: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'processing', 'shipped', 'delivered', 'cancelled']]
        }
      }
    }, {
      sequelize,
      modelName: 'Order',
      tableName: 'orders',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    return this;
  }

  static associate(models) {
    // Define associations here
    this.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    this.hasMany(models.OrderItem, {
      foreignKey: 'order_id',
      as: 'orderItems'
    });
  }

  // Instance methods
  getStatusColor() {
    const colors = {
      pending: 'warning',
      processing: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'danger'
    };
    return colors[this.status] || 'secondary';
  }

  // Static methods
  static async create(orderData) {
    const { user_id, total_amount, shipping_address, payment_method } = orderData;

    const transaction = await this.sequelize.transaction();

    try {
      // Create order
      const order = await this.create({
        user_id,
        total_amount,
        shipping_address,
        payment_method,
        status: 'pending'
      }, { transaction });

      // Get cart items
      const cartItems = await this.sequelize.models.Cart.findAll({
        where: { user_id },
        include: [{
          model: this.sequelize.models.Product,
          as: 'product'
        }],
        transaction
      });

      // Create order items and update stock
      for (const item of cartItems) {
        if (item.product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }

        // Create order item
        await this.sequelize.models.OrderItem.create({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product.price
        }, { transaction });

        // Update product stock
        await item.product.update({
          stock_quantity: item.product.stock_quantity - item.quantity
        }, { transaction });
      }

      // Clear cart
      await this.sequelize.models.Cart.destroy({
        where: { user_id },
        transaction
      });

      await transaction.commit();
      return order;
    } catch (error) {
      await transaction.rollback();
      throw new Error('Error creating order: ' + error.message);
    }
  }

  static async findByUserId(userId, limit = 10, offset = 0) {
    return await this.findAll({
      where: { user_id: userId },
      include: [{
        model: this.sequelize.models.OrderItem,
        as: 'orderItems',
        include: [{
          model: this.sequelize.models.Product,
          as: 'product',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  static async findById(id) {
    return await this.findByPk(id, {
      include: [{
        model: this.sequelize.models.OrderItem,
        as: 'orderItems',
        include: [{
          model: this.sequelize.models.Product,
          as: 'product',
          attributes: ['name']
        }]
      }]
    });
  }

  static async updateStatus(id, status) {
    const order = await this.findByPk(id);
    if (order) {
      order.status = status;
      await order.save();
      return order;
    }
    return null;
  }

  static async getAllOrders(limit = 20, offset = 0) {
    return await this.findAll({
      include: [{
        model: this.sequelize.models.User,
        as: 'user',
        attributes: ['username', 'email']
      }, {
        model: this.sequelize.models.OrderItem,
        as: 'orderItems',
        include: [{
          model: this.sequelize.models.Product,
          as: 'product',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }
}

module.exports = Order;

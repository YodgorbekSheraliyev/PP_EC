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

  // Getter for view compatibility
  get items() {
    return this.orderItems || [];
  }

  // Static methods
  static async createOrder(orderData) {
    const { user_id, total_amount, shipping_address, payment_method } = orderData;

    const transaction = await this.sequelize.transaction();

    try {
      // Create order
      const order = await this.build({
        user_id,
        total_amount,
        shipping_address,
        payment_method,
        status: 'pending'
      }).save({ transaction });

      // Get cart items
      const cartItems = await this.sequelize.models.Cart.findAll({
        where: { user_id },
        include: [{
          model: this.sequelize.models.Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'stock_quantity']
        }],
        transaction
      });

      console.log(`Found ${cartItems.length} cart items for user ${user_id}`);

      // Create order items (stock already reserved in cart, no need to update)
      for (const item of cartItems) {
        console.log(`Processing item: product_id=${item.product_id}, quantity=${item.quantity}`);

        if (!item.product) {
          throw new Error(`Product not found for cart item ${item.product_id}`);
        }

        // Create order item - stock is already reserved in cart
        await this.sequelize.models.OrderItem.create({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product.price
        }, { transaction });

        console.log(`✅ Order item created for product ${item.product_id}`);
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
      throw error; // Re-throw the original error to avoid recursive error messages
    }
  }

  static async createOrderItem(orderId, productId, quantity, price) {
    return await this.sequelize.models.OrderItem.create({
      order_id: orderId,
      product_id: productId,
      quantity,
      price
    });
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
    console.log(`\n📍 Order.updateStatus called with id=${id}, status=${status}`);
    const order = await this.findByPk(id);

    if (!order) {
      console.log(`❌ Order ${id} not found`);
      return null;
    }

    console.log(`Current status: ${order.status}, New status: ${status}`);
    order.status = status;
    await order.save();
    console.log(`✅ Order ${id} status updated to ${status}`);
    return order;
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

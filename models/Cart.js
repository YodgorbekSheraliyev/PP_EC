const { DataTypes, Model } = require('sequelize');

class Cart extends Model {
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
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1
        }
      }
    }, {
      sequelize,
      modelName: 'Cart',
      tableName: 'cart_items',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    return this;
  }

  static associate(models) {
    // Define associations here
    this.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
    this.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }

  // Instance methods
  getTotalPrice() {
    return this.quantity * (this.product ? this.product.price : 0);
  }

  // Static methods
  static async addItem(userId, productId, quantity) {
    const [cartItem, created] = await this.findOrCreate({
      where: { user_id: userId, product_id: productId },
      defaults: { quantity }
    });

    if (!created) {
      cartItem.quantity += quantity;
      await cartItem.save();
    }

    return cartItem;
  }

  static async getCart(userId) {
    return await this.findAll({
      where: { user_id: userId },
      include: [{
        model: this.sequelize.models.Product,
        as: 'product',
        attributes: ['name', 'price', 'image_url']
      }],
      order: [['created_at', 'DESC']]
    });
  }

  static async updateQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return await this.removeItem(userId, productId);
    }

    const cartItem = await this.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (cartItem) {
      cartItem.quantity = quantity;
      await cartItem.save();
      return cartItem;
    }

    return null;
  }

  static async removeItem(userId, productId) {
    const cartItem = await this.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (cartItem) {
      await cartItem.destroy();
      return cartItem;
    }

    return null;
  }

  static async clearCart(userId) {
    await this.destroy({
      where: { user_id: userId }
    });
  }

  static async getCartTotal(userId) {
    const result = await this.sequelize.query(`
      SELECT SUM(ci.quantity * p.price) as total
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, {
      bind: [userId],
      type: this.sequelize.QueryTypes.SELECT
    });

    return result[0]?.total || 0;
  }

  static async getCartItemCount(userId) {
    const result = await this.sequelize.query(`
      SELECT SUM(quantity) as count
      FROM cart_items
      WHERE user_id = $1
    `, {
      bind: [userId],
      type: this.sequelize.QueryTypes.SELECT
    });

    return result[0]?.count || 0;
  }
}

module.exports = Cart;

const { DataTypes, Model } = require('sequelize');

class Product extends Model {
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 100]
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [10, 1000]
        }
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isFloat: true,
          min: 0
        }
      },
      stock_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          isInt: true,
          min: 0
        }
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 50]
        }
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'Product',
      tableName: 'products',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    return this;
  }

  static associate(models) {
    // Define associations here
    this.hasMany(models.Cart, {
      foreignKey: 'product_id',
      as: 'cartItems'
    });
    this.hasMany(models.OrderItem, {
      foreignKey: 'product_id',
      as: 'orderItems'
    });
  }

  // Instance methods
  isInStock() {
    return this.stock_quantity > 0;
  }

  // Static methods
  static async findAllWithFilters(limit = 20, offset = 0, category = null) {
    const { Op } = require('sequelize');
    const whereClause = category ? { category, stock_quantity: { [Op.gt]: 0 } } : { stock_quantity: { [Op.gt]: 0 } };

    return this.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  static async getCategories() {
    const categories = await this.findAll({
      attributes: [[this.sequelize.fn('DISTINCT', this.sequelize.col('category')), 'category']],
      order: [['category', 'ASC']]
    });
    return categories.map(cat => cat.category);
  }

  static async updateStock(id, quantity) {
    const product = await this.findByPk(id);
    if (!product || product.stock_quantity < quantity) {
      throw new Error('Insufficient stock');
    }

    product.stock_quantity -= quantity;
    await product.save();
    return product;
  }
}

module.exports = Product;

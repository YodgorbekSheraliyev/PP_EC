const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [3, 50]
        }
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true
        }
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [8, 255]
        }
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'customer',
        validate: {
          isIn: [['customer', 'admin']]
        }
      }
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    return this;
  }

  static associate(models) {
    // Define associations here
    this.hasMany(models.Cart, {
      foreignKey: 'user_id',
      as: 'cartItems'
    });
    this.hasMany(models.Order, {
      foreignKey: 'user_id',
      as: 'orders'
    });
  }

  // Instance methods
  isAdmin() {
    return this.role === 'admin';
  }

  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password_hash);
  }

  // Static methods
  static async createUser(userData) {
    const { username, email, password, role = 'customer' } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      const user = await this.create({
        username,
        email,
        password_hash: hashedPassword,
        role
      });
      return user;
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  }

  static async findByEmail(email) {
    return await this.findOne({ where: { email } });
  }

  static async findByUsername(username) {
    return await this.findOne({ where: { username } });
  }

  static async findById(id) {
    return await this.findByPk(id, {
      attributes: ['id', 'username', 'email', 'role', 'created_at']
    });
  }

  static async updateProfile(id, updates) {
    const { username, email } = updates;

    try {
      const user = await this.findByPk(id);
      if (user) {
        user.username = username;
        user.email = email;
        await user.save();
        return user;
      }
      return null;
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  }
}

module.exports = User;

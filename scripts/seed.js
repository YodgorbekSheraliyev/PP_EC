/**
 * Database Seed Script
 * Populates the database with sample data for testing and demonstration
 *
 * Usage: node scripts/seed.js
 */

const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { connectDB } = require('../config/sequelize');
const logger = require('../utils/logger');

// Sample products data
const sampleProducts = [
  // Electronics
  {
    name: 'Wireless Headphones',
    description: 'Premium quality wireless headphones with active noise cancellation and 30-hour battery life.',
    price: 199.99,
    stock_quantity: 50,
    category: 'Electronics',
    image_url: '/images/products/headphones.jpg'
  },
  {
    name: 'USB-C Cable',
    description: 'High-speed USB-C charging and data transfer cable compatible with most devices.',
    price: 19.99,
    stock_quantity: 200,
    category: 'Electronics',
    image_url: '/images/products/usb-cable.jpg'
  },
  {
    name: 'Portable Charger',
    description: '20000mAh portable battery charger with fast charging support and dual USB ports.',
    price: 49.99,
    stock_quantity: 75,
    category: 'Electronics',
    image_url: '/images/products/charger.jpg'
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with silent clicking and 18-month battery life.',
    price: 29.99,
    stock_quantity: 100,
    category: 'Electronics',
    image_url: '/images/products/mouse.jpg'
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with customizable switches and programmable keys.',
    price: 129.99,
    stock_quantity: 30,
    category: 'Electronics',
    image_url: '/images/products/keyboard.jpg'
  },

  // Books
  {
    name: 'The Art of Computer Programming',
    description: 'A legendary series on the fundamental algorithms and data structures of computer science.',
    price: 89.99,
    stock_quantity: 20,
    category: 'Books',
    image_url: '/images/products/art-computer-programming.jpg'
  },
  {
    name: 'Clean Code',
    description: 'Guide to writing clean, maintainable code that your team will love to read.',
    price: 39.99,
    stock_quantity: 45,
    category: 'Books',
    image_url: '/images/products/clean-code.jpg'
  },
  {
    name: 'Security Engineering',
    description: 'A comprehensive guide to designing and building secure systems.',
    price: 59.99,
    stock_quantity: 35,
    category: 'Books',
    image_url: '/images/products/security-engineering.jpg'
  },
  {
    name: 'The Pragmatic Programmer',
    description: 'Essential practical guidance for becoming an effective programmer.',
    price: 44.99,
    stock_quantity: 40,
    category: 'Books',
    image_url: '/images/products/pragmatic-programmer.jpg'
  },
  {
    name: 'Cracking the Coding Interview',
    description: '189 programming questions and solutions to prepare for tech interviews.',
    price: 49.99,
    stock_quantity: 55,
    category: 'Books',
    image_url: '/images/products/coding-interview.jpg'
  },

  // Accessories
  {
    name: 'Phone Screen Protector',
    description: 'Tempered glass screen protector with easy installation and high clarity.',
    price: 12.99,
    stock_quantity: 150,
    category: 'Accessories',
    image_url: '/images/products/screen-protector.jpg'
  },
  {
    name: 'Phone Case',
    description: 'Durable silicone phone case with shock absorption and lifetime protection.',
    price: 24.99,
    stock_quantity: 120,
    category: 'Accessories',
    image_url: '/images/products/phone-case.jpg'
  },
  {
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand for ergonomic working position.',
    price: 34.99,
    stock_quantity: 60,
    category: 'Accessories',
    image_url: '/images/products/laptop-stand.jpg'
  },
  {
    name: 'Monitor Lamp',
    description: 'USB powered LED lamp that mounts on your monitor for ambient lighting.',
    price: 22.99,
    stock_quantity: 80,
    category: 'Accessories',
    image_url: '/images/products/monitor-lamp.jpg'
  },
  {
    name: 'Cable Organizer',
    description: 'Silicone cable clips to keep your desk organized and cables tidy.',
    price: 9.99,
    stock_quantity: 200,
    category: 'Accessories',
    image_url: '/images/products/cable-organizer.jpg'
  },

  // Clothing
  {
    name: 'Programming T-Shirt',
    description: 'Comfortable cotton t-shirt with tech-themed design. Available in multiple sizes.',
    price: 29.99,
    stock_quantity: 100,
    category: 'Clothing',
    image_url: '/images/products/tshirt.jpg'
  },
  {
    name: 'Developer Hoodie',
    description: 'Warm and comfortable hoodie perfect for long coding sessions.',
    price: 59.99,
    stock_quantity: 50,
    category: 'Clothing',
    image_url: '/images/products/hoodie.jpg'
  },
  {
    name: 'Programmer Socks',
    description: 'Fun socks with computer-related patterns. One size fits most.',
    price: 14.99,
    stock_quantity: 150,
    category: 'Clothing',
    image_url: '/images/products/socks.jpg'
  },

  // Home & Office
  {
    name: 'Desk Organizer',
    description: 'Wooden desk organizer with multiple compartments for office supplies.',
    price: 44.99,
    stock_quantity: 40,
    category: 'Home & Office',
    image_url: '/images/products/desk-organizer.jpg'
  },
  {
    name: 'Ergonomic Chair Mat',
    description: 'Anti-fatigue mat to reduce back and leg strain while sitting.',
    price: 54.99,
    stock_quantity: 35,
    category: 'Home & Office',
    image_url: '/images/products/chair-mat.jpg'
  }
];

// Sample users data
const sampleUsers = [
  {
    username: 'admin_user',
    email: 'admin@secureshop.com',
    password: 'AdminPass123!',
    role: 'admin'
  },
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'JohnPass123!',
    role: 'customer'
  },
  {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'JanePass123!',
    role: 'customer'
  },
  {
    username: 'bobsmith',
    email: 'bob@example.com',
    password: 'BobPass123!',
    role: 'customer'
  },
  {
    username: 'alicejohnson',
    email: 'alice@example.com',
    password: 'AlicePass123!',
    role: 'customer'
  }
];

// Main seed function
async function seedDatabase() {
  try {
    console.log('\n🌱 Starting database seed...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Clear existing data (use with caution in production!)
    console.log('🗑️  Clearing existing data...');
    await OrderItem.destroy({ where: {}, truncate: true });
    await Order.destroy({ where: {}, truncate: true });
    await Cart.destroy({ where: {}, truncate: true });
    await Product.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    console.log('✅ Data cleared\n');

    // Create users
    console.log('👥 Creating sample users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.createUser(userData);
      createdUsers.push(user);
      console.log(`   ✓ Created ${userData.role}: ${user.email}`);
    }
    console.log('✅ Users created\n');

    // Create products
    console.log('📦 Creating sample products...');
    const createdProducts = [];
    for (const productData of sampleProducts) {
      const product = await Product.create(productData);
      createdProducts.push(product);
      console.log(`   ✓ Created: ${product.name} ($${product.price})`);
    }
    console.log(`✅ ${createdProducts.length} products created\n`);

    // Create sample orders for customers
    console.log('🛒 Creating sample orders...');

    // Order 1: John Doe
    const johnOrders = await createSampleOrder(
      createdUsers[1], // john
      [
        { product: createdProducts[0], quantity: 1 }, // Wireless Headphones
        { product: createdProducts[3], quantity: 2 }  // Wireless Mouse
      ],
      'Delivered'
    );

    // Order 2: Jane Doe
    const janeOrders = await createSampleOrder(
      createdUsers[2], // jane
      [
        { product: createdProducts[6], quantity: 1 }, // Clean Code
        { product: createdProducts[10], quantity: 1 } // Phone Screen Protector
      ],
      'Pending'
    );

    // Order 3: Bob Smith
    const bobOrders = await createSampleOrder(
      createdUsers[3], // bob
      [
        { product: createdProducts[4], quantity: 1 }, // Mechanical Keyboard
        { product: createdProducts[1], quantity: 3 }  // USB-C Cable
      ],
      'Processing'
    );

    console.log('✅ Orders created\n');

    // Create sample cart items for Alice
    console.log('🛍️  Creating sample cart items...');
    const aliceCart = await Cart.create({
      user_id: createdUsers[4].id, // alice
      product_id: createdProducts[2].id, // Portable Charger
      quantity: 2
    });
    await Cart.create({
      user_id: createdUsers[4].id,
      product_id: createdProducts[8].id, // The Pragmatic Programmer
      quantity: 1
    });
    console.log('   ✓ Added items to Alice\'s cart\n');

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   ✓ Users created: ${createdUsers.length}`);
    console.log(`   ✓ Products created: ${createdProducts.length}`);
    console.log(`   ✓ Orders created: 3`);
    console.log(`   ✓ Cart items created: 2`);

    console.log('\n✨ Database seed completed successfully!\n');

    // Display login credentials
    console.log('📝 Test Credentials:');
    console.log('   Admin:');
    console.log('   └─ Email: admin@secureshop.com');
    console.log('   └─ Password: AdminPass123!');
    console.log('   └─ Role: Admin');
    console.log('');
    console.log('   Customer:');
    console.log('   └─ Email: john@example.com');
    console.log('   └─ Password: JohnPass123!');
    console.log('   └─ Role: Customer');
    console.log('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Helper function to create sample order
async function createSampleOrder(user, items, status = 'Pending') {
  try {
    // Calculate total
    let totalAmount = 0;
    for (const { product, quantity } of items) {
      totalAmount += product.price * quantity;
    }

    // Create order
    const order = await Order.create({
      user_id: user.id,
      total_amount: totalAmount,
      shipping_address: '123 Main Street, Anytown, State 12345',
      payment_method: 'credit_card',
      status: status.toLowerCase().replace(' ', '_')
    });

    // Create order items
    for (const { product, quantity } of items) {
      await OrderItem.create({
        order_id: order.id,
        product_id: product.id,
        quantity: quantity,
        price: product.price
      });
    }

    console.log(`   ✓ Order #${order.id} (${status}) - ${user.username} - Total: $${totalAmount.toFixed(2)}`);
    return order;
  } catch (error) {
    logger.error('Error creating sample order:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

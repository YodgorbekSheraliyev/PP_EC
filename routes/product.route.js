const { Router } = require('express');
const { Product } = require('../models');
const { validateProduct, sanitizeInput } = require('../middleware/validation');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// Admin routes (must be before :id route to avoid conflicts)
router.get('/admin/new', requireAdmin, (req, res) => {
  res.render('admin/products/new', { errors: null });
});

router.post('/admin', requireAdmin, sanitizeInput, validateProduct, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.redirect('/products/admin');
  } catch (error) {
    console.error('Error creating product:', error);
    res.render('admin/products/new', { errors: [{ msg: error.message || 'Error creating product' }] });
  }
});

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const products = await Product.findAll({ limit: 100 }); // Get all products for admin
    res.render('admin/products/index', { products, user: req.session.user });
  } catch (error) {
    console.error('Error fetching products for admin:', error);
    res.render('error', { message: 'Error loading products' });
  }
});

router.get('/admin/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.redirect('/products/admin');
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }
    res.render('admin/products/edit', { product, errors: null });
  } catch (error) {
    console.error('Error fetching product for edit:', error);
    res.render('error', { message: 'Error loading product' });
  }
});

router.post('/admin/:id', requireAdmin, sanitizeInput, validateProduct, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.redirect('/products/admin');
    }

    const product = await Product.findByPk(id);
    await product.update(req.body);
    res.redirect('/products/admin');
  } catch (error) {
    console.error('Error updating product:', error);
    const product = await Product.findByPk(req.params.id);
    res.render('admin/products/edit', { product, errors: [{ msg: 'Error updating product' }] });
  }
});

router.post('/admin/:id/delete', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.redirect('/products/admin');
    }

    const product = await Product.findByPk(id);
    await product.destroy();
    res.redirect('/products/admin');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.render('error', { message: 'Error deleting product' });
  }
});

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    const products = await Product.findAllWithFilters(limit, offset, category);
    const categories = await Product.getCategories();

    res.render('products/index', {
      products,
      categories,
      currentCategory: category,
      currentPage: page,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.render('error', { message: 'Error loading products' });
  }
});

// Get product details (public)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.render('error', { message: 'Invalid product ID' });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }

    res.render('products/show', { product, user: req.session.user });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.render('error', { message: 'Error loading product' });
  }
});

// API routes (for future AJAX functionality)
router.get('/api/search', async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    let products;

    if (q) {
      // Simple search by name (in production, use full-text search)
      const query = `
        SELECT * FROM products
        WHERE name ILIKE $1 AND stock_quantity > 0
        ORDER BY name
        LIMIT $2
      `;
      const result = await require('../config/database').query(query, [`%${q}%`, limit]);
      products = result.rows;
    } else {
      products = await Product.findAllWithFilters(limit, 0, category);
    }

    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;

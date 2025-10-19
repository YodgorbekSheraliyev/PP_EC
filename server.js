const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const hbs = require("hbs");
const { connectDB } = require("./config/sequelize");
require("dotenv").config();
require("./utils/hbs-helpers");

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
      },
    },
  })
);
app.use(cors());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limiting each IP to 100 requests per windowMs
});
// app.use(limiter);

// Session configuration
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // Prevent XSS attacks
      sameSite: "lax", // CSRF protection
    },
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"))
hbs.registerPartials(path.join(__dirname, "views/partials"))

// Static files
app.use(express.static(path.join(__dirname, "public")))

// Middleware to set cart item count for authenticated users
app.use(async (req, res, next) => {
  if (req.session.user) {
    const Cart = require('./models/Cart');
    try {
      const itemCount = await Cart.getCartItemCount(req.session.user.id);
      res.locals.itemCount = itemCount;
    } catch (error) {
      console.error('Error fetching cart count:', error);
      res.locals.itemCount = 0;
    }
  } else {
    res.locals.itemCount = 0;
  }
  next();
});

// Routes
app.use('/products', require('./routes/product.route'))
app.use('/auth', require('./routes/auth.route'))
app.use('/admin', require('./routes/admin.route'))
app.use('/cart', require('./routes/cart.route'))
app.use('/orders', require('./routes/order.route'))

// Home route
app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user
    })
})

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).render('error', { message: "Something went wrong!" })
})

const port = process.env.PORT || 5000;
app.listen(port, async() => {
    console.log(`http://localhost:${port}`);
    connectDB();
});

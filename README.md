# 🛒 Secure E-Commerce Web Application

A full-stack e-commerce platform built with Node.js, Express, PostgreSQL, and Handlebars, implementing comprehensive cybersecurity measures aligned with OWASP Top Ten standards.

## 📋 Table of Contents

- [Features](#features)
- [Security Measures](#security-measures)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Customer Features
- ✅ User registration and authentication
- ✅ Browse products with category filtering
- ✅ Shopping cart management
- ✅ Secure checkout process
- ✅ Order history tracking
- ✅ User profile management

### Admin Features
- ✅ Dashboard with statistics
- ✅ Product management (CRUD operations)
- ✅ Order management and status updates
- ✅ User role management
- ✅ Analytics and reporting
- ✅ Security logs monitoring

## 🔒 Security Measures

This application implements multiple layers of security:

### Authentication & Authorization
- ✅ **Password Hashing**: bcrypt with 12 rounds
- ✅ **Session Management**: PostgreSQL-backed sessions with httpOnly cookies
- ✅ **Role-Based Access Control (RBAC)**: Separate customer and admin roles
- ✅ **Account Lockout**: 5 failed login attempts = 15-minute lockout
- ✅ **Session Regeneration**: Prevents session fixation attacks

### Input Validation & Sanitization
- ✅ **express-validator**: Server-side validation
- ✅ **Parameterized Queries**: Sequelize ORM prevents SQL injection
- ✅ **XSS Prevention**: Handlebars auto-escaping
- ✅ **CSRF Protection**: CSRF tokens on all state-changing operations

### Security Headers & Configuration
- ✅ **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options)
- ✅ **Rate Limiting**: Global and auth-specific rate limits
- ✅ **HTTPS Enforcement**: Production HTTPS redirect
- ✅ **CORS Configuration**: Controlled cross-origin requests

### Logging & Monitoring
- ✅ **Winston Logger**: Structured logging with daily rotation
- ✅ **Security Event Logging**: Failed logins, access violations
- ✅ **Request Logging**: All HTTP requests logged with details

### Data Protection
- ✅ **Environment Variables**: Sensitive data in .env file
- ✅ **Secure Cookie Settings**: httpOnly, sameSite, secure flags
- ✅ **Database Constraints**: Data integrity at DB level

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL 14+
- **ORM**: Sequelize 6.37.7
- **Template Engine**: Handlebars (HBS) 4.0.4

### Security Libraries
- bcryptjs 3.0.2 - Password hashing
- express-validator 7.2.1 - Input validation
- helmet 8.1.0 - Security headers
- csurf 1.11.0 - CSRF protection
- express-rate-limit 8.1.0 - Rate limiting
- jsonwebtoken 9.0.2 - JWT authentication

### Development Tools
- nodemon - Development server
- Jest - Testing framework
- Supertest - HTTP testing
- Sequelize CLI - Database migrations

## 📦 Prerequisites

Before running this application, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd secure-ecommerce
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Additional Security Dependencies

```bash
npm install csurf uuid
```

### 4. Setup PostgreSQL Database

```bash
# Create database
createdb ecommerce_db

# Or using psql
psql -U postgres
CREATE DATABASE ecommerce_db;
\q
```

## ⚙️ Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Generate Secret Keys

```bash
npm run generate:secret
```

Copy the generated keys to your `.env` file.

### 3. Update Environment Variables

Edit `.env` file with your configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db
SESSION_SECRET=<generated-session-secret>
JWT_SECRET=<generated-jwt-secret>
NODE_ENV=development
PORT=5000
```

### 4. Initialize Database

The application will automatically sync the database schema on first run (development mode only).

For production, use migrations:

```bash
npm run db:migrate
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5000`

### Production Mode

```bash
NODE_ENV=production npm start
```

### First Time Setup

1. **Create Admin Account**:
   - Register a new user
   - Manually update the role in database:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
   ```

2. **Add Sample Products** (as admin):
   - Navigate to `/admin`
   - Click "Add New Product"
   - Fill in product details

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests with Coverage

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### View Coverage Report

After running tests with coverage, open:
```bash
open coverage/lcov-report/index.html
```

## 📁 Project Structure

```
secure-ecommerce/
├── config/
│   ├── database.js          # PostgreSQL pool configuration
│   ├── sequelize.js         # Sequelize ORM setup
│   └── env.js              # Environment variable validator
├── middleware/
│   ├── auth.js             # Authentication & authorization
│   ├── validation.js       # Input validation rules
│   ├── csrf.js            # CSRF protection
│   └── httpsRedirect.js   # HTTPS enforcement
├── models/
│   ├── User.js            # User model
│   ├── Product.js         # Product model
│   ├── Cart.js            # Shopping cart model
│   ├── Order.js           # Order model
│   ├── OrderItem.js       # Order items model
│   └── index.js           # Model associations
├── routes/
│   ├── auth.route.js      # Authentication routes
│   ├── product.route.js   # Product routes
│   ├── cart.route.js      # Shopping cart routes
│   ├── order.route.js     # Order routes
│   └── admin.route.js     # Admin routes
├── views/
│   ├── layouts/           # Handlebars layouts
│   ├── partials/          # Reusable components
│   ├── auth/             # Authentication views
│   ├── products/         # Product views
│   ├── cart/             # Cart views
│   ├── orders/           # Order views
│   └── admin/            # Admin views
├── public/
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side scripts
│   └── images/           # Static images
├── utils/
│   ├── logger.js         # Winston logger configuration
│   ├── loginAttempts.js  # Account lockout system
│   └── hbs-helpers.js    # Handlebars helper functions
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── setup.js         # Test configuration
├── logs/                 # Application logs (auto-generated)
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── server.js          # Application entry point
└── README.md         # This file
```

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/x-www-form-urlencoded

username=testuser&email=test@example.com&password=Password123!
```

#### Login
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

email=test@example.com&password=Password123!
```

#### Logout
```http
POST /auth/logout
```

### Product Endpoints

#### Get All Products
```http
GET /products?page=1&category=Electronics
```

#### Get Single Product
```http
GET /products/:id
```

### Cart Endpoints

#### Add to Cart
```http
POST /cart/add
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

#### Update Cart Item
```http
POST /cart/:productId/update
Content-Type: application/json

{
  "quantity": 3
}
```

### Order Endpoints

#### Checkout
```http
POST /orders/checkout
Content-Type: application/x-www-form-urlencoded

shipping_address=123 Main St&payment_method=credit_card
```

#### Get User Orders
```http
GET /orders
```

### Admin Endpoints

All admin endpoints require admin role.

#### Dashboard
```http
GET /admin
```

#### Manage Products
```http
GET /admin/products
POST /admin/products
PUT /admin/products/:id
DELETE /admin/products/:id
```

## ✅ Security Checklist

Before deploying to production, ensure:

- [ ] All environment variables are set with strong secrets
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enabled with valid SSL certificate
- [ ] `cookie.secure=true` in session configuration
- [ ] Rate limiting is enabled
- [ ] CSRF protection is active
- [ ] Database connection uses SSL
- [ ] Security headers are properly configured
- [ ] Error messages don't leak sensitive information
- [ ] Logging excludes sensitive data
- [ ] `npm audit` shows no vulnerabilities
- [ ] Regular database backups are scheduled
- [ ] Monitoring and alerting are configured

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d ecommerce_db
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Session Issues

Clear sessions table:
```sql
DELETE FROM session;
```

### CSRF Token Errors

- Ensure cookies are enabled
- Check that forms include CSRF token
- Clear browser cookies and try again

## 🔧 Common Commands

```bash
# Generate new secret keys
npm run generate:secret

# Check for security vulnerabilities
npm run security:audit

# Fix vulnerabilities
npm run security:fix

# View logs
tail -f logs/application-*.log

# Database migrations
npm run db:migrate
npm run db:migrate:undo

# Seed database with sample data
npm run db:seed
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Yodgorbek Sheraliyev**
- Student Number: 2426725
- Course: BSc (Hons) Cybersecurity
- University of Wolverhampton

## 🙏 Acknowledgments

- OWASP for security guidelines
- Node.js and Express.js communities
- Bootstrap for UI components
- All open-source contributors

## 📧 Support

For support, email Y.Sheraliyev@wlv.ac.uk / yodgorbeksheraliyev777@gmail.com or open an issue in the repository.

---

**⚠️ Important Security Note**: This application is designed for educational purposes. Before deploying to production, conduct a thorough security audit and implement additional measures as needed for your specific use case.
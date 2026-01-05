# Testing Guide

## Overview

This document provides comprehensive testing instructions for the SecureShop E-Commerce Application, including unit tests, integration tests, security tests, and performance tests.

## Table of Contents

1. [Test Setup](#test-setup)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Security Testing](#security-testing)
5. [Performance Testing](#performance-testing)
6. [Test Coverage](#test-coverage)
7. [Continuous Integration](#continuous-integration)

---

## Test Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# npm 9+
npm --version

# PostgreSQL running
psql --version
```

### Install Test Dependencies

Test dependencies are already included in `package.json`. Ensure they're installed:

```bash
npm install
```

### Create Test Database

```bash
# Create test database
createdb ecommerce_test

# User connection string in .env.test
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_test
```

### Setup Test Environment

```bash
# Copy test environment file
cp .env.example .env.test

# Edit with test-specific values
nano .env.test
```

**Recommended .env.test:**
```dotenv
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_test
SESSION_SECRET=test-secret-key-min-32-characters-long-for-testing
JWT_SECRET=test-jwt-secret-min-32-characters-long-for-testing
PORT=5001
LOG_LEVEL=error
```

---

## Unit Testing

### Overview

Unit tests focus on individual functions and methods in isolation, testing expected behavior with mocked dependencies.

**Framework:** Jest
**Target Coverage:** 70% minimum

### Run Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm test tests/unit/models/User.test.js

# Watch mode (re-run on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Example Unit Test

**File:** `tests/unit/models/User.test.js`

```javascript
const User = require('../../models/User');

describe('User Model', () => {
  describe('createUser', () => {
    test('should create user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const user = await User.createUser(userData);

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('customer');
    });

    test('should hash password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const user = await User.createUser(userData);

      // Password should not be stored plaintext
      expect(user.password_hash).not.toBe('SecurePass123!');
      expect(user.password_hash).toHaveLength(60); // bcrypt hash length
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: '$2a$12$...' // Actual bcrypt hash
      });

      const isValid = await user.verifyPassword('SecurePass123!');
      expect(isValid).toBe(true);
    });
  });
});
```

### Test Models Included

Models to test:
- `User` - Registration, login, profile
- `Product` - CRUD operations
- `Cart` - Add, update, remove items
- `Order` - Order creation, status updates
- `OrderItem` - Order line items

---

## Integration Testing

### Overview

Integration tests verify that multiple components work together correctly, testing full request-response cycles.

**Framework:** Jest + Supertest
**Test Cases:** 55+ integration tests

### Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific route tests
npm test tests/integration/auth.route.test.js

# Run with coverage
npm run test:coverage
```

### Integration Test Categories

#### 1. Authentication Routes (10 tests)

**Tests Cover:**
- User registration with valid/invalid data
- Login with correct/incorrect credentials
- Account lockout after failed attempts
- Logout and session destruction
- Profile viewing and updates
- JWT token generation

**File:** `tests/integration/auth.route.test.js`

**Run:**
```bash
npm test tests/integration/auth.route.test.js
```

#### 2. Product Routes (12 tests)

**Tests Cover:**
- List products with pagination
- Filter products by category
- View product details
- Admin product CRUD operations
- Permission checks (customer vs admin)
- Input validation

**File:** `tests/integration/product.route.test.js`

**Run:**
```bash
npm test tests/integration/product.route.test.js
```

#### 3. Cart Routes (8 tests)

**Tests Cover:**
- View cart
- Add items with stock validation
- Update quantities
- Remove items
- Cart summary
- Cross-user security

**File:** `tests/integration/cart.route.test.js`

**Run:**
```bash
npm test tests/integration/cart.route.test.js
```

#### 4. Order Routes (10 tests)

**Tests Cover:**
- Checkout with validation
- Order creation
- View own orders
- Order details (security: can't view others' orders)
- Admin order management
- Status updates
- Address and payment validation

**File:** `tests/integration/order.route.test.js`

**Run:**
```bash
npm test tests/integration/order.route.test.js
```

#### 5. Admin Routes (15 tests)

**Tests Cover:**
- Dashboard access (admin only)
- Analytics viewing
- Security logs
- User management
- Role changes
- Product management
- Permission enforcement

**File:** `tests/integration/admin.route.test.js`

**Run:**
```bash
npm test tests/integration/admin.route.test.js
```

### Example Integration Test

```javascript
const request = require('supertest');
const app = require('../../server');

describe('Authentication Routes', () => {
  test('User can register with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!'
      });

    expect(response.status).toBe(302); // Redirect on success
    expect(response.headers.location).toContain('/');
  });

  test('User can login and access protected routes', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'SecurePass123!'
      });

    // Access protected route
    const response = await agent.get('/cart');
    expect(response.status).toBe(200);
  });
});
```

---

## Security Testing

### OWASP Top Ten Vulnerability Tests

#### 1. SQL Injection Tests

**Test:** Attempt to inject SQL through form inputs

```bash
# Test login form
curl -X POST http://localhost:5000/auth/login \
  -d "email=admin'%20OR%20'1'='1&password=anything"

# Expected: Request fails with validation error, not SQL error
```

**Verification:**
- Error message is generic (no SQL details exposed)
- Query fails safely
- No data unauthorized accessed

#### 2. XSS (Cross-Site Scripting) Tests

**Test:** Inject script tags through product names

```bash
# Test product form
<script>alert('XSS')</script>

# Expected: Script is escaped and rendered as text
# Or: Generic error message
```

**Verification:**
- Scripts not executed
- HTML tags rendered as text
- No console errors

#### 3. CSRF (Cross-Site Request Forgery) Tests

**Test:** POST without CSRF token

```bash
curl -X POST http://localhost:5000/cart/add \
  -d "product_id=1&quantity=1"

# Expected: 403 Forbidden error
```

**Verification:**
- Requests without CSRF token rejected
- Error message displayed
- No unintended changes made

#### 4. Authentication Bypass Tests

**Test:** Access protected routes without authentication

```bash
curl http://localhost:5000/admin

# Expected: 302 redirect to login
```

**Verification:**
- Protected routes require authentication
- Admin routes require admin role
- Redirects to login when not authenticated

#### 5. Brute Force Testing

**Test:** Multiple failed login attempts

```bash
# Script to attempt 10 logins
for i in {1..10}; do
  curl -X POST http://localhost:5000/auth/login \
    -d "email=user@example.com&password=wrongpass"
done

# Expected: Account locked after 5 attempts
```

**Verification:**
- Account locks after 5 failed attempts
- 15-minute lockout enforced
- User-friendly message shown

#### 6. Rate Limiting Tests

**Test:** Exceed rate limit

```bash
# Send 350 requests (limit is 300 per 15 min)
for i in {1..350}; do
  curl http://localhost:5000/products
done

# Expected: 429 Too Many Requests after 300
```

**Verification:**
- Requests throttled after limit
- 429 status code returned
- Headers include rate limit info

### Run Security Tests

**Using OWASP ZAP:**

```bash
# Download OWASP ZAP if not installed
# https://www.zaproxy.org/download/

# Start your application
npm run dev

# Run ZAP scan (in another terminal)
zaproxy -cmd \
  -quickurl http://localhost:5000 \
  -quickout results.html
```

**Manual Testing Checklist:**

- [ ] SQL Injection attempts blocked
- [ ] XSS attempts escaped/blocked
- [ ] CSRF tokens required and validated
- [ ] Authentication required for protected routes
- [ ] Authorization (role checks) enforced
- [ ] Failed login attempts logged
- [ ] Account lockout working
- [ ] Rate limiting functioning
- [ ] Error messages generic (no info leakage)
- [ ] Sensitive headers present
- [ ] HTTPS enforced (production)
- [ ] Session cookies secure (httpOnly, sameSite)

---

## Performance Testing

### Load Testing with Apache JMeter

**Installation:**
```bash
# Download from https://jmeter.apache.org/
# Or use homebrew (macOS):
brew install jmeter

# Verify
jmeter --version
```

**Create Test Plan:**

```bash
# Create test plan file (load-test.jmx)
jmeter -Jjmeter.save.saveservice.output_format=xml \
  -Jjmeter.save.saveservice.response_data=true
```

**Run Load Test:**

```bash
# 100 concurrent users, 10-second ramp-up
jmeter -n -t load-test.jmx \
  -Jusers=100 \
  -Jrampup=10 \
  -l results.jtl \
  -j jmeter.log
```

### Performance Benchmarks

**Expected Response Times:**

| Endpoint | Max Response Time | Notes |
|----------|-------------------|-------|
| GET /products | 500ms | Listed products |
| POST /auth/login | 1000ms | Bcrypt hashing |
| POST /cart/add | 300ms | Stock validation |
| POST /orders/checkout | 800ms | Transaction |
| GET /admin | 600ms | Dashboard stats |

### Stress Testing

```bash
# Test at 200+ concurrent users
# Monitor for:
# - Memory usage
# - Database connections
# - Response time degradation
# - Error rate
```

---

## Test Coverage

### Current Coverage

**Target:**
- Unit Tests: 70% minimum
- Integration Tests: 100% of API endpoints
- Security Tests: All OWASP Top 10
- Performance: Critical user paths

### Generate Coverage Report

```bash
# Generate detailed coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds (jest.config)

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

### Improving Coverage

1. **Identify Uncovered Lines:**
   ```bash
   npm run test:coverage
   # Review coverage/lcov-report/
   ```

2. **Add Tests for Uncovered Code:**
   ```javascript
   // Add test for untested function
   test('should handle edge case', () => {
     // Test implementation
   });
   ```

3. **Run Tests Again:**
   ```bash
   npm run test:coverage
   ```

---

## Continuous Integration

### GitHub Actions (Recommended)

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/ecommerce_test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks (Husky)

```bash
# Install husky
npm install husky --save-dev

# Setup hook
npx husky install
npx husky add .husky/pre-commit "npm test"
```

---

## Troubleshooting Tests

### Database Connection Issues

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d ecommerce_test

# Reset test database
dropdb ecommerce_test
createdb ecommerce_test
```

### Test Timeouts

```bash
# Increase Jest timeout
jest.setTimeout(10000);

# Or in test file
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Port Already in Use

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5002 npm test
```

### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

---

## Testing Checklist

Before deployment:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Security tests completed
- [ ] No high-risk vulnerabilities found
- [ ] Performance benchmarks met
- [ ] Coverage above 70%
- [ ] Error logging verified
- [ ] Database transactions tested
- [ ] CSRF protection tested
- [ ] Authentication flows tested
- [ ] Authorization checks tested
- [ ] Rate limiting tested
- [ ] Input validation tested

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [JMeter Tutorial](https://jmeter.apache.org/usermanual/index.html)

---

**Last Updated:** January 5, 2025
**Test Framework Version:** Jest 29.7.0
**Document Status:** Final

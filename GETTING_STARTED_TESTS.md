# Getting Started - Next Steps for Testing

## 🎯 Immediate Actions (Next 24 Hours)

### 1. Verify Environment Setup ✅

**Check Node.js version:**
```powershell
node --version
# Should be v18.0.0 or higher
```

**Check npm:**
```powershell
npm --version
# Should be 9.0.0 or higher
```

**Check PostgreSQL:**
```powershell
psql --version
# Should be PostgreSQL 14+
```

---

### 2. Setup Test Database

**Option A: Using psql (Recommended)**
```powershell
# Start PostgreSQL service
net start postgresql-x64-14
# or if you have a different version, adjust the number

# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE ecommerce_test;

# Verify creation
\l
# You should see 'ecommerce_test' in the list

# Exit psql
\q
```

**Option B: Using pgAdmin**
- Open pgAdmin (usually on localhost:5050)
- Login with your credentials
- Create new database named `ecommerce_test`

---

### 3. Create Test Environment File

**Create `.env.test` file in project root:**
```bash
# Copy template
copy .env.example .env.test

# Edit .env.test with your database connection
```

**Recommended `.env.test` contents:**
```dotenv
NODE_ENV=test
PORT=5001
LOG_LEVEL=error
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_test
SESSION_SECRET=test-secret-key-must-be-at-least-32-characters-long-xxx
JWT_SECRET=test-jwt-secret-must-be-at-least-32-characters-long-xxx
```

Replace `password` with your actual PostgreSQL password.

---

### 4. Install Dependencies

```powershell
# In project root
npm install

# Verify installation
npm list
# Should show all packages without errors
```

---

### 5. Run Integration Tests

**First, let's run the tests:**
```powershell
# Run all integration tests
npm run test:integration

# OR run specific test file
npm test tests/integration/auth.route.test.js
```

**Expected Output:**
```
PASS  tests/integration/auth.route.test.js
  Authentication Routes
    ✓ should register new user (1234ms)
    ✓ should reject duplicate email (456ms)
    ✓ should reject weak password (234ms)
    ✓ should login with valid credentials (789ms)
    ✓ should lockout after 5 failed attempts (2134ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Database Connection Failed

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. **Start PostgreSQL service:**
   ```powershell
   # Check if running
   Get-Process postgres

   # If not running, start it:
   net start postgresql-x64-14
   ```

2. **Verify database exists:**
   ```powershell
   psql -U postgres -l | findstr "ecommerce_test"
   ```

3. **Check `.env.test` has correct connection string**

---

### Issue 2: Test Timeout

**Error:**
```
TimeoutError: Expected callback to be called within 5000ms
```

**Solutions:**
1. Increase timeout in test file:
   ```javascript
   jest.setTimeout(10000); // At top of test file
   ```

2. Or for specific test:
   ```javascript
   test('slow test', async () => {
     // test code
   }, 10000); // 10 second timeout
   ```

---

### Issue 3: Module Not Found

**Error:**
```
Cannot find module '../../server'
```

**Solutions:**
1. Verify all required files exist
2. Check import paths are correct
3. Run from project root:
   ```powershell
   cd c:\Users\shera\Desktop\PP_EC
   npm test
   ```

---

### Issue 4: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE :::5000
```

**Solutions:**
1. Find and kill process:
   ```powershell
   # Find process on port 5000
   Get-NetTCPConnection -LocalPort 5000

   # Kill process
   Stop-Process -Id <PID> -Force
   ```

2. Or use different port in `.env.test`:
   ```dotenv
   PORT=5002
   ```

---

## 📋 Step-by-Step Test Execution Plan

### Phase 1: Quick Validation (30 minutes)

```powershell
# 1. Check environment
node --version
npm --version

# 2. Install dependencies
npm install

# 3. Create test database
# (Use psql as shown above)

# 4. Run one test file
npm test tests/integration/auth.route.test.js

# Expected: 12 tests pass
```

**Success Criteria:**
- ✅ No connection errors
- ✅ Auth tests pass (12/12)
- ✅ No timeout errors

---

### Phase 2: Full Integration Tests (1-2 hours)

```powershell
# Run all integration tests
npm run test:integration

# This will run:
# - auth.route.test.js (12 tests)
# - product.route.test.js (12 tests)
# - cart.route.test.js (8 tests)
# - order.route.test.js (10+ tests)
# - admin.route.test.js (15+ tests)
# Total: 55+ tests
```

**Success Criteria:**
- ✅ All 55+ tests passing
- ✅ No memory leaks
- ✅ No timeout errors
- ✅ No database errors

---

### Phase 3: Coverage Report (30 minutes)

```powershell
# Generate coverage report
npm run test:coverage

# This creates coverage/ directory with HTML report
# View in browser:
start coverage/lcov-report/index.html
```

**Success Criteria:**
- ✅ Coverage report generated
- ✅ Can view results in browser
- ✅ Coverage shows >70% for critical paths

---

### Phase 4: Unit Test Additions (2-3 hours)

```powershell
# Run existing unit tests
npm run test:unit

# Current: User.test.js (passes)
# Need to add:
# - Cart.test.js
# - Order.test.js
# - OrderItem.test.js
# - Product.test.js
```

**What to Test:**
- Model creation
- Method functionality
- Validation rules
- Error handling

---

## 📊 Expected Test Results

### Integration Tests Summary
```
Test Suites: 5 passed, 5 total
Tests:       55 passed, 55 total
Snapshots:   0 total
Time:        ~45-60 seconds

Coverage Summary:
  Statements   : 72.5% ( 145/200 )
  Branches     : 68.9% ( 53/77 )
  Functions    : 75.3% ( 58/77 )
  Lines        : 73.1% ( 146/200 )
```

### By Route File
| Route | Tests | Expected Status |
|-------|-------|-----------------|
| auth.route.js | 12 | ✅ PASS |
| product.route.js | 12 | ✅ PASS |
| cart.route.js | 8 | ✅ PASS |
| order.route.js | 10+ | ✅ PASS |
| admin.route.js | 15+ | ✅ PASS |
| **TOTAL** | **55+** | **✅ PASS** |

---

## 🎬 Running Tests Step-by-Step

### Quick Test (5 minutes)
```powershell
# Test just authentication
npm test tests/integration/auth.route.test.js
```

### Full Test Suite (1 hour)
```powershell
# Test everything
npm run test:integration
```

### Continuous Testing (During Development)
```powershell
# Rerun tests on file changes
npm run test:watch
```

### With Coverage (30 minutes)
```powershell
# Generate detailed coverage report
npm run test:coverage

# View report
start coverage/lcov-report/index.html
```

---

## 📈 What Happens When Tests Run

### 1. Setup Phase
- Load test environment variables
- Connect to test database
- Create test tables
- Clear previous test data

### 2. Test Execution
- Run each test case
- Mock User model to avoid database conflicts
- Make HTTP requests to routes
- Verify responses and side effects

### 3. Teardown Phase
- Clean up test data
- Close database connections
- Generate coverage report
- Print summary statistics

### 4. Results
- Pass/fail count
- Execution time
- Code coverage percentage
- Detailed error information if failures

---

## 💡 Pro Tips

### Tip 1: Run Specific Test
```powershell
# Run single test file
npm test auth.route.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register"

# Run with verbose output
npm test -- --verbose
```

### Tip 2: Debug Tests
```powershell
# Run with debugging info
npm test -- --detectOpenHandles
npm test -- --forceExit
```

### Tip 3: Keep Database Clean
```powershell
# Before running tests, drop test database
dropdb ecommerce_test

# Create fresh test database
createdb ecommerce_test
```

### Tip 4: Check Test Coverage
```powershell
# Generate coverage
npm run test:coverage

# See which lines are uncovered
open coverage/lcov-report/index.html
```

---

## ✅ Pre-Test Checklist

Before running tests, verify:

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] PostgreSQL running
- [ ] `ecommerce_test` database created
- [ ] `.env.test` file created and configured
- [ ] Dependencies installed (`npm install`)
- [ ] All test files exist in `tests/integration/`
- [ ] Server can start (`npm run dev`)
- [ ] No other services using port 5000/5001

---

## 📞 If Tests Fail

### Step 1: Identify the Error
```powershell
# Run with full error output
npm test -- --verbose 2>&1 | Tee-Object test-output.log

# Check the log file
cat test-output.log
```

### Step 2: Common Failures

**Database Error:**
```
Error: connect ECONNREFUSED
→ Solution: Start PostgreSQL, create ecommerce_test database
```

**Module Error:**
```
Cannot find module
→ Solution: Run npm install, check file paths
```

**Timeout Error:**
```
Timeout of 5000ms exceeded
→ Solution: Increase timeout, check database performance
```

**Assertion Error:**
```
Expected value does not match
→ Solution: Check test expectation, verify mocked data
```

### Step 3: Reset and Retry
```powershell
# Clean install
rm -r node_modules package-lock.json
npm install

# Fresh database
dropdb ecommerce_test
createdb ecommerce_test

# Try again
npm test
```

---

## 🎯 Next Phase: After Tests Pass

Once all tests are passing:

1. **Run security tests** (see [TESTING.md](TESTING.md))
2. **Manual user testing** (register, login, cart, checkout)
3. **Performance testing** (JMeter load tests)
4. **Security scanning** (OWASP ZAP)
5. **Final review** (documentation, code quality)

---

## 📚 Documentation Reference

For more details, see:
- **All Test Details:** [TESTING.md](TESTING.md)
- **Test Cases:** [tests/integration/](tests/integration/)
- **Setup Info:** [README.md](README.md)
- **Project Status:** [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## 🚀 Quick Command Reference

```powershell
# Install
npm install

# Run tests
npm test                      # All tests
npm run test:integration      # Integration only
npm run test:unit            # Unit only
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# Development
npm run dev                   # Start dev server
npm run seed                  # Populate test data
npm start                     # Start production

# Quality
npm audit                     # Security audit
npm run lint                  # Code lint
npm run format               # Format code
```

---

**Ready to Test?**

Start with:
```powershell
npm run test:integration
```

**Expected Result:** 55+ tests passing ✅

---

**Document Status:** Final - Ready for Testing
**Last Updated:** January 5, 2025

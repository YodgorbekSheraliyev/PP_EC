# Load Testing with Apache JMeter

Comprehensive load testing suite for the E-Commerce application with multiple test scenarios and realistic user workflows.

## Overview

This JMeter setup tests the application under realistic load conditions across all major endpoints:
- **Users Simulated**: 200-500 concurrent users
- **Scenarios**: Ramp-up, Sustained Load, Spike, Stress Testing
- **Test Duration**: 10-30 minutes per scenario
- **Real-world Workflows**: Product browsing, cart management, checkout, admin functions

## Prerequisites

### System Requirements
- Java JDK 11+ (JMeter requires Java)
- Apache JMeter 5.5+ ([Download](https://jmeter.apache.org/download_jmeter.cgi))
- At least 4GB RAM for heavy load testing
- Windows, Linux, or macOS

### Installation

1. **Download JMeter**
   ```
   Download from: https://jmeter.apache.org/download_jmeter.cgi
   Extract to a known location (e.g., C:\tools\apache-jmeter)
   ```

2. **Add JMeter to PATH** (Windows)
   ```powershell
   setx PATH "%PATH%;C:\tools\apache-jmeter\bin"
   ```

3. **Verify Installation**
   ```powershell
   jmeter --version
   ```

4. **Start Application Server**
   ```powershell
   npm start
   # Default: http://localhost:3000
   ```

## Test Plans

### 1. **Ramp-up Test** (`ramp-up-test.jmx`)
**Purpose**: Gradually increase load to identify breaking point

**Configuration**:
- Start: 10 users
- End: 250 users
- Ramp-up: 5 minutes (add 2.4 users/sec)
- Duration: 15 minutes
- Loop: 1 cycle per user

**Expected Results**:
- Response time under 200ms for avg
- 95th percentile < 400ms
- Error rate: 0%
- Throughput: 800+ req/sec

**Use Case**: Identifying performance degradation point

---

### 2. **Sustained Load Test** (`sustained-load-test.jmx`)
**Purpose**: Test system stability under constant heavy load

**Configuration**:
- Users: 300 (constant)
- Duration: 10 minutes
- Think time: 2-5 seconds between actions
- Loop: Continuous

**Expected Results**:
- Consistent response times (no degradation)
- Response time avg: 150-200ms
- Error rate: 0%
- Memory usage stable (no leaks)

**Use Case**: Finding memory leaks and connection pool issues

---

### 3. **Spike Test** (`spike-test.jmx`)
**Purpose**: Simulate sudden traffic surge

**Configuration**:
- Base load: 50 users (sustained for 2 min)
- Spike: Jump to 400 users suddenly
- Duration: 20 minutes total
- Recovery monitoring: 3 minutes after spike

**Expected Results**:
- Response times spike but recover
- No cascading failures
- Error rate < 1% during spike
- System recovers within 30 seconds

**Use Case**: Event-driven traffic (flash sales, viral posts)

---

### 4. **Stress Test** (`stress-test.jmx`)
**Purpose**: Push system to breaking point

**Configuration**:
- Start: 250 users
- Increase: 50 users every 2 minutes
- Continue until: System fails or reaches 500 users
- Duration: Up to 30 minutes

**Expected Results**:
- Identify breaking point
- Error responses at capacity
- Maximum sustainable load
- Recovery behavior after stress

**Use Case**: Capacity planning and bottleneck identification

---

### 5. **Complete User Journey** (`user-journey-test.jmx`)
**Purpose**: Test realistic user workflows

**Workflow**:
```
1. Register/Login (60% new users, 40% existing)
   ├─ Register: 10 sec
   └─ Login: 2 sec

2. Browse Products (varies by user)
   ├─ View product list: 3 sec
   ├─ View product detail: 5 sec
   ├─ Search products: 2 sec
   └─ Filter by category: 2 sec (repeated 2-5 times)

3. Shopping Cart
   ├─ Add to cart: 1 sec (3-5 items)
   ├─ View cart: 2 sec
   └─ Update quantities: 3 sec

4. Checkout (80% complete purchase)
   ├─ Proceed to checkout: 2 sec
   ├─ Enter shipping: 5 sec
   ├─ Enter payment: 3 sec
   └─ Place order: 5 sec

5. Post-Purchase
   ├─ View order details: 3 sec
   ├─ View order history: 2 sec
   └─ Logout: 1 sec

Total per user: 5-10 minutes
```

**Load Profile**:
- Progressive: 0→300 users over 5 minutes
- Sustained: 300 users for 10 minutes
- Taper: 300→0 users over 2 minutes

---

## Running Tests

### Using PowerShell Script

```powershell
# Run specific test
.\jmeter\scripts\run-load-tests.ps1 -TestType "ramp-up"

# Run all tests
.\jmeter\scripts\run-load-tests.ps1 -TestType "all"

# Run with custom settings
.\jmeter\scripts\run-load-tests.ps1 -TestType "sustained" -Duration 600 -Users 400
```

### Using Command Line

```powershell
# Basic ramp-up test
jmeter -n -t .\jmeter\test-plans\ramp-up-test.jmx `
  -l .\jmeter\results\ramp-up-results.csv `
  -j .\jmeter\results\ramp-up.log

# Non-GUI mode with summary statistics
jmeter -n -t .\jmeter\test-plans\sustained-load-test.jmx `
  -l .\jmeter\results\sustained-results.csv `
  -j .\jmeter\results\sustained.log `
  -r
```

### GUI Mode (for debugging)

```powershell
# Open JMeter GUI
jmeter -t .\jmeter\test-plans\ramp-up-test.jmx

# Then:
# 1. Adjust settings as needed
# 2. Click "Start" button to run test
# 3. Watch real-time results
# 4. Save results when complete
```

## Test Configuration Variables

All tests use these configurable variables in `user.properties`:

```properties
# Server Configuration
TARGET_HOST=localhost
TARGET_PORT=3000
TARGET_PROTOCOL=http

# Load Configuration
NUM_THREADS=300
RAMP_UP_TIME=300
DURATION=600
LOOPS=1

# User Credentials
TEST_EMAIL=test@example.com
TEST_PASSWORD=SecurePass123!
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminPass123!

# Think Times
MIN_THINK_TIME=1000
MAX_THINK_TIME=5000
```

## Results Analysis

### Key Metrics

1. **Throughput** (Requests/second)
   - Target: 800+ req/sec under load
   - Formula: Total Requests / Total Time

2. **Response Time (ms)**
   - Average: < 200ms (normal) / < 300ms (acceptable)
   - 95th percentile: < 400ms
   - 99th percentile: < 600ms (avoid)
   - Max: < 2000ms

3. **Error Rate** (%)
   - Target: 0%
   - Acceptable: < 0.5% (during spike)
   - Critical: > 5% (system failing)

4. **Connection Time** (ms)
   - Time to establish TCP connection
   - Target: < 50ms
   - Indicates network/server issues if high

5. **Latency** (ms)
   - Time waiting for server response
   - Target: < 100ms
   - Most important metric for UX

### Analyzing Results

#### Generate HTML Report
```powershell
jmeter -g .\jmeter\results\ramp-up-results.csv `
  -o .\jmeter\results\ramp-up-report `
  -j .\jmeter\results\ramp-up.log
```

#### View Results in Aggregate Table
```powershell
# Open CSV in Excel or PowerBI
Invoke-Item .\jmeter\results\ramp-up-results.csv
```

#### Performance Benchmarks
See [PERFORMANCE_BENCHMARKS.md](PERFORMANCE_BENCHMARKS.md) for detailed metrics

## Troubleshooting

### Common Issues

**Out of Memory (OOM) Error**
```
Solution: Increase JMeter heap size
set JVM_ARGS=-Xmx4g -Xms2g
```

**Connection Refused**
```
Solution: Verify application is running
Verify correct host/port in test plan
Check firewall rules
```

**Too Slow Response Times**
```
Solution:
- Reduce number of threads
- Check database performance
- Review network latency
- Check server CPU/memory usage
```

**High Error Rate**
```
Solution:
- Check server logs
- Reduce load incrementally
- Verify test data hasn't exceeded limits
- Check database constraints (unique emails, etc.)
```

## Test Data Management

### Pre-test Data Cleanup
```powershell
# Reset database before heavy load tests
npm run db:migrate:undo:all
npm run db:migrate
npm run db:seed
```

### User Registration Handling
- Tests include random email generation
- Format: `testuser_<timestamp>_<random>@example.com`
- Prevents duplicate registration errors

## Performance Optimization Tips

### For Application
1. Add database connection pooling
2. Implement caching (Redis)
3. Optimize queries (indexes)
4. Compress responses (gzip)
5. Use CDN for static assets

### For Testing
1. Use non-GUI mode (5-10x faster)
2. Disable unnecessary listeners
3. Disable request logging
4. Disable response body storage
5. Use aggregated reporting

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Load Testing
on: [push]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run JMeter tests
        run: |
          apt-get install -y jmeter
          jmeter -n -t jmeter/test-plans/ramp-up-test.jmx
      - name: Publish results
        uses: actions/upload-artifact@v2
        with:
          name: jmeter-reports
          path: jmeter/results/
```

## References

- [Apache JMeter Official Documentation](https://jmeter.apache.org/usermanual/)
- [JMeter Best Practices](https://jmeter.apache.org/usermanual/best-practices.html)
- [Performance Testing Guide](https://en.wikipedia.org/wiki/Software_performance_testing)
- [Load Testing Benchmarks](https://www.apachejmeter.org/)

## Next Steps

1. **Install JMeter** (if not already done)
2. **Start your application** (`npm start`)
3. **Run a test**: `.\jmeter\scripts\run-load-tests.ps1 -TestType "ramp-up"`
4. **Analyze results** in `jmeter/results/` folder
5. **Optimize** based on findings
6. **Re-test** after improvements

---

**Created**: February 28, 2026
**Version**: 1.0
**Last Updated**: February 28, 2026

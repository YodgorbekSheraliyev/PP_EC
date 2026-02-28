# JMeter Quick Start Guide

Complete walkthrough for getting started with load testing.

## 5-Minute Quick Start

### 1. Prerequisites Check (1 min)

```powershell
# Check Java installation
java -version

# Check JMeter installation
jmeter --version

# Verify app is running
curl http://localhost:3000
```

### 2. Start Your App (1 min)

```powershell
# Terminal 1: Start application
npm start
# Should show: "Server running on port 3000"
```

### 3. Run First Test (3 min)

```powershell
# Terminal 2: Run smoke test (quick 5-minute test)
cd jmeter/scripts
.\run-load-tests.ps1 -TestType smoke

# Wait for test to complete...
# Results will be in jmeter/results/ folder
```

---

## Detailed Setup (First Time Only)

### Step 1: Install Java (if not installed)

**Windows**:
```powershell
# Download Java JDK from https://www.oracle.com/java/technologies/downloads/
# Run installer and follow prompts
# Verify installation:
java -version
```

**PowerShell**:
```powershell
# Alternative: Use Chocolatey
choco install jdk-temurin
```

### Step 2: Download and Install JMeter

**Option 1: Direct Download**
1. Go to https://jmeter.apache.org/download_jmeter.cgi
2. Download `apache-jmeter-X.X.zip`
3. Extract to `C:\tools\apache-jmeter`
4. Add to PATH:
   ```powershell
   setx PATH "%PATH%;C:\tools\apache-jmeter\bin"
   ```
5. Restart PowerShell and verify:
   ```powershell
   jmeter --version
   ```

**Option 2: Using Chocolatey**
```powershell
choco install jmeter
```

### Step 3: Configure JMeter

1. Copy configuration file:
   ```powershell
   Copy-Item .\jmeter\config\user.properties `
     "C:\tools\apache-jmeter\bin\user.properties"
   ```

2. Set JVM memory for heavy tests:
   ```powershell
   $env:JVM_ARGS = "-Xmx4g -Xms2g"
   ```

### Step 4: Prepare Your Application

```powershell
# Make sure app is fresh
npm run db:migrate:undo:all
npm run db:migrate
npm run db:seed

# Start the app
npm start
```

---

## Running Different Tests

### Smoke Test (5 minutes - Quick Check)
```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType smoke
```
**When to use**: Before running real tests, to verify everything works

---

### Ramp-up Test (15 minutes - Identify Breaking Point)
```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType ramp-up
```
**When to use**:
- Identify at what user count performance degrades
- Understand system scaling behavior
- Find optimal load capacity

**What to look for**:
- Where does response time start increasing rapidly?
- At what user count do errors appear?
- What's the maximum throughput achievable?

---

### Sustained Load Test (10 minutes - Stability Check)
```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType sustained
```
**When to use**:
- Test system stability under constant heavy load
- Detect memory leaks
- Verify connection pool stability

**What to look for**:
- Do response times stay consistent or degrade over time?
- Does memory usage increase continuously?
- Are there any intermittent errors?

---

### Spike Test (20 minutes - Real-World Scenario)
```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType spike
```
**When to use**:
- Simulate flash sales or viral events
- Test queue management
- Verify graceful degradation under sudden load

**What to look for**:
- How quickly does the system recover?
- Does it return to normal within 60 seconds?
- Are there cascading failures?

---

### Stress Test (30 minutes - Breaking Point)
```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType stress
```
**When to use**:
- Find absolute breaking point
- Capacity planning
- Identify bottlenecks
- **⚠️ Do NOT run during business hours**

**What to look for**:
- Where does error rate exceed 5%?
- When does throughput start decreasing?
- What's the actual maximum load?

---

## Custom Test Configuration

### Override Default Settings

```powershell
# Custom user count
.\jmeter\scripts\run-load-tests.ps1 `
  -TestType sustained `
  -NumThreads 500

# Custom duration (in seconds)
.\jmeter\scripts\run-load-tests.ps1 `
  -TestType sustained `
  -Duration 1200  # 20 minutes

# Custom ramp-up time
.\jmeter\scripts\run-load-tests.ps1 `
  -TestType ramp-up `
  -RampUpTime 600  # 10 minutes to reach full load

# Test different server
.\jmeter\scripts\run-load-tests.ps1 `
  -Host 192.168.1.100 `
  -Port 8080

# Combine options
.\jmeter\scripts\run-load-tests.ps1 `
  -TestType spike `
  -NumThreads 200 `
  -Duration 900 `
  -Host staging.example.com
```

---

## Analyzing Results

### Automatic Report Generation

After test completes:
```
Results folder: jmeter/results/
├─ ramp-up-results-20260228_120000.csv (raw data)
├─ ramp-up-results-20260228_120000.log (detailed log)
└─ ramp-up-report-20260228_120000/ (HTML report)
    └─ index.html (open in browser)
```

### View HTML Report

```powershell
# Open the report in your browser
Start-Process .\jmeter\results\ramp-up-report-20260228_120000\index.html
```

### Review in Excel

```powershell
# Open CSV file in Excel for manual analysis
Invoke-Item .\jmeter\results\ramp-up-results-20260228_120000.csv
```

### Key Metrics to Check

1. **Throughput (req/sec)**
   - Should be consistent at baseline
   - Dropping = capacity exceeded

2. **Response Time (ms)**
   - Average: Should match target
   - 95th percentile: Should be <2x average
   - If growing = memory leak or connection issue

3. **Error Rate (%)**
   - Should be 0% (except spike/stress)
   - Any errors = investigate immediately

4. **Connection Time**
   - Should be <50ms
   - High = network or server issue

---

## Troubleshooting

### "Connection refused" Error

```
Problem: Test can't connect to application

Solution:
1. Verify app is running: npm start
2. Check port is correct: 3000 (default)
3. Check firewall allows connections
4. Check application logs for errors
```

### "Out of Memory" Error

```
Problem: JMeter runs out of memory during test

Solution:
Set JVM memory before running test:
  $env:JVM_ARGS = "-Xmx8g -Xms4g"

Or edit JMeter startup script:
  jmeter.bat (Windows)
  jmeter.sh (Linux/Mac)
```

### "Too Slow" Performance

```
Problem: Response times are slower than expected

Causes & Solutions:
1. Database not optimized
   - Add indexes
   - Optimize queries

2. No caching
   - Implement Redis
   - Add response caching

3. Network latency
   - Check network speed
   - Test locally first

4. Insufficient hardware
   - Check CPU/Memory usage
   - Add more resources
```

### Test Hangs or Freezes

```
Problem: JMeter stops responding

Solution:
1. Press Ctrl+C to stop
2. Check application logs for errors
3. Check for database locks: SELECT * FROM pg_locks;
4. Restart application: npm start
5. Run smoke test to verify
```

---

## Performance Tuning Tips

### For Better Test Results

1. **Test Order** (do these first):
   - Smoke test (verify setup)
   - Sustained load (baseline)
   - Ramp-up (identify issues)
   - Spike (real-world)
   - Stress (limits)

2. **Optimize Test Data**:
   - Use realistic but diverse test data
   - Avoid duplicate products/users
   - Reset database between test runs

3. **Monitor While Testing**:
   ```powershell
   # Terminal 3: Monitor application
   # Watch for:
   # - CPU usage: top (Linux) or Task Manager (Windows)
   # - Memory: Resource Monitor
   # - Database: Check connection count
   # - Network: Check bandwidth usage
   ```

### For Better Application Performance

1. **Add Indexes**:
   ```sql
   CREATE INDEX idx_user_email ON users(email);
   CREATE INDEX idx_product_category ON products(category);
   ```

2. **Implement Caching**:
   ```javascript
   // Add Redis for session/response caching
   const redis = require('redis');
   const cache = redis.createClient();
   ```

3. **Connection Pooling**:
   - Increase pool size
   - Set appropriate timeout
   - Monitor exhaustion

4. **Query Optimization**:
   - Use EXPLAIN ANALYZE
   - Add WHERE clauses
   - Paginate results

---

## Test Execution Checklist

Before running a load test:

- [ ] Application is running (`npm start`)
- [ ] Database is fresh (`npm run db:migrate db:seed`)
- [ ] No other load tests running
- [ ] Enough disk space for results (100+ MB)
- [ ] Monitor ready to watch performance
- [ ] CPU/Memory baseline recorded
- [ ] Clear understanding of test goal

After test completes:

- [ ] Results are saved in `jmeter/results/`
- [ ] HTML report generated successfully
- [ ] CSV data downloaded for analysis
- [ ] Screenshots taken of key metrics
- [ ] Results documented in RESULTS.md
- [ ] Issues identified and logged
- [ ] Performance improvement plan created

---

## Next Steps After First Test

1. **Review Results**: Open HTML report
2. **Identify Issues**: Check for errors, slow endpoints
3. **Document Findings**: Create RESULTS.md in jmeter/ folder
4. **Fix Issues**: Address top performance bottlenecks
5. **Re-test**: Run same test again to measure improvement
6. **Compare**: Use Excel to compare before/after metrics

---

## Getting Help

### Common Resources

- [JMeter Documentation](https://jmeter.apache.org/usermanual/)
- [JMeter Best Practices](https://jmeter.apache.org/usermanual/best-practices.html)
- [StackOverflow - JMeter Tag](https://stackoverflow.com/questions/tagged/jmeter)

### Test Script Help

```powershell
.\jmeter\scripts\run-load-tests.ps1 -TestType help
```

---

**Last Updated**: February 28, 2026
**Version**: 1.0

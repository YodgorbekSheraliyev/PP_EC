# Performance Benchmarks & Expected Results

Comprehensive performance benchmarks and success criteria for all load testing scenarios.

## Summary Table

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| **Throughput (req/sec)** | 800+ | 500-800 | <500 |
| **Avg Response Time (ms)** | <150 | <250 | >500 |
| **95th Percentile (ms)** | <300 | <500 | >1000 |
| **99th Percentile (ms)** | <500 | <800 | >2000 |
| **Error Rate (%)** | 0% | <0.5% | >5% |
| **Connection Time (ms)** | <50 | <100 | >200 |
| **Latency (ms)** | <100 | <150 | >300 |

---

## Test-Specific Benchmarks

### 1. RAMP-UP TEST (0→250 users over 5 min)

#### Initial Phase (0-10 users)
```
Expected Results:
├─ Throughput: 200-300 req/sec
├─ Avg Response Time: 50-100ms
├─ 95th Percentile: 100-150ms
├─ Error Rate: 0%
└─ Status: ✓ PASSING
```

#### Mid Phase (50-150 users)
```
Expected Results:
├─ Throughput: 400-600 req/sec
├─ Avg Response Time: 100-150ms
├─ 95th Percentile: 200-300ms
├─ Error Rate: 0%
└─ Status: ✓ PASSING
```

#### Plateau Phase (150-250 users)
```
Expected Results:
├─ Throughput: 700-850 req/sec
├─ Avg Response Time: 150-200ms
├─ 95th Percentile: 300-450ms
├─ 99th Percentile: 500-700ms
├─ Error Rate: 0-0.1%
└─ Status: ✓ PASSING
```

#### Performance Degradation Indicators
If any of these occur, investigate immediately:
- Throughput drops below 600 req/sec
- Response time avg exceeds 300ms
- Error rate exceeds 1%
- Memory usage increases beyond 2GB
- CPU usage stays at 100% after load plateau

---

### 2. SUSTAINED LOAD TEST (300 users, 10 min)

#### Performance Expectations
```
├─ Throughput: 800-900 req/sec (consistent)
├─ Avg Response Time: 150-180ms
├─ Latency: 80-120ms (actual server time)
├─ Connection Time: 40-60ms
├─ Error Rate: 0%
├─ Memory Usage: Stable (no leaks)
├─ Database: <100ms query time
└─ Status: ✓ PASSING
```

#### Success Criteria
```
✓ PASS if:
├─ All metrics stay within target range for full 10 minutes
├─ No spikes or degradation over time
├─ Error rate remains 0%
├─ Response times consistent (StdDev < 50ms)
└─ Memory doesn't increase more than 5%

✗ FAIL if:
├─ Response times degrade over time (memory leak)
├─ Any error spike
├─ Transactions timeout
├─ Database locks detected
└─ CPU remains at 100%
```

#### Time-Series Breakdown
```
0-2 min:   Warmup phase
           ├─ Response time: 120-150ms
           ├─ Throughput builds to 850 req/sec
           └─ Cache populating

2-8 min:   Sustained phase
           ├─ Response time: 150-180ms (stable)
           ├─ Throughput: 850-900 req/sec (steady)
           └─ All systems nominal

8-10 min:  Tail phase
           ├─ Same metrics as sustained
           └─ Verify no degradation
```

---

### 3. SPIKE TEST (50→400 users + spike)

#### Pre-Spike Baseline (50 users, 2 min)
```
├─ Throughput: 250 req/sec
├─ Avg Response Time: 80-100ms
├─ Error Rate: 0%
└─ System: HEALTHY
```

#### During Spike (instant jump to 400 users)
```
Immediately After Spike (first 10 sec):
├─ Throughput: 1200-1500 req/sec (spike)
├─ Response Time: 400-800ms (elevated)
├─ 95th Percentile: 1000-2000ms
├─ Error Rate: 0-2% (acceptable during spike)
├─ Queue Depth: High
└─ Status: Under Stress

In Next 30 seconds:
├─ Response Time: 300-500ms (stabilizing)
├─ Error Rate: <0.5%
├─ Queue Depth: Decreasing
└─ System: Recovering

After 1 minute:
├─ Response Time: 200-300ms (approaching normal)
├─ Throughput: 900-1000 req/sec
├─ Error Rate: 0%
└─ System: Recovered
```

#### Recovery Indicators (System is OK if):
```
✓ Recovery occurs within 60 seconds
✓ No cascading failures
✓ No error rate > 2% during spike
✓ System returns to baseline within 2 minutes
✓ Queues drain completely
✓ Database recovers (no long locks)
```

#### Failure Indicators (Red Flags):
```
✗ Response time stays elevated (>500ms)
✗ Error rate exceeds 5%
✗ System doesn't recover to baseline
✗ Cascading errors occur
✗ SQL deadlocks or timeouts
✗ Memory usage jumps significantly
```

---

### 4. STRESS TEST (Ramp to breaking point, 0→500 users)

#### Phase Breakdown

**Phase 1: Light Load (0-50 users)**
```
├─ Throughput: 200-300 req/sec
├─ Response Time: 50-100ms
├─ Error Rate: 0%
└─ Status: ✓ OPTIMAL
```

**Phase 2: Moderate Load (50-200 users)**
```
├─ Throughput: 500-750 req/sec
├─ Response Time: 100-180ms
├─ Error Rate: 0%
└─ Status: ✓ GOOD
```

**Phase 3: Heavy Load (200-350 users)**
```
├─ Throughput: 800-950 req/sec
├─ Response Time: 150-250ms
├─ Error Rate: 0-0.5%
└─ Status: ⚠ STRESSED
```

**Phase 4: Critical Load (350-450 users)**
```
├─ Throughput: 950-1000 req/sec (plateauing)
├─ Response Time: 250-400ms
├─ Error Rate: 0.5-2%
└─ Status: ⚠ CRITICAL
```

**Phase 5: Beyond Capacity (450+ users)**
```
├─ Throughput: Decreasing despite more users
├─ Response Time: >500ms
├─ Error Rate: >5%
├─ Timeouts: Increasing
└─ Status: ✗ BREAKING POINT
```

#### Breaking Point Identification
The system breaks when:
- Throughput decreases as users increase
- Error rate exceeds 10%
- Response times exceed 5000ms
- Transaction timeouts occur
- Database becomes unresponsive

#### Recommended Breaking Point
- **Sustainable Load**: Up to 150% of baseline (300+ users)
- **Absolute Maximum**: Where error rate ≤ 5%
- **Recovery Capacity**: Load should accept 20% more users and recover

---

## Endpoint-Specific Benchmarks

### Authentication Endpoints
```
POST /auth/register
├─ Target: <300ms
├─ Throughput: 150 req/sec
├─ Under 250 users: 100-200ms
└─ Error: 0%

POST /auth/login
├─ Target: <200ms
├─ Throughput: 200 req/sec
├─ Under 250 users: 80-150ms
└─ Error: 0%
```

### Product Endpoints
```
GET /products
├─ Target: <100ms
├─ Throughput: 1000 req/sec
├─ Under 250 users: 50-100ms
└─ Cached response: <50ms

GET /products/:id
├─ Target: <150ms
├─ Throughput: 800 req/sec
├─ Avg: 100-150ms
└─ Error: 0%
```

### Cart Operations
```
POST /cart/add
├─ Target: <150ms
├─ Throughput: 500 req/sec
├─ Avg: 100-150ms
└─ Error: 0%

GET /cart
├─ Target: <100ms
├─ Throughput: 800 req/sec
├─ Avg: 50-100ms
└─ Error: 0%
```

### Order/Checkout
```
POST /orders
├─ Target: <500ms (transaction)
├─ Throughput: 100 req/sec
├─ Avg: 300-500ms
├─ Error: 0%
└─ Critical: Database consistency

POST /orders/:id/payment
├─ Target: <1000ms (external API)
├─ Throughput: 50 req/sec
├─ Avg: 800-1000ms
└─ Error: <1% (external dependency)
```

### Admin Endpoints
```
GET /admin/dashboard
├─ Target: <200ms
├─ Throughput: 200 req/sec
├─ Avg: 150-200ms
├─ Note: Lower throughput expected (admin users < customer users)

GET /admin/users
├─ Target: <500ms
├─ Throughput: 100 req/sec
├─ Avg: 300-500ms
└─ Depends on dataset size
```

---

## System Resource Benchmarks

### CPU Usage
```
0-100 users:    10-20% utilization
100-250 users:  30-50% utilization
250-350 users:  50-75% utilization
350-450 users:  75-95% utilization
450+ users:     100% (throttled)
```

### Memory Usage
```
At Rest:           50-100 MB
+100 Users:        200-300 MB
+250 Users:        400-500 MB
+350 Users:        500-700 MB
+500 Users:        700-1000 MB
```

**Warning Signs**:
- Continuous increase during sustained load (memory leak)
- Exceeds 2GB: Likely too many connections
- Exceeds 4GB: Out of memory imminent

### Database Connections
```
Connection Pool Size: 20-50 (depends on config)
Under 100 users:  5-10 active connections
Under 250 users:  15-25 active connections
Under 350 users:  30-40 active connections
350+ users:       (pool exhausted)
```

### Disk I/O
```
Database operations should not exceed:
├─ Read: 5000 IOPS
├─ Write: 1000 IOPS
└─ If exceeded: Add indexes or pagination
```

---

## Custom Target Adjustments

Adjust benchmarks based on your infrastructure:

### For Better Hardware
- Multiply throughput targets by 1.3-1.5x
- Reduce response time targets by 0.7-0.8x
- Increase sustainable load by 50%

### For Worse Hardware
- Multiply throughput targets by 0.6-0.7x
- Increase response time targets by 1.3-1.5x
- Reduce sustainable load by 30%

### For Database Optimization
- Implement caching (Redis): 3-5x improvement
- Add indexes: 2-3x improvement
- Query optimization: 1.5-2x improvement
- Connection pooling: 2x improvement

---

## Pass/Fail Criteria

### Test Result: PASS ✓
```
All of the following must be TRUE:
├─ Throughput ≥ target value
├─ Avg Response Time ≤ target value
├─ 95th Percentile ≤ target value
├─ Error Rate = 0%
├─ No timeouts
├─ Memory stable
├─ CPU < 95%
└─ All transactions complete successfully
```

### Test Result: FAIL ✗
```
If ANY of the following is TRUE:
├─ Error rate > 1% (except spike test: >2%)
├─ Response time avg > 500ms
├─ More than 1% of transactions timeout
├─ Memory leak detected (continuous increase)
├─ CPU stuck at 100%
├─ Database deadlocks
└─ Application crash/restart
```

### Test Result: CONDITIONAL PASS ⚠
```
For Spike/Stress tests, acceptable if:
├─ Errors occur only during extreme load
├─ System recovers when load decreases
├─ No cascading failures
├─ Breaking point identified
└─ Capacity limits documented
```

---

## Improvement Benchmarks

### What's an Issue Worth Fixing?

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Add database indexes | 2-3x response time | Low | ★★★★★ |
| Implement caching | 3-5x throughput | Medium | ★★★★☆ |
| Connection pooling | 2x connections | Low | ★★★★★ |
| Compress responses | 1.5-2x bandwidth | Low | ★★★☆☆ |
| Query optimization | 1.5-2x speed | High | ★★★★☆ |
| Add more servers | Linear scaling | High | ★★☆☆☆ |
| CDN for static | 5-10x static speed | Medium | ★★★☆☆ |
| Read replicas DB | 2x read performance | High | ★★★☆☆ |

---

**Document Version**: 1.0
**Last Updated**: February 28, 2026
**Author**: Performance Testing Team

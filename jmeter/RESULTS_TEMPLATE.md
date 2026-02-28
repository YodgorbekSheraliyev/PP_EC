# Load Testing Results Template

Use this template to document and analyze load test results.

---

## Test Information

**Test Date**: ________________
**Test Type**: ☐ Smoke  ☐ Ramp-up  ☐ Sustained  ☐ Spike  ☐ Stress

**Test Duration**: ________________
**Number of Users**: ________________
**Ramp-up Time**: ________________
**Target Server**: ________________

**Tested By**: ________________
**Notes/Context**:
```
_____________________________________________________________________________
_____________________________________________________________________________
```

---

## Overall Results

### Pass/Fail Status
- [ ] ✓ PASS - All metrics meet targets
- [ ] ⚠ CONDITIONAL PASS - Some metrics acceptable
- [ ] ✗ FAIL - Critical metrics exceeded limits

### Summary
```
Total Requests: ________________
Total Duration: ________________
Errors: ________________
Error Rate: ________________%
```

---

## Performance Metrics

### Throughput
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Requests/min | _______ | 50,000+ | ☐ Pass ☐ Fail |
| Requests/sec | _______ | 800+ | ☐ Pass ☐ Fail |
| Avg Response Time | _______ms | <200ms | ☐ Pass ☐ Fail |

### Response Times
| Percentile | Value | Target | Status |
|-----------|-------|--------|--------|
| Min | _______ms | ✓ Any | ☐ Pass |
| Average | _______ms | <200ms | ☐ Pass ☐ Fail |
| Median | _______ms | <200ms | ☐ Pass ☐ Fail |
| 90th %ile | _______ms | <300ms | ☐ Pass ☐ Fail |
| 95th %ile | _______ms | <400ms | ☐ Pass ☐ Fail |
| 99th %ile | _______ms | <600ms | ☐ Pass ☐ Fail |
| Max | _______ms | <2000ms | ☐ Pass ☐ Fail |

### Error Analysis
| Type | Count | Rate | Acceptable? |
|------|-------|------|-------------|
| Connection Errors | _______ | _______% | ☐ Yes ☐ No |
| Timeouts | _______ | _______% | ☐ Yes ☐ No |
| 4xx Errors | _______ | _______% | ☐ Yes ☐ No |
| 5xx Errors | _______ | _______% | ☐ Yes ☐ No |
| Other Errors | _______ | _______% | ☐ Yes ☐ No |
| **Total** | **_______** | **_______% ** | ☐ Yes ☐ No |

### Resource Usage
| Resource | Usage | Peak | Status |
|----------|-------|------|--------|
| CPU | _______% | _______% | ☐ OK ☐ High |
| Memory | _______MB | _______MB | ☐ OK ☐ High |
| Database Connections | _______ | _______ | ☐ OK ☐ Exhausted |
| Network I/O | _______KB/s | _______KB/s | ☐ OK ☐ Saturated |

---

## Endpoint Performance

### Critical Path Endpoints

#### Endpoint: ____________________
```
Requests: ________________
Avg Response Time: ________________ms
95th Percentile: ________________ms
Error Rate: ________________%
Acceptable? ☐ Yes ☐ No
Notes: _________________________________________________________________________
```

#### Endpoint: ____________________
```
Requests: ________________
Avg Response Time: ________________ms
95th Percentile: ________________ms
Error Rate: ________________%
Acceptable? ☐ Yes ☐ No
Notes: _________________________________________________________________________
```

#### Endpoint: ____________________
```
Requests: ________________
Avg Response Time: ________________ms
95th Percentile: ________________ms
Error Rate: ________________%
Acceptable? ☐ Yes ☐ No
Notes: _________________________________________________________________________
```

---

## Issues Identified

### Issue #1
**Severity**: ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Endpoint**: ________________
**Description**:
```
_____________________________________________________________________________
_____________________________________________________________________________
```
**Root Cause**:
```
_____________________________________________________________________________
```
**Recommended Fix**:
```
_____________________________________________________________________________
```
**Priority**: ☐ Immediate  ☐ High  ☐ Medium  ☐ Low

---

### Issue #2
**Severity**: ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Endpoint**: ________________
**Description**:
```
_____________________________________________________________________________
_____________________________________________________________________________
```
**Root Cause**:
```
_____________________________________________________________________________
```
**Recommended Fix**:
```
_____________________________________________________________________________
```
**Priority**: ☐ Immediate  ☐ High  ☐ Medium  ☐ Low

---

### Issue #3
**Severity**: ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Endpoint**: ________________
**Description**:
```
_____________________________________________________________________________
_____________________________________________________________________________
```
**Root Cause**:
```
_____________________________________________________________________________
```
**Recommended Fix**:
```
_____________________________________________________________________________
```
**Priority**: ☐ Immediate  ☐ High  ☐ Medium  ☐ Low

---

## Performance Summary by Phase

### Phase 1: Ramp-up (0 to 50% users)
- Response Times: ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor
- Error Rate: ☐ 0%  ☐ <0.5%  ☐ <1%  ☐ >1%
- Throughput: ☐ Increasing  ☐ Stable  ☐ Variable  ☐ Declining
- Notes: _________________________________________________________________

### Phase 2: Mid-Load (50% to 80% users)
- Response Times: ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor
- Error Rate: ☐ 0%  ☐ <0.5%  ☐ <1%  ☐ >1%
- Throughput: ☐ Increasing  ☐ Stable  ☐ Variable  ☐ Declining
- Notes: _________________________________________________________________

### Phase 3: Peak Load (80% to 100% users)
- Response Times: ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor
- Error Rate: ☐ 0%  ☐ <0.5%  ☐ <1%  ☐ >1%
- Throughput: ☐ Increasing  ☐ Stable  ☐ Variable  ☐ Declining
- Notes: _________________________________________________________________

### Phase 4: Sustained Load (full duration)
- Response Times: ☐ Stable  ☐ Degrading  ☐ Spiking  ☐ Unstable
- Memory Usage: ☐ Stable  ☐ Growing  ☐ Fluctuating
- CPU Usage: ☐ Stable  ☐ Maxed out  ☐ Fluctuating
- Notes: _________________________________________________________________

---

## Comparison with Previous Test

| Metric | Previous | Current | Change | Status |
|--------|----------|---------|--------|--------|
| Throughput (req/sec) | _______ | _______ | ___% | ☐ Better ☐ Worse |
| Avg Response Time | _______ms | _______ms | ___% | ☐ Better ☐ Worse |
| 95th Percentile | _______ms | _______ms | ___% | ☐ Better ☐ Worse |
| Error Rate | _______% | _______% | ___% | ☐ Better ☐ Worse |
| Peak Memory | _______MB | _______MB | ___% | ☐ Better ☐ Worse |

**Overall Trend**: ☐ Improving  ☐ Stable  ☐ Degrading

---

## Capacity Analysis

**Current Sustainable Load**: ________________ users
**Spike Resilience**: ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor
**Breaking Point**: ________________ users
**Capacity Headroom**: ________________%

**Recommendations for Scaling**:
```
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
```

---

## Action Items

### High Priority (Fix Before Production)
- [ ] Task: ________________________________________________________________
  - Deadline: ________________
  - Owner: ________________

- [ ] Task: ________________________________________________________________
  - Deadline: ________________
  - Owner: ________________

### Medium Priority (Fix Soon)
- [ ] Task: ________________________________________________________________
  - Deadline: ________________
  - Owner: ________________

- [ ] Task: ________________________________________________________________
  - Deadline: ________________
  - Owner: ________________

### Low Priority (Optimize Later)
- [ ] Task: ________________________________________________________________
  - Deadline: ________________
  - Owner: ________________

---

## Recommendations

### Immediate Actions (This Sprint)
```
1. _________________________________________________________________________

2. _________________________________________________________________________

3. _________________________________________________________________________
```

### Short-term (Next Sprint)
```
1. _________________________________________________________________________

2. _________________________________________________________________________

3. _________________________________________________________________________
```

### Long-term (Future Planning)
```
1. _________________________________________________________________________

2. _________________________________________________________________________

3. _________________________________________________________________________
```

---

## Conclusion

**Overall Assessment**:
☐ System is production-ready
☐ System needs minor improvements
☐ System needs significant work
☐ System is not suitable for production

**Summary**:
```
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
```

---

## Attachments

- [ ] JMeter Results CSV: `jmeter/results/________________`
- [ ] HTML Report: `jmeter/results/________________`
- [ ] Screenshots of metrics
- [ ] Application logs during test
- [ ] Database performance logs
- [ ] System resource logs

---

**Report Completed**: ________________
**Reviewed By**: ________________
**Approved By**: ________________
**Next Review Date**: ________________

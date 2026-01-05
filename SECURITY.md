# Security Documentation

## Overview

This document details the security features and best practices implemented in the SecureShop E-Commerce Application. The application follows OWASP Top Ten principles and implements industry-standard security measures.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Data Protection](#data-protection)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [OWASP Top Ten Mitigations](#owasp-top-ten-mitigations)
5. [Security Headers](#security-headers)
6. [Session Management](#session-management)
7. [API Security](#api-security)
8. [Logging & Monitoring](#logging--monitoring)
9. [Deployment Security Checklist](#deployment-security-checklist)
10. [Vulnerability Reporting](#vulnerability-reporting)

---

## Authentication & Authorization

### Password Security

**Implementation:**
- Passwords hashed using bcryptjs with 12 rounds (configurable via `BCRYPT_ROUNDS` env var)
- No plaintext passwords stored in database
- Password requirements enforced:
  - Minimum 8 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (@$!%*?&)

**Validation Regex:**
```javascript
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
```

### Account Lockout

**Feature:** Brute force protection
- Maximum 5 failed login attempts per email address
- 15-minute account lockout after threshold exceeded
- Lockout timer resets on successful login
- User-friendly error messages showing remaining lockout time

**File:** `utils/loginAttempts.js`

### Role-Based Access Control (RBAC)

**Roles:**
- **Customer**: Can browse products, manage cart, checkout, view own orders
- **Admin**: Full system access including user/product/order management

**Protected Routes:**
- `requireAuth` - Requires authenticated session
- `requireAdmin` - Requires admin role
- `requireCustomer` - Requires customer role
- `verifyToken` - JWT token validation for API endpoints

**File:** `middleware/auth.js`

### Session Management

**Features:**
- PostgreSQL-backed session storage (survives server restarts)
- Session expiration: 24 hours (configurable via `SESSION_MAX_AGE`)
- Session regeneration on login (prevents session fixation attacks)
- httpOnly cookies prevent JavaScript access
- sameSite: lax for CSRF protection
- Secure flag in production (HTTPS only)

**Configuration:**
```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}
```

### JWT Authentication (API)

- 24-hour token expiration
- Contains user ID, email, and role
- Used for future mobile app integration
- Tokens validated on protected API endpoints

---

## Data Protection

### Database Security

**Measures Implemented:**
- SQL Injection Prevention:
  - Sequelize ORM with parameterized queries
  - No raw string concatenation in SQL
  - Input validation before database operations

- Data Integrity:
  - Foreign key constraints
  - CHECK constraints on database level
  - NOT NULL constraints prevent incomplete records
  - Transactions for multi-step operations (order creation)

- Sensitive Data:
  - Credit card information NOT stored (payment method type only)
  - Passwords hashed with salt
  - Session data encrypted in PostgreSQL

### Field-Level Security

**Users Table:**
- `password_hash`: Bcrypted, never exposed
- `email`: Unique constraint, validated format
- `role`: Enum constraint (customer/admin only)

**Orders Table:**
- `shipping_address`: Validated length (10-500 chars)
- `payment_method`: Enum constraint
- `total_amount`: Non-negative, 2 decimal precision

**Products Table:**
- `price`: Non-negative, 2 decimal precision
- `stock_quantity`: Non-negative integer
- `category`: Validated length

---

## Input Validation & Sanitization

### Validation Framework

**Library:** express-validator v7.2.1

**Key Validators:**

**Registration:**
```javascript
- username: 3-50 chars, alphanumeric + underscore only
- email: Valid email format, normalized
- password: 8+ chars with required character types
```

**Products:**
```javascript
- name: 1-100 characters
- description: 10-1000 characters
- price: Float >= 0
- stock_quantity: Integer >= 0
- category: 1-50 characters
```

**Orders:**
```javascript
- shipping_address: 10-500 characters
- payment_method: Must be in ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
```

**Cart:**
```javascript
- product_id: Valid integer
- quantity: Integer >= 1
```

### XSS Prevention

**Handlebars Auto-Escaping:**
- All `{{variable}}` syntax automatically HTML-escapes
- Never use `{{{raw}}}` unless absolutely necessary
- Content-Security-Policy headers prevent script injection

**Example:**
```handlebars
<!-- User input automatically escaped -->
<p>Welcome {{username}}</p>
<!-- Script tags rendered as text, not executed -->
```

### CSRF Protection

**Implementation:** csurf middleware v1.11.0

**Features:**
- Token generated per session
- Included in all forms as hidden input
- Validated on every POST/PUT/DELETE request
- Automatic token refresh on session regeneration

**Usage:**
```html
<form method="POST" action="/cart/add">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <!-- form fields -->
</form>
```

---

## OWASP Top Ten Mitigations

### A01: Broken Access Control
- ✅ Role-based middleware on all protected routes
- ✅ User ID filtering in database queries
- ✅ Admin routes require admin role check
- ✅ Orders filtered by user_id for customers

### A02: Cryptographic Failures
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Sessions stored securely in PostgreSQL
- ✅ HTTPS enforced in production
- ✅ Sensitive data not logged or exposed

### A03: Injection
- ✅ Sequelize ORM with parameterized queries
- ✅ No raw SQL string concatenation
- ✅ Input validation via express-validator
- ✅ Database-level constraints

### A04: Insecure Design
- ✅ Security-first architecture
- ✅ Three-tier separation of concerns
- ✅ Threat modeling applied
- ✅ Defense-in-depth approach

### A05: Security Misconfiguration
- ✅ Helmet.js for security headers
- ✅ Environment variables for secrets
- ✅ Generic error messages
- ✅ X-Powered-By header disabled
- ✅ HSTS enabled in production

### A06: Vulnerable and Outdated Components
- ✅ npm audit regularly performed
- ✅ Minimal dependencies
- ✅ Security advisories monitored
- ⚠️ Weekly updates recommended

### A07: Identification and Authentication Failures
- ✅ Strong password requirements
- ✅ Account lockout after 5 failed attempts
- ✅ Session timeout (24 hours)
- ✅ Session regeneration on login
- ⚠️ Future: Email verification, password reset

### A08: Software and Data Integrity Failures
- ✅ Input validation at multiple layers
- ✅ CSRF protection on state-changing operations
- ✅ Integrity checks for session data

### A09: Security Logging and Monitoring
- ✅ Winston logger with structured logging
- ✅ Daily log rotation (14-day retention)
- ✅ Failed login attempts logged
- ✅ Access denied attempts logged
- ✅ Admin operations logged with context

### A10: Server-Side Request Forgery (SSRF)
- ✅ Not applicable (no external URL fetching)
- ⚠️ If implemented: URL whitelist approach recommended

---

## Security Headers

### Headers Set (via Helmet.js)

```
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

X-Frame-Options: SAMEORIGIN

X-Content-Type-Options: nosniff

X-XSS-Protection: 1; mode=block

Referrer-Policy: no-referrer
```

### CSP Directives

- `defaultSrc`: 'self' (same origin only)
- `styleSrc`: Bootstrap and inline styles allowed
- `scriptSrc`: Bootstrap and inline scripts allowed
- `imgSrc`: Self, data URIs, HTTPS
- `connectSrc`: HTTPS only
- `fontSrc`: Bootstrap fonts

---

## Session Management

### Configuration

**Store:** PostgreSQL via connect-pg-simple
**Expiration:** 24 hours (configurable)
**Cookie Settings:**
- httpOnly: true (prevents XSS token theft)
- sameSite: 'lax' (CSRF protection)
- secure: true in production (HTTPS only)

### Regeneration

Sessions are regenerated on:
- User registration
- User login
- Logout

**Code:**
```javascript
req.session.regenerate((err) => {
  if (!err) {
    req.session.user = { /* user data */ };
  }
});
```

### Expiration & Cleanup

- Automatic expiration after 24 hours
- Database cleanup of expired sessions
- Configurable via `SESSION_MAX_AGE` environment variable

---

## API Security

### Rate Limiting

**Global Limiter:**
- 300 requests per IP per 15 minutes
- Standard headers included in response

**Auth Routes:**
- 5 login/register attempts per IP per 15 minutes
- Successful requests don't count against limit

**Configuration:**
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});
```

### Endpoint Security

All endpoints follow these principles:
1. **Authentication Required**: Protected by `requireAuth` middleware
2. **Authorization Checked**: Role validation before processing
3. **Input Validated**: express-validator rules applied
4. **Output Escaped**: Handlebars auto-escaping for HTML views
5. **CSRF Protected**: POST routes protected via csurf
6. **Rate Limited**: Global + auth-specific limiters

### API Response Format

**Successful Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "status": 400
}
```

**Never expose:**
- Stack traces
- Database query details
- System paths
- Server version information

---

## Logging & Monitoring

### Winston Logger

**Location:** `utils/logger.js`

**Features:**
- Structured JSON logging
- Daily log rotation
- Separate exception handlers
- Multiple transports

### Logged Events

**Authentication:**
- User registration (email, timestamp, IP)
- Login attempts (successful and failed)
- Logout events
- Account lockouts

**Authorization:**
- Access denied attempts (user, resource, IP)
- Admin operations (action, admin user, IP)

**Application:**
- HTTP requests (method, URL, status, duration, IP)
- Database errors (sanitized)
- Application errors (stack trace in dev only)

**Security:**
- Failed CSRF validations
- Invalid token attempts
- Rate limit violations
- Suspicious activities

### Log Retention

- **Application logs**: 14 days (daily rotation)
- **Exception logs**: Permanent
- **Rejection logs**: Permanent
- **Compression**: Automatic after rotation

### Access Logs

**Format:**
```json
{
  "timestamp": "2025-01-05T10:30:45.123Z",
  "level": "info",
  "message": "HTTP Request",
  "method": "POST",
  "url": "/auth/login",
  "status": 302,
  "duration": "125ms",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Deployment Security Checklist

### Before Production

- [ ] Generate new SESSION_SECRET (32+ characters)
- [ ] Generate new JWT_SECRET (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Configure PostgreSQL with SSL
- [ ] Set up HTTPS with valid certificate
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and alerting
- [ ] Run npm audit and address vulnerabilities
- [ ] Test all authentication flows
- [ ] Verify all validation rules
- [ ] Test CSRF protection
- [ ] Verify rate limiting is active
- [ ] Check security headers
- [ ] Review environment variables
- [ ] Set up log rotation
- [ ] Configure intrusion detection
- [ ] Test error handling (no sensitive info leaked)

### Production Environment

**Required Settings:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host/db
SESSION_SECRET=<cryptographically secure random 32+ chars>
JWT_SECRET=<cryptographically secure random 32+ chars>
PORT=5000
BCRYPT_ROUNDS=12
```

**Recommended Settings:**
```bash
FORCE_HTTPS=true
DB_SSL_MODE=require
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=200
```

### Post-Deployment

- [ ] Verify HTTPS working
- [ ] Test login/register flows
- [ ] Monitor error logs
- [ ] Check security headers (curl -I https://yourdomain.com)
- [ ] Run security scan (OWASP ZAP)
- [ ] Monitor rate limits
- [ ] Review login logs for anomalies
- [ ] Set up alerts for failed logins

---

## Vulnerability Reporting

### Responsible Disclosure

If you discover a security vulnerability, please:

1. **Do NOT** create a public GitHub issue
2. **Email**: security@example.com with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

3. **Timeline:**
   - Initial response: 48 hours
   - Fix release: 30 days
   - Public disclosure: After fix released

### Known Limitations

- Email verification not implemented
- Password reset functionality not available
- Two-factor authentication not implemented
- No automated security scanning in CI/CD
- No intrusion detection system
- No rate limiting in development mode

---

## Regular Maintenance

### Weekly
- [ ] Review security logs for anomalies
- [ ] Run `npm audit`
- [ ] Monitor error rates

### Monthly
- [ ] Review access logs
- [ ] Check for failed login patterns
- [ ] Update dependencies
- [ ] Review firewall rules

### Quarterly
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review authentication logs
- [ ] Update security policies

---

## Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Sequelize Security](https://sequelize.org/docs/v6/getting-started/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated:** January 5, 2025
**Version:** 1.0
**Document Owner:** Security Team

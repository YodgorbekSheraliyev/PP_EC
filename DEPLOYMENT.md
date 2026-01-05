# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the SecureShop E-Commerce application to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Environment Setup](#production-environment-setup)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

**Minimum:**
- Node.js 18+ (LTS recommended)
- PostgreSQL 12+
- 2GB RAM
- 10GB disk space

**Recommended:**
- Node.js 20+ (LTS)
- PostgreSQL 14+
- 4GB+ RAM
- 50GB disk space
- Ubuntu 20.04 LTS or similar Linux distribution

### Required Tools

```bash
# Node.js and npm
node --version  # Should be v18+
npm --version   # Should be v9+

# PostgreSQL client
psql --version  # Should be 12+

# Git
git --version
```

### Domain & SSL

- [ ] Domain name registered
- [ ] SSL certificate (Let's Encrypt recommended)
- [ ] DNS records configured
- [ ] Firewall rules configured

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ecommerce-app.git
cd ecommerce-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit with your local settings
nano .env
```

**Development .env:**
```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_dev
SESSION_SECRET=your-dev-secret-min-32-chars-long
JWT_SECRET=your-dev-jwt-secret-min-32-chars-long
PORT=5000
LOG_LEVEL=debug
```

### 4. Database Setup

```bash
# Create PostgreSQL user
createuser ecommerce_user -P

# Create database
createdb -O ecommerce_user ecommerce_dev

# Run migrations (automatic via Sequelize)
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:5000

---

## Production Environment Setup

### 1. Server Provisioning

**Using DigitalOcean/AWS/Heroku:**

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

### 2. Create Application User

```bash
# Create non-root user
useradd -m -s /bin/bash appuser
usermod -aG sudo appuser

# Switch to app user
su - appuser
```

### 3. Clone Repository

```bash
cd /home/appuser
git clone https://github.com/yourusername/ecommerce-app.git
cd ecommerce-app
npm install --production
```

### 4. Configure Systemd Service

Create `/etc/systemd/system/ecommerce.service`:

```ini
[Unit]
Description=SecureShop E-Commerce Application
After=network.target postgresql.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/home/appuser/ecommerce-app
EnvironmentFile=/home/appuser/ecommerce-app/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/ecommerce/app.log
StandardError=append:/var/log/ecommerce/error.log

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable ecommerce
sudo systemctl start ecommerce
sudo systemctl status ecommerce
```

### Alternative: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name ecommerce

# Create startup script
pm2 startup
pm2 save

# Monitor
pm2 logs ecommerce
pm2 monit
```

---

## Database Setup

### 1. PostgreSQL Configuration

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE ecommerce_prod;

# Create application user
CREATE USER ecommerce_prod WITH PASSWORD 'secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ecommerce_prod TO ecommerce_prod;

# Connect to database
\c ecommerce_prod

# Grant schema privileges
GRANT ALL ON SCHEMA public TO ecommerce_prod;

# Exit
\q
```

### 2. SSL Configuration for PostgreSQL

Edit `/etc/postgresql/14/main/postgresql.conf`:

```
ssl = on
ssl_cert_file = '/etc/ssl/certs/your-cert.pem'
ssl_key_file = '/etc/ssl/private/your-key.pem'
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
hostssl ecommerce_prod ecommerce_prod  0.0.0.0/0              scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 3. Database Migrations

```bash
# Run Sequelize migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Verify
npm run db:seed:undo:all  # Only for testing
```

### 4. Backup Configuration

```bash
# Create backup script
cat > /home/appuser/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/appuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="ecommerce_prod"
USER="ecommerce_prod"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $USER -d $DATABASE | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
EOF

chmod +x /home/appuser/backup-db.sh

# Schedule daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /home/appuser/backup-db.sh") | crontab -
```

---

## Application Deployment

### 1. Production Environment Variables

Create `.env` with:

```dotenv
# Node Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://ecommerce_prod:secure_password_here@localhost:5432/ecommerce_prod

# Security Keys (MUST be different from development!)
SESSION_SECRET=<generate-new-random-32-chars>
JWT_SECRET=<generate-new-random-32-chars>

# Security
BCRYPT_ROUNDS=12
FORCE_HTTPS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
AUTH_RATE_LIMIT_MAX=5

# Session
SESSION_MAX_AGE=86400000

# Logging
LOG_LEVEL=warn
```

**Generate secure secrets:**
```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"
```

### 2. Nginx Configuration

Create `/etc/nginx/sites-available/ecommerce`:

```nginx
upstream ecommerce {
    server localhost:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    limit_req zone=general burst=20 nodelay;

    # Reverse Proxy
    location / {
        proxy_pass http://ecommerce;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Static Files Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # Logging
    access_log /var/log/nginx/ecommerce-access.log;
    error_log /var/log/nginx/ecommerce-error.log;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 4. Application Logs Setup

```bash
# Create log directory
mkdir -p /var/log/ecommerce
sudo chown appuser:appuser /var/log/ecommerce

# Log rotation
sudo cat > /etc/logrotate.d/ecommerce << 'EOF'
/var/log/ecommerce/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
}
EOF
```

---

## Security Configuration

### 1. Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny everything else
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Check status
sudo ufw status
```

### 2. Security Headers Verification

```bash
# Check headers
curl -I https://your-domain.com

# Should include:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
# - Content-Security-Policy
```

### 3. System Hardening

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication (use keys only)
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart ssh
```

### 4. Database Security

```bash
# Create PostgreSQL backups
sudo -u postgres pg_dump ecommerce_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Restrict database connections
# Edit /etc/postgresql/14/main/pg_hba.conf
hostssl ecommerce_prod ecommerce_prod 127.0.0.1/32 scram-sha-256
```

---

## Monitoring & Maintenance

### 1. Health Checks

```bash
# Check application status
systemctl status ecommerce

# View logs
journalctl -u ecommerce -f

# Check database
psql -U ecommerce_prod -d ecommerce_prod -c "SELECT COUNT(*) FROM users;"
```

### 2. Performance Monitoring

```bash
# Install PM2 Monitoring (optional)
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# CPU/Memory Usage
ps aux | grep node

# Disk Usage
df -h

# Database Connections
psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### 3. Log Monitoring

```bash
# Application errors
tail -f /var/log/ecommerce/error.log

# Failed logins
grep "failed login" /var/log/ecommerce/app.log

# Admin actions
grep "Admin" /var/log/ecommerce/app.log
```

### 4. Regular Maintenance Tasks

**Daily:**
- Check application health
- Monitor disk space
- Review error logs

**Weekly:**
- Review security logs
- Run npm audit
- Check database size

**Monthly:**
- Update dependencies (with testing)
- Review access logs
- Security audit
- Database optimization

**Quarterly:**
- Full security assessment
- Performance review
- Backup restoration test

---

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database Connection Failed**
```bash
# Test connection
psql -U ecommerce_prod -d ecommerce_prod -h localhost

# Check credentials in .env
# Check PostgreSQL is running
sudo systemctl status postgresql
```

**Out of Disk Space**
```bash
# Find large files
du -sh /*

# Clean old logs
rm -rf /var/log/ecommerce/*.log

# Vacuum database
psql -U ecommerce_prod -d ecommerce_prod -c "VACUUM ANALYZE;"
```

**High Memory Usage**
```bash
# Restart application
systemctl restart ecommerce

# Check for memory leaks
node --inspect server.js
```

### Debug Mode

Enable detailed logging:
```bash
# Edit .env
LOG_LEVEL=debug

# Restart
systemctl restart ecommerce

# View debug logs
tail -f /var/log/ecommerce/app.log | grep "debug"
```

---

## Backup & Recovery

### Automated Backups

**Database Backup Script:**
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump ecommerce_prod | gzip > /home/appuser/backups/db_$TIMESTAMP.sql.gz
```

**Schedule with Cron:**
```bash
# Daily at 2 AM
0 2 * * * /home/appuser/backup-db.sh

# Weekly to external storage
0 3 * * 0 aws s3 cp /home/appuser/backups/ s3://your-bucket/ecommerce/ --recursive
```

### Recovery Procedure

**Database Recovery:**
```bash
# Stop application
sudo systemctl stop ecommerce

# Restore database
gunzip -c /home/appuser/backups/db_backup.sql.gz | psql -U ecommerce_prod -d ecommerce_prod

# Start application
sudo systemctl start ecommerce
```

---

## Deployment Checklist

Before going live:

- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database created and seeded
- [ ] Nginx configured
- [ ] Application started via systemd/PM2
- [ ] Health check endpoint responding
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Logs configured
- [ ] Backups scheduled
- [ ] Firewall configured
- [ ] SSH hardened
- [ ] Monitoring setup
- [ ] Incident response plan ready

---

## Post-Deployment

After deployment:

1. **Verify Application**
   ```bash
   curl https://your-domain.com
   curl -I https://your-domain.com  # Check headers
   ```

2. **Test Functionality**
   - Register new account
   - Login/logout
   - Browse products
   - Add to cart
   - Checkout
   - Admin features

3. **Monitor Logs**
   ```bash
   tail -f /var/log/ecommerce/app.log
   ```

4. **Set Up Alerts**
   - High error rate
   - Database connection errors
   - Disk space warnings
   - Failed login attempts

---

**Deployment Complete!**

For support, see [SECURITY.md](SECURITY.md) and [README.md](README.md)

**Last Updated:** January 5, 2025

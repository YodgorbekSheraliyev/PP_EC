#!/bin/bash

# Secure E-Commerce Installation Script
# This script helps set up the application for first-time use

set -e # Exit on error

echo "🚀 Secure E-Commerce Application - Installation Script"
echo "======================================================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check npm version
echo "📦 Checking npm version..."
echo "✅ npm version: $(npm -v)"
echo ""

# Check PostgreSQL
echo "🐘 Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed: $(psql --version)"
else
    echo "⚠️  Warning: PostgreSQL not found in PATH"
    echo "   Please ensure PostgreSQL is installed and running"
fi
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Install additional security dependencies
echo "🔒 Installing security dependencies..."
npm install csurf uuid
echo "✅ Security dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env

    # Generate secrets
    echo "🔐 Generating secure secrets..."
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-session-key-change-this-min-32-chars-long-please/$SESSION_SECRET/" .env
        sed -i '' "s/your-jwt-secret-key-change-this-also-min-32-characters-long/$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/your-super-secret-session-key-change-this-min-32-chars-long-please/$SESSION_SECRET/" .env
        sed -i "s/your-jwt-secret-key-change-this-also-min-32-characters-long/$JWT_SECRET/" .env
    fi

    echo "✅ .env file created with generated secrets"
    echo ""
    echo "⚠️  IMPORTANT: Please update DATABASE_URL in .env with your PostgreSQL credentials"
else
    echo "✅ .env file already exists"
fi
echo ""

# Create logs directory
echo "📝 Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory created"
echo ""

# Create tests directory structure
echo "🧪 Creating test directory structure..."
mkdir -p tests/{unit,integration,security}
mkdir -p tests/unit/{models,middleware}
echo "✅ Test directories created"
echo ""

# Security audit
echo "🔍 Running security audit..."
npm audit --production
echo ""

# Check for vulnerabilities
VULNERABILITIES=$(npm audit --json | grep -o '"vulnerabilities":{[^}]*}' | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
if [ "$VULNERABILITIES" -gt 0 ]; then
    echo "⚠️  Warning: $VULNERABILITIES vulnerabilities found"
    echo "   Run 'npm audit fix' to attempt automatic fixes"
else
    echo "✅ No vulnerabilities found"
fi
echo ""

# Database setup instructions
echo "📊 Database Setup Instructions:"
echo "================================"
echo ""
echo "1. Make sure PostgreSQL is running:"
echo "   pg_isready"
echo ""
echo "2. Create the database:"
echo "   createdb ecommerce_db"
echo "   OR using psql:"
echo "   psql -U postgres -c 'CREATE DATABASE ecommerce_db;'"
echo ""
echo "3. Update DATABASE_URL in .env file:"
echo "   DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db"
echo ""
echo "4. The application will automatically sync the database schema on first run"
echo ""

# Final instructions
echo "✅ Installation complete!"
echo ""
echo "🚀 Next steps:"
echo "=============="
echo ""
echo "1. Update .env file with your database credentials"
echo "2. Start the application:"
echo "   npm run dev           # Development mode"
echo "   npm start             # Production mode"
echo ""
echo "3. Access the application:"
echo "   http://localhost:5000"
echo ""
echo "4. Create an admin user:"
echo "   - Register a new user"
echo "   - Update role in database:"
echo "     psql -U postgres -d ecommerce_db"
echo "     UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
echo ""
echo "5. Run tests:"
echo "   npm test"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "⚠️  Security Reminders:"
echo "======================="
echo "- Never commit .env file to version control"
echo "- Use strong, unique secrets in production"
echo "- Enable HTTPS in production"
echo "- Keep dependencies updated: npm audit"
echo ""
echo "Happy coding! 🎉"
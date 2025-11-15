#!/bin/bash

# Quick Start Script for End-to-End Testing
# This script helps set up the environment files if they don't exist

set -e

echo "=========================================="
echo "Stock Portfolio Tracker - Quick Start"
echo "=========================================="
echo ""

# Check if we're in the project root
if [ ! -d "server" ] || [ ! -d "web" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Setup backend .env
echo "📝 Setting up backend environment..."
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env from template"
    echo "⚠️  Please edit server/.env and add your configuration:"
    echo "   - MONGODB_URI (MongoDB connection string)"
    echo "   - JWT_SECRET (strong random string, 32+ characters)"
    echo "   - EXCHANGE_RATE_API_KEY (from exchangerate-api.com)"
    echo ""
else
    echo "✅ server/.env already exists"
fi

# Setup frontend .env
echo "📝 Setting up frontend environment..."
if [ ! -f "web/.env" ]; then
    cp web/.env.example web/.env
    echo "✅ Created web/.env from template"
else
    echo "✅ web/.env already exists"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Edit server/.env with your configuration"
echo "   Required: MONGODB_URI, JWT_SECRET, EXCHANGE_RATE_API_KEY"
echo ""
echo "2. Start the backend (Terminal 1):"
echo "   cd server && go run main.go"
echo ""
echo "3. Start the frontend (Terminal 2):"
echo "   cd web && npm install && npm start"
echo ""
echo "4. Follow the testing guide:"
echo "   .kiro/specs/yahoo-finance-refactor/e2e-testing-guide.md"
echo ""
echo "=========================================="

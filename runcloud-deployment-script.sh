#!/bin/bash
set -e

# NOTE: Environment variables must NOT be stored here. Use RunCloud Environment Variables instead.

# Change to project directory
cd /home/fabrizio/webapps/thaiheavens-sign-app || exit 1

# Update code from Git
echo "Pulling latest changes from Git..."
git pull origin main || git merge origin/main

# Backend: Install dependencies and build
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# Frontend: Install dependencies and build
echo "Building frontend..."
cd frontend
# Remove old build-info.json to ensure fresh generation
rm -f src/build-info.json
npm install
# Generate build-info.json with version and commit hash
npm run prebuild
npm run build
cd ..

# Documentation: Build and copy to frontend
echo "Building documentation..."
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

# Restart Node.js application (using PM2)
echo "Restarting PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart thaiheavens-backend || pm2 start ecosystem.config.js
    pm2 save
    echo "PM2 restarted successfully"
else
    echo "WARNING: PM2 not found. Please restart the application manually."
fi

echo "Deployment completed successfully!"


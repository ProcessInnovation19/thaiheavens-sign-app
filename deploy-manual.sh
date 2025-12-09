#!/bin/bash
set -e

echo "=== Starting Manual Deployment ==="

# Navigate to project directory
cd /home/fabrizio/webapps/thaiheavens-sign-app

echo "=== Current directory: $(pwd) ==="

# Backend: Install dependencies and build
echo "=== Building Backend ==="
cd backend
npm install
npm run build
cd ..

# Frontend: Install dependencies and build
echo "=== Building Frontend ==="
cd frontend
npm install
npm run build
cd ..

# Documentation: Build and copy to frontend
echo "=== Building Documentation ==="
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

# Create storage directories if they don't exist
echo "=== Creating Storage Directories ==="
mkdir -p backend/storage/original
mkdir -p backend/storage/signed
mkdir -p backend/uploads
chmod -R 755 backend/storage
chmod -R 755 backend/uploads

echo "=== Deployment Complete ==="
echo "=== Verifying Build Files ==="
ls -la backend/dist/index.js
ls -la frontend/dist/index.html
ls -la frontend/public/docs/index.html

echo "=== All done! Now restart the Node.js app in RunCloud dashboard ==="




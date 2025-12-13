#!/bin/bash
set -e

# NOTE: Environment variables must NOT be stored here. Use RunCloud Environment Variables instead.

# Change to project directory
cd /home/fabrizio/webapps/thaiheavens-sign-app || {
    echo "ERROR: Directory not found!"
    exit 1
}

# Fix Git permissions and repository state
echo "Checking Git repository..."
if [ -d ".git" ]; then
    # Fix permissions on .git directory
    chmod -R u+w .git 2>/dev/null || true
    # Try to fix index file permissions
    if [ -f ".git/index" ]; then
        chmod 644 .git/index 2>/dev/null || true
        # If index is still problematic, remove it (git will recreate)
        if ! git status >/dev/null 2>&1; then
            echo "Removing corrupted index file..."
            rm -f .git/index 2>/dev/null || true
        fi
    fi
    # Remove problematic refs
    rm -f .git/refs/remotes/origin/HEAD 2>/dev/null || true
fi

# Update code from Git
echo "Pulling latest changes from Git..."
# Try pull, if it fails try fetch and reset
if ! git pull origin main 2>/dev/null; then
    echo "Pull failed, trying fetch and reset..."
    git fetch origin main 2>/dev/null || true
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        git reset --hard origin/main 2>/dev/null || {
            echo "WARNING: Git reset failed, continuing with existing code..."
        }
    else
        echo "WARNING: Cannot access origin/main, continuing with existing code..."
    fi
fi

# Backend: Install dependencies and build
echo "Building backend..."
cd backend
npm install
npm run build
if [ ! -f "dist/index.js" ]; then
    echo "ERROR: Backend build failed - dist/index.js not found!"
    exit 1
fi
echo "✓ Backend build completed"
cd ..

# Frontend: Install dependencies and build
echo "Building frontend..."
cd frontend
# Remove old build-info.json to ensure fresh generation
rm -f src/build-info.json
npm install
# Generate build-info.json with version and commit hash
npm run prebuild
if [ ! -f "src/build-info.json" ]; then
    echo "ERROR: build-info.json not generated!"
    exit 1
fi
echo "Build info generated:"
cat src/build-info.json
npm run build
if [ ! -f "dist/index.html" ]; then
    echo "ERROR: Frontend build failed - dist/index.html not found!"
    exit 1
fi
echo "✓ Frontend build completed"
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
    echo "✓ PM2 restarted successfully"
else
    echo "WARNING: PM2 not found. Please restart the application manually."
fi

echo "✓ Deployment completed successfully!"


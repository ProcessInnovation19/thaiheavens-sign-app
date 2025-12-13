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
GIT_WORKING=false
if [ -d ".git" ]; then
    # Fix permissions on entire .git directory recursively
    echo "Fixing Git permissions..."
    chmod -R u+w .git 2>/dev/null || true
    chown -R $(whoami) .git 2>/dev/null || true
    
    # Remove corrupted files
    rm -f .git/index 2>/dev/null || true
    rm -f .git/refs/remotes/origin/HEAD 2>/dev/null || true
    
    # Fix permissions on objects directory
    if [ -d ".git/objects" ]; then
        chmod -R u+w .git/objects 2>/dev/null || true
        find .git/objects -type f -exec chmod 644 {} \; 2>/dev/null || true
        find .git/objects -type d -exec chmod 755 {} \; 2>/dev/null || true
    fi
    
    # Test if Git works now
    if git rev-parse --git-dir >/dev/null 2>&1; then
        GIT_WORKING=true
    else
        echo "WARNING: Git repository is corrupted, will skip Git operations"
    fi
fi

# Update code from Git (only if Git is working)
if [ "$GIT_WORKING" = true ]; then
    echo "Pulling latest changes from Git..."
    # Try pull, if it fails try fetch and reset
    if ! git pull origin main 2>/dev/null; then
        echo "Pull failed, trying fetch and reset..."
        # Set remote if not exists
        if ! git remote get-url origin >/dev/null 2>&1; then
            git remote add origin https://github.com/ProcessInnovation19/thaiheavens-sign-app.git 2>/dev/null || true
        fi
        if ! git fetch origin main 2>/dev/null; then
            echo "WARNING: Git fetch failed, marking Git as non-working"
            GIT_WORKING=false
        elif ! git rev-parse --verify origin/main >/dev/null 2>&1; then
            echo "WARNING: Cannot access origin/main, marking Git as non-working"
            GIT_WORKING=false
        elif ! git reset --hard origin/main 2>/dev/null; then
            echo "WARNING: Git reset failed, marking Git as non-working"
            GIT_WORKING=false
        fi
    fi
else
    echo "WARNING: Skipping Git operations due to repository corruption"
    echo "Continuing with existing code files..."
fi

# Export SKIP_GIT if Git is not working
if [ "$GIT_WORKING" != true ]; then
    export SKIP_GIT=true
    echo "SKIP_GIT=true will be used for build process"
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
# Pass SKIP_GIT explicitly to npm if Git is not working
if [ "$GIT_WORKING" != true ]; then
    echo "Running prebuild with SKIP_GIT=true..."
    SKIP_GIT=true npm run prebuild
else
    npm run prebuild
fi
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


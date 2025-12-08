#!/bin/bash
set -e

# Build documentation
vitepress build .

# Remove old docs
rm -rf ../frontend/public/docs

# Copy new docs
mkdir -p ../frontend/public/docs
cp -r .vitepress/dist/* ../frontend/public/docs/

echo "Documentation copied to frontend/public/docs/"



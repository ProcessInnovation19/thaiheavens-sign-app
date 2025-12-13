#!/bin/bash
# Deploy completo in un unico comando

cd /home/fabrizio/webapps/thaiheavens-sign-app && \
git pull origin main && \
cd backend && npm run build && \
cd ../docs-site && npm run build && npm run copy-to-frontend && \
cd .. && \
pm2 restart thaiheavens-backend && \
echo "✅ Deploy completato!"





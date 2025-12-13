import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { uploadRoutes } from './routes/upload';
import { sessionRoutes } from './routes/session';
import { adminRoutes } from './routes/admin';
import { pdfRoutes } from './routes/pdf';
import { calibrateRoutes } from './routes/calibrate';
import { initStorage } from './services/storage';

// Initialize storage directories
initStorage();

const app = express();
const PORT = process.env.PORT || 5000;

// Get project root: backend/dist -> backend -> project root
// __dirname in compiled file is backend/dist
const projectRoot = path.join(__dirname, '../..');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public version endpoint (for verification)
app.get('/api/version', (req, res) => {
  try {
    const buildInfoPath = path.join(projectRoot, 'frontend', 'dist', 'build-info.json');
    let buildInfo = null;
    
    if (fs.existsSync(buildInfoPath)) {
      const buildInfoContent = fs.readFileSync(buildInfoPath, 'utf-8');
      buildInfo = JSON.parse(buildInfoContent);
    }
    
    res.json({
      version: buildInfo?.version || 'unknown',
      timestamp: buildInfo?.timestamp || null,
      date: buildInfo?.date || null,
      commit: buildInfo?.commit || null,
    });
  } catch (error: any) {
    console.error('Get version error:', error);
    res.json({
      version: 'unknown',
      timestamp: null,
      date: null,
      commit: null,
    });
  }
});

// Routes
app.use('/api', uploadRoutes);
app.use('/api', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/calibrate', calibrateRoutes);

// Serve frontend static files (both production and when served by Express)
const frontendPath = path.join(projectRoot, 'frontend/dist');
const frontendPublicPath = path.join(projectRoot, 'frontend/public');
const docsPath = path.join(projectRoot, 'frontend/public/docs');

// Serve documentation
if (fs.existsSync(docsPath)) {
  app.use('/docs', express.static(docsPath));
  // Handle client-side routing for VitePress
  app.get('/docs/*', (req, res) => {
    const filePath = path.join(docsPath, req.path.replace('/docs', ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    res.sendFile(path.join(docsPath, 'index.html'));
  });
}

// Serve images - try dist first (production, Vite copies public to dist), then public (fallback)
// Add no-cache headers for images to prevent caching issues
const distImagesPath = path.join(frontendPath, 'images');
const publicImagesPath = path.join(projectRoot, 'frontend/public/images');

if (fs.existsSync(distImagesPath)) {
  // Production: serve from dist (Vite copies public to dist during build)
  app.use('/images', express.static(distImagesPath, {
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }));
  console.log('Images served from dist:', distImagesPath);
} else if (fs.existsSync(publicImagesPath)) {
  // Fallback: serve from public (development or if dist doesn't exist)
  app.use('/images', express.static(publicImagesPath, {
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }));
  console.log('Images served from public:', publicImagesPath);
}

// Serve frontend static files
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // Handle client-side routing for React (SPA)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or docs
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (req.path.startsWith('/docs')) {
      return; // Already handled above
    }
    if (req.path.startsWith('/images')) {
      return; // Already handled above
    }
    // Set no-cache headers for index.html to prevent caching issues
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Fallback if frontend not built
  app.get('/', (req, res) => {
    res.json({ message: 'ThaiHeavens Backend API is running! Frontend not found.' });
  });
}

// Global error handler to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - log and continue
  // In production, you might want to exit and let the process manager restart
  if (process.env.NODE_ENV === 'production') {
    console.error('Fatal error in production, exiting...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Timeout for requests (30 seconds)
server.timeout = 30000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;


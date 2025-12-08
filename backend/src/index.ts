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

// __dirname is available in CommonJS modules
// Use process.cwd() for the project root instead
const projectRoot = process.cwd();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', uploadRoutes);
app.use('/api', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/calibrate', calibrateRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(projectRoot, 'frontend/dist');
  const docsPath = path.join(projectRoot, 'docs-site/.vitepress/dist');
  
  // Serve documentation
  if (fs.existsSync(docsPath)) {
    app.use('/docs', express.static(docsPath));
    // Handle client-side routing for VitePress
    app.get('/docs/*', (req, res) => {
      res.sendFile(path.join(docsPath, 'index.html'));
    });
  }
  
  // Serve frontend static files
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    
    // Handle client-side routing for React (SPA)
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api') || req.path.startsWith('/docs')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
} else {
  // Development mode
  app.get('/', (req, res) => {
    res.json({ message: 'ThaiHeavens Backend API is running!' });
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


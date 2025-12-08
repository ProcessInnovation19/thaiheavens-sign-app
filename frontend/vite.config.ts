import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Plugin to serve docs/index.html at /docs/
function serveDocsPlugin(): Plugin {
  return {
    name: 'serve-docs',
    configureServer(server) {
      // Serve static files from /docs first, before React Router
      server.middlewares.use('/docs', (req, res, next) => {
        const url = req.url || ''
        // If it's a request for a file (has extension or is in assets/chunks), serve it directly
        if (url.includes('.') || url.startsWith('/assets') || url.startsWith('/chunks') || url.startsWith('/vp-icons')) {
          // Let Vite serve the static file
          return next()
        }
        // If accessing /docs or /docs/ without a file, serve index.html
        if (url === '/' || url === '' || url.endsWith('/')) {
          req.url = '/index.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), serveDocsPlugin()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  publicDir: 'public'
})

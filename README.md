# ThaiHeavensSignApp

A full-stack web application for managing digital signing of rental contracts (PDFs). Built with React, TypeScript, Node.js, and Express.

## Project Summary

ThaiHeavensSignApp enables property managers and administrators to:
- Upload PDF rental contracts
- Visually position signature fields on contracts
- Generate secure signing links for guests
- Allow guests to sign contracts digitally using touch or mouse
- Download final signed contracts

The application features a clean, mobile-friendly interface designed for non-technical users, with separate admin and guest flows.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Installation

1. **Clone or download the project**

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

4. **Install documentation dependencies:**
   ```bash
   cd docs-site
   npm install
   ```

### Running the Application

**Option 1: Manual (Recommended for Development)**

Terminal 1 - Start Backend:
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5000`

Terminal 2 - Start Frontend:
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

**Option 2: PowerShell Script (Windows)**

Run the provided script:
```powershell
.\start-servers.ps1
```

This opens two separate windows for backend and frontend.

### Access the Application

- **Admin Interface:** http://localhost:5173/admin
- **Guest Signing:** http://localhost:5173/sign/:token
- **Calibration Tool:** http://localhost:5173/calibrate
- **Backend API:** http://localhost:5000/api
- **Documentation:** http://localhost:5173/docs (or run `npm run docs:dev`)

## Documentation

### Running Documentation

The documentation is built with VitePress and can be run independently:

**Development Mode:**
```bash
npm run docs:dev
```
Documentation runs on `http://localhost:5173` (or default VitePress port)

**Build Documentation:**
```bash
npm run docs:build
```
Output: `docs-site/.vitepress/dist/`

**Preview Documentation:**
```bash
npm run docs:preview
```
Preview the built documentation

### Documentation Structure

Comprehensive documentation is available in the `/docs` folder:

#### Core Documentation

- **[Developer Documentation](./docs/DEVELOPER.md)** - Complete technical documentation for developers
- **[User Guide](./docs/USER_GUIDE.md)** - User-friendly guide for non-technical users
- **[AI Replication Guide](./docs/AI_README_FOR_REPLICATION.md)** - Complete system description for AI-assisted replication

#### Diagram Documentation

- **[Architecture](./docs/architecture.md)** - High-level system architecture diagrams
- **[Sequence Diagrams](./docs/sequence_diagrams.md)** - All major flow sequences
- **[API Flow](./docs/api_flow.md)** - API interaction diagrams
- **[Data Model](./docs/data_model.md)** - Entity relationship and data model diagrams
- **[User Flow](./docs/user_flow.md)** - User journey and admin journey diagrams
- **[System Lifecycle](./docs/system_lifecycle.md)** - State transitions and lifecycle diagrams
- **[Deployment](./docs/deployment.md)** - Production deployment diagrams

### Documentation Portal

Access the interactive documentation portal:
- **Development:** Run `npm run docs:dev` from project root
- **Production:** Documentation is included in frontend build under `/docs`

## Technology Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- pdf-lib (PDF manipulation)
- Multer (file uploads)
- File system storage

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- React Router
- pdfjs-dist (PDF rendering)
- signature_pad (signature drawing)
- Tailwind CSS (styling)

**Documentation:**
- VitePress
- Mermaid diagrams

## Project Structure

```
ThaiHeavensSignApp/
├── backend/          # Node.js/Express backend
├── frontend/         # React frontend
├── docs/             # Documentation markdown files
├── docs-site/        # VitePress documentation site
└── README.md         # This file
```

## Features

### Admin Features
- ✅ Upload PDF contracts (drag & drop or file picker)
- ✅ Visual signature position selection
- ✅ Interactive signature box (drag & resize)
- ✅ Create signing sessions with guest information
- ✅ Generate secure signing links
- ✅ View all sessions and their status
- ✅ Download signed PDFs
- ✅ Delete sessions
- ✅ Calibration tool for testing

### Guest Features
- ✅ Access signing link (no account required)
- ✅ View contract PDF with page navigation
- ✅ Draw signature using touch or mouse
- ✅ Preview signed contract
- ✅ Confirm and download signed PDF
- ✅ Mobile-friendly interface

## Deployment

Per mettere online l'applicazione, consulta la [Guida al Deploy](./DEPLOY.md).

**Opzioni consigliate:**
- **Railway** (consigliato) - Facile setup, supporto full-stack, piano gratuito
- **Render** - Alternativa a Railway, simile facilità
- **Vercel + Railway** - Frontend su Vercel, Backend su Railway

**Quick Deploy su Railway:**
1. Crea account su [railway.app](https://railway.app)
2. Connetti il repository GitHub
3. Aggiungi le variabili d'ambiente (vedi `DEPLOY.md`)
4. Deploy automatico!

## Development

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```
Output: `frontend/dist/`

**Documentation:**
```bash
npm run docs:build
```
Output: `docs-site/.vitepress/dist/`

### Environment Variables

**Backend (.env):**
- `PORT` - Server port (default: 5000)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 465)
- `SMTP_SECURE` - Use SSL/TLS (true/false)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `NODE_ENV` - Environment (development/production)

**Frontend:**
- API proxy configured in `vite.config.ts`
- Development: `/api` → `http://localhost:5000`
- Production: `/api` → same origin (backend serves frontend)

## Documentation Commands

All documentation commands can be run from the project root:

```bash
# Start documentation dev server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview built documentation
npm run docs:preview
```

Or from the `frontend` directory:

```bash
cd frontend
npm run docs:dev
npm run docs:build
npm run docs:preview
```

## Security Notes

⚠️ **Current State:** This is a development version with no authentication. For production use, you should:

- Add authentication middleware
- Implement rate limiting
- Validate file uploads
- Restrict CORS to specific origins
- Use HTTPS/SSL
- Add input validation
- Implement proper error handling

## License

ISC

## Support

For technical questions, see the [Developer Documentation](./docs/DEVELOPER.md).

For user questions, see the [User Guide](./docs/USER_GUIDE.md).

For AI replication, see the [AI Replication Guide](./docs/AI_README_FOR_REPLICATION.md).

---

**Built with ❤️ for simple, secure digital contract signing.**

# Developer Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Structure](#backend-structure)
3. [Frontend Structure](#frontend-structure)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [PDF Tools & Coordinate Mapping](#pdf-tools--coordinate-mapping)
7. [Signature System](#signature-system)
8. [Local Development](#local-development)
9. [Deployment](#deployment)
10. [Folder Structure](#folder-structure)
11. [Extending Functionality](#extending-functionality)

---

## Architecture Overview

ThaiHeavensSignApp is a full-stack web application for managing digital signing of rental contracts (PDFs). It follows a monorepo structure with separate frontend and backend applications.

### Technology Stack

**Backend:**
- Node.js + TypeScript
- Express.js for REST API
- pdf-lib for PDF manipulation
- Multer for file uploads
- File system storage (JSON + files)

**Frontend:**
- React 18 + TypeScript
- Vite for build tooling
- React Router for routing
- pdfjs-dist for PDF rendering
- signature_pad for signature drawing
- Tailwind CSS for styling

### Architecture Pattern

The application follows a **client-server architecture** with:
- **RESTful API** backend serving JSON responses
- **Single Page Application (SPA)** frontend
- **Stateless API** design (sessions stored in JSON file)
- **File-based storage** for PDFs and session data

---

## Backend Structure

### Project Layout

```
backend/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── models/
│   │   └── SigningSession.ts # TypeScript interfaces
│   ├── routes/
│   │   ├── upload.ts         # PDF upload endpoints
│   │   ├── session.ts        # Session management endpoints
│   │   ├── admin.ts          # Admin-only endpoints
│   │   ├── pdf.ts            # PDF streaming endpoints
│   │   └── calibrate.ts      # Calibration/testing endpoints
│   └── services/
│       ├── storage.ts         # File system operations
│       └── pdfService.ts     # PDF manipulation logic
├── storage/
│   ├── original/             # Original uploaded PDFs
│   ├── signed/               # Signed PDFs
│   └── sessions.json         # Session data (JSON)
├── package.json
└── tsconfig.json
```

### Core Services

#### Storage Service (`services/storage.ts`)

Manages file system operations:
- **`initStorage()`**: Creates necessary directories on startup
- **`getSessions()`**: Reads all sessions from JSON file
- **`saveSessions()`**: Writes sessions to JSON file
- **`getSessionById()`**: Retrieves session by ID
- **`getSessionByToken()`**: Retrieves session by public token
- **`saveSession()`**: Saves/updates a session
- **`deleteSession()`**: Deletes session and associated files
- **`getOriginalPdfPath()`**: Returns path to original PDF
- **`getSignedPdfPath()`**: Returns path to signed PDF

#### PDF Service (`services/pdfService.ts`)

Handles PDF manipulation using pdf-lib:
- **`applySignatureToPdf()`**: Embeds signature image into PDF at specified coordinates
  - Converts canvas coordinates (top-left origin) to PDF coordinates (bottom-left origin)
  - Embeds PNG signature image
  - Saves signed PDF to disk

### Express App Setup

The main Express application (`src/index.ts`):
1. Initializes storage directories
2. Configures CORS for frontend communication
3. Sets up JSON body parser (50MB limit for base64 images)
4. Registers route handlers:
   - `/api` - Upload and session routes
   - `/api/admin` - Admin routes
   - `/api/pdf` - PDF streaming
   - `/api/calibrate` - Calibration routes

---

## Frontend Structure

### Project Layout

```
frontend/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router configuration
│   ├── index.css             # Global styles (Tailwind)
│   ├── components/
│   │   ├── PDFViewer.tsx     # PDF rendering component
│   │   └── SignaturePad.tsx  # Signature drawing component
│   ├── pages/
│   │   ├── AdminPage.tsx     # Admin interface
│   │   ├── SignPage.tsx      # Guest signing interface
│   │   └── CalibratePage.tsx # Calibration tool
│   ├── services/
│   │   └── api.ts            # API client functions
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── public/
├── package.json
├── vite.config.ts            # Vite configuration
└── tailwind.config.js        # Tailwind CSS configuration
```

### Key Components

#### PDFViewer (`components/PDFViewer.tsx`)

Renders PDFs using pdfjs-dist:
- Loads PDF from URL
- Renders pages to canvas at 1.5x scale
- Handles page navigation
- Supports click-to-select signature position
- Interactive signature box (drag & resize)
- Coordinate conversion (canvas ↔ PDF)

**Props:**
- `pdfUrl`: URL to PDF file
- `onPageClick`: Callback when user clicks on PDF
- `selectedPage`: Page number to display
- `selectedPosition`: Current signature box position
- `readOnly`: Disable interaction
- `onViewportReady`: Callback with viewport dimensions
- `onPositionUpdate`: Callback when position changes

#### SignaturePad (`components/SignaturePad.tsx`)

Canvas-based signature drawing using signature_pad:
- Transparent background
- Responsive canvas sizing
- Guide line at 2/3 height (visual only, not exported)
- Exports as PNG with transparency

**Props:**
- `onSignatureChange`: Callback with base64 image
- `height`: Canvas height in pixels

### Pages

#### AdminPage (`pages/AdminPage.tsx`)

Multi-step admin interface:
1. **Sessions List**: View all signing sessions
2. **Upload PDF**: Drag & drop or file picker
3. **Select Position**: Click on PDF to position signature box
4. **Create Session**: Enter guest details and generate link

Features:
- Drag & drop PDF upload
- Interactive signature box positioning
- Box resizing and dragging
- Session management (view, copy URL, delete)

#### SignPage (`pages/SignPage.tsx`)

Guest signing flow:
1. **View Contract**: Read the PDF
2. **Draw Signature**: Use canvas to sign
3. **Preview**: See signed PDF preview
4. **Confirm**: Finalize signature

Features:
- Mobile-friendly interface
- Touch support for signature drawing
- PDF preview after signing
- Download on confirmation

#### CalibratePage (`pages/CalibratePage.tsx`)

Calibration tool for testing signature placement:
- Upload test PDF
- Click to position signature box
- Adjust calibration parameters (offset, scale)
- Test with box or actual signature
- Generate test PDF to verify placement

### API Client (`services/api.ts`)

Centralized API functions:
- `uploadPdf(file)`: Upload PDF file
- `createSession(data)`: Create signing session
- `getSessionByToken(token)`: Get session info
- `signSession(token, signatureBase64)`: Apply signature
- `confirmSession(token)`: Confirm signature
- `getAllSessions()`: Get all sessions (admin)
- `downloadSignedPdf(sessionId)`: Download signed PDF
- `deleteSession(sessionId)`: Delete session

---

## Data Models

### SigningSession

```typescript
interface SigningSession {
  id: string;                    // UUID
  token: string;                 // Public token (no dashes)
  pdfId: string;                 // UUID of original PDF
  originalPdfPath: string;       // File system path
  signedPdfPath?: string;        // File system path (after signing)
  guestName?: string;            // Optional guest name
  guestEmail?: string;           // Optional guest email
  page: number;                  // PDF page index (0-based)
  x: number;                     // X coordinate (PDF points)
  y: number;                     // Y coordinate (PDF points)
  width: number;                 // Signature width (PDF points)
  height: number;                // Signature height (PDF points)
  status: 'pending' | 'signed' | 'completed';
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### SessionPublicInfo

Public-facing session data (no internal paths):
```typescript
interface SessionPublicInfo {
  id: string;
  token: string;
  guestName?: string;
  guestEmail?: string;
  status: 'pending' | 'signed' | 'completed';
  pdfViewUrl: string;            // Public URL to view PDF
  page: number;
}
```

---

## API Endpoints

### Upload Endpoints

#### `POST /api/upload-pdf`
Upload a PDF file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file)

**Response:**
```json
{
  "pdfId": "uuid",
  "filePath": "/path/to/file.pdf"
}
```

### Session Endpoints

#### `POST /api/create-session`
Create a new signing session.

**Request:**
```json
{
  "pdfId": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "page": 0,
  "x": 100,
  "y": 200,
  "width": 200,
  "height": 100
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "token": "tokenstring",
  "publicUrl": "/sign/tokenstring"
}
```

#### `GET /api/session/:token`
Get session information (public endpoint).

**Response:**
```json
{
  "id": "uuid",
  "token": "tokenstring",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "status": "pending",
  "pdfViewUrl": "/api/pdf/uuid",
  "page": 0
}
```

#### `POST /api/session/:token/sign`
Apply signature to PDF.

**Request:**
```json
{
  "signatureImageBase64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "signedPdfUrl": "/api/admin/session/:id/preview-signed",
  "sessionId": "uuid"
}
```

#### `POST /api/session/:token/confirm`
Confirm signature and mark session as completed.

**Response:**
```json
{
  "success": true
}
```

### Admin Endpoints

#### `GET /api/admin/sessions`
Get all sessions (admin only).

**Response:**
```json
[
  {
    "id": "uuid",
    "token": "tokenstring",
    "guestName": "John Doe",
    "status": "completed",
    ...
  }
]
```

#### `GET /api/admin/session/:id/download-signed`
Download signed PDF.

**Response:** PDF file stream

#### `GET /api/admin/session/:id/preview-signed`
Preview signed PDF (inline).

**Response:** PDF file stream with inline content-type

#### `DELETE /api/admin/session/:id`
Delete session and associated files.

**Response:**
```json
{
  "success": true
}
```

### PDF Endpoints

#### `GET /api/pdf/:pdfId`
Stream original PDF file.

**Response:** PDF file stream

### Calibration Endpoints

#### `POST /api/calibrate/test-pdf`
Generate test PDF with signature box or signature.

**Request:**
```json
{
  "pdfId": "uuid",
  "page": 0,
  "x": 100,
  "y": 200,
  "width": 200,
  "height": 100,
  "signatureImageBase64": "optional"
}
```

**Response:** PDF file stream

---

## PDF Tools & Coordinate Mapping

### Coordinate Systems

The application uses two coordinate systems:

1. **Canvas Coordinates** (top-left origin):
   - Used in frontend for display
   - Origin (0,0) at top-left corner
   - Y increases downward

2. **PDF Coordinates** (bottom-left origin):
   - Used in backend for PDF manipulation
   - Origin (0,0) at bottom-left corner
   - Y increases upward

### Conversion Logic

**Frontend → Backend:**
```typescript
// Canvas is rendered at scale 1.5
const pdfScaleRatio = 1.0 / displayViewport.scale; // 1/1.5 = 0.666...
const pdfX = canvasX * pdfScaleRatio;
const pdfY = canvasY * pdfScaleRatio;
```

**Backend PDF Placement:**
```typescript
// PDF coordinates have bottom-left origin
const pdfX = session.x; // X stays the same
const pdfY = pageHeight - session.y - session.height; // Flip Y
```

### PDF Rendering

**Frontend (pdfjs-dist):**
- Renders PDF pages to HTML5 canvas
- Uses viewport scale of 1.5 for better quality
- Handles page navigation
- Supports touch events for mobile

**Backend (pdf-lib):**
- Loads PDF from file system
- Embeds PNG signature image
- Draws image at calculated coordinates
- Saves modified PDF to disk

### Signature Box Positioning

The signature box is rendered as an HTML overlay on the canvas:
- Default size: 200x100px (2:1 aspect ratio)
- Draggable for repositioning
- Resizable from corners (maintains aspect ratio)
- Guide line at 2/3 height (visual only)
- Coordinates updated in real-time

---

## Signature System

### Signature Drawing

**Library:** signature_pad v4.0.9

**Features:**
- Transparent background (RGBA)
- Smooth stroke rendering
- Touch and mouse support
- Responsive canvas sizing
- Export as PNG with transparency

### Signature Export

**Process:**
1. User draws signature on canvas
2. Signature is exported as base64 PNG
3. Guide line is NOT included in export (redrawn after export)
4. Base64 string sent to backend
5. Backend converts to Buffer and embeds in PDF

### Signature Placement

**Visual Guide:**
- Horizontal line at 2/3 height from top
- Helps user align signature vertically
- Only visible on screen, not in exported image

**PDF Embedding:**
- Signature image embedded at exact coordinates
- Maintains original size and aspect ratio
- Transparent background preserved

---

## Local Development

### Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge
- Modern browser

### Setup

1. **Clone repository** (if applicable)

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

### Running Development Servers

**Option 1: Manual (separate terminals)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5000`

Terminal 2 - Frontend:
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

### Development URLs

- **Admin Interface:** http://localhost:5173/admin
- **Guest Signing:** http://localhost:5173/sign/:token
- **Calibration Tool:** http://localhost:5173/calibrate
- **Backend API:** http://localhost:5000/api
- **Documentation:** http://localhost:5173/docs

### Hot Reload

Both servers support hot reload:
- **Backend:** Uses `ts-node-dev` with `--respawn` flag
- **Frontend:** Uses Vite HMR (Hot Module Replacement)

### Storage Directories

On first run, the backend creates:
- `backend/storage/original/` - Original PDFs
- `backend/storage/signed/` - Signed PDFs
- `backend/storage/sessions.json` - Session data

---

## Deployment

### Production Build

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

### Environment Variables

**Backend:**
- `PORT` - Server port (default: 5000)

**Frontend:**
- Configured in `vite.config.ts`
- API proxy: `/api` → `http://localhost:5000`

### Deployment Options

**Option 1: Traditional Hosting**
- Deploy backend to Node.js hosting (Heroku, Railway, etc.)
- Deploy frontend to static hosting (Vercel, Netlify, etc.)
- Update frontend API base URL

**Option 2: Single Server**
- Serve frontend build from Express
- Add static file serving in `backend/src/index.ts`:
  ```typescript
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  ```

**Option 3: Docker**
- Create Dockerfile for backend
- Use nginx for frontend
- Set up reverse proxy

### Security Considerations

**Current State:**
- No authentication (admin routes are public)
- No rate limiting
- File uploads not validated (should add PDF validation)
- CORS allows all origins

**Recommended for Production:**
- Add authentication middleware
- Implement rate limiting
- Validate file types and sizes
- Restrict CORS to specific origins
- Use environment variables for secrets
- Add HTTPS/SSL

---

## Folder Structure

### Root Structure

```
ThaiHeavensSignApp/
├── backend/              # Backend application
├── frontend/             # Frontend application
├── docs/                 # Documentation markdown files
├── docs-site/            # VitePress documentation site
├── README.md             # Project overview
├── start-servers.ps1     # Development script (Windows)
└── cursor-rules.txt      # Project rules
```

### Backend Structure

```
backend/
├── src/
│   ├── index.ts          # Express app entry
│   ├── models/           # TypeScript interfaces
│   ├── routes/           # API route handlers
│   └── services/         # Business logic
├── storage/              # File storage
│   ├── original/         # Original PDFs
│   ├── signed/           # Signed PDFs
│   └── sessions.json     # Session data
├── uploads/              # Temporary uploads (Multer)
├── package.json
└── tsconfig.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx          # React entry
│   ├── App.tsx           # Router
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   ├── services/         # API client
│   └── types/            # TypeScript types
├── public/               # Static assets
├── dist/                 # Build output
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Extending Functionality

### Adding New API Endpoints

1. Create route file in `backend/src/routes/`
2. Export router: `export const myRoutes = Router();`
3. Define endpoints: `myRoutes.get('/path', handler)`
4. Register in `backend/src/index.ts`: `app.use('/api', myRoutes)`

### Adding New Frontend Pages

1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`:
   ```tsx
   <Route path="/my-page" element={<MyPage />} />
   ```

### Adding Authentication

**Backend:**
1. Install auth library (e.g., `jsonwebtoken`)
2. Create middleware: `middleware/auth.ts`
3. Protect routes: `adminRoutes.use(authMiddleware)`

**Frontend:**
1. Add login page
2. Store token in localStorage
3. Add to API requests: `Authorization: Bearer ${token}`

### Adding Database

Replace JSON file storage:
1. Install database (e.g., PostgreSQL, MongoDB)
2. Create models/ORM setup
3. Update `services/storage.ts` to use database
4. Migrate existing sessions

### Adding Email Notifications

1. Install email library (e.g., `nodemailer`)
2. Create service: `services/email.ts`
3. Send email on session creation/confirmation
4. Use environment variables for SMTP config

### Adding Multi-Signature Support

1. Extend `SigningSession` model:
   ```typescript
   signatures: Array<{
     x: number;
     y: number;
     width: number;
     height: number;
     page: number;
   }>
   ```
2. Update PDF service to handle multiple signatures
3. Update frontend to support multiple boxes

### Adding PDF Templates

1. Create template system in `services/pdfService.ts`
2. Support template variables
3. Add template selection in admin interface

---

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 5000 is available
- Verify `storage/` directories exist
- Check TypeScript compilation errors

**Frontend can't connect to backend:**
- Verify backend is running
- Check CORS configuration
- Verify proxy settings in `vite.config.ts`

**PDF not rendering:**
- Check browser console for errors
- Verify PDF file is valid
- Check pdfjs-dist worker URL

**Signature not appearing:**
- Verify coordinate conversion
- Check PDF coordinate system (bottom-left origin)
- Verify signature image is valid PNG

**Storage issues:**
- Check file permissions
- Verify storage directories exist
- Check disk space

---

## Best Practices

1. **Type Safety:** Always use TypeScript interfaces
2. **Error Handling:** Wrap async operations in try-catch
3. **Validation:** Validate user inputs on both frontend and backend
4. **Comments:** Document coordinate conversions and complex logic
5. **Testing:** Add unit tests for services and utilities
6. **Code Organization:** Keep routes thin, move logic to services
7. **Security:** Never expose internal file paths to frontend
8. **Performance:** Optimize PDF rendering and image sizes

---

## Additional Resources

- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [pdfjs-dist Documentation](https://mozilla.github.io/pdf.js/)
- [signature_pad Documentation](https://github.com/szimek/signature_pad)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [VitePress Documentation](https://vitepress.dev/)

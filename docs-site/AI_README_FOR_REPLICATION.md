# AI README for Replication

## Complete System Description for Automated Generation

This document provides a complete, explicit description of the ThaiHeavensSignApp system to enable accurate AI-assisted replication or regeneration from scratch.

---

## System Overview

**Project Name:** ThaiHeavensSignApp  
**Purpose:** Full-stack web application for managing digital signing of rental contracts (PDFs)  
**Architecture:** Monorepo with separate frontend (React) and backend (Node.js/Express)  
**Storage:** File system (JSON + PDF files)  
**Deployment Model:** Client-server with REST API

---

## Core Requirements

### Functional Requirements

1. **Admin Flow:**
   - Upload PDF contracts
   - Visually select signature position on PDF
   - Create signing sessions with guest information
   - Generate secure public signing links
   - View all sessions and their status
   - Download signed PDFs

2. **Guest Flow:**
   - Access signing link (no authentication required)
   - View contract PDF
   - Draw signature using touch/mouse
   - Preview signed contract
   - Confirm signature
   - Download signed PDF

3. **Technical Requirements:**
   - Mobile-friendly interface
   - Touch support for signature drawing
   - Coordinate mapping between canvas and PDF
   - Transparent signature background
   - PDF manipulation without altering original

### Non-Functional Requirements

- Simple, clean UI (no heavy frameworks)
- Fast PDF rendering
- Responsive design
- Cross-browser compatibility
- No external dependencies for core functionality

---

## Technology Stack (MANDATORY)

### Backend

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.3+
- **Framework:** Express.js 4.18+
- **PDF Library:** pdf-lib 1.17+
- **File Upload:** Multer 1.4+
- **UUID Generation:** uuid 9.0+
- **Development:** ts-node-dev 2.0+

### Frontend

- **Framework:** React 18.2+
- **Language:** TypeScript 5.3+
- **Build Tool:** Vite 5.0+
- **Routing:** react-router-dom 6.21+
- **PDF Rendering:** pdfjs-dist 3.11+
- **Signature Drawing:** signature_pad 4.0+
- **Styling:** Tailwind CSS 3.4+
- **PostCSS:** autoprefixer 10.4+

### Development Tools

- TypeScript for type safety
- Vite for fast HMR
- Tailwind CSS for styling
- CORS enabled for development

---

## Project Structure

### Root Directory

```
ThaiHeavensSignApp/
├── backend/                 # Backend Node.js application
├── frontend/                # Frontend React application
├── docs/                    # Documentation markdown files
├── docs-site/               # VitePress documentation site
├── README.md                # Project overview
├── start-servers.ps1        # Windows dev script
└── cursor-rules.txt         # Project rules/context
```

### Backend Structure

```
backend/
├── src/
│   ├── index.ts             # Express app entry point
│   ├── models/
│   │   └── SigningSession.ts # TypeScript interface
│   ├── routes/
│   │   ├── upload.ts        # POST /api/upload-pdf
│   │   ├── session.ts       # Session CRUD operations
│   │   ├── admin.ts         # Admin-only endpoints
│   │   ├── pdf.ts           # GET /api/pdf/:pdfId
│   │   └── calibrate.ts     # POST /api/calibrate/test-pdf
│   └── services/
│       ├── storage.ts       # File system operations
│       └── pdfService.ts    # PDF manipulation
├── storage/                  # Created at runtime
│   ├── original/            # Original PDFs (UUID.pdf)
│   ├── signed/              # Signed PDFs (sessionId.pdf)
│   └── sessions.json        # Session data (JSON array)
├── uploads/                  # Multer temp directory
├── package.json
└── tsconfig.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Router configuration
│   ├── index.css            # Tailwind imports
│   ├── components/
│   │   ├── PDFViewer.tsx    # PDF rendering component
│   │   └── SignaturePad.tsx # Signature drawing component
│   ├── pages/
│   │   ├── AdminPage.tsx    # Admin interface
│   │   ├── SignPage.tsx    # Guest signing interface
│   │   └── CalibratePage.tsx # Calibration tool
│   ├── services/
│   │   └── api.ts           # API client functions
│   └── types/
│       └── index.ts         # TypeScript interfaces
├── public/                   # Static assets
├── index.html                # HTML entry point
├── package.json
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── postcss.config.js        # PostCSS configuration
```

---

## Data Models

### SigningSession Interface

```typescript
interface SigningSession {
  id: string;                    // UUID v4
  token: string;                 // UUID without dashes (public token)
  pdfId: string;                 // UUID of original PDF
  originalPdfPath: string;       // Absolute file system path
  signedPdfPath?: string;        // Absolute file system path (after signing)
  guestName?: string;            // Optional guest name
  guestEmail?: string;           // Optional guest email
  page: number;                  // PDF page index (0-based)
  x: number;                     // X coordinate in PDF points (bottom-left origin)
  y: number;                     // Y coordinate in PDF points (bottom-left origin)
  width: number;                 // Signature width in PDF points
  height: number;                // Signature height in PDF points
  status: 'pending' | 'signed' | 'completed';
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### Frontend Types

```typescript
// Public session info (no internal paths)
interface SessionPublicInfo {
  id: string;
  token: string;
  guestName?: string;
  guestEmail?: string;
  status: 'pending' | 'signed' | 'completed';
  pdfViewUrl: string;            // Public URL: /api/pdf/:pdfId
  page: number;
}

// Create session request
interface CreateSessionRequest {
  pdfId: string;
  guestName?: string;
  guestEmail?: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Create session response
interface CreateSessionResponse {
  sessionId: string;
  token: string;
  publicUrl: string;              // Relative URL: /sign/:token
}
```

---

## API Endpoints Specification

### Base URL
- Development: `http://localhost:5000`
- All endpoints prefixed with `/api` except root

### Upload Endpoints

#### `POST /api/upload-pdf`
**Purpose:** Upload a PDF file for signing

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file)

**Response:**
```json
{
  "pdfId": "uuid-string",
  "filePath": "/absolute/path/to/file.pdf"
}
```

**Implementation Notes:**
- Use Multer with single file upload
- Generate UUID for pdfId
- Store in `backend/storage/original/{pdfId}.pdf`
- Return pdfId (not filePath) to frontend

### Session Endpoints

#### `POST /api/create-session`
**Purpose:** Create a new signing session

**Request Body:**
```json
{
  "pdfId": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "page": 0,
  "x": 100.0,
  "y": 200.0,
  "width": 200.0,
  "height": 100.0
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "token": "tokenstringnodashes",
  "publicUrl": "/sign/tokenstringnodashes"
}
```

**Implementation Notes:**
- Generate sessionId (UUID v4)
- Generate token (UUID v4 without dashes)
- Create SigningSession object
- Save to `storage/sessions.json`
- Return publicUrl (relative path)

#### `GET /api/session/:token`
**Purpose:** Get session information (public endpoint)

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

**Implementation Notes:**
- Do NOT return internal file paths
- Only return public URLs
- Return 404 if session not found

#### `POST /api/session/:token/sign`
**Purpose:** Apply signature to PDF

**Request Body:**
```json
{
  "signatureImageBase64": "data:image/png;base64,iVBORw0KG..."
}
```

**Response:**
```json
{
  "signedPdfUrl": "/api/admin/session/:id/preview-signed",
  "sessionId": "uuid"
}
```

**Implementation Notes:**
- Extract base64 data (remove `data:image/png;base64,` prefix)
- Convert to Buffer
- Call `applySignatureToPdf()` service
- Update session status to "signed"
- Update session.signedPdfPath
- Return preview URL

#### `POST /api/session/:token/confirm`
**Purpose:** Confirm signature and mark as completed

**Response:**
```json
{
  "success": true
}
```

**Implementation Notes:**
- Update session status to "completed"
- Save session to JSON file

### Admin Endpoints

#### `GET /api/admin/sessions`
**Purpose:** Get all sessions (admin only)

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

**Implementation Notes:**
- Return full session objects (including internal paths)
- No authentication currently (add in production)

#### `GET /api/admin/session/:id/download-signed`
**Purpose:** Download signed PDF file

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="signed.pdf"`
- PDF file stream

**Implementation Notes:**
- Check if session exists and is completed
- Stream file from `storage/signed/{sessionId}.pdf`

#### `GET /api/admin/session/:id/preview-signed`
**Purpose:** Preview signed PDF inline

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `inline`
- PDF file stream

#### `DELETE /api/admin/session/:id`
**Purpose:** Delete session and associated files

**Response:**
```json
{
  "success": true
}
```

**Implementation Notes:**
- Delete signed PDF if exists
- Remove session from JSON file
- Do NOT delete original PDF (may be used by other sessions)

### PDF Endpoints

#### `GET /api/pdf/:pdfId`
**Purpose:** Stream original PDF file

**Response:**
- Content-Type: `application/pdf`
- PDF file stream

**Implementation Notes:**
- Stream from `storage/original/{pdfId}.pdf`
- Return 404 if file not found

### Calibration Endpoints

#### `POST /api/calibrate/test-pdf`
**Purpose:** Generate test PDF with signature box or signature

**Request Body:**
```json
{
  "pdfId": "uuid",
  "page": 0,
  "x": 100.0,
  "y": 200.0,
  "width": 200.0,
  "height": 100.0,
  "signatureImageBase64": "optional-base64-string"
}
```

**Response:**
- Content-Type: `application/pdf`
- PDF file stream with red box or signature

**Implementation Notes:**
- If signatureImageBase64 provided: embed signature
- Otherwise: draw red rectangle at coordinates
- Return modified PDF inline

---

## Coordinate System Mapping

### Critical Understanding

**Two Coordinate Systems:**

1. **Canvas Coordinates (Frontend):**
   - Origin (0,0) at **top-left**
   - Y increases **downward**
   - Used for display and user interaction

2. **PDF Coordinates (Backend):**
   - Origin (0,0) at **bottom-left**
   - Y increases **upward**
   - Used for PDF manipulation

### Conversion Logic

**Frontend Canvas → PDF:**

```typescript
// Canvas is rendered at scale 1.5
const displayViewport = page.getViewport({ scale: 1.5 });
const pdfScaleRatio = 1.0 / displayViewport.scale; // 1/1.5 = 0.666...

// Convert canvas coordinates to PDF coordinates
const pdfX = canvasX * pdfScaleRatio;
const pdfY = canvasY * pdfScaleRatio;
```

**PDF Placement (Backend):**

```typescript
// PDF coordinates have bottom-left origin
const pageHeight = targetPage.getSize().height;
const pdfX = session.x; // X stays the same
const pdfY = pageHeight - session.y - session.height; // Flip Y axis
```

### Signature Box Dimensions

- **Default Size:** 200px width × 100px height (2:1 aspect ratio)
- **Canvas Display:** Rendered at 1.5x scale
- **PDF Points:** Converted using scale ratio
- **Maintained:** Aspect ratio always 2:1

---

## PDF Tools Implementation

### Frontend: pdfjs-dist

**Purpose:** Render PDF pages to HTML5 canvas

**Key Implementation:**

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Load PDF
const loadingTask = pdfjsLib.getDocument(pdfUrl);
const pdf = await loadingTask.promise;

// Get page
const page = await pdf.getPage(pageNumber);

// Create viewport (scale 1.5 for better quality)
const viewport = page.getViewport({ scale: 1.5 });

// Render to canvas
const renderContext = {
  canvasContext: ctx,
  viewport: viewport,
};
await page.render(renderContext).promise;
```

**Important:**
- Use CDN worker URL
- Scale 1.5 for display quality
- Handle render task cancellation
- Clear canvas before rendering

### Backend: pdf-lib

**Purpose:** Embed signature image into PDF

**Key Implementation:**

```typescript
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

// Load PDF
const pdfBytes = fs.readFileSync(originalPdfPath);
const pdfDoc = await PDFDocument.load(pdfBytes);

// Get page
const pages = pdfDoc.getPages();
const targetPage = pages[session.page];

// Convert base64 to image
const imageBytes = Buffer.from(signatureImageBase64, 'base64');
const signatureImage = await pdfDoc.embedPng(imageBytes);

// Draw image (coordinates in PDF points, bottom-left origin)
targetPage.drawImage(signatureImage, {
  x: pdfX,
  y: pdfY,
  width: session.width,
  height: session.height,
});

// Save
const pdfBytes = await pdfDoc.save();
fs.writeFileSync(signedPdfPath, pdfBytes);
```

**Important:**
- Use `embedPng()` for transparent signatures
- Convert base64 to Buffer
- Handle coordinate conversion (bottom-left origin)
- Save as new file (don't modify original)

---

## Signature System Implementation

### Frontend: signature_pad

**Purpose:** Draw signatures on canvas

**Key Implementation:**

```typescript
import SignaturePad from 'signature_pad';

// Initialize
const signaturePad = new SignaturePad(canvas, {
  backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent
  penColor: 'rgb(0, 0, 0)',
});

// Export
const dataUrl = signaturePad.toDataURL('image/png');
```

**Critical Requirements:**
- **Transparent background:** Must use `rgba(0, 0, 0, 0)`
- **PNG export:** Use `toDataURL('image/png')` to preserve transparency
- **Guide line:** Draw at 2/3 height for visual alignment (NOT in exported image)
- **Responsive:** Handle canvas resize and device pixel ratio

**Guide Line Implementation:**
```typescript
// Draw guide line (visual only, not in export)
const visualHeight = canvas.offsetHeight;
const guideY = (visualHeight * 2) / 3;

ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
ctx.lineWidth = 1;
ctx.setLineDash([4, 4]);
ctx.beginPath();
ctx.moveTo(0, guideY);
ctx.lineTo(canvas.offsetWidth, guideY);
ctx.stroke();
```

**Export Process:**
1. User draws signature
2. Export as PNG (guide line NOT included)
3. Redraw guide line AFTER export (for display only)
4. Send base64 to backend

---

## Frontend Components

### PDFViewer Component

**Purpose:** Render PDF and handle signature position selection

**Props:**
```typescript
interface PDFViewerProps {
  pdfUrl: string;
  onPageClick?: (page: number, canvasX: number, canvasY: number, pdfX?: number, pdfY?: number) => void;
  selectedPage?: number;
  selectedPosition?: { x: number; y: number; width: number; height: number; pdfX?: number; pdfY?: number; pdfWidth?: number; pdfHeight?: number };
  readOnly?: boolean;
  onViewportReady?: (viewport: { width: number; height: number; scale: number }) => void;
  onPositionUpdate?: (position: { x: number; y: number; width: number; height: number; pdfX: number; pdfY: number; pdfWidth: number; pdfHeight: number }) => void;
}
```

**Key Features:**
- PDF rendering with pdfjs-dist
- Page navigation (Previous/Next)
- Click to select position
- Interactive signature box (drag & resize)
- Coordinate conversion
- Touch support for mobile
- Custom rectangle cursor

**Signature Box:**
- HTML overlay (not drawn on canvas)
- Draggable for repositioning
- Resizable from corners (maintains 2:1 aspect ratio)
- Guide line at 2/3 height
- Real-time coordinate updates

### SignaturePad Component

**Purpose:** Draw signatures on canvas

**Props:**
```typescript
interface SignaturePadComponentProps {
  onSignatureChange?: (dataUrl: string) => void;
  height?: number; // Default: 300
}
```

**Key Features:**
- Transparent background
- Responsive canvas sizing
- Guide line at 2/3 height (visual only)
- Touch and mouse support
- Clear functionality
- PNG export with transparency

---

## Frontend Pages

### AdminPage

**Route:** `/admin` or `/`

**Flow:**
1. **Sessions List** (default view)
   - Display all sessions in table
   - Show: ID, Guest Name, Status, Actions
   - Actions: Copy URL, Download, Delete

2. **Upload PDF**
   - Drag & drop or file picker
   - Upload to `/api/upload-pdf`
   - Store pdfId

3. **Select Position**
   - Render PDF with PDFViewer
   - Click to position signature box
   - Drag/resize box as needed
   - Store coordinates

4. **Create Session**
   - Input: guestName, guestEmail
   - Submit to `/api/create-session`
   - Display generated link
   - Return to sessions list

### SignPage

**Route:** `/sign/:token`

**Flow:**
1. **Load Session**
   - Fetch from `/api/session/:token`
   - Display PDF for review
   - Show guest name if available

2. **Draw Signature**
   - Display SignaturePad component
   - User draws signature
   - Click "Apply Signature"

3. **Preview**
   - Show signed PDF preview
   - Display confirmation options

4. **Confirm**
   - Call `/api/session/:token/confirm`
   - Download signed PDF
   - Show success message

### CalibratePage

**Route:** `/calibrate`

**Purpose:** Test and calibrate signature placement

**Features:**
- Upload test PDF
- Click to position test box
- Adjust calibration parameters (offset, scale)
- Test with box or actual signature
- Generate test PDF to verify

---

## Storage Implementation

### File System Structure

```
backend/storage/
├── original/
│   └── {pdfId}.pdf          # Original uploaded PDFs
├── signed/
│   └── {sessionId}.pdf      # Signed PDFs
└── sessions.json            # Session data (JSON array)
```

### Sessions JSON Format

```json
[
  {
    "id": "uuid",
    "token": "tokenstring",
    "pdfId": "uuid",
    "originalPdfPath": "/absolute/path",
    "signedPdfPath": "/absolute/path",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "page": 0,
    "x": 100.0,
    "y": 200.0,
    "width": 200.0,
    "height": 100.0,
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Storage Service Functions

```typescript
// Initialize directories
initStorage(): void

// Session operations
getSessions(): SigningSession[]
saveSessions(sessions: SigningSession[]): void
getSessionById(id: string): SigningSession | undefined
getSessionByToken(token: string): SigningSession | undefined
saveSession(session: SigningSession): void
deleteSession(sessionId: string): boolean

// Path operations
getOriginalPdfPath(pdfId: string): string
getSignedPdfPath(sessionId: string): string
```

---

## Routing Configuration

### Backend Routes

```typescript
// In backend/src/index.ts
app.use('/api', uploadRoutes);      // POST /api/upload-pdf
app.use('/api', sessionRoutes);    // Session endpoints
app.use('/api/admin', adminRoutes); // Admin endpoints
app.use('/api/pdf', pdfRoutes);     // GET /api/pdf/:pdfId
app.use('/api/calibrate', calibrateRoutes); // Calibration
```

### Frontend Routes

```typescript
// In frontend/src/App.tsx
<Route path="/admin" element={<AdminPage />} />
<Route path="/sign/:token" element={<SignPage />} />
<Route path="/calibrate" element={<CalibratePage />} />
<Route path="/" element={<AdminPage />} /> // Default
```

---

## Configuration Files

### Backend package.json

```json
{
  "name": "thaiheavens-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pdf-lib": "^1.17.1",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0"
  }
}
```

### Frontend package.json

```json
{
  "name": "thaiheavens-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "pdfjs-dist": "^3.11.174",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "signature_pad": "^4.0.9"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.22",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.18",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### tailwind.config.js

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom theme extensions
    },
  },
  plugins: [],
};
```

---

## Critical Implementation Rules

### Always Follow These Rules

1. **Coordinate Conversion:**
   - Frontend uses top-left origin (canvas)
   - Backend uses bottom-left origin (PDF)
   - Always convert Y coordinate: `pdfY = pageHeight - canvasY - height`

2. **Signature Transparency:**
   - Must use `rgba(0, 0, 0, 0)` for background
   - Export as PNG to preserve transparency
   - Guide line must NOT be in exported image

3. **File Storage:**
   - Never expose internal file paths to frontend
   - Use public URLs: `/api/pdf/:pdfId`
   - Store files with UUID names

4. **Session Tokens:**
   - Generate UUID v4
   - Remove dashes for public tokens
   - Keep tokens secure (no public listing)

5. **PDF Rendering:**
   - Use scale 1.5 for quality
   - Cancel previous render tasks
   - Clear canvas before rendering

6. **Error Handling:**
   - Always wrap async operations in try-catch
   - Return meaningful error messages
   - Handle file not found (404)

7. **Mobile Support:**
   - Touch events for signature drawing
   - Prevent default on touch move
   - Responsive canvas sizing

---

## Testing Instructions

### Manual Testing Checklist

**Backend:**
- [ ] Upload PDF file
- [ ] Create session with coordinates
- [ ] Get session by token
- [ ] Apply signature to PDF
- [ ] Confirm session
- [ ] Download signed PDF
- [ ] Delete session
- [ ] Test calibration endpoint

**Frontend:**
- [ ] Upload PDF (drag & drop and file picker)
- [ ] Navigate PDF pages
- [ ] Click to position signature box
- [ ] Drag signature box
- [ ] Resize signature box
- [ ] Create session
- [ ] Copy signing link
- [ ] View session as guest
- [ ] Draw signature (mouse and touch)
- [ ] Preview signed PDF
- [ ] Confirm and download
- [ ] Test on mobile device

### Automated Testing (Future)

**Recommended Tests:**
- Unit tests for coordinate conversion
- Unit tests for PDF service
- Integration tests for API endpoints
- E2E tests for complete flows

---

## Deployment Checklist

### Pre-Deployment

- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Build backend: `cd backend && npm run build`
- [ ] Test production builds locally
- [ ] Set environment variables
- [ ] Configure CORS for production domain
- [ ] Set up file storage backup
- [ ] Configure reverse proxy (if needed)

### Production Considerations

- [ ] Add authentication middleware
- [ ] Implement rate limiting
- [ ] Add file upload validation
- [ ] Set up HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up logging
- [ ] Configure error monitoring
- [ ] Set up database (replace JSON file)
- [ ] Configure email notifications
- [ ] Set up backup system

---

## Regeneration Instructions

### Step-by-Step Regeneration

1. **Create Project Structure:**
   ```
   mkdir ThaiHeavensSignApp
   cd ThaiHeavensSignApp
   mkdir backend frontend docs
   ```

2. **Initialize Backend:**
   ```bash
   cd backend
   npm init -y
   npm install express cors pdf-lib multer uuid
   npm install -D @types/express @types/cors @types/multer @types/uuid @types/node typescript ts-node-dev
   ```

3. **Initialize Frontend:**
   ```bash
   cd frontend
   npm create vite@latest . -- --template react-ts
   npm install pdfjs-dist react-router-dom signature_pad
   npm install -D tailwindcss postcss autoprefixer
   ```

4. **Create TypeScript Configs:**
   - `backend/tsconfig.json`
   - `frontend/tsconfig.json`

5. **Implement Backend:**
   - Create `src/index.ts` (Express app)
   - Create models, routes, services
   - Set up storage directories

6. **Implement Frontend:**
   - Create `src/App.tsx` (Router)
   - Create pages and components
   - Set up API client
   - Configure Vite and Tailwind

7. **Test End-to-End:**
   - Upload PDF
   - Create session
   - Sign as guest
   - Download signed PDF

---

## Assumptions and Constraints

### Current Assumptions

1. **No Authentication:** Admin routes are public (add in production)
2. **Single Signature:** One signature per session (extendable)
3. **File Storage:** Local file system (migrate to cloud in production)
4. **JSON Database:** Simple JSON file (migrate to real DB in production)
5. **No Email:** No email notifications (add as needed)
6. **Single Tenant:** One admin user (extend for multi-tenant)

### Constraints

1. **PDF Format:** Only PDF files supported
2. **Signature Format:** PNG images only
3. **Coordinate System:** Must handle canvas ↔ PDF conversion
4. **Mobile First:** Must work on touch devices
5. **Browser Support:** Modern browsers only (ES6+)

---

## Best Practices for AI Generation

### When Generating Code

1. **Always use TypeScript** with proper interfaces
2. **Add comments** for coordinate conversions
3. **Handle errors** with try-catch blocks
4. **Validate inputs** on both frontend and backend
5. **Use async/await** for asynchronous operations
6. **Follow existing patterns** in the codebase
7. **Test coordinate conversions** carefully
8. **Preserve transparency** in signature images
9. **Never expose internal paths** to frontend
10. **Maintain aspect ratios** (2:1 for signature box)

### Code Style

- Use meaningful variable names
- Keep functions focused and small
- Add JSDoc comments for complex functions
- Use consistent formatting
- Follow React best practices (hooks, components)
- Follow Express best practices (middleware, routes)

---

## Additional Notes

### Known Limitations

1. No authentication system
2. No session expiration
3. No file size limits (should add)
4. No PDF validation (should add)
5. No concurrent signature support
6. No signature history/versioning

### Future Enhancements

1. Add authentication (JWT, OAuth)
2. Add database (PostgreSQL, MongoDB)
3. Add email notifications
4. Add signature templates
5. Add multi-signature support
6. Add signature verification
7. Add audit logging
8. Add cloud storage (S3, etc.)

---

## Conclusion

This document provides complete specifications for regenerating the ThaiHeavensSignApp system. Follow the structure, use the specified libraries, implement the coordinate conversions correctly, and test thoroughly. The system is designed to be simple, extensible, and maintainable.

**Key Success Factors:**
- Correct coordinate system conversion
- Transparent signature handling
- Mobile-friendly interface
- Clean code structure
- Proper error handling

Good luck with your implementation!

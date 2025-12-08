# Sequence Diagrams

## Overview

This document contains sequence diagrams for all major flows in ThaiHeavensSignApp.

## Admin Flow: Create Signing Session

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant API as Backend API
    participant S as Storage Service
    participant FS as File System
    
    A->>F: Upload PDF
    F->>API: POST /api/upload-pdf
    API->>FS: Save PDF to original/
    FS-->>API: pdfId
    API-->>F: {pdfId}
    F->>F: Display PDF
    
    A->>F: Click to position signature
    F->>F: Calculate coordinates
    F->>F: Show signature box
    
    A->>F: Enter guest details
    A->>F: Click "Create Session"
    F->>API: POST /api/create-session
    API->>S: Generate session
    S->>FS: Save to sessions.json
    FS-->>S: Success
    S-->>API: {sessionId, token, publicUrl}
    API-->>F: Session created
    F->>F: Display signing link
    A->>A: Copy and send link
```

### Flow Explanation

1. Admin uploads PDF file
2. Backend stores PDF and returns ID
3. Admin positions signature box on PDF
4. Admin enters guest information
5. Backend creates session and generates token
6. Frontend displays signing link

---

## Guest Flow: Sign Contract

```mermaid
sequenceDiagram
    participant G as Guest
    participant F as Frontend
    participant API as Backend API
    participant S as Storage Service
    participant PS as PDF Service
    participant FS as File System
    
    G->>F: Open signing link
    F->>API: GET /api/session/:token
    API->>S: Get session by token
    S->>FS: Read sessions.json
    FS-->>S: Session data
    S-->>API: Session info
    API-->>F: {session info, pdfViewUrl}
    F->>API: GET /api/pdf/:pdfId
    API->>FS: Read PDF from original/
    FS-->>API: PDF file
    API-->>F: PDF stream
    F->>F: Display PDF
    
    G->>F: Draw signature
    F->>F: Export as PNG base64
    G->>F: Click "Apply Signature"
    F->>API: POST /api/session/:token/sign
    API->>PS: Apply signature to PDF
    PS->>FS: Read original PDF
    FS-->>PS: PDF bytes
    PS->>PS: Embed signature image
    PS->>FS: Save signed PDF to signed/
    FS-->>PS: Success
    PS->>S: Update session status
    S->>FS: Update sessions.json
    FS-->>S: Success
    PS-->>API: Signed PDF path
    API-->>F: {signedPdfUrl}
    F->>API: GET /api/admin/session/:id/preview-signed
    API->>FS: Read signed PDF
    FS-->>API: PDF file
    API-->>F: PDF stream
    F->>F: Display preview
    
    G->>F: Click "Confirm"
    F->>API: POST /api/session/:token/confirm
    API->>S: Update session status
    S->>FS: Update sessions.json
    FS-->>S: Success
    API-->>F: Success
    F->>API: GET /api/admin/session/:id/download-signed
    API->>FS: Read signed PDF
    FS-->>API: PDF file
    API-->>F: PDF download
    F->>G: Download PDF
```

### Flow Explanation

1. Guest opens signing link
2. Frontend fetches session information
3. Frontend loads and displays PDF
4. Guest draws signature on canvas
5. Frontend exports signature as base64 PNG
6. Backend applies signature to PDF
7. Backend saves signed PDF
8. Frontend shows preview
9. Guest confirms signature
10. Backend marks session as completed
11. Frontend downloads signed PDF

---

## PDF Coordinate Conversion Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant PV as PDFViewer
    participant API as Backend API
    participant PS as PDF Service
    
    U->>PV: Click on PDF canvas
    PV->>PV: Get click coordinates (canvas)
    Note over PV: Canvas: top-left origin<br/>X, Y in pixels (scale 1.5)
    PV->>PV: Convert to PDF coordinates
    Note over PV: PDF: bottom-left origin<br/>Scale: 1.5 → 1.0
    PV->>PV: Calculate pdfX, pdfY
    PV->>F: onPageClick(pdfX, pdfY)
    F->>F: Store coordinates
    
    U->>F: Create session
    F->>API: POST /api/create-session
    Note over F,API: {x: pdfX, y: pdfY, width, height}
    API->>PS: Apply signature
    Note over PS: pdfY = pageHeight - y - height<br/>(Flip Y axis)
    PS->>PS: Draw signature at (pdfX, pdfY)
```

### Coordinate Conversion Details

**Frontend (Canvas):**
- Origin: top-left (0,0)
- Y increases downward
- Scale: 1.5x for display
- Coordinates: pixels

**Backend (PDF):**
- Origin: bottom-left (0,0)
- Y increases upward
- Scale: 1.0x (actual PDF size)
- Coordinates: PDF points

**Conversion Formula:**
```
pdfX = canvasX / 1.5
pdfY = canvasY / 1.5
pdfY_final = pageHeight - pdfY - height
```

---

## Signature Drawing and Export Flow

```mermaid
sequenceDiagram
    participant U as User
    participant SP as SignaturePad
    participant C as Canvas
    participant API as Backend API
    participant PS as PDF Service
    
    U->>SP: Draw signature
    SP->>C: Draw strokes
    C->>SP: Update canvas
    SP->>SP: onSignatureChange callback
    
    U->>SP: Click "Apply Signature"
    SP->>C: Export to PNG
    Note over SP,C: toDataURL('image/png')<br/>Guide line NOT included
    C-->>SP: base64 PNG string
    SP->>C: Redraw guide line (display only)
    SP->>API: POST /api/session/:token/sign
    Note over SP,API: {signatureImageBase64}
    API->>PS: Apply signature
    PS->>PS: Convert base64 to Buffer
    PS->>PS: Embed PNG in PDF
    PS->>PS: Save signed PDF
    PS-->>API: Success
    API-->>SP: {signedPdfUrl}
```

### Signature Export Process

1. User draws on canvas
2. SignaturePad tracks strokes
3. On export, canvas converts to PNG base64
4. Guide line is NOT included in export
5. Guide line is redrawn after export (visual only)
6. Base64 string sent to backend
7. Backend converts to Buffer
8. Backend embeds in PDF

---

## Session Management Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant API as Backend API
    participant S as Storage Service
    participant FS as File System
    
    A->>F: View sessions list
    F->>API: GET /api/admin/sessions
    API->>S: Get all sessions
    S->>FS: Read sessions.json
    FS-->>S: Sessions array
    S-->>API: All sessions
    API-->>F: Sessions list
    F->>F: Display table
    
    A->>F: Click "Copy URL"
    F->>F: Copy to clipboard
    
    A->>F: Click "Download"
    F->>API: GET /api/admin/session/:id/download-signed
    API->>S: Get session
    S->>FS: Read sessions.json
    FS-->>S: Session data
    S-->>API: Session
    API->>FS: Read signed PDF
    FS-->>API: PDF file
    API-->>F: PDF download
    
    A->>F: Click "Delete"
    F->>API: DELETE /api/admin/session/:id
    API->>S: Delete session
    S->>FS: Delete signed PDF
    S->>FS: Remove from sessions.json
    FS-->>S: Success
    S-->>API: Success
    API-->>F: Success
    F->>F: Refresh list
```

### Session Operations

- **List:** Read all sessions from JSON file
- **Copy URL:** Frontend copies link to clipboard
- **Download:** Stream signed PDF file
- **Delete:** Remove session and associated files

---

## PDF Rendering Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant PV as PDFViewer
    participant PDFJS as pdfjs-dist
    participant API as Backend API
    participant FS as File System
    
    F->>PV: Load PDF (pdfUrl)
    PV->>PDFJS: getDocument(pdfUrl)
    PDFJS->>API: GET /api/pdf/:pdfId
    API->>FS: Read PDF file
    FS-->>API: PDF bytes
    API-->>PDFJS: PDF stream
    PDFJS->>PDFJS: Parse PDF
    PDFJS-->>PV: PDF document
    
    PV->>PDFJS: getPage(pageNumber)
    PDFJS-->>PV: Page object
    PV->>PDFJS: getViewport({scale: 1.5})
    PDFJS-->>PV: Viewport
    PV->>PV: Set canvas size
    PV->>PDFJS: render(renderContext)
    PDFJS->>PDFJS: Render to canvas
    PDFJS-->>PV: Render complete
    PV->>F: Display PDF
```

### PDF Rendering Process

1. Frontend requests PDF from backend
2. Backend streams PDF file
3. pdfjs-dist parses PDF document
4. Frontend gets specific page
5. Frontend creates viewport at 1.5x scale
6. pdfjs-dist renders page to canvas
7. Canvas displays PDF page

---

## Error Handling Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Backend API
    participant S as Storage Service
    participant FS as File System
    
    U->>F: Action
    F->>API: Request
    API->>S: Service call
    S->>FS: File operation
    
    alt File Not Found
        FS-->>S: Error: File not found
        S-->>API: 404 Error
        API-->>F: 404 Not Found
        F->>F: Display error message
    else Invalid Request
        API-->>F: 400 Bad Request
        F->>F: Display validation error
    else Server Error
        FS-->>S: Error
        S-->>API: 500 Error
        API-->>F: 500 Server Error
        F->>F: Display error message
    else Success
        FS-->>S: Data
        S-->>API: Success
        API-->>F: 200 OK
        F->>F: Update UI
    end
```

### Error Handling Strategy

- **400 Bad Request:** Invalid input data
- **404 Not Found:** Resource doesn't exist
- **500 Server Error:** Internal server error
- **Success:** 200 OK with data

---

## Calibration Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant CP as CalibratePage
    participant API as Backend API
    participant PS as PDF Service
    
    A->>CP: Upload test PDF
    CP->>API: POST /api/upload-pdf
    API-->>CP: {pdfId}
    
    A->>CP: Click position
    CP->>CP: Calculate coordinates
    CP->>CP: Show test box
    
    A->>CP: Adjust calibration params
    CP->>CP: Update offset/scale
    
    A->>CP: Click "Test"
    CP->>API: POST /api/calibrate/test-pdf
    API->>PS: Generate test PDF
    PS->>PS: Apply box or signature
    PS-->>API: Test PDF
    API-->>CP: PDF stream
    CP->>CP: Display test result
    
    A->>CP: Verify placement
    alt Placement Correct
        A->>A: Use calibration params
    else Placement Incorrect
        A->>CP: Adjust params
        CP->>CP: Retry test
    end
```

### Calibration Process

1. Upload test PDF
2. Click to position signature box
3. Adjust calibration parameters (offset, scale)
4. Generate test PDF with box/signature
5. Verify placement
6. Adjust if needed
7. Use calibrated parameters

---

## Notes for Developers

### Sequence Diagram Conventions

- **Solid arrows:** Synchronous operations
- **Dashed arrows:** Asynchronous operations
- **Notes:** Important implementation details
- **Alt blocks:** Conditional flows

### Key Timing Considerations

- **PDF Rendering:** Can be slow for large files
- **Signature Application:** Requires PDF processing time
- **File Operations:** I/O bound operations
- **API Calls:** Network latency

### Error Scenarios

- Network failures
- File system errors
- Invalid PDF files
- Missing sessions
- Coordinate conversion errors

---

## Notes for AI Regeneration

### Required Sequence Patterns

1. **Upload Flow:** File → Storage → Response
2. **Session Creation:** Data → Validation → Storage → Token
3. **Signing Flow:** Signature → PDF Processing → Storage → Preview
4. **Coordinate Conversion:** Canvas → PDF coordinates → Backend

### Critical Timing

- Always handle async operations with await
- Cancel previous PDF render tasks
- Clear canvas before rendering
- Handle errors at each step

### State Management

- Frontend: React state for UI
- Backend: File system for persistence
- Sessions: JSON file for metadata
- PDFs: File system for documents

---

## Additional Flows

### Drag and Resize Signature Box

```mermaid
sequenceDiagram
    participant U as User
    participant PV as PDFViewer
    participant F as Frontend
    
    U->>PV: Drag signature box
    PV->>PV: Calculate new position
    PV->>PV: Convert to PDF coordinates
    PV->>F: onPositionUpdate(newCoords)
    F->>F: Update state
    
    U->>PV: Resize from corner
    PV->>PV: Calculate new size
    PV->>PV: Maintain aspect ratio (2:1)
    PV->>PV: Convert to PDF coordinates
    PV->>F: onPositionUpdate(newCoords)
    F->>F: Update state
```

### Page Navigation

```mermaid
sequenceDiagram
    participant U as User
    participant PV as PDFViewer
    participant PDFJS as pdfjs-dist
    
    U->>PV: Click "Next"
    PV->>PV: Increment page number
    PV->>PDFJS: Cancel previous render
    PV->>PDFJS: getPage(newPage)
    PDFJS-->>PV: Page object
    PV->>PDFJS: Render page
    PDFJS-->>PV: Render complete
    PV->>U: Display new page
```

---

## Conclusion

These sequence diagrams document all major flows in the application. They show:
- **Data flow:** How data moves through the system
- **Component interaction:** How components communicate
- **Error handling:** How errors are managed
- **Timing:** When operations occur

Use these diagrams to understand the system behavior and to guide implementation.



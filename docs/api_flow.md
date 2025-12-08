# API Flow Documentation

## Overview

This document describes all API interactions in ThaiHeavensSignApp using Mermaid diagrams.

## API Request/Response Flow

```mermaid
graph LR
    A[Frontend] -->|HTTP Request| B[Express Router]
    B --> C{Route Handler}
    C --> D[Service Layer]
    D --> E[File System]
    E --> D
    D --> C
    C -->|JSON Response| A
```

### Request Flow

1. Frontend makes HTTP request
2. Express router matches route
3. Route handler processes request
4. Service layer performs business logic
5. File system operations occur
6. Response flows back through layers

---

## Upload PDF API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as Multer
    participant U as Upload Route
    participant S as Storage Service
    participant FS as File System
    
    F->>U: POST /api/upload-pdf<br/>(multipart/form-data)
    U->>M: Handle file upload
    M->>FS: Save to uploads/ (temp)
    FS-->>M: Temp file path
    M-->>U: req.file
    U->>S: Generate pdfId (UUID)
    U->>FS: Move file to storage/original/
    FS-->>U: Success
    U-->>F: {pdfId, filePath}
```

### Upload Endpoint Details

**Endpoint:** `POST /api/upload-pdf`

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

**Error Responses:**
- `400 Bad Request`: No file uploaded
- `500 Internal Server Error`: File system error

---

## Create Session API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant SR as Session Route
    participant S as Storage Service
    participant FS as File System
    
    F->>SR: POST /api/create-session<br/>{pdfId, guestName, guestEmail,<br/>page, x, y, width, height}
    SR->>SR: Validate input
    SR->>SR: Generate sessionId (UUID)
    SR->>SR: Generate token (UUID no dashes)
    SR->>S: Create SigningSession object
    S->>FS: Read sessions.json
    FS-->>S: Existing sessions
    S->>S: Add new session
    S->>FS: Write sessions.json
    FS-->>S: Success
    S-->>SR: Session created
    SR->>SR: Build publicUrl
    SR-->>F: {sessionId, token, publicUrl}
```

### Create Session Endpoint Details

**Endpoint:** `POST /api/create-session`

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

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Storage error

---

## Get Session API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant SR as Session Route
    participant S as Storage Service
    participant FS as File System
    
    F->>SR: GET /api/session/:token
    SR->>S: getSessionByToken(token)
    S->>FS: Read sessions.json
    FS-->>S: All sessions
    S->>S: Find session by token
    alt Session Found
        S->>S: Build public info (no internal paths)
        S-->>SR: SessionPublicInfo
        SR-->>F: {id, token, guestName, status,<br/>pdfViewUrl, page}
    else Session Not Found
        S-->>SR: undefined
        SR-->>F: 404 Not Found
    end
```

### Get Session Endpoint Details

**Endpoint:** `GET /api/session/:token`

**Response (Success):**
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

**Response (Error):**
```json
{
  "error": "Session not found"
}
```
Status: `404 Not Found`

---

## Sign Session API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant SR as Session Route
    participant PS as PDF Service
    participant S as Storage Service
    participant FS as File System
    
    F->>SR: POST /api/session/:token/sign<br/>{signatureImageBase64}
    SR->>S: getSessionByToken(token)
    S->>FS: Read sessions.json
    FS-->>S: Session data
    S-->>SR: Session object
    SR->>SR: Extract base64 data
    SR->>PS: applySignatureToPdf(session, base64)
    PS->>FS: Read original PDF
    FS-->>PS: PDF bytes
    PS->>PS: Load PDF with pdf-lib
    PS->>PS: Convert base64 to PNG
    PS->>PS: Embed PNG in PDF
    Note over PS: Coordinate conversion:<br/>pdfY = pageHeight - y - height
    PS->>FS: Save signed PDF
    FS-->>PS: Success
    PS->>S: Update session (signedPdfPath, status)
    S->>FS: Update sessions.json
    FS-->>S: Success
    PS-->>SR: Signed PDF path
    SR->>SR: Build preview URL
    SR-->>F: {signedPdfUrl, sessionId}
```

### Sign Session Endpoint Details

**Endpoint:** `POST /api/session/:token/sign`

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

**Error Responses:**
- `404 Not Found`: Session not found
- `500 Internal Server Error`: PDF processing error

---

## Confirm Session API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant SR as Session Route
    participant S as Storage Service
    participant FS as File System
    
    F->>SR: POST /api/session/:token/confirm
    SR->>S: getSessionByToken(token)
    S->>FS: Read sessions.json
    FS-->>S: Session data
    S-->>SR: Session object
    SR->>S: Update session status to "completed"
    S->>FS: Update sessions.json
    FS-->>S: Success
    S-->>SR: Success
    SR-->>F: {success: true}
```

### Confirm Session Endpoint Details

**Endpoint:** `POST /api/session/:token/confirm`

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found`: Session not found
- `500 Internal Server Error`: Storage error

---

## Admin API Flows

### Get All Sessions

```mermaid
sequenceDiagram
    participant F as Frontend
    participant AR as Admin Route
    participant S as Storage Service
    participant FS as File System
    
    F->>AR: GET /api/admin/sessions
    AR->>S: getSessions()
    S->>FS: Read sessions.json
    FS-->>S: Sessions array
    S-->>AR: All sessions (full objects)
    AR-->>F: [sessions array]
```

### Download Signed PDF

```mermaid
sequenceDiagram
    participant F as Frontend
    participant AR as Admin Route
    participant S as Storage Service
    participant FS as File System
    
    F->>AR: GET /api/admin/session/:id/download-signed
    AR->>S: getSessionById(id)
    S->>FS: Read sessions.json
    FS-->>S: Session data
    S-->>AR: Session object
    AR->>AR: Check status === "completed"
    AR->>FS: Read signed PDF file
    FS-->>AR: PDF file stream
    AR-->>F: PDF download<br/>(Content-Disposition: attachment)
```

### Delete Session

```mermaid
sequenceDiagram
    participant F as Frontend
    participant AR as Admin Route
    participant S as Storage Service
    participant FS as File System
    
    F->>AR: DELETE /api/admin/session/:id
    AR->>S: deleteSession(id)
    S->>FS: Read sessions.json
    FS-->>S: Sessions array
    S->>S: Find session
    S->>FS: Delete signed PDF (if exists)
    FS-->>S: Success
    S->>FS: Remove from sessions.json
    FS-->>S: Success
    S-->>AR: Success
    AR-->>F: {success: true}
```

---

## PDF Streaming API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant PR as PDF Route
    participant FS as File System
    
    F->>PR: GET /api/pdf/:pdfId
    PR->>FS: Read PDF from storage/original/
    alt File Exists
        FS-->>PR: PDF file stream
        PR->>PR: Set Content-Type: application/pdf
        PR-->>F: PDF stream
    else File Not Found
        FS-->>PR: Error
        PR-->>F: 404 Not Found
    end
```

### PDF Streaming Details

**Endpoint:** `GET /api/pdf/:pdfId`

**Response:**
- Content-Type: `application/pdf`
- PDF file stream

**Error Response:**
- `404 Not Found`: PDF file not found

---

## Calibration API Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant CR as Calibrate Route
    participant PS as PDF Service
    participant FS as File System
    
    F->>CR: POST /api/calibrate/test-pdf<br/>{pdfId, page, x, y, width, height,<br/>signatureImageBase64?}
    CR->>FS: Read original PDF
    FS-->>CR: PDF bytes
    CR->>PS: Load PDF with pdf-lib
    alt Signature Provided
        CR->>PS: Embed signature at coordinates
    else No Signature
        CR->>PS: Draw red rectangle at coordinates
    end
    PS->>PS: Generate modified PDF
    PS-->>CR: PDF bytes (Uint8Array)
    CR->>CR: Convert to Buffer
    CR->>CR: Set Content-Type: application/pdf
    CR-->>F: PDF stream (inline)
```

### Calibration Endpoint Details

**Endpoint:** `POST /api/calibrate/test-pdf`

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
- PDF file stream with test box or signature

---

## API Error Handling Flow

```mermaid
graph TB
    A[API Request] --> B{Validate Input}
    B -->|Invalid| C[400 Bad Request]
    B -->|Valid| D{Resource Exists?}
    D -->|No| E[404 Not Found]
    D -->|Yes| F{Process Request}
    F -->|Error| G[500 Server Error]
    F -->|Success| H[200 OK]
    
    C --> I[JSON Error Response]
    E --> I
    G --> I
    H --> J[JSON Success Response]
```

### Error Response Format

All errors return JSON:
```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid input
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## API Authentication Flow (Future)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as Auth Middleware
    participant R as Route Handler
    participant S as Service
    
    F->>R: Request with token
    R->>A: Check authentication
    alt Valid Token
        A->>A: Verify JWT
        A-->>R: Authenticated
        R->>S: Process request
        S-->>R: Result
        R-->>F: Success response
    else Invalid Token
        A-->>R: Unauthorized
        R-->>F: 401 Unauthorized
    end
```

### Future Authentication

**Current State:** No authentication
**Future:** Add JWT-based authentication for admin routes

---

## API Rate Limiting Flow (Future)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant RL as Rate Limiter
    participant R as Route Handler
    
    F->>RL: Request
    RL->>RL: Check rate limit
    alt Within Limit
        RL->>R: Allow request
        R-->>F: Response
    else Exceeded Limit
        RL-->>F: 429 Too Many Requests
    end
```

### Future Rate Limiting

**Current State:** No rate limiting
**Future:** Add rate limiting to prevent abuse

---

## Notes for Developers

### API Design Principles

1. **RESTful:** Use standard HTTP methods
2. **JSON:** All responses in JSON format
3. **Error Handling:** Consistent error format
4. **Status Codes:** Use appropriate HTTP status codes
5. **Validation:** Validate all inputs

### API Security

**Current:**
- No authentication
- CORS enabled for all origins
- No rate limiting

**Production Requirements:**
- Add authentication
- Restrict CORS
- Implement rate limiting
- Validate file uploads
- Sanitize inputs

---

## Notes for AI Regeneration

### Required API Patterns

1. **Upload:** Multipart form data handling
2. **Session Management:** CRUD operations
3. **PDF Operations:** File streaming
4. **Error Handling:** Consistent error responses

### API Contract

**Always:**
- Return JSON for errors
- Use appropriate status codes
- Validate input data
- Handle file operations safely
- Never expose internal paths

**Never:**
- Return internal file paths to frontend
- Skip input validation
- Expose sensitive data
- Allow direct file system access

---

## API Endpoint Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/upload-pdf` | Upload PDF | No |
| POST | `/api/create-session` | Create session | No |
| GET | `/api/session/:token` | Get session | No |
| POST | `/api/session/:token/sign` | Apply signature | No |
| POST | `/api/session/:token/confirm` | Confirm signature | No |
| GET | `/api/admin/sessions` | List sessions | No* |
| GET | `/api/admin/session/:id/download-signed` | Download PDF | No* |
| GET | `/api/admin/session/:id/preview-signed` | Preview PDF | No* |
| DELETE | `/api/admin/session/:id` | Delete session | No* |
| GET | `/api/pdf/:pdfId` | Stream PDF | No |
| POST | `/api/calibrate/test-pdf` | Test PDF | No |

*Currently no auth, but should be added in production

---

## Conclusion

This document provides complete API flow documentation. All endpoints follow RESTful principles and return consistent JSON responses. Error handling is implemented at each layer, and file operations are performed safely.



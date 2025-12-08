# System Architecture

## Overview

This document describes the high-level architecture of ThaiHeavensSignApp using Mermaid diagrams.

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser] --> B[React Frontend]
        B --> C[PDF Viewer Component]
        B --> D[Signature Pad Component]
        B --> E[Admin Interface]
        B --> F[Guest Interface]
    end
    
    subgraph "API Layer"
        G[Express.js Server] --> H[REST API Endpoints]
        H --> I[Upload Routes]
        H --> J[Session Routes]
        H --> K[Admin Routes]
        H --> L[PDF Routes]
        H --> M[Calibrate Routes]
    end
    
    subgraph "Service Layer"
        N[Storage Service] --> O[File System]
        P[PDF Service] --> Q[pdf-lib]
        N --> R[JSON Sessions File]
    end
    
    subgraph "Storage Layer"
        O --> S[Original PDFs]
        O --> T[Signed PDFs]
        R --> U[sessions.json]
    end
    
    B -->|HTTP/REST| G
    G --> N
    G --> P
    P --> O
    N --> O
    N --> R
```

### How to Read This Diagram

- **Client Layer:** User-facing React application running in the browser
- **API Layer:** Express.js backend handling HTTP requests
- **Service Layer:** Business logic for file operations and PDF manipulation
- **Storage Layer:** File system storage for PDFs and session data

### Architecture Notes

**Separation of Concerns:**
- Frontend handles UI/UX and user interactions
- Backend handles business logic and file operations
- Services encapsulate specific functionality (storage, PDF manipulation)

**Data Flow:**
1. User interacts with React frontend
2. Frontend makes API calls to Express backend
3. Backend uses services to process requests
4. Services read/write to file system
5. Responses flow back through the layers

---

## Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        A[App.tsx] --> B[AdminPage]
        A --> C[SignPage]
        A --> D[CalibratePage]
        B --> E[PDFViewer]
        B --> F[SessionList]
        C --> E
        C --> G[SignaturePad]
        D --> E
        D --> G
    end
    
    subgraph "Backend Services"
        H[Express App] --> I[Upload Routes]
        H --> J[Session Routes]
        H --> K[Admin Routes]
        I --> L[Storage Service]
        J --> L
        J --> M[PDF Service]
        K --> L
        K --> M
    end
    
    E -->|API Calls| H
    G -->|API Calls| H
    F -->|API Calls| H
```

### Component Relationships

- **App.tsx:** Root component with routing
- **Pages:** Top-level page components
- **Components:** Reusable UI components
- **Services:** Backend business logic

---

## Technology Stack Architecture

```mermaid
graph TB
    subgraph "Frontend Stack"
        A[React 18] --> B[TypeScript]
        A --> C[Vite]
        A --> D[React Router]
        A --> E[pdfjs-dist]
        A --> F[signature_pad]
        A --> G[Tailwind CSS]
    end
    
    subgraph "Backend Stack"
        H[Node.js] --> I[TypeScript]
        H --> J[Express.js]
        J --> K[pdf-lib]
        J --> L[Multer]
        J --> M[UUID]
    end
    
    subgraph "Storage"
        N[File System] --> O[JSON File]
        N --> P[PDF Files]
    end
    
    A -->|HTTP| J
    J --> N
```

### Stack Explanation

**Frontend:**
- React for UI components
- TypeScript for type safety
- Vite for fast development and building
- pdfjs-dist for PDF rendering
- signature_pad for signature drawing

**Backend:**
- Node.js runtime
- Express.js for HTTP server
- pdf-lib for PDF manipulation
- Multer for file uploads
- UUID for ID generation

---

## Request Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Service
    participant FS as File System
    
    U->>F: User Action
    F->>A: HTTP Request
    A->>S: Service Call
    S->>FS: Read/Write
    FS-->>S: Data
    S-->>A: Result
    A-->>F: JSON Response
    F-->>U: UI Update
```

### Flow Explanation

1. User performs action (click, upload, etc.)
2. Frontend component handles event
3. API client makes HTTP request
4. Express route receives request
5. Route calls appropriate service
6. Service interacts with file system
7. Response flows back through layers
8. Frontend updates UI

---

## Notes for Developers

### Key Architectural Decisions

1. **Monorepo Structure:** Separate frontend and backend for clear separation
2. **RESTful API:** Standard HTTP methods for clear communication
3. **File-based Storage:** Simple JSON file for sessions (can be upgraded to database)
4. **Stateless Backend:** Each request is independent
5. **Component-based Frontend:** Reusable React components

### Scalability Considerations

- **Current:** Single server, file-based storage
- **Future:** Can scale horizontally with database
- **Frontend:** Can be deployed to CDN
- **Backend:** Can be containerized with Docker

---

## Notes for AI Regeneration

### Critical Architecture Rules

1. **Always maintain separation:** Frontend and backend are separate applications
2. **API contract:** Frontend communicates only via REST API
3. **No direct file access:** Frontend never accesses file system directly
4. **Coordinate conversion:** Must happen in both frontend and backend
5. **State management:** Frontend uses React state, backend uses file system

### Required Components

**Frontend:**
- Router (React Router)
- PDF Viewer (pdfjs-dist)
- Signature Pad (signature_pad)
- API Client (fetch/axios)

**Backend:**
- Express server
- Route handlers
- Storage service
- PDF service

### File Structure Requirements

```
backend/src/
  ├── index.ts (Express app)
  ├── routes/ (API endpoints)
  └── services/ (Business logic)

frontend/src/
  ├── App.tsx (Router)
  ├── pages/ (Page components)
  └── components/ (Reusable components)
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Frontend Dev Server<br/>localhost:5173] --> B[Backend Dev Server<br/>localhost:5000]
    end
    
    subgraph "Production Option 1"
        C[Static Hosting<br/>Vercel/Netlify] --> D[Node.js Hosting<br/>Heroku/Railway]
    end
    
    subgraph "Production Option 2"
        E[Single Server<br/>Express + Static] --> F[File System Storage]
    end
    
    subgraph "Production Option 3"
        G[Docker Container] --> H[Reverse Proxy<br/>Nginx]
        H --> I[Backend Container]
        H --> J[Frontend Container]
    end
```

### Deployment Options

1. **Separate Hosting:** Frontend on static hosting, backend on Node.js hosting
2. **Single Server:** Express serves both frontend and backend
3. **Containerized:** Docker containers with reverse proxy

---

## Security Architecture

```mermaid
graph TB
    A[User Request] --> B{Authentication?}
    B -->|No| C[Public Endpoints]
    B -->|Yes| D[Protected Endpoints]
    C --> E[Session Routes]
    C --> F[PDF Routes]
    D --> G[Admin Routes]
    
    E --> H[Token Validation]
    F --> I[PDF Access Control]
    G --> J[Admin Auth]
    
    H --> K[File System]
    I --> K
    J --> K
```

### Current Security Model

- **Public:** Guest signing endpoints (token-based)
- **Protected:** Admin endpoints (currently no auth - add in production)
- **File Access:** Controlled via API, no direct file system access

### Production Security Requirements

- Add authentication middleware
- Implement rate limiting
- Validate file uploads
- Use HTTPS/SSL
- Restrict CORS origins
- Add input validation

---

## Data Flow Architecture

```mermaid
flowchart TD
    A[PDF Upload] --> B[Storage: original/]
    B --> C[Create Session]
    C --> D[Storage: sessions.json]
    D --> E[Generate Token]
    E --> F[Guest Signs]
    F --> G[Apply Signature]
    G --> H[Storage: signed/]
    H --> I[Update Session]
    I --> D
    I --> J[Download Signed PDF]
```

### Data Lifecycle

1. **Upload:** PDF stored in `original/` directory
2. **Session Creation:** Session data stored in JSON file
3. **Signing:** Signature applied, signed PDF stored in `signed/`
4. **Completion:** Session status updated, PDF available for download

---

## Error Handling Architecture

```mermaid
graph TB
    A[Request] --> B{Valid?}
    B -->|No| C[400 Bad Request]
    B -->|Yes| D{Exists?}
    D -->|No| E[404 Not Found]
    D -->|Yes| F{Process}
    F -->|Error| G[500 Server Error]
    F -->|Success| H[200 OK]
    
    C --> I[Error Response]
    E --> I
    G --> I
    H --> J[Success Response]
```

### Error Flow

- **Validation Errors:** 400 Bad Request
- **Not Found:** 404 Not Found
- **Server Errors:** 500 Internal Server Error
- **Success:** 200 OK with data

---

## Performance Architecture

```mermaid
graph LR
    A[User Request] --> B{Cache?}
    B -->|Yes| C[Return Cached]
    B -->|No| D[Process Request]
    D --> E[File System]
    E --> F[Response]
    F --> G[Cache Result]
    G --> H[Return Response]
    C --> H
```

### Performance Considerations

**Current:**
- No caching (can be added)
- Direct file system access
- JSON file reads on each request

**Optimization Opportunities:**
- Add Redis for session caching
- Implement file streaming
- Add database for faster queries
- Use CDN for frontend assets

---

## Extension Points

```mermaid
graph TB
    A[Core System] --> B[Authentication Module]
    A --> C[Database Module]
    A --> D[Email Module]
    A --> E[Multi-Signature Module]
    A --> F[Template Module]
    
    B --> G[Auth Routes]
    C --> H[Database Service]
    D --> I[Email Service]
    E --> J[Multi-Sig Service]
    F --> K[Template Service]
```

### Extensibility

The architecture supports adding:
- Authentication system
- Database integration
- Email notifications
- Multiple signatures per session
- PDF templates
- Custom workflows

---

## Conclusion

This architecture provides a solid foundation for a digital signing application. It's designed to be:
- **Simple:** Easy to understand and maintain
- **Extensible:** Can add features without major refactoring
- **Scalable:** Can grow from file-based to database-backed
- **Secure:** Clear separation of concerns (add auth in production)



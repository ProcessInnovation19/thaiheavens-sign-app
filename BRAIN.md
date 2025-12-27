# Project Brain (ThaiHeavensSignApp)

## What this repo is (observed)
- Web app with `frontend/` (Vite + React/TS) and `backend/` (Node/TS compiled to `backend/dist/`).
- Core flow appears to be “upload PDF → create signing session → user signs → generate signed PDF”.

## Where to look first (observed paths)
- Frontend signature UX: `frontend/src/pages/SignPage.tsx`, `frontend/src/components/SignaturePad.tsx`, `frontend/src/components/PDFViewer.tsx`
- Backend session + PDF generation: `backend/src/routes/session.ts`, `backend/src/services/pdfService.ts`, `backend/src/models/SigningSession.ts`
- Storage: `backend/storage/` (includes `signed/` PDFs and `sessions*.json`)

## Operating principles for changes in this repo
- Prefer minimal diffs; preserve existing API shapes and URL patterns.
- Avoid modifying built artifacts (`frontend/dist/`, `backend/dist/`) unless the repo’s process requires it.



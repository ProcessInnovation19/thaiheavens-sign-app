# Invariants (must not break)

## High-level invariants (project-critical)
- Signing flow must remain functional: session creation, user signing, and producing a signed PDF.
- Public links sent to end-users must remain valid according to current session rules (no silent changes to token formats/URLs).
- PDF rendering + signature placement must remain consistent with calibration/placement settings.

## Technical invariants (observed structure)
- Source of truth for backend logic is `backend/src/` (compiled output in `backend/dist/`).
- Source of truth for frontend logic is `frontend/src/` (built output in `frontend/dist/`).

## Files/areas to treat as sensitive by default
- `backend/src/services/pdfService.ts` (PDF generation / signature stamping)
- `backend/src/routes/session.ts` (session lifecycle & endpoints)
- `frontend/src/pages/SignPage.tsx` + `frontend/src/components/PDFViewer.tsx` (signature capture & visualization)



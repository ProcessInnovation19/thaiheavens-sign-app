# AI Changelog

## 2025-12-27
- **Goal**: Initialize required brain files for this workspace (no application code changes).
- **Files changed**: `BRAIN.md`, `INVARIANTS.md`, `KNOWN_GOOD.md`, `CHANGELOG_AI.md`
- **Risk level**: Low (documentation only)
- **How to verify**: Ensure the four files exist in repo root and no runtime behavior changed.

## 2025-12-27
- **Goal**: Fix missing signature in signed PDF after user completes signing (coordinate conversion + admin placement).
- **Files changed**: `frontend/src/pages/AdminPage.tsx`, `frontend/src/pages/CalibratePage.tsx`, `frontend/src/components/PDFViewer.tsx`, `frontend/src/components/SignaturePad.tsx`
- **Risk level**: Medium (affects signature placement; should be validated on a real PDF/session)
- **How to verify**:
  - Create a new session in Admin, click to place the signature rectangle, generate the signing link.
  - Open the link as a guest, draw signature, confirm.
  - In the preview (`/api/admin/session/<id>/preview-signed`) and in the downloaded PDF, the signature must be visible at the chosen position (correct page and roughly correct location).
  - In Calibrate (`/calibrate`), clicking the PDF must show the red box overlay; changing calibration sliders must move the overlay; generating a test PDF must show the red box/signature at the expected spot.
  - The signed PDF must NOT include the dotted guide line from the signature pad (guide line should be visible only while drawing).



# Known-good behaviors (baseline)

## Observed artifacts in repo
- There are already signed PDFs in `backend/storage/signed/`, suggesting the end-to-end flow worked at least once.
- There is a calibration route/page (`backend/src/routes/calibrate.ts`, `frontend/src/pages/CalibratePage.tsx`) which likely controls placement coordinates.

## Baseline expectations to preserve
- A user completing the signing flow should result in:
  - the signature being stored (image/data),
  - the signature being visible in the UI preview (if present),
  - and/or the final signed PDF containing the signature at the expected position.

## Verification checkpoints
- Create a new signing session, open the user link, draw signature, submit, verify:
  - signature is persisted on backend,
  - UI shows it (if intended),
  - generated signed PDF includes it at the correct position.



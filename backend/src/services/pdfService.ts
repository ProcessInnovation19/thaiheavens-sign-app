import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { SigningSession } from '../models/SigningSession';
import { getOriginalPdfPath, getSignedPdfPath } from './storage';

/**
 * Applies a signature image to a PDF at the specified coordinates.
 * 
 * Coordinate mapping:
 * - PDF coordinates: origin (0,0) is at bottom-left
 * - Canvas coordinates: origin (0,0) is at top-left
 * - We need to convert from canvas (top-left) to PDF (bottom-left)
 * 
 * @param session The signing session with position and signature info
 * @param signatureImageBase64 Base64 encoded PNG image of the signature
 * @returns Path to the signed PDF
 */
export async function applySignatureToPdf(
  session: SigningSession,
  signatureImageBase64: string
): Promise<string> {
  // Add timeout protection (30 seconds max)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('PDF processing timeout after 30 seconds')), 30000);
  });

  const processPdf = async (): Promise<string> => {
    // Read the original PDF
    const originalPdfPath = getOriginalPdfPath(session.pdfId);
    if (!fs.existsSync(originalPdfPath)) {
      throw new Error(`Original PDF not found: ${originalPdfPath}`);
    }
    const originalPdfBytes = fs.readFileSync(originalPdfPath);

    // Load the PDF
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

  // Get the page where signature should be placed
  const pages = pdfDoc.getPages();
  const targetPage = pages[session.page];

  if (!targetPage) {
    throw new Error(`Page ${session.page} does not exist in PDF`);
  }

  // Convert base64 to image
  const imageBytes = Buffer.from(signatureImageBase64, 'base64');
  const signatureImage = await pdfDoc.embedPng(imageBytes);

  // Get page dimensions
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    // Coordinate conversion:
    // - session.x, session.y, session.width, session.height are in PDF coordinates (scale 1.0)
    // - PDF coordinates have origin at bottom-left
    // - session.x and session.y are stored with top-left origin (canvas-style)
    // - We need to flip the Y coordinate: pdfY = pageHeight - y - height
    // Note: session.x and session.y are the top-left corner of the signature box in PDF coordinates
    const pdfX = session.x;
    const pdfY = pageHeight - session.y - session.height;

  // Draw the signature image at the specified position
  targetPage.drawImage(signatureImage, {
    x: pdfX,
    y: pdfY,
    width: session.width,
    height: session.height,
  });

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const signedPdfPath = getSignedPdfPath(session.id);
    
    // Ensure directory exists
    const dir = path.dirname(signedPdfPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(signedPdfPath, pdfBytes);

    return signedPdfPath;
  };

  // Race between processing and timeout
  return Promise.race([processPdf(), timeoutPromise]);
}


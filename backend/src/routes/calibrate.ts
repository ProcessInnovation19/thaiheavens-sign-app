import { Router } from 'express';
import { getOriginalPdfPath } from '../services/storage';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fs from 'fs';

export const calibrateRoutes = Router();

// Generate test PDF with a red box or signature at specified position
calibrateRoutes.post('/test-pdf', async (req, res) => {
  try {
    const { pdfId, page, x, y, width, height, signatureImageBase64 } = req.body;

    if (!pdfId || page === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read the original PDF
    const originalPdfPath = getOriginalPdfPath(pdfId);
    if (!fs.existsSync(originalPdfPath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);

    // Load the PDF
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // Get the page
    const pages = pdfDoc.getPages();
    const targetPage = pages[page];

    if (!targetPage) {
      return res.status(400).json({ error: `Page ${page} does not exist` });
    }

    // Get page dimensions
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    // Convert to PDF coordinates (bottom-left origin)
    const finalPdfX = x;
    const finalPdfY = pageHeight - y - height;

    if (signatureImageBase64) {
      // Draw signature image if provided
      const imageBytes = Buffer.from(signatureImageBase64, 'base64');
      const signatureImage = await pdfDoc.embedPng(imageBytes);
      
      targetPage.drawImage(signatureImage, {
        x: finalPdfX,
        y: finalPdfY,
        width: width,
        height: height,
      });
    } else {
      // Draw a test rectangle (red box) at the position
      targetPage.drawRectangle({
        x: finalPdfX,
        y: finalPdfY,
        width: width,
        height: height,
        borderColor: rgb(1, 0, 0),
        borderWidth: 3,
      });
    }

    // Save PDF
    const modifiedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test-signature.pdf"');
    res.send(Buffer.from(modifiedPdfBytes));
  } catch (error: any) {
    console.error('Calibrate test PDF error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test PDF' });
  }
});


import { Router } from 'express';
import { getOriginalPdfPath } from '../services/storage';
import * as fs from 'fs';

export const pdfRoutes = Router();

// Stream original PDF for viewing
pdfRoutes.get('/:pdfId', (req, res) => {
  try {
    const { pdfId } = req.params;
    const pdfPath = getOriginalPdfPath(pdfId);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="contract.pdf"');
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('PDF stream error:', error);
    res.status(500).json({ error: error.message || 'Failed to stream PDF' });
  }
});



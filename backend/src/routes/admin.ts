import { Router } from 'express';
import { getSessions, getSessionById, deleteSession } from '../services/storage';
import { sendSigningLinkEmail } from '../services/email';
import * as fs from 'fs';
import * as path from 'path';

export const adminRoutes = Router();

// Get all sessions (admin only)
adminRoutes.get('/sessions', (req, res) => {
  try {
    const sessions = getSessions();
    res.json(sessions);
  } catch (error: any) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sessions' });
  }
});

// Preview signed PDF (for viewing, not download)
adminRoutes.get('/session/:id/preview-signed', (req, res) => {
  try {
    const { id } = req.params;
    const session = getSessionById(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed' && session.status !== 'signed') {
      return res.status(400).json({ error: 'PDF is not signed yet' });
    }

    if (!session.signedPdfPath || !fs.existsSync(session.signedPdfPath)) {
      return res.status(404).json({ error: 'Signed PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // inline for preview, not attachment
    
    const fileStream = fs.createReadStream(session.signedPdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview PDF' });
  }
});

// Download signed PDF
adminRoutes.get('/session/:id/download-signed', (req, res) => {
  try {
    const { id } = req.params;
    const session = getSessionById(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed' && session.status !== 'signed') {
      return res.status(400).json({ error: 'PDF is not signed yet' });
    }

    if (!session.signedPdfPath || !fs.existsSync(session.signedPdfPath)) {
      return res.status(404).json({ error: 'Signed PDF not found' });
    }

    const fileName = `signed_${session.guestName || session.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(session.signedPdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to download PDF' });
  }
});

// Delete session
adminRoutes.delete('/session/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteSession(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

// Send email with signing link
adminRoutes.post('/send-email', async (req, res) => {
  try {
    const { url, recipientEmail, recipientName } = req.body;

    if (!url || !recipientEmail) {
      return res.status(400).json({ error: 'URL and recipient email are required' });
    }

    await sendSigningLinkEmail(recipientEmail, recipientName || 'Guest', url);

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});


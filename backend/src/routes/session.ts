import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getSessionByToken,
  saveSession,
  getSessions,
  getOriginalPdfPath,
} from '../services/storage';
import { applySignatureToPdf } from '../services/pdfService';
import { SigningSession } from '../models/SigningSession';

export const sessionRoutes = Router();

// Create a new signing session
sessionRoutes.post('/create-session', (req, res) => {
  try {
    const {
      pdfId,
      guestName,
      guestEmail,
      page,
      x,
      y,
      width,
      height,
    } = req.body;

    if (!pdfId || page === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionId = uuidv4();
    const token = uuidv4().replace(/-/g, ''); // Simple token without dashes

    const session: SigningSession = {
      id: sessionId,
      token,
      pdfId,
      originalPdfPath: getOriginalPdfPath(pdfId),
      guestName: guestName || undefined,
      guestEmail: guestEmail || undefined,
      page: Number(page),
      x: Number(x),
      y: Number(y),
      width: Number(width) || 200,
      height: Number(height) || 100,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSession(session);

    const publicUrl = `/sign/${token}`;

    res.json({
      sessionId,
      token,
      publicUrl,
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

// Get session by token (public endpoint for guests)
sessionRoutes.get('/session/:token', (req, res) => {
  try {
    const { token } = req.params;
    const session = getSessionByToken(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Return public info only (no internal paths)
    res.json({
      id: session.id,
      token: session.token,
      guestName: session.guestName,
      guestEmail: session.guestEmail,
      status: session.status,
      pdfViewUrl: `/api/pdf/${session.pdfId}`,
      page: session.page,
    });
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message || 'Failed to get session' });
  }
});

// Sign the PDF (apply signature image)
sessionRoutes.post('/session/:token/sign', async (req, res) => {
  try {
    const { token } = req.params;
    const { signatureImageBase64 } = req.body;

    if (!signatureImageBase64) {
      return res.status(400).json({ error: 'Signature image is required' });
    }

    const session = getSessionByToken(token);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Apply signature to PDF
    const signedPdfPath = await applySignatureToPdf(session, signatureImageBase64);

    // Update session
    session.signedPdfPath = signedPdfPath;
    session.status = 'signed';
    session.updatedAt = new Date().toISOString();
    saveSession(session);

    res.json({
      success: true,
      signedPdfUrl: `/api/admin/session/${session.id}/preview-signed`,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Sign error:', error);
    res.status(500).json({ error: error.message || 'Failed to sign PDF' });
  }
});

// Confirm signature (mark as completed)
sessionRoutes.post('/session/:token/confirm', (req, res) => {
  try {
    const { token } = req.params;
    const session = getSessionByToken(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'signed') {
      return res.status(400).json({ error: 'Session must be signed before confirmation' });
    }

    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    saveSession(session);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Confirm error:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm signature' });
  }
});


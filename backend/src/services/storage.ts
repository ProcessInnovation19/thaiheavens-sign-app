import * as fs from 'fs';
import * as path from 'path';
import { SigningSession } from '../models/SigningSession';

const STORAGE_DIR = path.join(__dirname, '../../storage');
const ORIGINAL_DIR = path.join(STORAGE_DIR, 'original');
const SIGNED_DIR = path.join(STORAGE_DIR, 'signed');
const SESSIONS_FILE = path.join(STORAGE_DIR, 'sessions.json');

// Ensure storage directories exist
export function initStorage() {
  [STORAGE_DIR, ORIGINAL_DIR, SIGNED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Initialize sessions file if it doesn't exist
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
  }
}

// Sessions storage (simple JSON file)
export function getSessions(): SigningSession[] {
  try {
    const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export function saveSessions(sessions: SigningSession[]) {
  try {
    // Use writeFileSync with a temporary file first to avoid corruption
    const tempFile = `${SESSIONS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(sessions, null, 2));
    fs.renameSync(tempFile, SESSIONS_FILE);
  } catch (error) {
    console.error('Error saving sessions:', error);
    // Don't throw - allow the app to continue even if save fails
    // The next read will get the old data, but at least the app won't crash
  }
}

export function getSessionById(id: string): SigningSession | undefined {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
}

export function getSessionByToken(token: string): SigningSession | undefined {
  const sessions = getSessions();
  return sessions.find(s => s.token === token);
}

export function saveSession(session: SigningSession) {
  try {
    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    saveSessions(sessions);
  } catch (error) {
    console.error('Error saving session:', error);
    // Don't throw - allow the app to continue
  }
}

export function getOriginalPdfPath(pdfId: string): string {
  return path.join(ORIGINAL_DIR, `${pdfId}.pdf`);
}

export function getSignedPdfPath(sessionId: string): string {
  return path.join(SIGNED_DIR, `${sessionId}.pdf`);
}

export function deleteSession(sessionId: string): boolean {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index < 0) {
    return false;
  }
  
  const session = sessions[index];
  
  // Delete signed PDF if it exists
  if (session.signedPdfPath && fs.existsSync(session.signedPdfPath)) {
    try {
      fs.unlinkSync(session.signedPdfPath);
    } catch (error) {
      console.error('Error deleting signed PDF:', error);
    }
  }
  
  // Remove session from array
  sessions.splice(index, 1);
  saveSessions(sessions);
  
  return true;
}


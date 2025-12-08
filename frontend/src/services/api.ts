import { CreateSessionRequest, CreateSessionResponse, SessionPublicInfo, SigningSession } from '../types';

const API_BASE = '/api';

export async function uploadPdf(file: File): Promise<{ pdfId: string; filePath: string }> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('Starting upload request for file:', file.name, file.size, 'bytes');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(`${API_BASE}/upload-pdf`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'Failed to upload PDF';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Upload response received:', result);
    return result;
  } catch (err: any) {
    console.error('Upload request error:', err);
    if (err.name === 'AbortError') {
      throw new Error('Upload timeout. The file may be too large or the server is not responding.');
    }
    throw err;
  }
}

export async function createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE}/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create session');
  }

  return response.json();
}

export async function getSessionByToken(token: string): Promise<SessionPublicInfo> {
  const response = await fetch(`${API_BASE}/session/${token}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get session');
  }

  return response.json();
}

export async function signSession(token: string, signatureImageBase64: string): Promise<{ success: boolean; signedPdfUrl: string; sessionId?: string }> {
  const response = await fetch(`${API_BASE}/session/${token}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signatureImageBase64 }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign PDF');
  }

  return response.json();
}

export async function confirmSession(token: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/session/${token}/confirm`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm signature');
  }

  return response.json();
}

export async function getAllSessions(): Promise<SigningSession[]> {
  const response = await fetch(`${API_BASE}/admin/sessions`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get sessions');
  }

  return response.json();
}

export async function downloadSignedPdf(sessionId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/admin/session/${sessionId}/download-signed`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download PDF');
  }

  return response.blob();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/session/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete session');
  }
}

export async function sendEmail(url: string, recipientEmail: string, recipientName: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/admin/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, recipientEmail, recipientName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return response.json();
}


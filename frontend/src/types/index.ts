export interface SigningSession {
  id: string;
  token: string;
  pdfId: string;
  originalPdfPath: string;
  signedPdfPath?: string;
  guestName?: string;
  guestEmail?: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'pending' | 'signed' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface SessionPublicInfo {
  id: string;
  token: string;
  guestName?: string;
  guestEmail?: string;
  status: 'pending' | 'signed' | 'completed';
  pdfViewUrl: string;
  page: number;
}

export interface CreateSessionRequest {
  pdfId: string;
  guestName?: string;
  guestEmail?: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateSessionResponse {
  sessionId: string;
  token: string;
  publicUrl: string;
}



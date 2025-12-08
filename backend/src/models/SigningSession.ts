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



import { useState, useEffect } from 'react';
import PDFViewer from '../components/PDFViewer';
import { uploadPdf, createSession, getAllSessions, downloadSignedPdf, deleteSession, sendEmail } from '../services/api';
import { SigningSession } from '../types';
import buildInfo from '../build-info.json';

type Step = 'sessions' | 'upload' | 'position' | 'create';

export default function AdminPage() {
  const [step, setStep] = useState<Step>('sessions');
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    pdfX?: number;
    pdfY?: number;
    pdfWidth?: number;
    pdfHeight?: number;
  } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [sessions, setSessions] = useState<SigningSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [modalGuestEmail, setModalGuestEmail] = useState('');
  const [modalGuestName, setModalGuestName] = useState('');

  const processFile = async (file: File) => {
    if (!file) {
      console.warn('No file provided to processFile');
      setLoading(false);
      return;
    }
    
    // Check if it's a PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Processing file:', file.name, 'Size:', file.size, 'bytes', 'Type:', file.type);
      const result = await uploadPdf(file);
      console.log('Upload successful:', result);
      setPdfId(result.pdfId);
      setPdfUrl(`/api/pdf/${result.pdfId}`);
      setStep('position');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload PDF. Please try again.');
    } finally {
      setLoading(false);
      setIsDragging(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      try {
        await processFile(file);
      } catch (err) {
        console.error('Error processing dropped file:', err);
        setLoading(false);
        setIsDragging(false);
      }
    }
  };

  const handlePageClick = (page: number, canvasX: number, canvasY: number, pdfX?: number, pdfY?: number) => {
    setSelectedPage(page);
    // For display on canvas (scale 1.5)
    const displayWidth = 200;
    const displayHeight = 100;
    // PDF dimensions (scale 1.0)
    const pdfWidth = displayWidth / 1.5;
    const pdfHeight = displayHeight / 1.5;
    
    // Center the box on the click position (subtract half width/height)
    const boxX = canvasX - displayWidth / 2;
    const boxY = canvasY - displayHeight / 2;
    
    // For PDF coordinates, also center (subtract half width/height)
    const pdfBoxX = (pdfX ?? canvasX / 1.5) - pdfWidth / 2;
    const pdfBoxY = (pdfY ?? canvasY / 1.5) - pdfHeight / 2;
    
    setSelectedPosition({ 
      x: boxX, // Canvas coordinates for visual box (centered)
      y: boxY, // Canvas coordinates for visual box (centered)
      width: displayWidth, // Canvas width for visual box
      height: displayHeight, // Canvas height for visual box
      // Store PDF coordinates for backend (scale 1.0, centered)
      pdfX: pdfBoxX,
      pdfY: pdfBoxY,
      pdfWidth: pdfWidth,
      pdfHeight: pdfHeight,
    });
  };

  const handleCreateSession = async () => {
    if (!pdfId || !selectedPosition) {
      setError('Please select a position for the signature');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use PDF coordinates for backend (scale 1.0), fallback to canvas coordinates if not available
      const pdfX = selectedPosition.pdfX ?? selectedPosition.x / 1.5;
      const pdfY = selectedPosition.pdfY ?? selectedPosition.y / 1.5;
      const pdfWidth = selectedPosition.pdfWidth ?? selectedPosition.width / 1.5;
      const pdfHeight = selectedPosition.pdfHeight ?? selectedPosition.height / 1.5;

      const result = await createSession({
        pdfId,
        guestName: guestName || undefined,
        guestEmail: undefined, // Email will be set only in modal
        page: selectedPage - 1,
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      });

      const fullUrl = `${window.location.origin}${result.publicUrl}`;
      setPublicUrl(fullUrl);
      setModalGuestEmail(''); // Start with empty email in modal
      setModalGuestName(guestName || ''); // Set guest name in modal
      setShowUrlModal(true);
      setStep('sessions');
      loadSessions();
      
      // Reset form
      setPdfId(null);
      setPdfUrl(null);
      setSelectedPosition(null);
      setGuestName('');
      setEmailSent(false);
      setSendingEmail(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleDownload = async (sessionId: string, guestName?: string) => {
    try {
      const blob = await downloadSignedPdf(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${guestName || sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyUrl = async (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleResend = (session: SigningSession) => {
    const fullUrl = `${window.location.origin}/sign/${session.token}`;
    setPublicUrl(fullUrl);
    setModalGuestEmail(session.guestEmail || '');
    setModalGuestName(session.guestName || '');
    setEmailSent(false);
    setSendingEmail(false);
    setError(null);
    setShowUrlModal(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteSession(sessionId);
      loadSessions(); // Reload the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      signed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleNewSession = () => {
    setStep('upload');
    setPdfId(null);
    setPdfUrl(null);
    setSelectedPosition(null);
    setGuestName('');
    setPublicUrl(null);
    setError(null);
    setEmailSent(false);
    setSendingEmail(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={`${typeof window !== 'undefined' ? window.location.origin : ''}/images/logo.png?v=${buildInfo.timestamp}`}
                alt="Thai Heavens" 
                className="h-20 w-auto object-contain"
                style={{ maxHeight: '80px' }}
                key={`logo-${buildInfo.timestamp}`}
                onError={(e) => {
                  // Try fallback URL if local file doesn't exist
                  const img = e.target as HTMLImageElement;
                  const currentSrc = img.src;
                  if (!currentSrc.includes('thaiheavens.com')) {
                    img.src = `https://thaiheavens.com/logo.png?v=${buildInfo.timestamp}`;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Thai Heavens Sign
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">Digital Signature Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600">System Online</span>
              </div>
              <a
                href="/docs/"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </a>
              {step === 'sessions' && (
                <>
                  <a
                    href="/calibrate"
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Calibrate
                  </a>
                  <button
                    onClick={handleNewSession}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Session
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 animate-slide-up">
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start">
              <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step: Sessions List (Default) */}
        {step === 'sessions' && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">All Sessions</h2>
                  <p className="text-sm text-slate-600 mt-1">{sessions.length} total session{sessions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadSessions}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={handleNewSession}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Session
                  </button>
                </div>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">No sessions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Create your first signing session to get started</p>
                  <button
                    onClick={handleNewSession}
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Create First Session
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Guest</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {session.id.substring(0, 8)}...
                            </code>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {session.guestName || <span className="text-slate-400">N/A</span>}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {getStatusBadge(session.status)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={() => handleCopyUrl(session.token)}
                                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
                                title="Copy signing URL"
                              >
                                {copiedUrl ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy URL
                                  </>
                                )}
                              </button>
                              <a
                                href={`/sign/${session.token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Open
                              </a>
                              <button
                                onClick={() => handleResend(session)}
                                className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                title="Resend email"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Resend
                              </button>
                              {(session.status === 'signed' || session.status === 'completed') && (
                                <button
                                  onClick={() => handleDownload(session.id, session.guestName)}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                disabled={loading}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Upload PDF */}
        {step === 'upload' && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-8 md:p-12">
              <div className="max-w-2xl mx-auto text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">Upload Contract PDF</h2>
                <p className="text-slate-600 mb-8">Select the PDF document you want to prepare for digital signing</p>
                
                <div
                  className={`border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-100 scale-105'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <span className="text-lg font-semibold text-blue-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-lg font-semibold text-slate-700 mb-2">Click to upload or drag and drop</span>
                        <span className="text-sm text-slate-500">PDF files only (max 10MB)</span>
                      </>
                    )}
                  </label>
                </div>
                
                <button
                  onClick={() => setStep('sessions')}
                  className="mt-6 text-slate-600 hover:text-slate-800 font-medium"
                >
                  ← Back to Sessions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Position */}
        {step === 'position' && pdfUrl && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 md:p-8">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  2
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-slate-900">Select Signature Position</h2>
                  <p className="text-sm text-slate-600 mt-1">Click on the PDF where the signature should appear</p>
                </div>
              </div>
              
              <div className="mb-6">
                <PDFViewer
                  pdfUrl={pdfUrl}
                  onPageClick={handlePageClick}
                  selectedPage={selectedPage}
                  selectedPosition={selectedPosition || undefined}
                  onPositionUpdate={(position) => {
                    setSelectedPosition({
                      x: position.x,
                      y: position.y,
                      width: position.width,
                      height: position.height,
                      pdfX: position.pdfX,
                      pdfY: position.pdfY,
                      pdfWidth: position.pdfWidth,
                      pdfHeight: position.pdfHeight,
                    });
                  }}
                />
              </div>

              {selectedPosition && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 animate-slide-up">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-900">Position selected</p>
                        <p className="text-sm text-emerald-700">Page {selectedPage} • Ready to continue</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('create')}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setStep('upload')}
                className="mt-4 text-slate-600 hover:text-slate-800 font-medium"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Session */}
        {step === 'create' && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 md:p-8">
              <div className="flex items-center mb-8">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  3
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-slate-900">Guest Information</h2>
                  <p className="text-sm text-slate-600 mt-1">Enter guest details (optional)</p>
                </div>
              </div>
              
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Guest Name
                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Session...
                      </span>
                    ) : (
                      'Create Signing Link'
                    )}
                  </button>
                  <button
                    onClick={() => setStep('position')}
                    className="px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* URL Modal */}
      {showUrlModal && publicUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Session Created!</h3>
                  <p className="text-sm text-slate-600">Copy the signing URL to share with your guest</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUrlModal(false);
                  setPublicUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Signing URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    } catch (err) {
                      // Fallback
                      const textArea = document.createElement('textarea');
                      textArea.value = publicUrl;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
                >
                  {copiedUrl ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={modalGuestEmail}
                onChange={(e) => {
                  setModalGuestEmail(e.target.value);
                  setEmailSent(false); // Reset sent status when email changes
                  setError(null); // Clear error when email changes
                }}
                disabled={emailSent}
                placeholder="guest@example.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors text-center flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </a>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!isValidEmail(modalGuestEmail) || emailSent || sendingEmail) return;
                    try {
                      setSendingEmail(true);
                      setError(null);
                      await sendEmail(publicUrl!, modalGuestEmail, modalGuestName || 'Guest');
                      setEmailSent(true);
                      setSendingEmail(false);
                    } catch (err: any) {
                      console.error('Email send error:', err);
                      setError(err.message || 'Failed to send email. Please check the email address and try again.');
                      setSendingEmail(false);
                      // Don't set emailSent to true on error, so user can retry
                    }
                  }}
                  disabled={sendingEmail || emailSent || !isValidEmail(modalGuestEmail)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                    emailSent
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : sendingEmail
                      ? 'bg-blue-600 text-white cursor-wait'
                      : isValidEmail(modalGuestEmail)
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {emailSent ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sent
                    </>
                  ) : sendingEmail ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUrlModal(false);
                    setPublicUrl(null);
                    setEmailSent(false);
                    setSendingEmail(false);
                    setModalGuestEmail('');
                    setModalGuestName('');
                    setError(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

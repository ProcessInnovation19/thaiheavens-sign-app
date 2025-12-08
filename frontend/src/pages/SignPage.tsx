import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PDFViewer from '../components/PDFViewer';
import SignaturePadComponent from '../components/SignaturePad';
import {
  getSessionByToken,
  signSession,
  confirmSession,
} from '../services/api';
import { SessionPublicInfo } from '../types';

type SignStep = 'loading' | 'view' | 'sign' | 'preview' | 'confirmed';

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<SignStep>('loading');
  const [session, setSession] = useState<SessionPublicInfo | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedSessionId, setSignedSessionId] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (token) {
      loadSession();
    }
  }, [token]);

  // Detect orientation - with delay for orientationchange
  useEffect(() => {
    const checkOrientation = () => {
      // Use a small delay for orientationchange to ensure dimensions are updated
      setTimeout(() => {
        const isLandscapeMode = window.innerWidth > window.innerHeight;
        setIsLandscape(isLandscapeMode);
      }, 100);
    };
    
    // Initial check
    setIsLandscape(window.innerWidth > window.innerHeight);
    
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const loadSession = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const sessionData = await getSessionByToken(token);
      setSession(sessionData);
      setStep('view');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired signing link');
      setStep('view');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySignature = async () => {
    if (!signatureDataUrl || !token) {
      setError('Please draw your signature first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const base64Data = signatureDataUrl.split(',')[1] || signatureDataUrl;
      const result = await signSession(token, base64Data);
      setSignedPdfUrl(result.signedPdfUrl);
      if (result.sessionId) {
        setSignedSessionId(result.sessionId);
      }
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to apply signature');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || !signedSessionId) return;

    try {
      setLoading(true);
      setError(null);
      await confirmSession(token);
      
      // Download the signed PDF
      try {
        const response = await fetch(`/api/admin/session/${signedSessionId}/download-signed`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `signed_${session?.guestName || 'document'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } catch (downloadErr) {
        console.error('Download error:', downloadErr);
        // Continue even if download fails
      }
      
      setStep('confirmed');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm signature');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAndSignAgain = () => {
    setSignatureDataUrl('');
    setSignedPdfUrl(null);
    setStep('sign');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-soft border border-white/50 p-8 md:p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Link Invalid</h2>
          <p className="text-slate-600 mb-2">{error}</p>
          <p className="text-sm text-slate-500">This signing link is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-soft p-8 max-w-md w-full text-center">
          <p className="text-slate-600">Session not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="Thai Heavens" 
                className="h-16 sm:h-20 w-auto object-contain"
                style={{ maxHeight: '80px', display: 'block' }}
                onError={(e) => {
                  // Try fallback URL if local file doesn't exist
                  const img = e.target as HTMLImageElement;
                  const currentSrc = img.src;
                  if (!currentSrc.includes('thaiheavens.com')) {
                    img.src = 'https://thaiheavens.com/logo.png';
                  } else if (!currentSrc.includes('sign.process-innovation.it')) {
                    // Try server URL
                    img.src = 'https://sign.process-innovation.it/images/logo.png';
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Digital Signature
                </h1>
                {session.guestName && (
                  <p className="text-sm text-slate-600 mt-0.5">Hello, {session.guestName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Secure Session
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
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

        {/* Step: View PDF */}
        {step === 'view' && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Contract</h2>
                <p className="text-slate-600">Please read the contract carefully before signing</p>
              </div>
              
              {session.pdfViewUrl && (
                <div className="mb-4 -mx-2 sm:-mx-4">
                  <PDFViewer pdfUrl={session.pdfViewUrl} readOnly={true} />
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowSignatureModal(true);
                  setStep('sign');
                }}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={loading}
              >
                I'm Ready to Sign
              </button>
            </div>
          </div>
        )}

        {/* Step: Sign - Fullscreen Modal */}
        {step === 'sign' && showSignatureModal && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Show rotate message if portrait on mobile */}
            {!isLandscape && window.innerWidth < 768 && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center z-50 p-8 text-center">
                <div className="mb-6" style={{ animation: 'spin 3s linear infinite' }}>
                  <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">Rotate Your Device</h2>
                <p className="text-xl mb-2">Please rotate your phone to landscape mode</p>
                <p className="text-lg text-blue-100">to sign the document</p>
              </div>
            )}

            {/* Modal Header - Only show in landscape or desktop */}
            {(isLandscape || window.innerWidth >= 768) && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 sm:py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Sign Document</h2>
                    <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">Use your finger or mouse to draw your signature</p>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Canvas - Fullscreen */}
            {(isLandscape || window.innerWidth >= 768) && (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative" style={{ height: '100%' }}>
                <div className="w-full h-full flex flex-col" style={{ height: '100%' }}>
                  <SignaturePadComponent
                    onSignatureChange={setSignatureDataUrl}
                    fullscreen={isLandscape && window.innerWidth < 768}
                    height={typeof window !== 'undefined' 
                      ? (isLandscape && window.innerWidth < 768 
                          ? window.innerHeight - 60  // Full height minus small header in landscape mobile
                          : window.innerWidth >= 768 
                            ? Math.max(window.innerHeight - 200, 400)  // Desktop
                            : Math.max(window.innerHeight - 200, 400))  // Portrait mobile
                      : 600}
                  />
                </div>
                
                {/* Floating OK button in landscape mobile */}
                {isLandscape && window.innerWidth < 768 && (
                  <>
                    <div className="absolute bottom-4 left-0 right-0 bg-black/70 text-white px-4 py-2 text-center z-40">
                      <p className="text-xs font-semibold mb-2">When finished, rotate to portrait or click OK below</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (signatureDataUrl) {
                          setShowSignatureModal(false);
                          await handleApplySignature();
                        }
                      }}
                      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-50 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-base shadow-2xl hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      disabled={!signatureDataUrl || loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Applying...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>OK</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Modal Footer - Show in portrait or desktop, hide in mobile landscape */}
            {(!isLandscape || window.innerWidth >= 768) && (
              <div className="bg-white border-t border-slate-200 px-2 sm:px-4 py-3 sm:py-4 flex gap-2 sm:gap-3 shadow-lg">
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setSignatureDataUrl('');
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-100 text-slate-700 rounded-xl text-sm sm:text-base font-semibold hover:bg-slate-200 transition-all duration-200 flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (signatureDataUrl) {
                      setShowSignatureModal(false);
                      await handleApplySignature();
                    }
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex-1 flex items-center justify-center gap-2"
                  disabled={!signatureDataUrl || loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Applying...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>OK</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && session && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Preview Signature</h2>
                <p className="text-slate-600">Review the page with your signature before confirming</p>
              </div>
              
              {signedPdfUrl && (
                <div className="mb-4 -mx-2 sm:-mx-4">
                  <PDFViewer 
                    pdfUrl={signedPdfUrl} 
                    readOnly={true}
                    selectedPage={session.page + 1} // session.page is 0-indexed, PDFViewer expects 1-indexed
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming...
                    </span>
                  ) : (
                    '✓ Confirm & Download'
                  )}
                </button>
                <button
                  onClick={handleClearAndSignAgain}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-200 transition-all duration-200"
                  disabled={loading}
                >
                  Clear & Sign Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Confirmed */}
        {step === 'confirmed' && (
          <div className="animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Signature Confirmed!
              </h2>
              <p className="text-xl text-slate-600 mb-2">
                Your signature has been successfully recorded.
              </p>
              <p className="text-slate-500">
                Thank you for completing the signing process.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

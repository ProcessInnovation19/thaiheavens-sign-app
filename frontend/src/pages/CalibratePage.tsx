import { useState } from 'react';
import PDFViewer from '../components/PDFViewer';
import SignaturePadComponent from '../components/SignaturePad';
import { uploadPdf } from '../services/api';

export default function CalibratePage() {
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [clickPosition, setClickPosition] = useState<{
    canvasX: number;
    canvasY: number;
    pdfX: number;
    pdfY: number;
  } | null>(null);
  const [testBox, setTestBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [calibrationParams, setCalibrationParams] = useState({
    offsetX: 0,
    offsetY: 0,
    scaleX: 1.0,
    scaleY: 1.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPdfUrl, setTestPdfUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [testMode, setTestMode] = useState<'box' | 'signature'>('box');
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number; scale: number } | null>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    
    // Check if it's a PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await uploadPdf(file);
      setPdfId(result.pdfId);
      setPdfUrl(`/api/pdf/${result.pdfId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      await processFile(file);
    }
  };

  const handlePageClick = (page: number, canvasX: number, canvasY: number, pdfX?: number, pdfY?: number) => {
    setSelectedPage(page);
    
    // Store click position (center point)
    setClickPosition({
      canvasX,
      canvasY,
      pdfX: pdfX ?? canvasX / 1.5,
      pdfY: pdfY ?? canvasY / 1.5,
    });

    // Calculate test box dimensions proportional to viewport
    // Use a fixed aspect ratio (2:1) but scale based on viewport size
    const aspectRatio = 2; // width:height = 2:1
    let displayWidth: number;
    let displayHeight: number;
    
    if (viewportSize) {
      // Make box proportional to viewport (e.g., 20% of viewport width)
      displayWidth = viewportSize.width * 0.2;
      displayHeight = displayWidth / aspectRatio;
      
      // Ensure minimum and maximum sizes
      displayWidth = Math.max(100, Math.min(displayWidth, 300));
      displayHeight = displayWidth / aspectRatio;
    } else {
      // Fallback to fixed size if viewport not available
      displayWidth = 200;
      displayHeight = 100;
    }
    
    const pdfWidth = displayWidth / 1.5;
    const pdfHeight = displayHeight / 1.5;

    // Center the box on the click position
    const adjustedPdfX = ((pdfX ?? canvasX / 1.5) - pdfWidth / 2) * calibrationParams.scaleX + calibrationParams.offsetX;
    const adjustedPdfY = ((pdfY ?? canvasY / 1.5) - pdfHeight / 2) * calibrationParams.scaleY + calibrationParams.offsetY;

    // Convert back to canvas coordinates for display (centered)
    const adjustedCanvasX = adjustedPdfX * 1.5;
    const adjustedCanvasY = adjustedPdfY * 1.5;

    setTestBox({
      x: adjustedCanvasX,
      y: adjustedCanvasY,
      width: displayWidth,
      height: displayHeight,
    });
  };

  const handleTestSignature = async () => {
    if (!pdfId || !clickPosition || !testBox) {
      setError('Please click on the PDF first');
      return;
    }

    if (testMode === 'signature' && !signatureDataUrl) {
      setError('Please draw your signature first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the testBox dimensions (which are already scaled proportionally)
      const pdfWidth = testBox.width / 1.5;
      const pdfHeight = testBox.height / 1.5;
      const adjustedPdfX = (clickPosition.pdfX - pdfWidth / 2) * calibrationParams.scaleX + calibrationParams.offsetX;
      const adjustedPdfY = (clickPosition.pdfY - pdfHeight / 2) * calibrationParams.scaleY + calibrationParams.offsetY;

      // Call backend to generate test PDF
      const response = await fetch('/api/calibrate/test-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId,
          page: selectedPage - 1,
          x: adjustedPdfX,
          y: adjustedPdfY,
          width: pdfWidth,
          height: pdfHeight,
          signatureImageBase64: testMode === 'signature' ? (signatureDataUrl.split(',')[1] || signatureDataUrl) : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate test PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setTestPdfUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Calibration Tool
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">Test and adjust coordinate mapping</p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              ← Back to Admin
            </a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Upload PDF</h2>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
                id="calibrate-pdf-upload"
              />
              <div
                className={`block w-full px-4 py-3 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <label
                  htmlFor="calibrate-pdf-upload"
                  className="w-full h-full flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Uploading...' : pdfUrl ? 'PDF Loaded ✓' : 'Click to Upload PDF or Drag & Drop'}
                </label>
              </div>
            </div>

            {clickPosition && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Click Position</h2>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Canvas X:</span>
                    <span className="text-slate-900">{clickPosition.canvasX.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Canvas Y:</span>
                    <span className="text-slate-900">{clickPosition.canvasY.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">PDF X:</span>
                    <span className="text-slate-900">{clickPosition.pdfX.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">PDF Y:</span>
                    <span className="text-slate-900">{clickPosition.pdfY.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Calibration Parameters</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Offset X: {calibrationParams.offsetX.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={calibrationParams.offsetX}
                    onChange={(e) => setCalibrationParams({ ...calibrationParams, offsetX: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Offset Y: {calibrationParams.offsetY.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={calibrationParams.offsetY}
                    onChange={(e) => setCalibrationParams({ ...calibrationParams, offsetY: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Scale X: {calibrationParams.scaleX.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.001"
                    value={calibrationParams.scaleX}
                    onChange={(e) => setCalibrationParams({ ...calibrationParams, scaleX: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Scale Y: {calibrationParams.scaleY.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.001"
                    value={calibrationParams.scaleY}
                    onChange={(e) => setCalibrationParams({ ...calibrationParams, scaleY: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => setCalibrationParams({ offsetX: 0, offsetY: 0, scaleX: 1.0, scaleY: 1.0 })}
                  className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {clickPosition && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Test Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTestMode('box')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        testMode === 'box'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Box Only
                    </button>
                    <button
                      onClick={() => setTestMode('signature')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        testMode === 'signature'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      With Signature
                    </button>
                  </div>
                </div>

                {testMode === 'signature' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Draw Signature</label>
                    <div className="border-2 border-slate-200 rounded-lg p-2 bg-white">
                      <SignaturePadComponent
                        onSignatureChange={setSignatureDataUrl}
                        height={150}
                      />
                    </div>
                    {signatureDataUrl && (
                      <button
                        onClick={() => setSignatureDataUrl('')}
                        className="mt-2 w-full px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                      >
                        Clear Signature
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={handleTestSignature}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Testing...' : testMode === 'box' ? 'Test Box Position' : 'Test Signature Position'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  {testMode === 'box'
                    ? 'This will create a test PDF with a red box where the signature would be placed'
                    : 'This will create a test PDF with your signature at the selected position'}
                </p>
              </div>
            )}
          </div>

          {/* Right: PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Click on the PDF to test</h2>
              {pdfUrl ? (
                <PDFViewer
                  pdfUrl={pdfUrl}
                  onPageClick={handlePageClick}
                  selectedPage={selectedPage}
                  selectedPosition={testBox || undefined}
                  onViewportReady={setViewportSize}
                  onPositionUpdate={(position) => {
                    setTestBox({
                      x: position.x,
                      y: position.y,
                      width: position.width,
                      height: position.height,
                    });
                    if (clickPosition) {
                      setClickPosition({
                        ...clickPosition,
                        pdfX: position.pdfX,
                        pdfY: position.pdfY,
                      });
                    }
                  }}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <p className="text-slate-500">Upload a PDF to start calibration</p>
                </div>
              )}
            </div>

            {testPdfUrl && (
              <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Test Result</h2>
                <p className="text-sm text-slate-600 mb-4">
                  {testMode === 'box'
                    ? 'Check if the red box appears where you clicked. Adjust calibration parameters if needed.'
                    : 'Check if your signature appears where you clicked. Adjust calibration parameters if needed.'}
                </p>
                <PDFViewer
                  pdfUrl={testPdfUrl}
                  readOnly={true}
                  selectedPage={selectedPage}
                />
                <div className="mt-4 flex gap-3">
                  <a
                    href={testPdfUrl}
                    download="test-signature.pdf"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Download Test PDF
                  </a>
                  <button
                    onClick={() => {
                      if (testPdfUrl) URL.revokeObjectURL(testPdfUrl);
                      setTestPdfUrl(null);
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    Clear Test
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
  onPageClick?: (page: number, canvasX: number, canvasY: number, pdfX?: number, pdfY?: number) => void;
  selectedPage?: number;
  selectedPosition?: { x: number; y: number; width: number; height: number; pdfX?: number; pdfY?: number; pdfWidth?: number; pdfHeight?: number };
  readOnly?: boolean;
  onViewportReady?: (viewport: { width: number; height: number; scale: number }) => void;
  onPositionUpdate?: (position: { x: number; y: number; width: number; height: number; pdfX: number; pdfY: number; pdfWidth: number; pdfHeight: number }) => void;
  fullscreen?: boolean;
}

interface PageInfo {
  canvas: HTMLCanvasElement;
  viewport: any;
  page: any;
  rendered: boolean;
}

export default function PDFViewer({
  pdfUrl,
  onPageClick,
  selectedPage,
  selectedPosition,
  readOnly = false,
  onViewportReady,
  fullscreen = false,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const pagesRef = useRef<PageInfo[]>([]);
  const renderTasksRef = useRef<any[]>([]);
  
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Zoom and pan for readOnly mode
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollTop: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; zoom: number; center: { x: number; y: number }; scrollTop: number } | null>(null);

  useEffect(() => {
    if (selectedPage) {
      setCurrentPage(selectedPage);
    }
  }, [selectedPage]);

  // Load PDF
  useEffect(() => {
    let isMounted = true;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        if (!isMounted) return;
        
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        pagesRef.current = [];
        renderTasksRef.current = [];
        
        // Initialize pages array
        for (let i = 1; i <= pdf.numPages; i++) {
          pagesRef.current.push({
            canvas: null as any,
            viewport: null,
            page: null,
            rendered: false,
          });
        }
        
        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          console.error('Error loading PDF:', err);
          setError(err.message || 'Failed to load PDF');
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
      // Cancel all render tasks
      renderTasksRef.current.forEach(task => {
        if (task && task.cancel) {
          task.cancel();
        }
      });
    };
  }, [pdfUrl]);

  // Render all pages in vertical layout (Google PDF Reader style)
  useEffect(() => {
    if (!pdfRef.current || !pagesContainerRef.current || loading) return;
    if (!readOnly && selectedPosition) return; // Don't re-render if positioning signature

    const renderAllPages = async () => {
      const container = pagesContainerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const heights: number[] = [];
      let totalHeight = 0;

      // Clear existing pages
      container.innerHTML = '';
      pagesRef.current = [];
      renderTasksRef.current = [];

      try {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfRef.current.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          
          // Calculate scale to fit container width (100% width)
          const scale = containerWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale: scale * zoom });
          
          // Create canvas for this page
          const canvas = document.createElement('canvas');
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '8px'; // Small space between pages
          canvas.className = 'pdf-page-canvas';
          
          const context = canvas.getContext('2d');
          if (!context) continue;

          // Render page
          const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
          };

          const renderTask = page.render(renderContext);
          renderTasksRef.current.push(renderTask);
          
          await renderTask.promise;
          
          // Store page info
          pagesRef.current[pageNum - 1] = {
            canvas,
            viewport: scaledViewport,
            page,
            rendered: true,
          };
          
          heights.push(scaledViewport.height);
          totalHeight += scaledViewport.height + 8; // +8 for margin
          
          // Append canvas to container
          container.appendChild(canvas);
          
          // Add click handler for signature positioning (non-readOnly mode)
          if (!readOnly && onPageClick) {
            canvas.addEventListener('click', (e) => {
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const canvasX = (e.clientX - rect.left) * scaleX;
              const canvasY = (e.clientY - rect.top) * scaleY;
              const pdfCoords = canvasToPdf(pageNum, canvasX, canvasY, 0, 0);
              onPageClick(pageNum, canvasX, canvasY, pdfCoords.x, pdfCoords.y);
            });
          }
        }
        
        // Notify viewport ready for first page (for signature positioning)
        if (onViewportReady && pagesRef.current[0]) {
          const firstPage = pagesRef.current[0];
          onViewportReady({
            width: firstPage.viewport.width,
            height: firstPage.viewport.height,
            scale: firstPage.viewport.scale,
          });
        }
      } catch (err) {
        console.error('Error rendering pages:', err);
      }
    };

    renderAllPages();
  }, [pdfUrl, numPages, zoom, readOnly, selectedPosition, onViewportReady]);

  // Improved pinch-to-zoom calculation
  const calculatePinchZoom = useCallback((touch1: React.Touch, touch2: React.Touch, startDistance: number, startZoom: number) => {
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    const scale = currentDistance / startDistance;
    return Math.max(0.5, Math.min(4, startZoom * scale));
  }, []);

  // Calculate scroll position to keep pinch center in view
  const calculateScrollForZoom = useCallback((
    pinchCenter: { x: number; y: number },
    oldZoom: number,
    newZoom: number,
    currentScrollTop: number
  ) => {
    const zoomRatio = newZoom / oldZoom;
    const scrollDelta = (pinchCenter.y - currentScrollTop) * (zoomRatio - 1);
    return currentScrollTop + scrollDelta;
  }, []);

  // Touch handlers for improved pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!readOnly) return;
    
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const container = pagesContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
        
        setIsPinching(true);
        setIsPanning(false);
        setPinchStart({
          distance,
          zoom,
          center: { x: centerX, y: centerY },
          scrollTop: container.scrollTop,
        });
      }
    } else if (e.touches.length === 1 && !isPinching) {
      const container = pagesContainerRef.current;
      if (container) {
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollTop: container.scrollTop,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!readOnly) return;
    
    if (isPinching && pinchStart && e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const newZoom = calculatePinchZoom(touch1, touch2, pinchStart.distance, pinchStart.zoom);
      setZoom(newZoom);
      
      // Adjust scroll to keep pinch center in view
      const container = pagesContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
        const newScrollTop = calculateScrollForZoom(
          { x: 0, y: centerY + pinchStart.scrollTop },
          pinchStart.zoom,
          newZoom,
          pinchStart.scrollTop
        );
        container.scrollTop = newScrollTop;
      }
    } else if (isPanning && panStart && e.touches.length === 1 && !isPinching) {
      e.preventDefault();
      const container = pagesContainerRef.current;
      if (container) {
        const deltaY = panStart.y - e.touches[0].clientY;
        container.scrollTop = panStart.scrollTop + deltaY;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!readOnly) return;
    
    if (e.touches.length === 0) {
      setIsPanning(false);
      setPanStart(null);
      setIsPinching(false);
      setPinchStart(null);
    } else if (e.touches.length === 1 && isPinching) {
      // Switched from pinch to pan
      setIsPinching(false);
      setPinchStart(null);
      const container = pagesContainerRef.current;
      if (container) {
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollTop: container.scrollTop,
        });
      }
    }
  };

  // Convert canvas coordinates to PDF coordinates (for signature positioning)
  const canvasToPdf = (pageNum: number, canvasX: number, canvasY: number, canvasWidth: number, canvasHeight: number) => {
    const pageInfo = pagesRef.current[pageNum - 1];
    if (!pageInfo || !pageInfo.viewport) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const pdfViewport = pageInfo.page.getViewport({ scale: 1 });
    const scaleFactor = pdfViewport.width / pageInfo.viewport.width;
    
    return {
      x: canvasX * scaleFactor,
      y: (pageInfo.viewport.height - canvasY - canvasHeight) * scaleFactor,
      width: canvasWidth * scaleFactor,
      height: canvasHeight * scaleFactor,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-slate-50 rounded-lg border border-slate-200">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-red-50 rounded-lg border border-red-300 text-red-800 p-4">
        <p>{error}</p>
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Fullscreen mobile mode (Adobe Reader Light style)
  if (fullscreen && isMobile) {
    return (
      <div className="w-full h-full relative flex flex-col bg-black" style={{ height: '100%', width: '100%' }}>
        {/* Minimal floating controls */}
        <div className="absolute top-2 right-2 z-50 flex flex-col gap-2">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs font-semibold shadow-lg">
            {currentPage} / {numPages}
          </div>
          {readOnly && (
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 shadow-lg">
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-bold flex items-center justify-center transition-colors"
                aria-label="Zoom in"
              >
                +
              </button>
              <div className="px-2 py-1 text-white text-xs font-semibold text-center min-w-[40px]">
                {Math.round(zoom * 100)}%
              </div>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-bold flex items-center justify-center transition-colors"
                aria-label="Zoom out"
              >
                −
              </button>
            </div>
          )}
        </div>
        
        {/* Page navigation */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-3 shadow-lg">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm flex items-center justify-center transition-colors"
              aria-label="Previous page"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages || loading}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm flex items-center justify-center transition-colors"
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>
        
        {/* Pages container - Google PDF Reader style */}
        <div
          ref={pagesContainerRef}
          className="flex-1 overflow-y-auto w-full"
          style={{
            touchAction: readOnly ? 'pan-y pinch-zoom' : 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pages are rendered here by useEffect */}
        </div>
      </div>
    );
  }

  // Desktop/normal mode
  return (
    <div className="w-full relative">
      {/* Desktop: Controls above PDF */}
      {!isMobile && (
        <>
          <div className="flex items-center justify-center gap-2 mb-3 bg-slate-50 rounded-lg p-2 border border-slate-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            >
              ← Previous
            </button>
            <div className="px-6 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 shadow-sm">
              Page {currentPage} of {numPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages || loading}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            >
              Next →
            </button>
          </div>
          
          {/* Zoom Controls */}
          {readOnly && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 shadow-sm min-w-[80px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  if (pagesContainerRef.current) {
                    pagesContainerRef.current.scrollTop = 0;
                  }
                }}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Reset
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Pages container - Google PDF Reader style: all pages vertical */}
      <div
        ref={containerRef}
        className={`flex flex-col items-center ${readOnly ? 'bg-slate-100 rounded-lg border border-slate-200 overflow-y-auto' : 'p-1 sm:p-2'}`}
        style={readOnly ? {
          height: isMobile ? '100vh' : '70vh',
          touchAction: 'pan-y pinch-zoom',
          WebkitOverflowScrolling: 'touch',
        } : {}}
      >
        <div
          ref={pagesContainerRef}
          className="w-full"
          style={readOnly ? {
            touchAction: 'pan-y pinch-zoom',
            WebkitOverflowScrolling: 'touch',
          } : {}}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pages are rendered here by useEffect */}
        </div>
      </div>
      
      {!readOnly && (
        <p className="text-center text-slate-600 text-sm mt-4 font-medium">
          👆 Click on the PDF to select where the signature should appear
        </p>
      )}
    </div>
  );
}

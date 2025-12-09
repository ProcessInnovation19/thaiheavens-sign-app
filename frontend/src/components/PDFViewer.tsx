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
  // Zoom and pan for readOnly mode - start at 1 (fit to width)
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollTop: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; zoom: number; center: { x: number; y: number }; scrollTop: number } | null>(null);
  const zoomUpdateRef = useRef<number | null>(null);

  // Note: selectedPage is used for signature positioning, not for navigation

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
        // Get device pixel ratio for high quality rendering
        const devicePixelRatio = window.devicePixelRatio || 2;
        const qualityScale = Math.max(2, devicePixelRatio); // Minimum 2x quality
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfRef.current.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          
          // Calculate base scale to fit container width (100% width)
          const baseScale = containerWidth / viewport.width;
          // Apply zoom, but ensure minimum zoom is 1 (fit to width)
          const effectiveZoom = Math.max(1, zoom);
          const finalScale = baseScale * effectiveZoom;
          
          // Render at high quality (qualityScale x finalScale)
          const renderScale = finalScale * qualityScale;
          const renderViewport = page.getViewport({ scale: renderScale });
          
          // Create canvas for this page - render at high quality
          const canvas = document.createElement('canvas');
          canvas.width = renderViewport.width;
          canvas.height = renderViewport.height;
          // Display at final size (with zoom applied)
          canvas.style.width = `${containerWidth * effectiveZoom}px`;
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '24px'; // Increased space between pages
          canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; // Elevated shadow effect
          canvas.style.backgroundColor = '#ffffff';
          canvas.className = 'pdf-page-canvas';
          
          const context = canvas.getContext('2d');
          if (!context) continue;

          // Render page at high quality
          const renderContext = {
            canvasContext: context,
            viewport: renderViewport,
          };

          const renderTask = page.render(renderContext);
          renderTasksRef.current.push(renderTask);
          
          await renderTask.promise;
          
          // Store page info (use display viewport, not render viewport)
          const displayViewport = page.getViewport({ scale: finalScale });
          pagesRef.current[pageNum - 1] = {
            canvas,
            viewport: displayViewport,
            page,
            rendered: true,
          };
          
          heights.push(displayViewport.height);
          totalHeight += displayViewport.height + 24; // +24 for margin
          
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

  // Improved pinch-to-zoom calculation - zoom out minimum is 1 (fit to width)
  const calculatePinchZoom = useCallback((touch1: React.Touch, touch2: React.Touch, startDistance: number, startZoom: number) => {
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    // Calculate scale based on distance change
    const scale = currentDistance / startDistance;
    // Apply scale to current zoom
    const newZoom = startZoom * scale;
    // Minimum zoom is 1 (fit to container width), maximum is 4
    return Math.max(1, Math.min(4, newZoom));
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
      
      // Use requestAnimationFrame for smooth zoom updates
      if (zoomUpdateRef.current !== null) {
        cancelAnimationFrame(zoomUpdateRef.current);
      }
      
      zoomUpdateRef.current = requestAnimationFrame(() => {
        // Use current zoom state, not pinchStart.zoom, to avoid accumulation errors
        const currentZoom = zoom;
        const newZoom = calculatePinchZoom(touch1, touch2, pinchStart.distance, currentZoom);
        
        // Clamp zoom between 1 (fit to width) and 4 (max zoom)
        const clampedZoom = Math.max(1, Math.min(4, newZoom));
        setZoom(clampedZoom);
        
        // Update pinchStart.zoom to current zoom for next calculation
        setPinchStart(prev => prev ? { ...prev, zoom: clampedZoom } : null);
        
        // Adjust scroll to keep pinch center in view
        const container = pagesContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
          const newScrollTop = calculateScrollForZoom(
            { x: 0, y: centerY + pinchStart.scrollTop },
            currentZoom,
            clampedZoom,
            pinchStart.scrollTop
          );
          container.scrollTop = newScrollTop;
        }
        
        zoomUpdateRef.current = null;
      });
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
    
    // Cancel any pending zoom updates
    if (zoomUpdateRef.current !== null) {
      cancelAnimationFrame(zoomUpdateRef.current);
      zoomUpdateRef.current = null;
    }
    
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

  // Fullscreen mobile mode (Google PDF Reader style)
  if (fullscreen && isMobile) {
    return (
      <div className="w-full h-full relative flex flex-col bg-slate-50" style={{ height: '100dvh', width: '100%', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Pages container - Google PDF Reader style */}
        <div
          ref={pagesContainerRef}
          className="flex-1 w-full"
          style={{
            touchAction: readOnly ? (zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom') : 'auto',
            WebkitOverflowScrolling: 'touch',
            height: '100%',
            maxHeight: '100dvh',
            overflow: readOnly ? (zoom > 1 ? 'auto' : 'y-auto') : 'auto',
            overflowX: readOnly ? (zoom > 1 ? 'auto' : 'hidden') : 'auto',
            overflowY: 'auto',
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
      {/* Pages container - Google PDF Reader style: all pages vertical */}
      <div
        ref={containerRef}
        className={`flex flex-col items-center ${readOnly ? 'bg-slate-50 rounded-lg border border-slate-200' : 'p-1 sm:p-2'}`}
        style={readOnly ? {
          height: isMobile ? '100dvh' : '70vh', // Full height on mobile when header is hidden
          touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom',
          WebkitOverflowScrolling: 'touch',
          maxHeight: isMobile ? '100dvh' : '70vh',
          overflow: zoom > 1 ? 'auto' : 'y-auto',
          overflowX: zoom > 1 ? 'auto' : 'hidden',
          overflowY: 'auto',
        } : {}}
      >
        <div
          ref={pagesContainerRef}
          className="w-full"
          style={readOnly ? {
            touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom',
            WebkitOverflowScrolling: 'touch',
            overflow: zoom > 1 ? 'auto' : 'y-auto',
            overflowX: zoom > 1 ? 'auto' : 'hidden',
            overflowY: 'auto',
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

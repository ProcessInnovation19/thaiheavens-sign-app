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
  const [zoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollTop: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; zoom: number; center: { x: number; y: number }; scrollTop: number } | null>(null);
  const currentVisualZoomRef = useRef<number>(1); // Track visual zoom without state updates

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
          // Add top margin only to first page, bottom margin to all pages
          canvas.style.marginTop = pageNum === 1 ? '16px' : '0';
          canvas.style.marginBottom = '24px'; // Increased space between pages
          canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; // Elevated shadow effect
          canvas.style.backgroundColor = '#ffffff';
          canvas.className = 'pdf-page-canvas';
          // Optimize for smooth zooming
          canvas.style.willChange = 'transform';
          canvas.style.imageRendering = 'high-quality';
          canvas.style.transition = 'none'; // Disable transitions during pinch for instant response
          
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
  }, [pdfUrl, numPages, readOnly, selectedPosition, onViewportReady]);
  // NOTE: Removed 'zoom' from dependencies to prevent re-render during pinch
  // Zoom is now handled purely with CSS transform for smooth experience

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
        const parentContainer = container.parentElement;
        const rect = parentContainer ? parentContainer.getBoundingClientRect() : container.getBoundingClientRect();
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
        
        // Get current visual zoom from transform if exists, otherwise use state
        let currentZoom = zoom;
        if (container && container.style.transform) {
          // Extract zoom from existing transform
          const transformMatch = container.style.transform.match(/scale\(([\d.]+)\)/);
          if (transformMatch) {
            currentZoom = parseFloat(transformMatch[1]);
          }
        }
        currentVisualZoomRef.current = currentZoom;
        
        setIsPinching(true);
        setIsPanning(false);
        setPinchStart({
          distance,
          zoom: currentZoom, // Use current visual zoom as base
          center: { x: centerX, y: centerY },
          scrollTop: parentContainer ? parentContainer.scrollTop : 0,
        });
      }
    } else if (e.touches.length === 1 && !isPinching) {
      const container = pagesContainerRef.current;
      if (container) {
        const parentContainer = container.parentElement;
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollTop: parentContainer ? parentContainer.scrollTop : 0,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!readOnly) return;
    
    if (isPinching && pinchStart && e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate zoom directly for immediate response
      // Use pinchStart.zoom as base to avoid accumulation errors
      const baseZoom = pinchStart.zoom;
      const newZoom = calculatePinchZoom(touch1, touch2, pinchStart.distance, baseZoom);
      
      // Clamp zoom between 1 (fit to width) and 4 (max zoom)
      const clampedZoom = Math.max(1, Math.min(4, newZoom));
      
      // Update ref (no state update = no re-render = maximum smoothness)
      currentVisualZoomRef.current = clampedZoom;
      
      // Apply CSS transform using requestAnimationFrame for ultra-smooth, native-like zoom
      // This ensures the transform is applied at the optimal time for rendering
      requestAnimationFrame(() => {
        const container = pagesContainerRef.current;
        if (container) {
          // Apply transform with hardware acceleration hints
          container.style.transform = `translateZ(0) scale(${clampedZoom})`;
          container.style.transformOrigin = 'top center';
          container.style.willChange = 'transform';
          // Force GPU acceleration
          container.style.backfaceVisibility = 'hidden';
          container.style.perspective = '1000px';
        }
      });
      
      // Don't adjust scroll during pinch - let browser handle it naturally for maximum smoothness
      // This prevents janky scroll calculations that can cause stuttering
    } else if (isPanning && panStart && e.touches.length === 1 && !isPinching) {
      e.preventDefault();
      e.stopPropagation();
      const container = pagesContainerRef.current;
      if (container) {
        const deltaY = panStart.y - e.touches[0].clientY;
        const parentContainer = container.parentElement;
        if (parentContainer) {
          parentContainer.scrollTop = panStart.scrollTop + deltaY;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!readOnly) return;
    
      // When pinch ends, keep the transform - don't trigger re-render
      if (isPinching && pinchStart) {
        const finalZoom = currentVisualZoomRef.current;
        
        // DON'T remove CSS transform - keep it for smooth experience
        // DON'T update zoom state to avoid re-render
        // Just update the ref for next pinch calculation
        currentVisualZoomRef.current = finalZoom;
        
        // Update pinchStart.zoom to current zoom to prevent accumulation on next pinch
        setPinchStart({
          ...pinchStart,
          zoom: finalZoom,
        });
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
        const parentContainer = container.parentElement;
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollTop: parentContainer ? parentContainer.scrollTop : 0,
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
      <div 
        className="w-full h-full relative flex flex-col bg-slate-50" 
        style={{ 
          height: '100%', 
          width: '100%', 
          margin: 0,
          padding: 0,
        }}
      >
        {/* Pages container - Google PDF Reader style - can be zoomed with CSS transform */}
        <div
          ref={pagesContainerRef}
          className="flex-1 w-full"
          style={{
            touchAction: readOnly ? (zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom') : 'auto',
            WebkitOverflowScrolling: 'touch',
            height: '100%',
            width: '100%',
            overflow: 'auto',
            margin: 0,
            padding: 0,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transform: 'translateZ(0)',
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
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transform: 'translateZ(0)',
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

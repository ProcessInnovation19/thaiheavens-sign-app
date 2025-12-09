import { useEffect, useRef, useState } from 'react';
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
  // Use refs instead of state for maximum performance - no re-renders during pinch
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const isPinchingRef = useRef(false);
  const pinchStartRef = useRef<{ distance: number; zoom: number; center: { x: number; y: number }; scrollTop: number } | null>(null);
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

  // Ultra-fast pinch-to-zoom calculation - optimized for performance
  // Use simple distance calculation instead of Math.hypot for speed
  const calculatePinchZoom = (touch1: Touch, touch2: Touch, startDistance: number, startZoom: number) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    // Fast distance calculation (avoid Math.hypot for performance)
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    // Calculate scale based on distance change
    const scale = currentDistance / startDistance;
    // Apply scale to current zoom
    const newZoom = startZoom * scale;
    // Minimum zoom is 1 (fit to container width), maximum is 4
    return Math.max(1, Math.min(4, newZoom));
  };


  // Native touch event listeners for maximum performance - NO React event system overhead
  useEffect(() => {
    if (!readOnly) return;
    
    const container = pagesContainerRef.current;
    if (!container) return;

    // Ultra-fast distance calculation (avoid Math.hypot)
    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Native touch start handler - maximum performance
    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers = pinch zoom - prevent default to handle zoom
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = getDistance(touch1, touch2);
        
        const parentContainer = container.parentElement;
        
        // Get current zoom from transform
        let currentZoom = currentVisualZoomRef.current;
        const transformMatch = container.style.transform.match(/scale\(([\d.]+)\)/);
        if (transformMatch) {
          currentZoom = parseFloat(transformMatch[1]);
        }
        currentVisualZoomRef.current = currentZoom;
        
        // Store pinch start in ref (no state = no re-render)
        isPinchingRef.current = true;
        isPanningRef.current = false;
        pinchStartRef.current = {
          distance,
          zoom: currentZoom,
          center: { x: 0, y: 0 }, // Not used, but kept for compatibility
          scrollTop: parentContainer ? parentContainer.scrollTop : 0,
        };
      } else if (e.touches.length === 1) {
        // Single finger: check if zoomed, if so handle pan manually (like Google PDF Viewer)
        const currentZoom = currentVisualZoomRef.current;
        const transformMatch = container.style.transform.match(/scale\(([\d.]+)\)/);
        const zoom = transformMatch ? parseFloat(transformMatch[1]) : currentZoom;
        
        // Always prevent default when zoomed to handle pan manually (allows simultaneous movement)
        if (zoom > 1) {
          e.preventDefault(); // Prevent default to handle pan manually
          const parentContainer = container.parentElement;
          if (parentContainer) {
            isPanningRef.current = true;
            panStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              scrollLeft: parentContainer.scrollLeft,
              scrollTop: parentContainer.scrollTop,
            };
          }
        }
        // If not zoomed, let browser handle native scroll (don't prevent default)
      }
    };

    // Native touch move handler - ULTRA-FAST, direct DOM manipulation
    const handleTouchMoveNative = (e: TouchEvent) => {
      if (isPinchingRef.current && pinchStartRef.current && e.touches.length === 2) {
        // During pinch, prevent default and handle zoom
        e.preventDefault();
        e.stopPropagation();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // Ultra-fast zoom calculation
        const baseZoom = pinchStartRef.current.zoom;
        const newZoom = calculatePinchZoom(touch1, touch2, pinchStartRef.current.distance, baseZoom);
        const clampedZoom = Math.max(1, Math.min(4, newZoom));
        
        // Update ref and apply transform IMMEDIATELY - no delays, no RAF
        currentVisualZoomRef.current = clampedZoom;
        container.style.transform = `translate3d(0, 0, 0) scale(${clampedZoom})`;
        container.style.transformOrigin = 'top left'; // Scale from top-left so content expands only right and down
      } else if (isPanningRef.current && panStartRef.current && e.touches.length === 1 && !isPinchingRef.current) {
        // During manual pan (single finger drag when zoomed), handle scroll manually
        // This allows simultaneous vertical and horizontal movement like Google PDF Viewer
        e.preventDefault();
        e.stopPropagation();
        
        const deltaX = panStartRef.current.x - e.touches[0].clientX;
        const deltaY = panStartRef.current.y - e.touches[0].clientY;
        const parentContainer = container.parentElement;
        
        if (parentContainer) {
          // Calculate new scroll positions
          let newScrollLeft = panStartRef.current.scrollLeft + deltaX;
          let newScrollTop = panStartRef.current.scrollTop + deltaY;
          
          // Get current zoom to calculate limits
          const currentZoom = currentVisualZoomRef.current;
          const transformMatch = container.style.transform.match(/scale\(([\d.]+)\)/);
          const zoom = transformMatch ? parseFloat(transformMatch[1]) : currentZoom;
          
          // Calculate scroll limits based on zoom and container dimensions
          // With transformOrigin: 'top left', content expands only right and down (no left expansion)
          const viewportWidth = parentContainer.clientWidth;
          const viewportHeight = parentContainer.clientHeight;
          
          // Get actual content dimensions (these don't change with transform: scale())
          const contentWidth = container.scrollWidth;
          const contentHeight = container.scrollHeight;
          
          // When zoomed, the visual content size is zoom * original size
          const visualContentWidth = contentWidth * zoom;
          const visualContentHeight = contentHeight * zoom;
          
          // With transformOrigin: 'top left', content expands only to the right and down
          // So we can scroll right until the right edge of scaled content aligns with viewport right
          // And scroll down until the bottom edge of scaled content aligns with viewport bottom
          const maxScrollLeft = Math.max(0, (visualContentWidth - viewportWidth) / zoom);
          const maxScrollTop = Math.max(0, (visualContentHeight - viewportHeight) / zoom);
          
          // Clamp scroll to boundaries (stops at edges like Google PDF Viewer)
          // Min is 0 (can't scroll left), max is calculated based on scaled content
          newScrollLeft = Math.max(0, Math.min(maxScrollLeft, newScrollLeft));
          newScrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));
          
          // Apply scroll - smooth and simultaneous in both directions
          parentContainer.scrollLeft = newScrollLeft;
          parentContainer.scrollTop = newScrollTop;
        }
      }
      // If not pinching or panning, let browser handle native scroll
    };

    // Native touch end handler
    const handleTouchEndNative = (e: TouchEvent) => {
      if (isPinchingRef.current && pinchStartRef.current) {
        // Update pinch start zoom for next pinch
        pinchStartRef.current.zoom = currentVisualZoomRef.current;
      }
      
      if (e.touches.length === 0) {
        // All touches ended
        isPanningRef.current = false;
        panStartRef.current = null;
        isPinchingRef.current = false;
        // Keep pinchStart for next pinch
      } else if (e.touches.length === 1 && isPinchingRef.current) {
        // Switched from pinch (2 fingers) to single finger
        isPinchingRef.current = false;
        // Start manual pan if zoomed
        const currentZoom = currentVisualZoomRef.current;
        const transformMatch = container.style.transform.match(/scale\(([\d.]+)\)/);
        const zoom = transformMatch ? parseFloat(transformMatch[1]) : currentZoom;
        
        if (zoom > 1) {
          const parentContainer = container.parentElement;
          if (parentContainer) {
            isPanningRef.current = true;
            panStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              scrollLeft: parentContainer.scrollLeft,
              scrollTop: parentContainer.scrollTop,
            };
          }
        }
      }
    };

    // Add native event listeners with passive: false for full control
    container.addEventListener('touchstart', handleTouchStartNative, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    container.addEventListener('touchend', handleTouchEndNative, { passive: false });
    container.addEventListener('touchcancel', handleTouchEndNative, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartNative);
      container.removeEventListener('touchmove', handleTouchMoveNative);
      container.removeEventListener('touchend', handleTouchEndNative);
      container.removeEventListener('touchcancel', handleTouchEndNative);
    };
  }, [readOnly, calculatePinchZoom]);


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
            touchAction: readOnly ? 'none' : 'auto', // Disable native touch actions when readOnly to handle manually
            WebkitOverflowScrolling: 'touch',
            height: '100%',
            width: '100%',
            overflow: 'auto',
            overflowX: 'auto',
            overflowY: 'auto',
            margin: 0,
            padding: 0,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            contain: 'layout style paint',
          }}
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
          touchAction: 'none', // Disable native touch actions to handle manually when zoomed
          WebkitOverflowScrolling: 'touch',
          maxHeight: isMobile ? '100dvh' : '70vh',
          overflow: 'auto',
          overflowX: 'auto', // Always allow horizontal scroll
          overflowY: 'auto',
        } : {}}
      >
        <div
          ref={pagesContainerRef}
          className="w-full"
          style={readOnly ? {
            touchAction: 'none', // Disable native touch actions to handle manually when zoomed
            WebkitOverflowScrolling: 'touch',
            overflow: 'auto',
            overflowX: 'auto', // Always allow horizontal scroll
            overflowY: 'auto',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            contain: 'layout style paint',
          } : {}}
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

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
  onPositionUpdate,
  selectedPage,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const pagesRef = useRef<PageInfo[]>([]);
  const renderTasksRef = useRef<any[]>([]);
  const signatureBoxRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Zoom and pan for readOnly mode - start at 1 (fit to width)
  const [zoom] = useState(1);
  // Use refs instead of state for maximum performance - no re-renders during pinch
  // Removed zoom and pan refs - using native scroll only

  // Signature box state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Current page for signature positioning (use selectedPage prop if provided, otherwise default to 1)
  const [currentPage, setCurrentPage] = useState(selectedPage || 1);

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
        
        // For signature positioning mode, show only current page
        // For readOnly mode, show all pages
        const startPage = readOnly ? 1 : currentPage;
        const endPage = readOnly ? numPages : currentPage;
        
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
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
          canvas.style.width = '100%';
          canvas.style.maxWidth = `${containerWidth * effectiveZoom}px`;
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          // No margins on canvas in signature mode - margins handled by wrapper
          canvas.style.marginTop = readOnly ? (pageNum === 1 ? '16px' : '0') : '0';
          canvas.style.marginBottom = readOnly ? '24px' : '0'; // Space between pages only in readOnly mode
          canvas.style.boxShadow = readOnly ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'; // Elevated shadow only in readOnly
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
          totalHeight += displayViewport.height + (readOnly ? 24 : 0); // +24 for margin only in readOnly
          
          // Append canvas to container
          container.appendChild(canvas);
          
          // Add click handler for signature positioning (non-readOnly mode)
          if (!readOnly && onPageClick) {
            canvas.addEventListener('click', (e) => {
              const rect = canvas.getBoundingClientRect();
              // Calculate scale: canvas internal size / displayed size
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              // Convert click position to canvas coordinates
              const canvasX = (e.clientX - rect.left) * scaleX;
              const canvasY = (e.clientY - rect.top) * scaleY;
              const pdfCoords = canvasToPdf(pageNum, canvasX, canvasY, 0, 0);
              
              // Default signature box size (200x100, 2:1 aspect ratio) in canvas coordinates
              const defaultWidth = 200;
              const defaultHeight = 100;
              
              // Center the box on click position
              if (onPositionUpdate && pagesRef.current[pageNum - 1]) {
                const pageInfo = pagesRef.current[pageNum - 1];
                // Center the box on the click position (no clamping - click is always inside PDF)
                const boxX = canvasX - defaultWidth / 2;
                const boxY = canvasY - defaultHeight / 2;
                
                // Convert to PDF coordinates (scale 1.0)
                const displayScale = pageInfo.viewport.scale || 1;
                const qualityScale = pageInfo.canvas && pageInfo.viewport.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
                const pdfScaleRatio = 1.0 / (displayScale * qualityScale);
                const pdfWidth = defaultWidth * pdfScaleRatio;
                const pdfHeight = defaultHeight * pdfScaleRatio;
                const pdfBoxX = boxX * pdfScaleRatio;
                const pdfBoxY = boxY * pdfScaleRatio;
                
                onPositionUpdate({
                  x: boxX,
                  y: boxY,
                  width: defaultWidth,
                  height: defaultHeight,
                  pdfX: pdfBoxX,
                  pdfY: pdfBoxY,
                  pdfWidth: pdfWidth,
                  pdfHeight: pdfHeight,
                });
              }
              
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
  }, [pdfUrl, numPages, readOnly, onViewportReady, currentPage]);
  // NOTE: Removed 'zoom' from dependencies to prevent re-render during pinch
  // Zoom is now handled purely with CSS transform for smooth experience

  // Removed calculatePinchZoom - no zoom functionality

  // Removed all touch event handlers - using native scroll only

  // Handle mouse move for signature box preview (follows cursor)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) {
      setMousePosition(null);
      return;
    }
    
    // Hide preview while dragging or resizing
    if (isDragging || isResizing) {
      setMousePosition(null);
      return;
    }
    
    if (!pagesContainerRef.current || !pagesRef.current[currentPage - 1]?.canvas) return;
    const canvas = pagesRef.current[currentPage - 1].canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = pagesContainerRef.current.getBoundingClientRect();
    
    // Check if mouse is over the canvas
    if (e.clientX >= canvasRect.left && e.clientX <= canvasRect.right &&
        e.clientY >= canvasRect.top && e.clientY <= canvasRect.bottom) {
      
      // If there's a selected position, check if mouse is inside the placed box
      if (selectedPosition) {
        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;
        const canvasOffsetX = canvasRect.left - containerRect.left;
        const canvasOffsetY = canvasRect.top - containerRect.top;
        
        const boxLeft = canvasOffsetX + (selectedPosition.x * scaleX);
        const boxTop = canvasOffsetY + (selectedPosition.y * scaleY);
        const boxRight = boxLeft + (selectedPosition.width * scaleX);
        const boxBottom = boxTop + (selectedPosition.height * scaleY);
        
        const mouseXInContainer = e.clientX - containerRect.left;
        const mouseYInContainer = e.clientY - containerRect.top;
        
        // If mouse is inside the placed box, hide preview (show normal cursor for drag/resize)
        if (mouseXInContainer >= boxLeft && mouseXInContainer <= boxRight &&
            mouseYInContainer >= boxTop && mouseYInContainer <= boxBottom) {
          setMousePosition(null);
          return;
        }
      }
      
      // Calculate position relative to container for the cursor rectangle
      const canvasOffsetX = canvasRect.left - containerRect.left;
      const canvasOffsetY = canvasRect.top - containerRect.top;
      const mouseXInCanvas = e.clientX - canvasRect.left;
      const mouseYInCanvas = e.clientY - canvasRect.top;
      
      setMousePosition({
        x: canvasOffsetX + mouseXInCanvas,
        y: canvasOffsetY + mouseYInCanvas,
      });
    } else {
      setMousePosition(null);
    }
  };
  
  const handleMouseLeave = () => {
    setMousePosition(null);
  };

  // Handle drag for signature box
  useEffect(() => {
    if (!isDragging || !selectedPosition || !dragStart || !pagesRef.current[currentPage - 1]?.canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const canvas = pagesRef.current[currentPage - 1].canvas;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      
      // Clamp mouse position to canvas visible boundaries
      // Get the actual rendered canvas dimensions from its computed style
      const computedStyle = window.getComputedStyle(canvas);
      const canvasDisplayWidth = parseFloat(computedStyle.width);
      const canvasDisplayHeight = parseFloat(computedStyle.height);
      const clampedClientX = Math.max(canvasRect.left, Math.min(e.clientX, canvasRect.left + canvasDisplayWidth));
      const clampedClientY = Math.max(canvasRect.top, Math.min(e.clientY, canvasRect.top + canvasDisplayHeight));
      
      // Calculate new position relative to canvas (in canvas coordinates)
      const newX = ((clampedClientX - canvasRect.left) / scaleX) - dragStart.x;
      const newY = ((clampedClientY - canvasRect.top) / scaleY) - dragStart.y;
      
      // No clamping on rectangle position - it can go partially outside
      
      // Convert to PDF coordinates and update
      if (onPositionUpdate) {
        const pageInfo = pagesRef.current[currentPage - 1];
        const qualityScale = pageInfo.canvas && pageInfo.viewport.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
        const pdfScaleRatio = 1.0 / ((pageInfo.viewport.scale || 1) * qualityScale);
        const pdfX = newX * pdfScaleRatio;
        // PDF coordinates - use newY directly (like AdminPage does)
        const pdfY = (newY * pdfScaleRatio);
        
        onPositionUpdate({
          x: newX,
          y: newY,
          width: selectedPosition.width,
          height: selectedPosition.height,
          pdfX: pdfX,
          pdfY: pdfY,
          pdfWidth: selectedPosition.width * pdfScaleRatio,
          pdfHeight: selectedPosition.height * pdfScaleRatio,
        });
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragStart(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp, { passive: false });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedPosition, dragStart, onPositionUpdate, currentPage]);

  // Handle resize for signature box
  useEffect(() => {
    if (!isResizing || !selectedPosition || !resizeStart || !pagesRef.current[currentPage - 1]) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!pagesContainerRef.current || !pagesRef.current[currentPage - 1]?.canvas) return;
      const canvas = pagesRef.current[currentPage - 1].canvas;
      const canvasRect = canvas.getBoundingClientRect();
      
      // Clamp mouse position to canvas boundaries
      const computedStyle = window.getComputedStyle(canvas);
      const canvasDisplayWidth = parseFloat(computedStyle.width);
      const clampedClientX = Math.max(canvasRect.left, Math.min(e.clientX, canvasRect.left + canvasDisplayWidth));
      
      // Calculate delta from initial mouse position (using clamped position)
      const deltaX = clampedClientX - resizeStart.x;
      
      // Maintain 2:1 aspect ratio
      const aspectRatio = 2;
      let newWidth = Math.max(100, resizeStart.width + deltaX);
      let newHeight = newWidth / aspectRatio;
      
      // Ensure minimum size
      newWidth = Math.max(100, newWidth);
      newHeight = Math.max(50, newHeight);
      
      // Convert to PDF coordinates and update
      if (onPositionUpdate) {
        const pageInfo = pagesRef.current[currentPage - 1];
        const qualityScale = pageInfo.canvas && pageInfo.viewport.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
        const pdfScaleRatio = 1.0 / ((pageInfo.viewport.scale || 1) * qualityScale);
        const pdfX = selectedPosition.x * pdfScaleRatio;
        // PDF coordinates - use selectedPosition.y directly (like AdminPage does)
        const pdfY = (selectedPosition.y * pdfScaleRatio);
        
        onPositionUpdate({
          x: selectedPosition.x,
          y: selectedPosition.y,
          width: newWidth,
          height: newHeight,
          pdfX: pdfX,
          pdfY: pdfY,
          pdfWidth: newWidth * pdfScaleRatio,
          pdfHeight: newHeight * pdfScaleRatio,
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeStart(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, selectedPosition, resizeStart, onPositionUpdate, currentPage]);

  // Convert canvas coordinates to PDF coordinates (for signature positioning)
  const canvasToPdf = (pageNum: number, canvasX: number, canvasY: number, canvasWidth: number, canvasHeight: number) => {
    const pageInfo = pagesRef.current[pageNum - 1];
    if (!pageInfo || !pageInfo.viewport) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    // Important: we render the canvas at higher resolution (qualityScale),
    // so canvas coordinates must be converted using the *render* scale, not the display scale.
    const qualityScale = pageInfo.canvas && pageInfo.viewport.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
    const renderScale = (pageInfo.viewport.scale || 1) * qualityScale;
    const scaleFactor = 1 / renderScale;
    
    return {
      x: canvasX * scaleFactor,
      // canvasY is top-left; PDF uses bottom-left
      y: ((pageInfo.viewport.height * qualityScale) - canvasY - canvasHeight) * scaleFactor,
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

  // Fullscreen mobile mode (Google PDF Reader style) - only for readOnly
  if (fullscreen && isMobile && readOnly) {
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
            touchAction: 'pan-x pan-y pinch-zoom',
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
            transform: 'none',
            WebkitTransform: 'none',
            contain: 'layout style paint',
          }}
        >
          {/* Pages are rendered here by useEffect */}
        </div>
      </div>
    );
  }

  // Desktop/normal mode - signature positioning mode (not readOnly)
  if (!readOnly) {
    return (
      <div className="w-full relative">
        {/* Page navigation controls */}
        {numPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                  // Reset selected position when changing page
                  if (onPositionUpdate) {
                    const pageInfo = pagesRef.current[currentPage - 2];
                    const qualityScale = pageInfo?.canvas && pageInfo?.viewport?.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
                    const pdfScaleRatio = 1.0 / ((pageInfo?.viewport?.scale || 1) * qualityScale);
                    onPositionUpdate({
                      x: 0,
                      y: 0,
                      width: 200,
                      height: 100,
                      pdfX: 0,
                      pdfY: 0,
                      pdfWidth: 200 * pdfScaleRatio,
                      pdfHeight: 100 * pdfScaleRatio,
                    });
                  }
                }
              }}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-slate-700 font-medium">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => {
                if (currentPage < numPages) {
                  setCurrentPage(currentPage + 1);
                  // Reset selected position when changing page
                  if (onPositionUpdate && pagesRef.current[currentPage]) {
                    const pageInfo = pagesRef.current[currentPage];
                    const qualityScale = pageInfo.canvas && pageInfo.viewport.width ? (pageInfo.canvas.width / pageInfo.viewport.width) : 1;
                    const pdfScaleRatio = 1.0 / ((pageInfo.viewport.scale || 1) * qualityScale);
                    onPositionUpdate({
                      x: 0,
                      y: 0,
                      width: 200,
                      height: 100,
                      pdfX: 0,
                      pdfY: 0,
                      pdfWidth: 200 * pdfScaleRatio,
                      pdfHeight: 100 * pdfScaleRatio,
                    });
                  }
                }
              }}
              disabled={currentPage === numPages}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
        
        {/* Pages container - one page at a time for signature positioning */}
        <div
          ref={containerRef}
          className="flex flex-col items-center pt-4 p-1 sm:p-2"
        >
          <div
            ref={pagesContainerRef}
            className="w-full relative"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ 
              position: 'relative',
              cursor: mousePosition ? 'none' : 'default', // Hide default cursor only when showing preview
              userSelect: 'none', // Prevent text selection while interacting
              WebkitUserSelect: 'none',
              overflow: 'hidden', // Hide elements that go outside the PDF area
            }}
          >
            {/* Pages are rendered here by useEffect */}
            
            {/* Signature box overlay */}
            {pagesContainerRef.current && (
              <>
                {/* Cursor rectangle - follows mouse, centered on cursor */}
                {mousePosition && pagesRef.current[currentPage - 1]?.canvas && (() => {
                  // Match the placed box dimensions exactly
                  const canvas = pagesRef.current[currentPage - 1].canvas;
                  const canvasRect = canvas.getBoundingClientRect();
                  const scaleX = canvasRect.width / canvas.width;
                  const scaleY = canvasRect.height / canvas.height;
                  
                  // Same dimensions as click handler (200x100 in canvas coords)
                  const defaultWidth = 200;
                  const defaultHeight = 100;
                  
                  // Convert to display pixels (same as box rendering)
                  const previewWidth = defaultWidth * scaleX;
                  const previewHeight = defaultHeight * scaleY;
                  
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${mousePosition.x - previewWidth / 2}px`,
                        top: `${mousePosition.y - previewHeight / 2}px`,
                        width: `${previewWidth}px`,
                        height: `${previewHeight}px`,
                        border: '2px dashed #ef4444',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        borderRadius: '2px',
                      }}
                    >
                      {/* Guide line at 2/3 height */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${(previewHeight * 2) / 3}px`,
                        height: '1px',
                        borderTop: '1px dashed #ef4444',
                        opacity: 0.6,
                      }} />
                      {/* Crosshair at center */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '16px',
                        height: '16px',
                      }}>
                        {/* Horizontal line */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          right: 0,
                          height: '2px',
                          marginTop: '-1px',
                          backgroundColor: '#ef4444',
                        }} />
                        {/* Vertical line */}
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          marginLeft: '-1px',
                          backgroundColor: '#ef4444',
                        }} />
                      </div>
                    </div>
                  );
                })()}
                
                {/* Fixed box after click */}
                {selectedPosition && pagesRef.current[currentPage - 1]?.canvas && (() => {
                  const canvas = pagesRef.current[currentPage - 1].canvas;
                  const canvasRect = canvas.getBoundingClientRect();
                  const containerRect = pagesContainerRef.current?.getBoundingClientRect();
                  const canvasOffsetX = containerRect ? canvasRect.left - containerRect.left : 0;
                  const canvasOffsetY = containerRect ? canvasRect.top - containerRect.top : 0;
                  
                  // Convert canvas coordinates to container coordinates
                  // selectedPosition.x and y are in canvas coordinates
                  // We need to convert them to container coordinates
                  const scaleX = canvasRect.width / canvas.width;
                  const scaleY = canvasRect.height / canvas.height;
                  const boxXInContainer = canvasOffsetX + (selectedPosition.x * scaleX);
                  const boxYInContainer = canvasOffsetY + (selectedPosition.y * scaleY);
                  
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/552d0c1e-1614-4c1f-b710-a32c57fa14b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PDFViewer.tsx:boxRender',message:'Box render coordinates',data:{selectedPositionX:selectedPosition.x,selectedPositionY:selectedPosition.y,selectedPositionWidth:selectedPosition.width,selectedPositionHeight:selectedPosition.height,canvasWidth:canvas.width,canvasHeight:canvas.height,canvasRectWidth:canvasRect.width,canvasRectHeight:canvasRect.height,scaleX,scaleY,boxXInContainer,boxYInContainer,canvasOffsetX,canvasOffsetY},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
                  // #endregion
                  
                  return (
                    <div
                      ref={signatureBoxRef}
                      onMouseDown={(e) => {
                        if (e.target === resizeHandleRef.current) return;
                        e.preventDefault();
                        setIsDragging(true);
                        const canvasRect = canvas.getBoundingClientRect();
                        const scaleX = canvasRect.width / canvas.width;
                        const scaleY = canvasRect.height / canvas.height;
                        setDragStart({
                          x: (e.clientX - canvasRect.left) / scaleX - selectedPosition.x,
                          y: (e.clientY - canvasRect.top) / scaleY - selectedPosition.y,
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${boxXInContainer}px`,
                        top: `${boxYInContainer}px`,
                        width: `${selectedPosition.width * scaleX}px`,
                        height: `${selectedPosition.height * scaleY}px`,
                        border: '2px solid #ef4444',
                        cursor: isDragging ? 'grabbing' : 'move',
                        zIndex: 10,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      }}
                    >
                      {/* Guide line at 2/3 height */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: `${(selectedPosition.height * scaleY * 2) / 3}px`,
                          width: '100%',
                          height: '1px',
                          borderTop: '1px dashed #ef4444',
                          pointerEvents: 'none',
                        }}
                      />
                      
                      {/* Resize handle */}
                      <div
                        ref={resizeHandleRef}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsResizing(true);
                          setResizeStart({
                            x: e.clientX,
                            y: e.clientY,
                            width: selectedPosition.width,
                            height: selectedPosition.height,
                          });
                        }}
                        style={{
                          position: 'absolute',
                          right: '-5px',
                          bottom: '-5px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#ef4444',
                          cursor: 'nwse-resize',
                          border: '2px solid white',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  );
                })()}
              </>
            )}
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

  // Desktop/normal mode - readOnly (viewer mode)
  return (
    <div className="w-full relative">
      {/* Pages container - Google PDF Reader style: all pages vertical */}
      <div
        ref={containerRef}
        className="flex flex-col items-center bg-slate-50 rounded-lg border border-slate-200"
        style={{
          height: isMobile ? '100dvh' : '70vh',
          touchAction: 'pan-x pan-y pinch-zoom',
          WebkitOverflowScrolling: 'touch',
          maxHeight: isMobile ? '100dvh' : '70vh',
          overflow: 'auto',
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        <div
          ref={pagesContainerRef}
          className="w-full"
          style={{
            touchAction: 'pan-x pan-y pinch-zoom',
            WebkitOverflowScrolling: 'touch',
            overflow: 'auto',
            overflowX: 'auto',
            overflowY: 'auto',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'none',
            WebkitTransform: 'none',
            contain: 'layout style paint',
          }}
        >
          {/* Pages are rendered here by useEffect */}
        </div>
      </div>
      
    </div>
  );
}

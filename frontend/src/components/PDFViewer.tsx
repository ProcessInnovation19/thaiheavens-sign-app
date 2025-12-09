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
        
        // For signature positioning mode, show only first page
        // For readOnly mode, show all pages
        const pagesToRender = readOnly ? numPages : 1;
        
        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
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
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const canvasX = (e.clientX - rect.left) * scaleX;
              const canvasY = (e.clientY - rect.top) * scaleY;
              const pdfCoords = canvasToPdf(pageNum, canvasX, canvasY, 0, 0);
              
              // Default signature box size (200x100, 2:1 aspect ratio)
              const defaultWidth = 200;
              const defaultHeight = 100;
              
              // Center the box on click position (relative to container, not canvas)
              const containerRect = pagesContainerRef.current?.getBoundingClientRect();
              if (containerRect && onPositionUpdate) {
                const boxX = (e.clientX - containerRect.left) - defaultWidth / 2;
                const boxY = (e.clientY - containerRect.top) - defaultHeight / 2;
                
                // Convert to PDF coordinates
                const pdfBoxX = pdfCoords.x - (defaultWidth / scaleX) / 2;
                const pdfBoxY = pdfCoords.y - (defaultHeight / scaleY) / 2;
                
                onPositionUpdate({
                  x: boxX,
                  y: boxY,
                  width: defaultWidth,
                  height: defaultHeight,
                  pdfX: pdfBoxX,
                  pdfY: pdfBoxY,
                  pdfWidth: defaultWidth / scaleX,
                  pdfHeight: defaultHeight / scaleY,
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
  }, [pdfUrl, numPages, readOnly, onViewportReady]);
  // NOTE: Removed 'zoom' from dependencies to prevent re-render during pinch
  // Zoom is now handled purely with CSS transform for smooth experience

  // Removed calculatePinchZoom - no zoom functionality

  // Removed all touch event handlers - using native scroll only

  // Handle mouse move for signature box preview (follows cursor)
  useEffect(() => {
    if (readOnly || selectedPosition) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!pagesContainerRef.current) return;
      const rect = pagesContainerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    
    const container = pagesContainerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [readOnly, selectedPosition]);

  // Handle drag for signature box
  useEffect(() => {
    if (!isDragging || !selectedPosition || !dragStart) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!pagesContainerRef.current) return;
      const rect = pagesContainerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - rect.left - dragStart.x;
      const deltaY = e.clientY - rect.top - dragStart.y;
      
      const newX = selectedPosition.x + deltaX;
      const newY = selectedPosition.y + deltaY;
      
      // Convert to PDF coordinates and update
      if (onPositionUpdate && pagesRef.current[0]) {
        const pdfCoords = canvasToPdf(1, newX, newY, selectedPosition.width, selectedPosition.height);
        
        onPositionUpdate({
          x: newX,
          y: newY,
          width: selectedPosition.width,
          height: selectedPosition.height,
          pdfX: pdfCoords.x,
          pdfY: pdfCoords.y,
          pdfWidth: pdfCoords.width,
          pdfHeight: pdfCoords.height,
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedPosition, dragStart, onPositionUpdate]);

  // Handle resize for signature box
  useEffect(() => {
    if (!isResizing || !selectedPosition || !resizeStart) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!pagesContainerRef.current) return;
      const rect = pagesContainerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - rect.left - resizeStart.x;
      
      // Maintain 2:1 aspect ratio
      const aspectRatio = 2;
      const newWidth = Math.max(100, resizeStart.width + deltaX);
      const newHeight = newWidth / aspectRatio;
      
      // Convert to PDF coordinates and update
      if (onPositionUpdate && pagesRef.current[0]) {
        const pdfCoords = canvasToPdf(1, selectedPosition.x, selectedPosition.y, newWidth, newHeight);
        
        onPositionUpdate({
          x: selectedPosition.x,
          y: selectedPosition.y,
          width: newWidth,
          height: newHeight,
          pdfX: pdfCoords.x,
          pdfY: pdfCoords.y,
          pdfWidth: pdfCoords.width,
          pdfHeight: pdfCoords.height,
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
  }, [isResizing, selectedPosition, resizeStart, onPositionUpdate]);

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
        {/* Pages container - one page at a time for signature positioning */}
        <div
          ref={containerRef}
          className="flex flex-col items-center p-1 sm:p-2"
        >
          <div
            ref={pagesContainerRef}
            className="w-full relative"
            style={{ position: 'relative' }}
          >
            {/* Pages are rendered here by useEffect */}
            
            {/* Signature box overlay */}
            {pagesContainerRef.current && (
              <>
                {/* Preview box that follows cursor */}
                {!selectedPosition && mousePosition && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${mousePosition.x - 100}px`,
                      top: `${mousePosition.y - 50}px`,
                      width: '200px',
                      height: '100px',
                      border: '2px dashed #ef4444',
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}
                  />
                )}
                
                {/* Fixed box after click */}
                {selectedPosition && (
                  <div
                    ref={signatureBoxRef}
                    onMouseDown={(e) => {
                      if (e.target === resizeHandleRef.current) return;
                      setIsDragging(true);
                      if (pagesContainerRef.current) {
                        const rect = pagesContainerRef.current.getBoundingClientRect();
                        setDragStart({
                          x: e.clientX - rect.left - selectedPosition.x,
                          y: e.clientY - rect.top - selectedPosition.y,
                        });
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${selectedPosition.x}px`,
                      top: `${selectedPosition.y}px`,
                      width: `${selectedPosition.width}px`,
                      height: `${selectedPosition.height}px`,
                      border: '2px solid #ef4444',
                      cursor: isDragging ? 'grabbing' : 'move',
                      zIndex: 10,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    }}
                  >
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
                )}
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

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
  fullscreen?: boolean; // New prop for fullscreen mode
}

export default function PDFViewer({
  pdfUrl,
  onPageClick,
  selectedPage,
  selectedPosition,
  readOnly = false,
  onViewportReady,
  onPositionUpdate,
  fullscreen = false,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
  // Zoom and pan for readOnly mode
  const [zoom, setZoom] = useState(1.5);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; zoom: number; center: { x: number; y: number } } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPage) {
      setCurrentPage(selectedPage);
    }
  }, [selectedPage]);

  // Listen for zoom events from parent (mobile fullscreen mode)
  useEffect(() => {
    const handleZoomIn = () => {
      setZoom((z) => Math.min(4, z + 0.25));
    };
    const handleZoomOut = () => {
      setZoom((z) => Math.max(0.5, z - 0.25));
    };
    
    window.addEventListener('pdfZoomIn', handleZoomIn);
    window.addEventListener('pdfZoomOut', handleZoomOut);
    
    return () => {
      window.removeEventListener('pdfZoomIn', handleZoomIn);
      window.removeEventListener('pdfZoomOut', handleZoomOut);
    };
  }, []);

  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const viewportRef = useRef<any>(null);
  const pageRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfRef.current = pdf;
        
        if (!isMounted) return;
        
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        pageRef.current = page;
        const viewport = page.getViewport({ scale: zoom });
        viewportRef.current = viewport;
        
        // Notify parent component about viewport size
        if (onViewportReady) {
          onViewportReady({
            width: viewport.width,
            height: viewport.height,
            scale: viewport.scale,
          });
        }

        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Cancel any previous render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        
        if (isMounted) {
          setLoading(false);
        }
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
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfUrl, currentPage, zoom]);

  // Redraw PDF when page changes or zoom changes
  useEffect(() => {
    if (!canvasRef.current || loading || !pdfRef.current) return;
    if (!readOnly && selectedPosition) return; // Don't redraw if positioning signature

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const redrawPDF = async () => {
      try {
        const page = await pdfRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        viewportRef.current = viewport;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw PDF
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        
        const task = page.render(renderContext);
        await task.promise;
      } catch (err) {
        console.error('Error redrawing PDF:', err);
      }
    };

    redrawPDF();
  }, [currentPage, readOnly, loading, zoom, selectedPosition]);

  // Convert canvas coordinates to PDF coordinates
  const canvasToPdf = (canvasX: number, canvasY: number, canvasWidth: number, canvasHeight: number) => {
    if (!viewportRef.current) return { x: canvasX / 1.5, y: canvasY / 1.5, width: canvasWidth / 1.5, height: canvasHeight / 1.5 };
    const scale = viewportRef.current.scale; // 1.5
    return {
      x: canvasX / scale,
      y: canvasY / scale,
      width: canvasWidth / scale,
      height: canvasHeight / scale,
    };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !selectedPosition || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    // Check if click is inside the box (not on resize handle)
    if (
      canvasX >= selectedPosition.x &&
      canvasX <= selectedPosition.x + selectedPosition.width &&
      canvasY >= selectedPosition.y &&
      canvasY <= selectedPosition.y + selectedPosition.height
    ) {
      setIsDragging(true);
      setDragStart({
        x: canvasX - selectedPosition.x,
        y: canvasY - selectedPosition.y,
      });
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    if (readOnly || !selectedPosition || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const startX = (clientX - rect.left) * scaleX;
    const startY = (clientY - rect.top) * scaleY;
    
    setIsResizing(true);
    setResizeCorner(corner);
    setResizeStart({
      x: startX,
      y: startY,
      width: selectedPosition.width,
      height: selectedPosition.height,
    });
  };

  // Handle mouse/touch move for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!selectedPosition || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      if (isDragging && dragStart) {
        // Calculate new position
        let newX = canvasX - dragStart.x;
        let newY = canvasY - dragStart.y;
        
        // Keep within canvas bounds
        newX = Math.max(0, Math.min(newX, canvas.width - selectedPosition.width));
        newY = Math.max(0, Math.min(newY, canvas.height - selectedPosition.height));

        const pdfCoords = canvasToPdf(newX, newY, selectedPosition.width, selectedPosition.height);
        
        if (onPositionUpdate) {
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
      } else if (isResizing && resizeStart && selectedPosition && resizeCorner) {
        // Calculate distance from resize start point
        const deltaX = canvasX - resizeStart.x;
        const deltaY = canvasY - resizeStart.y;
        
        // Use the larger delta to maintain aspect ratio 2:1
        const aspectRatio = 2; // width:height = 2:1
        let deltaWidth: number;
        
        // Determine delta based on corner direction
        // For each corner, calculate the distance from the opposite corner
        if (resizeCorner === 'bottom-right') {
          // Moving right/down increases size, left/up decreases
          deltaWidth = Math.abs(deltaX) > Math.abs(deltaY * aspectRatio) ? deltaX : deltaY * aspectRatio;
        } else if (resizeCorner === 'top-left') {
          // Moving left/up increases size, right/down decreases (inverted)
          deltaWidth = Math.abs(deltaX) > Math.abs(deltaY * aspectRatio) ? -deltaX : -deltaY * aspectRatio;
        } else if (resizeCorner === 'top-right') {
          // Moving right/up increases size, left/down decreases
          deltaWidth = Math.abs(deltaX) > Math.abs(deltaY * aspectRatio) ? deltaX : -deltaY * aspectRatio;
        } else { // bottom-left
          // Moving left/down increases size, right/up decreases
          deltaWidth = Math.abs(deltaX) > Math.abs(deltaY * aspectRatio) ? -deltaX : deltaY * aspectRatio;
        }
        
        // Calculate new dimensions maintaining aspect ratio
        let newWidth = Math.max(50, Math.min(resizeStart.width + deltaWidth, canvas.width * 0.8));
        let newHeight = newWidth / aspectRatio;
        
        // Calculate new position keeping opposite corner fixed
        let newX: number, newY: number;
        
        if (resizeCorner === 'top-left') {
          // Keep bottom-right corner fixed
          newX = selectedPosition.x + selectedPosition.width - newWidth;
          newY = selectedPosition.y + selectedPosition.height - newHeight;
        } else if (resizeCorner === 'top-right') {
          // Keep bottom-left corner fixed
          newX = selectedPosition.x;
          newY = selectedPosition.y + selectedPosition.height - newHeight;
        } else if (resizeCorner === 'bottom-left') {
          // Keep top-right corner fixed
          newX = selectedPosition.x + selectedPosition.width - newWidth;
          newY = selectedPosition.y;
        } else { // bottom-right
          // Keep top-left corner fixed
          newX = selectedPosition.x;
          newY = selectedPosition.y;
        }
        
        // Keep within canvas bounds
        if (newX < 0) {
          newWidth = selectedPosition.x + selectedPosition.width;
          newX = 0;
        }
        if (newY < 0) {
          newHeight = selectedPosition.y + selectedPosition.height;
          newY = 0;
        }
        if (newX + newWidth > canvas.width) {
          newWidth = canvas.width - newX;
        }
        if (newY + newHeight > canvas.height) {
          newHeight = canvas.height - newY;
        }
        
        // Recalculate to maintain aspect ratio after bounds check
        const finalWidth = Math.min(newWidth, newHeight * aspectRatio);
        const finalHeight = finalWidth / aspectRatio;
        
        // Adjust position if needed to maintain opposite corner
        if (resizeCorner === 'top-left') {
          newX = selectedPosition.x + selectedPosition.width - finalWidth;
          newY = selectedPosition.y + selectedPosition.height - finalHeight;
        } else if (resizeCorner === 'top-right') {
          newX = selectedPosition.x;
          newY = selectedPosition.y + selectedPosition.height - finalHeight;
        } else if (resizeCorner === 'bottom-left') {
          newX = selectedPosition.x + selectedPosition.width - finalWidth;
          newY = selectedPosition.y;
        } else {
          newX = selectedPosition.x;
          newY = selectedPosition.y;
        }
        
        const finalX = Math.max(0, Math.min(newX, canvas.width - finalWidth));
        const finalY = Math.max(0, Math.min(newY, canvas.height - finalHeight));

        const pdfCoords = canvasToPdf(finalX, finalY, finalWidth, finalHeight);
        
        if (onPositionUpdate) {
          onPositionUpdate({
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            pdfX: pdfCoords.x,
            pdfY: pdfCoords.y,
            pdfWidth: pdfCoords.width,
            pdfHeight: pdfCoords.height,
          });
        }
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setDragStart(null);
      setResizeStart(null);
      setResizeCorner(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeCorner, selectedPosition, onPositionUpdate, readOnly]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || !onPageClick) return;

    const canvas = canvasRef.current;
    if (!canvas || !pageRef.current || !viewportRef.current) return;

    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX - rect.left;
      clientY = e.touches[0].clientY - rect.top;
    } else if ('clientX' in e) {
      // Mouse event
      clientX = e.clientX - rect.left;
      clientY = e.clientY - rect.top;
    } else {
      return;
    }

    // Account for CSS scaling: canvas might be displayed at different size than its internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convert client coordinates to canvas internal coordinates
    const canvasX = clientX * scaleX;
    const canvasY = clientY * scaleY;

    // Get the actual PDF page dimensions (scale 1.0 = actual PDF size in points)
    const displayViewport = viewportRef.current; // scale 1.5

    // Convert canvas internal coordinates to PDF coordinates
    // Canvas is rendered at scale 1.5, so we need to divide by 1.5 to get PDF coordinates
    const pdfScaleRatio = 1.0 / displayViewport.scale; // This is 1/1.5 = 0.666...
    const pdfX = canvasX * pdfScaleRatio;
    const pdfY = canvasY * pdfScaleRatio;

    // Pass canvas coordinates (for display box) and PDF coordinates (for backend)
    onPageClick(currentPage, canvasX, canvasY, pdfX, pdfY);
  };



  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-800 font-semibold mb-1">Error loading PDF</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Detect if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Fullscreen mode: no controls, PDF fills screen
  if (fullscreen && isMobile) {
    return (
      <div className="w-full h-full relative flex items-center justify-center" style={{ height: '100%', width: '100%' }}>
        <div 
          ref={containerRef}
          className="flex justify-center bg-slate-100 rounded-lg border border-slate-200 relative flex-1 h-full overflow-hidden" 
          style={{ 
            cursor: isPanning ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
          onMouseDown={(e) => {
            if (readOnly && e.button === 0) {
              setIsPanning(true);
              setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }
          }}
          onMouseMove={(e) => {
            if (readOnly && isPanning && panStart) {
              setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
              });
            }
          }}
          onMouseUp={() => {
            if (readOnly) {
              setIsPanning(false);
              setPanStart(null);
            }
          }}
          onMouseLeave={() => {
            if (readOnly) {
              setIsPanning(false);
              setPanStart(null);
            }
          }}
          onTouchStart={(e) => {
            if (readOnly) {
              if (e.touches.length === 1) {
                // Single touch: pan
                const touch = e.touches[0];
                setIsPanning(true);
                setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
                setIsPinching(false);
              } else if (e.touches.length === 2) {
                // Two touches: pinch-to-zoom
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                  touch2.clientX - touch1.clientX,
                  touch2.clientY - touch1.clientY
                );
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                
                setIsPinching(true);
                setIsPanning(false);
                setPinchStart({
                  distance,
                  zoom,
                  center: { x: centerX, y: centerY }
                });
              }
            }
          }}
          onTouchMove={(e) => {
            if (readOnly) {
              if (isPinching && pinchStart && e.touches.length === 2) {
                // Pinch-to-zoom
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                  touch2.clientX - touch1.clientX,
                  touch2.clientY - touch1.clientY
                );
                
                const scale = distance / pinchStart.distance;
                const newZoom = Math.max(0.5, Math.min(4, pinchStart.zoom * scale));
                setZoom(newZoom);
                
                // Adjust pan to zoom towards the center of the pinch
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                const deltaX = centerX - pinchStart.center.x;
                const deltaY = centerY - pinchStart.center.y;
                
                setPanOffset({
                  x: panOffset.x + deltaX * (1 - scale),
                  y: panOffset.y + deltaY * (1 - scale),
                });
              } else if (isPanning && panStart && e.touches.length === 1) {
                // Single touch pan
                e.preventDefault();
                const touch = e.touches[0];
                setPanOffset({
                  x: touch.clientX - panStart.x,
                  y: touch.clientY - panStart.y,
                });
              }
            }
          }}
          onTouchEnd={(e) => {
            if (readOnly) {
              if (e.touches.length === 0) {
                // All touches ended
                setIsPanning(false);
                setPanStart(null);
                setIsPinching(false);
                setPinchStart(null);
              } else if (e.touches.length === 1 && isPinching) {
                // Switched from pinch to pan
                setIsPinching(false);
                setPinchStart(null);
                const touch = e.touches[0];
                setIsPanning(true);
                setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
              }
            }
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
            </div>
          )}
          <div 
            className="relative"
            style={readOnly ? {
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            } : {}}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-lg"
              style={{
                maxHeight: '100vh',
                maxWidth: '100vw',
              }}
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full relative">
      {/* Desktop: Controls above PDF */}
      {!isMobile && (
        <>
          <div className="flex items-center justify-center gap-2 mb-3 bg-slate-50 rounded-lg p-2 border border-slate-200 relative min-h-[50px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
              </div>
            )}
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
          
          {/* Zoom Controls - Only show in readOnly mode */}
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
                  setZoom(1.5);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Reset
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Mobile: Floating controls overlay on PDF */}
      {isMobile && readOnly && (
        <div className="absolute top-2 left-2 right-2 z-50 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
          {/* Page Navigation */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-slate-200 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="w-10 h-10 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md"
              aria-label="Previous page"
            >
              ←
            </button>
            <div className="px-4 py-2 bg-slate-100 rounded-lg font-bold text-slate-900 text-sm min-w-[80px] text-center">
              {currentPage}/{numPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages || loading}
              className="w-10 h-10 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md"
              aria-label="Next page"
            >
              →
            </button>
          </div>
          
          {/* Zoom Controls */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-slate-200 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="w-10 h-10 bg-slate-500 text-white rounded-lg font-bold hover:bg-slate-600 transition-all duration-200 flex items-center justify-center shadow-md"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="px-3 py-2 bg-slate-100 rounded-lg font-semibold text-slate-900 text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              className="w-10 h-10 bg-slate-500 text-white rounded-lg font-bold hover:bg-slate-600 transition-all duration-200 flex items-center justify-center shadow-md"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => {
                setZoom(1.5);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-all duration-200 shadow-md"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`flex justify-center bg-slate-100 rounded-lg border border-slate-200 relative ${readOnly ? 'overflow-auto' : 'p-1 sm:p-2'} ${readOnly ? (isMobile ? 'h-screen' : 'h-[70vh]') : ''}`}
        style={readOnly ? { 
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none'
        } : {}}
        onMouseDown={(e) => {
          if (readOnly && e.button === 0) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
          }
        }}
        onMouseMove={(e) => {
          if (readOnly && isPanning && panStart) {
            setPanOffset({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y,
            });
          }
        }}
        onMouseUp={() => {
          if (readOnly) {
            setIsPanning(false);
            setPanStart(null);
          }
        }}
        onMouseLeave={() => {
          if (readOnly) {
            setIsPanning(false);
            setPanStart(null);
          }
        }}
        onTouchStart={(e) => {
          if (readOnly) {
            if (e.touches.length === 1) {
              // Single touch: pan
              const touch = e.touches[0];
              setIsPanning(true);
              setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
              setIsPinching(false);
            } else if (e.touches.length === 2) {
              // Two touches: pinch-to-zoom
              e.preventDefault();
              const touch1 = e.touches[0];
              const touch2 = e.touches[1];
              const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
              );
              const centerX = (touch1.clientX + touch2.clientX) / 2;
              const centerY = (touch1.clientY + touch2.clientY) / 2;
              
              setIsPinching(true);
              setIsPanning(false);
              setPinchStart({
                distance,
                zoom,
                center: { x: centerX, y: centerY }
              });
            }
          }
        }}
        onTouchMove={(e) => {
          if (readOnly) {
            if (isPinching && pinchStart && e.touches.length === 2) {
              // Pinch-to-zoom
              e.preventDefault();
              const touch1 = e.touches[0];
              const touch2 = e.touches[1];
              const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
              );
              
              const scale = distance / pinchStart.distance;
              const newZoom = Math.max(0.5, Math.min(4, pinchStart.zoom * scale));
              setZoom(newZoom);
              
              // Adjust pan to zoom towards the center of the pinch
              const centerX = (touch1.clientX + touch2.clientX) / 2;
              const centerY = (touch1.clientY + touch2.clientY) / 2;
              const deltaX = centerX - pinchStart.center.x;
              const deltaY = centerY - pinchStart.center.y;
              
              setPanOffset({
                x: panOffset.x + deltaX * (1 - scale),
                y: panOffset.y + deltaY * (1 - scale),
              });
            } else if (isPanning && panStart && e.touches.length === 1) {
              // Single touch pan
              e.preventDefault();
              const touch = e.touches[0];
              setPanOffset({
                x: touch.clientX - panStart.x,
                y: touch.clientY - panStart.y,
              });
            }
          }
        }}
        onTouchEnd={(e) => {
          if (readOnly) {
            if (e.touches.length === 0) {
              // All touches ended
              setIsPanning(false);
              setPanStart(null);
              setIsPinching(false);
              setPinchStart(null);
            } else if (e.touches.length === 1 && isPinching) {
              // Switched from pinch to pan
              setIsPinching(false);
              setPinchStart(null);
              const touch = e.touches[0];
              setIsPanning(true);
              setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
            }
          }
        }}
      >
        <div 
          className="relative"
          style={readOnly ? {
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          } : {}}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onTouchEnd={(e) => {
              if (!readOnly) {
                handleCanvasClick(e);
                // Keep cursor visible briefly on touch end, then hide
                setTimeout(() => setCursorPosition(null), 500);
              }
            }}
            className={`${readOnly ? 'max-w-none' : 'max-w-full'} h-auto rounded-lg shadow-lg transition-all ${readOnly ? '' : 'hover:shadow-xl'}`}
            style={!readOnly ? { 
              cursor: 'none' // Hide default cursor, we'll use custom one
            } : {
              cursor: isPanning ? 'grabbing' : 'grab'
            }}
            onMouseMove={(e) => {
              if (readOnly || !canvasRef.current) return;
              // Update cursor position for custom rectangle cursor
              const rect = canvasRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              // Store for cursor display (relative to canvas container)
              setCursorPosition({ x, y });
            }}
            onMouseLeave={() => {
              if (!readOnly) {
                setCursorPosition(null);
              }
            }}
            onTouchMove={(e) => {
              if (readOnly || !canvasRef.current) return;
              e.preventDefault(); // Prevent scrolling
              const touch = e.touches[0];
              if (!touch) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              setCursorPosition({ x, y });
            }}
            onTouchStart={(e) => {
              if (readOnly || !canvasRef.current) return;
              const touch = e.touches[0];
              if (!touch) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              setCursorPosition({ x, y });
            }}
          />
          {!readOnly && cursorPosition && !selectedPosition && canvasRef.current && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-red-500 bg-red-500/10 z-20"
              style={{
                left: `${cursorPosition.x - 100}px`, // 100 = half of 200px width (display size)
                top: `${cursorPosition.y - 50}px`, // 50 = half of 100px height (display size)
                width: '200px',
                height: '100px',
              }}
            >
              {/* Horizontal guide line at 2/3 from top */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-red-500"
                style={{
                  top: '66.67%', // 2/3 from top
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          )}
          {!readOnly && selectedPosition && canvasRef.current && (() => {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width / canvas.width;
            const scaleY = rect.height / canvas.height;
            return (
              <div
                className="absolute border-2 border-red-500 bg-red-500/10 z-30 cursor-move"
                style={{
                  left: `${selectedPosition.x * scaleX}px`,
                  top: `${selectedPosition.y * scaleY}px`,
                  width: `${selectedPosition.width * scaleX}px`,
                  height: `${selectedPosition.height * scaleY}px`,
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
              {/* Horizontal guide line at 2/3 from top */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-red-500"
                style={{
                  top: '66.67%', // 2/3 from top
                }}
              />
                {/* Resize handles at corners */}
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => {
                  // Set correct cursor for each corner
                  let cursorClass = 'cursor-nwse-resize'; // default
                  if (corner === 'top-left') cursorClass = 'cursor-nwse-resize'; // ↖
                  else if (corner === 'top-right') cursorClass = 'cursor-nesw-resize'; // ↗
                  else if (corner === 'bottom-left') cursorClass = 'cursor-nesw-resize'; // ↙
                  else if (corner === 'bottom-right') cursorClass = 'cursor-nwse-resize'; // ↘
                  
                  return (
                    <div
                      key={corner}
                      className={`absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full ${cursorClass} z-40`}
                      style={{
                        left: corner.includes('left') ? '-6px' : 'auto',
                        right: corner.includes('right') ? '-6px' : 'auto',
                        top: corner.includes('top') ? '-6px' : 'auto',
                        bottom: corner.includes('bottom') ? '-6px' : 'auto',
                      }}
                      onMouseDown={(e) => handleResizeStart(e, corner)}
                      onTouchStart={(e) => handleResizeStart(e, corner)}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>
        {!readOnly && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg pointer-events-none z-10 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Click to place signature
          </div>
        )}
      </div>
      
      {!readOnly && (
        <p className="text-center text-slate-600 text-sm mt-4 font-medium">
          👆 Click on the PDF to select where the signature should appear
        </p>
      )}
    </div>
  );
}

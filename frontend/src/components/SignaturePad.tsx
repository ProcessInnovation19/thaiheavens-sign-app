import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadComponentProps {
  onSignatureChange?: (dataUrl: string) => void;
  height?: number;
  fullscreen?: boolean;
}

export default function SignaturePadComponent({
  onSignatureChange,
  height = 300,
  fullscreen = false,
}: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
      penColor: 'rgb(0, 0, 0)',
    });
    
    // Draw horizontal guide line at 2/3 from top (towards bottom)
    const drawGuideLine = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const visualHeight = canvas.offsetHeight;
      const guideY = (visualHeight * 2) / 3;
      
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, guideY);
      ctx.lineTo(canvas.offsetWidth, guideY);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    
    // Draw guide line after canvas is ready
    setTimeout(drawGuideLine, 100);

    const handleResize = () => {
      if (!canvas || !signaturePadRef.current) return;

      const data = signaturePadRef.current.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      signaturePadRef.current.clear();
      signaturePadRef.current.fromData(data);
      // Redraw guide line after resize
      drawGuideLine();
      // Update empty state
      setIsEmpty(signaturePadRef.current.isEmpty());
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      signaturePadRef.current?.clear();
    };
  }, []);

  const handleChange = () => {
    if (signaturePadRef.current && onSignatureChange && canvasRef.current) {
      // Export as PNG with transparency
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      onSignatureChange(dataUrl);
      
      // Update empty state
      setIsEmpty(signaturePadRef.current.isEmpty());
      
      // Redraw guide line AFTER exporting (for display only)
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const visualHeight = canvas.offsetHeight;
        const guideY = (visualHeight * 2) / 3;
        
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, guideY);
        ctx.lineTo(canvas.offsetWidth, guideY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  useEffect(() => {
    if (signaturePadRef.current) {
      const checkEmpty = () => {
        if (signaturePadRef.current) {
          setIsEmpty(signaturePadRef.current.isEmpty());
        }
      };
      
      signaturePadRef.current.addEventListener('beginStroke', () => {
        setIsEmpty(false);
      });
      signaturePadRef.current.addEventListener('endStroke', () => {
        checkEmpty();
        handleChange();
      });
      
      return () => {
        signaturePadRef.current?.removeEventListener('beginStroke', () => {});
        signaturePadRef.current?.removeEventListener('endStroke', () => {});
      };
    }
  }, [onSignatureChange]);

  // Listen for clear event from parent (for mobile landscape mode)
  useEffect(() => {
    const handleClearEvent = () => {
      handleClear();
    };
    window.addEventListener('clearSignature', handleClearEvent);
    return () => {
      window.removeEventListener('clearSignature', handleClearEvent);
    };
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
    if (onSignatureChange) {
      onSignatureChange('');
    }
    // Redraw guide line after clearing
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const visualHeight = canvas.offsetHeight;
        const guideY = (visualHeight * 2) / 3;
        
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, guideY);
        ctx.lineTo(canvas.offsetWidth, guideY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center ${fullscreen ? 'h-full' : ''}`}>
      <div className={`w-full bg-white ${fullscreen ? 'rounded-none border-0 shadow-none h-full' : 'rounded-xl shadow-lg border-2 border-slate-300'} overflow-hidden relative`} style={fullscreen ? { height: '100%', width: '100%' } : {}}>
        <div className="relative w-full h-full" style={{ height: fullscreen ? '100%' : `${height}px`, width: '100%' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full absolute inset-0"
            style={{
              height: '100%',
              touchAction: 'none',
              display: 'block',
            }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center px-4">
                <p className="text-2xl md:text-3xl font-semibold text-slate-400 mb-2">Click here to sign</p>
                <p className="text-sm text-slate-400">Use your finger or mouse to draw your signature</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Clear button only shown in fullscreen desktop, not in mobile landscape (handled by parent) */}
      {fullscreen && typeof window !== 'undefined' && window.innerWidth >= 768 && (
        <button
          onClick={handleClear}
          className="absolute top-4 right-4 z-30 px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg font-semibold hover:bg-white transition-all duration-200 shadow-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>
      )}
    </div>
  );
}

import { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadComponentProps {
  onSignatureChange?: (dataUrl: string) => void;
  height?: number;
}

export default function SignaturePadComponent({
  onSignatureChange,
  height = 300,
}: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
      penColor: 'rgb(0, 0, 0)',
    });
    
    // Draw horizontal guide line at 2/3 from top (towards bottom)
    // The line should be at 2/3 of the visual canvas height, matching the red box position
    const drawGuideLine = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Use offsetHeight (visual height) instead of canvas.height (internal resolution)
      // The context is already scaled by devicePixelRatio, so we use visual coordinates
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
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      signaturePadRef.current?.clear();
    };
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
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

  const handleChange = () => {
    if (signaturePadRef.current && onSignatureChange && canvasRef.current) {
      // Export as PNG with transparency (SignaturePad with transparent background already handles this)
      // NOTE: Do NOT redraw guide line before export - it should only be visible on screen, not in the exported image
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      onSignatureChange(dataUrl);
      
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
      signaturePadRef.current.addEventListener('endStroke', handleChange);
      return () => {
        signaturePadRef.current?.removeEventListener('endStroke', handleChange);
      };
    }
  }, [onSignatureChange]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border-2 border-slate-300 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-2 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Signature Canvas</p>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{
            height: `${height}px`,
            touchAction: 'none',
            display: 'block',
          }}
        />
      </div>
      <button
        onClick={handleClear}
        className="mt-4 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear Signature
      </button>
    </div>
  );
}

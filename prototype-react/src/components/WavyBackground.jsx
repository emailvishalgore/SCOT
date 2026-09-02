import React, { useEffect, useRef } from 'react';

export default function WavyBackground({ children, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Wave color parameters
    const colors = [
      'rgba(139, 92, 246, 0.28)',  // Violet (brighter neon for dark contrast)
      'rgba(124, 58, 237, 0.22)',  // Purple
      'rgba(16, 185, 129, 0.16)',  // Emerald Green
      'rgba(59, 130, 246, 0.16)',  // Blue
      'rgba(167, 139, 250, 0.12)'   // Lavender
    ];

    let nt = 0;

    const drawWave = (n, speed, heightModifier) => {
      nt += 0.002;
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors[n % colors.length];

      for (let i = 0; i < w; i += 10) {
        // Calculate y coordinate using multiple overlapping sine waves for organic fluid motion
        const y = 
          Math.sin(i * 0.003 + nt * speed + n * 50) * 80 * heightModifier + 
          Math.sin(i * 0.007 + nt * (speed * 0.5)) * 30 + 
          h * 0.5;

        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
    };

    const render = () => {
      // Clear with dark slate background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid lines (21st.dev template look)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Render 5 distinct overlapping waves
      drawWave(0, 0.5, 0.8);
      drawWave(1, 0.8, 1.2);
      drawWave(2, 1.2, 0.6);
      drawWave(3, 0.4, 1.0);
      drawWave(4, 0.7, 0.9);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflow: 'hidden' }} className={className}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          display: 'block'
        }}
      />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

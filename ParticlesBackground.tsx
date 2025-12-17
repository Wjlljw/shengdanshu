import React, { useRef, useEffect, useCallback } from 'react';

// --- Types ---

interface TreeParticle {
  // 3D coordinates (relative to center)
  x: number;
  y: number;
  z: number;
  // Original 3D coordinates
  baseX: number;
  baseY: number;
  baseZ: number;

  radius: number;
  color: string;
  alpha: number;
  isStar: boolean;
}

interface Firework {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  targetY: number;
  hue: number; // Use Hue for color cycling
  speed: number;
}

interface Spark {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  alpha: number;
  hue: number;
  saturation: number;
  lightness: number;
  decay: number;
}

const ParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State refs
  const treeParticlesRef = useRef<TreeParticle[]>([]);
  const fireworksRef = useRef<Firework[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const rafIdRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);

  // Colors for the tree
  const treeColors = [
    '#0F9D58', // Google Green
    '#34A853', // Lighter Google Green
    '#0B8043', // Darker Green
    '#1E8E3E', // Forest Green
  ];
  
  const ornamentColors = [
    '#FF3333', // Bright Red (Glows better than #EA4335)
    '#FFD700', // Bright Gold (Glows better than #FBBC04)
    '#FFFFFF', // White Snow
    '#00FFFF', // Cyan Light (New addition for variety)
  ];

  // --- Initialization Logic ---

  const initTree = useCallback((width: number, height: number) => {
    const particles: TreeParticle[] = [];
    
    // Tree Configuration
    const treeHeight = Math.min(height * 0.7, 600);
    const baseRadius = Math.min(width * 0.35, 250);
    const particleCount = 1200; // Increased count for fuller tree
    const spiralLoops = 15; // More loops

    // 1. Create Tree Spiral
    for (let i = 0; i < particleCount; i++) {
      const progress = i / particleCount;
      // Invert Y so 1 is top
      const y = (progress - 0.5) * treeHeight * -1; 
      const currentRadius = baseRadius * (1 - progress);
      const angle = progress * Math.PI * 2 * spiralLoops;
      const jitter = 10;
      
      const x = Math.cos(angle) * currentRadius + (Math.random() - 0.5) * jitter;
      const z = Math.sin(angle) * currentRadius + (Math.random() - 0.5) * jitter;

      // Color Logic
      const rand = Math.random();
      let color;
      let isOrnament = false;
      
      if (rand > 0.90) {
        color = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
        isOrnament = true;
      } else {
        color = treeColors[Math.floor(Math.random() * treeColors.length)];
      }

      particles.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        radius: isOrnament ? Math.random() * 3 + 2 : Math.random() * 2 + 1, // Ornaments are bigger
        color: color,
        alpha: Math.random() * 0.6 + 0.4,
        isStar: false,
      });
    }

    // 2. Add Top Star
    particles.push({
      x: 0, 
      y: -treeHeight / 2 - 15, 
      z: 0,
      baseX: 0, 
      baseY: -treeHeight / 2 - 15, 
      baseZ: 0,
      radius: 12, // Bigger star
      color: '#FFD700', 
      alpha: 1,
      isStar: true,
    });

    treeParticlesRef.current = particles;
  }, []);

  const createFirework = (width: number, height: number) => {
    const x = width / 2 + (Math.random() - 0.5) * (width * 0.5); // Wider spread
    // Explode in the upper third
    const targetY = height * 0.15 + Math.random() * (height * 0.2); 
    
    // Random Hue for this entire firework
    const hue = Math.floor(Math.random() * 360);
    
    fireworksRef.current.push({
      x,
      y: height + 20,
      prevX: x,
      prevY: height + 20,
      targetY,
      hue,
      speed: 15 + Math.random() * 5,
    });
  };

  const explodeFirework = (f: Firework) => {
    // Increase particle count for denser, fuller explosion
    const particleCount = 800 + Math.random() * 400; 
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // High variance in speed creates the "burst" from center effect
      const velocity = Math.random() * 22; 
      
      // Slight hue variation per particle for richness
      const hueVariance = 30;
      const pHue = f.hue + (Math.random() - 0.5) * hueVariance;

      sparksRef.current.push({
        x: f.x,
        y: f.y,
        prevX: f.x,
        prevY: f.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        alpha: 1,
        hue: pHue,
        saturation: 80 + Math.random() * 20, // High saturation
        lightness: 60 + Math.random() * 40, // Brighter sparks
        decay: 0.005 + Math.random() * 0.015, 
      });
    }
  };

  // --- Animation Loop ---

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    const centerX = width / 2;
    const centerY = height / 2 + 100;

    // 1. Clear Screen
    ctx.clearRect(0, 0, width, height);

    // ===========================
    // 2. Fireworks Layer (Glowing)
    // ===========================
    // Switch to 'lighter' for additive color blending (glowing effect)
    ctx.globalCompositeOperation = 'lighter';

    if (sparksRef.current.length < 2500 && Math.random() < 0.015) {
      createFirework(width, height);
    }

    // -- Rockets --
    for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
      const f = fireworksRef.current[i];
      f.prevX = f.x;
      f.prevY = f.y;
      f.y -= f.speed;

      // Draw Rocket Trail
      ctx.beginPath();
      ctx.moveTo(f.prevX, f.prevY);
      ctx.lineTo(f.x, f.y);
      ctx.strokeStyle = `hsl(${f.hue}, 100%, 60%)`;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (f.y <= f.targetY) {
        explodeFirework(f);
        fireworksRef.current.splice(i, 1);
      }
    }

    // -- Sparks (Explosions) --
    for (let i = sparksRef.current.length - 1; i >= 0; i--) {
      const s = sparksRef.current[i];
      
      s.prevX = s.x;
      s.prevY = s.y;

      // Physics
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.92; // Stronger friction
      s.vy *= 0.92;
      s.vy += 0.08; // Gravity
      
      s.alpha -= s.decay;
      
      if (s.lightness > 40) s.lightness -= 0.5;

      if (s.alpha <= 0) {
        sparksRef.current.splice(i, 1);
      } else {
        // Draw Streaks
        ctx.beginPath();
        ctx.moveTo(s.prevX, s.prevY);
        ctx.lineTo(s.x, s.y);
        
        ctx.lineWidth = Math.max(0.1, 2.5 * s.alpha); 
        ctx.strokeStyle = `hsla(${s.hue}, ${s.saturation}%, ${s.lightness}%, ${s.alpha})`;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // ===========================
    // 3. Tree Layer (Enhanced Glow)
    // ===========================
    // Switch back to source-over for depth handling, but we will manually add glow
    ctx.globalCompositeOperation = 'source-over';

    // Mouse Rotation
    if (mouseRef.current.x !== null) {
        const targetRotation = (mouseRef.current.x - width / 2) * 0.002;
        rotationRef.current += (targetRotation - rotationRef.current) * 0.05;
    } else {
        rotationRef.current += 0.005; 
    }

    const cosAngle = Math.cos(rotationRef.current);
    const sinAngle = Math.sin(rotationRef.current);
    const focalLength = 800;

    const particles = treeParticlesRef.current;
    const projectedParticles = particles.map(p => {
        const rotatedX = p.baseX * cosAngle - p.baseZ * sinAngle;
        const rotatedZ = p.baseZ * cosAngle + p.baseX * sinAngle;
        const scale = focalLength / (focalLength + rotatedZ);
        
        return {
            ...p,
            rotatedZ,
            scale,
            screenX: centerX + rotatedX * scale,
            screenY: centerY + p.baseY * scale,
        };
    });

    // Sort by Z for correct occlusion
    projectedParticles.sort((a, b) => b.rotatedZ - a.rotatedZ);

    const time = Date.now();

    projectedParticles.forEach(p => {
        if (p.scale < 0) return;

        // Determine if this particle is a "light"
        const isLight = p.color === '#FF3333' || p.color === '#FFD700' || p.color === '#FFFFFF' || p.color === '#00FFFF';
        
        // Dynamic Twinkle
        // Lights twinkle more intensely and slowly
        const twinkleSpeed = isLight ? 0.003 : 0.005;
        const twinklePhase = isLight ? p.baseY * 0.05 : p.baseY * 0.1;
        const twinkleBase = Math.sin(time * twinkleSpeed + twinklePhase);
        
        // Calculate Alpha
        let alpha = p.alpha;
        if (isLight) {
            // Lights oscillate between 0.6 and 1.0
            alpha = 0.6 + (twinkleBase * 0.4); 
        } else {
            // Leaves oscillate subtly
            alpha = Math.max(0, Math.min(1, p.alpha + twinkleBase * 0.2));
        }

        // Draw
        ctx.beginPath();
        const drawRadius = p.radius * p.scale;
        
        ctx.arc(p.screenX, p.screenY, Math.max(0, drawRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;

        // --- GLOW EFFECT LOGIC ---
        if (p.isStar) {
            // Massive Star Glow
            ctx.shadowBlur = 50 * p.scale;
            ctx.shadowColor = '#FFD700'; // Gold
        } else if (isLight) {
            // Strong Ornament Glow
            // We use a relatively high blur to simulate LED
            ctx.shadowBlur = 20 * p.scale;
            ctx.shadowColor = p.color;
        } else {
            // No glow for leaves (optimizes perf and contrast)
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }

        ctx.fill();
        
        // Reset Shadow for next iteration (important if next is leaf)
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });

    rafIdRef.current = requestAnimationFrame(animate);
  }, []); 

  // --- Effect Hooks ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      initTree(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    rafIdRef.current = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [initTree, animate]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none"
    />
  );
};

export default ParticlesBackground;
import { useEffect, useRef } from 'react';
import './SpaceBackground.css';

/* Animated deep-space backdrop: drifting nebula clouds + twinkling
   starfield, both with smooth mouse-parallax. Renders behind the app. */

const NEBULAE = [
  // x/y as viewport fractions, r as fraction of max(w,h), parallax depth
  { x: 0.16, y: 0.22, r: 0.52, color: [139, 92, 246], alpha: 0.20, depth: 0.030, spdX: 0.00011, spdY: 0.00008, phase: 0.0 },
  { x: 0.82, y: 0.12, r: 0.46, color: [217, 70, 239], alpha: 0.14, depth: 0.048, spdX: 0.00009, spdY: 0.00013, phase: 1.7 },
  { x: 0.58, y: 0.62, r: 0.50, color: [34, 211, 238], alpha: 0.09, depth: 0.022, spdX: 0.00013, spdY: 0.00007, phase: 3.1 },
  { x: 0.28, y: 0.85, r: 0.42, color: [16, 185, 129], alpha: 0.07, depth: 0.040, spdX: 0.00008, spdY: 0.00011, phase: 4.6 },
  { x: 0.92, y: 0.72, r: 0.38, color: [109, 40, 217], alpha: 0.12, depth: 0.056, spdX: 0.00012, spdY: 0.00009, phase: 5.9 },
];

const STAR_COUNT = 160;

export default function SpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = 1;
    let raf = 0;
    let running = true;

    // Mouse state — target follows the cursor, current eases toward it
    const mouse = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5 };

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.1,
      depth: 0.2 + Math.random() * 0.8,          // parallax strength
      tw: Math.random() * Math.PI * 2,           // twinkle phase
      twSpd: 0.0008 + Math.random() * 0.0018,
      hue: Math.random(),                         // 0 violet · 1 cyan
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e) => {
      mouse.tx = e.clientX / w;
      mouse.ty = e.clientY / h;
    };

    const draw = (t) => {
      // Ease current mouse toward target for a soft trailing feel
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;

      const mx = mouse.x - 0.5;
      const my = mouse.y - 0.5;
      const maxDim = Math.max(w, h);

      ctx.clearRect(0, 0, w, h);

      // ── Nebula clouds ──
      ctx.globalCompositeOperation = 'lighter';
      for (const n of NEBULAE) {
        const driftX = reduceMotion ? 0 : Math.sin(t * n.spdX + n.phase) * 0.045;
        const driftY = reduceMotion ? 0 : Math.cos(t * n.spdY + n.phase) * 0.04;
        const px = -mx * maxDim * n.depth * 2.2;
        const py = -my * maxDim * n.depth * 2.2;
        const cx = (n.x + driftX) * w + px;
        const cy = (n.y + driftY) * h + py;
        const r = n.r * maxDim;
        const [cr, cg, cb] = n.color;
        // Nebula breathes slightly
        const pulse = reduceMotion ? 1 : 1 + Math.sin(t * 0.00025 + n.phase * 2) * 0.12;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulse);
        g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${n.alpha})`);
        g.addColorStop(0.45, `rgba(${cr}, ${cg}, ${cb}, ${n.alpha * 0.35})`);
        g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r * pulse, cy - r * pulse, r * pulse * 2, r * pulse * 2);
      }

      // Cursor glow — a faint aurora that rides with the pointer
      const glowR = maxDim * 0.28;
      const gx = mouse.x * w;
      const gy = mouse.y * h;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
      glow.addColorStop(0, 'rgba(139, 92, 246, 0.085)');
      glow.addColorStop(0.5, 'rgba(34, 211, 238, 0.03)');
      glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(gx - glowR, gy - glowR, glowR * 2, glowR * 2);

      // ── Starfield ──
      ctx.globalCompositeOperation = 'source-over';
      for (const s of stars) {
        const twinkle = reduceMotion ? 0.75 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.twSpd + s.tw));
        const sx = s.x * w - mx * 46 * s.depth;
        const sy = s.y * h - my * 46 * s.depth;
        const a = twinkle * (0.25 + s.depth * 0.5);
        ctx.fillStyle = s.hue > 0.85
          ? `rgba(34, 211, 238, ${a})`
          : s.hue > 0.7
            ? `rgba(196, 181, 253, ${a})`
            : `rgba(228, 228, 240, ${a * 0.9})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

    };

    const loop = (t) => {
      draw(t);
      if (running) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });

    draw(0); // paint immediately so the backdrop is never blank
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="space-bg" aria-hidden="true" />;
}

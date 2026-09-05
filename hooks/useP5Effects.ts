'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import p5 from 'p5';

interface EffectState {
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }>;
  confetti: Array<{ x: number; y: number; vx: number; vy: number; color: string; rotation: number; rotationSpeed: number; life: number }>;
  screenShake: number;
  flashColor: string | null;
  flashAlpha: number;
  time: number;
}

export function useP5Effects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<p5 | null>(null);
  const [, setTick] = useState(0);

  const initState = useCallback((): EffectState => ({
    particles: [],
    confetti: [],
    screenShake: 0,
    flashColor: null,
    flashAlpha: 0,
    time: 0,
  }), []);

  const triggerWin = useCallback(() => {
    setTick(t => t + 1);
    if (sketchRef.current) {
      const s = sketchRef.current;
      for (let i = 0; i < 50; i++) {
        (sketchRef.current as any).state.particles.push({
          x: s.width / 2 + (Math.random() - 0.5) * 200,
          y: s.height / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 8 - 4,
          life: 1,
          color: Math.random() > 0.5 ? '#FFD700' : '#00FF41',
          size: Math.random() * 4 + 2,
        });
      }
      for (let i = 0; i < 30; i++) {
        (sketchRef.current as any).state.confetti.push({
          x: Math.random() * s.width,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3 + 2,
          color: ['#FFD700', '#00FF41', '#FF0033', '#FFAA00'][Math.floor(Math.random() * 4)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          life: 1,
        });
      }
      (sketchRef.current as any).state.screenShake = 10;
      (sketchRef.current as any).state.flashColor = '#00FF41';
      (sketchRef.current as any).state.flashAlpha = 0.4;
    }
  }, []);

  const triggerLoss = useCallback(() => {
    setTick(t => t + 1);
    if (sketchRef.current) {
      const s = sketchRef.current;
      (sketchRef.current as any).state.screenShake = 15;
      (sketchRef.current as any).state.flashColor = '#FF0033';
      (sketchRef.current as any).state.flashAlpha = 0.3;
      for (let i = 0; i < 20; i++) {
        (sketchRef.current as any).state.particles.push({
          x: s.width / 2 + (Math.random() - 0.5) * 200,
          y: s.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 6 - 2,
          life: 1,
          color: '#FF0033',
          size: Math.random() * 3 + 1,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const state = initState();
    const sketch = new p5((p: p5) => {
      p.setup = () => {
        const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
        cnv.position(0, 0);
        (sketchRef as any).current = p;
        (sketchRef as any).state = state;
      };
      p.draw = () => {
        p.background(5, 5, 5, 5);
        const s = state;
        s.time += 0.016;
        s.screenShake *= 0.9;
        if (s.screenShake < 0.5) s.screenShake = 0;
        if (s.flashAlpha > 0) s.flashAlpha -= 0.02;
        if (s.flashAlpha < 0) s.flashAlpha = 0;

        // Screen shake
        if (s.screenShake > 0) {
          p.translate((Math.random() - 0.5) * s.screenShake, (Math.random() - 0.5) * s.screenShake);
        }

        // Flash overlay
        if (s.flashAlpha > 0 && s.flashColor) {
          p.noStroke();
          p.fill(s.flashColor, s.flashAlpha * 255);
          p.rect(0, 0, p.width, p.height);
        }

        // Draw particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const pt = state.particles[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.vy += 0.15;
          pt.life -= 0.02;
          if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
          p.noStroke();
          p.fill(pt.color);
          p.ellipse(pt.x, pt.y, pt.size * pt.life, pt.size * pt.life);
        }

        // Draw confetti
        for (let i = state.confetti.length - 1; i >= 0; i--) {
          const c = state.confetti[i];
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.1;
          c.rotation += c.rotationSpeed;
          c.life -= 0.008;
          if (c.life <= 0 || c.y > p.height + 20) { state.confetti.splice(i, 1); continue; }
          p.push();
          p.translate(c.x, c.y);
          p.rotate(c.rotation);
          p.fill(c.color);
          p.rect(-6, -3, 12, 6);
          p.pop();
        }
      };
      p.windowResized = () => { p.resizeCanvas(p.windowWidth, p.windowHeight); };
    }, containerRef.current);
    return () => { sketch.remove(); };
  }, []);

  return { canvasRef, containerRef, triggerWin, triggerLoss };
}
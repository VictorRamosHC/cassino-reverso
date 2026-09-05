'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/utils-data';

export default function SurvivalChart({ recent }: { recent: Array<{ time: number; balance: number; tipo_jogo?: string }> }) {
  const pts = recent.slice(0, 200).sort((a, b) => a.time - b.time).map(r => ({
    time: new Date(r.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    value: r.balance / 100
  }));

  if (pts.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm font-mono">
        Faça uma aposta para ver o gráfico.
      </div>
    );
  }

  const maxV = Math.max(...pts.map(p => p.value));
  const minV = Math.min(...pts.map(p => p.value));
  const range = Math.max(1, maxV - minV);
  const pad = 50;
  const w = 100, h = 180, padX = 20, padYTop = 20, padYBot = 20;
  const plotW = w + padX, plotH = h + padYTop + padYBot;

  const pts2 = pts.map((p, i) => ({
    x: padX + (i / Math.max(1, pts.length - 1)) * w,
    y: padYTop + (1 - (p.value - minV + pad) / (range + pad * 2)) * (h - padYTop - padYBot + pad * 2)
  }));

  return (
    <div className="w-full h-[180px]">
      <svg className="w-full h-full" viewBox={`0 0 ${plotW} ${plotH}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#FFD700" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid horizontal */}
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={padX} y1={padYTop + i * (h - padYTop - padYBot) / 4} x2={padX + w} y2={padYTop + i * (h - padYTop - padYBot) / 4} stroke="#2d2d2d" strokeWidth="0.5" />
        ))}
        {/* Grid vertical */}
        {pts2.filter((_, i) => i % Math.max(1, Math.floor(pts2.length / 6)) === 0).map((p, i) => (
          <line key={i} x1={p.x} y1={padYTop} x2={p.x} y2={padYTop + h - padYTop - padYBot} stroke="#2d2d2d" strokeWidth="0.5" />
        ))}
        {/* Área */}
        <path
          fill="url(#areaGrad)"
          d={`M ${pts2[0].x} ${padYTop + h - padYTop - padYBot} ${pts2.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${pts2[pts2.length-1].x} ${padYTop + h - padYTop - padYBot} Z`}
        />
        {/* Linha */}
        <polyline
          points={pts2.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#FFD700"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Pontos */}
        {pts2.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#FFD700" stroke="#0a0a0a" strokeWidth="0.5" />
        ))}
        {/* Rótulos */}
        <text x={padX} y={plotH - 3} fill="#6b6b6b" fontSize="7" fontFamily="monospace">Saldo: R$ {pts[0]?.value.toFixed(0)}</text>
        <text x={plotW - 2} y={plotH - 3} fill="#FFD700" fontSize="7" fontFamily="monospace" textAnchor="end">
          R$ {pts[pts.length-1]?.value.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

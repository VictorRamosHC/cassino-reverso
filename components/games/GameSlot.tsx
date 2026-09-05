'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatBRL } from '@/lib/utils-data';
import { SlotGameData } from '@/lib/game-engine';

interface Props {
  onPlay: () => void;
  busy: boolean;
  balance: number;
  onWin?: () => void;
  onLoss?: () => void;
}

const SYMBOLS = ['7', 'BAR', '★', '💎', '🔔', '🍒', '💰', '🎰'];
const WIN_SYMBOLS = ['7', '★', '💎'];

export default function GameSlot({ onPlay, busy, balance, onWin, onLoss }: Props) {
  const [displaySymbols, setDisplaySymbols] = useState(SYMBOLS.slice(0, 3));
  const [rolling, setRolling] = useState(false);
  const [nearMiss, setNearMiss] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleSpin = useCallback(() => {
    if (busy || balance < 10) return;
    setRolling(true);
    setNearMiss(false);
    const count = 0;
    intervalRef.current = setInterval(() => {
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      setDisplaySymbols([
        sym,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
      if (count > 15) {
        clearInterval(intervalRef.current!);
        setRolling(false);
        setTimeout(() => onPlay(), 600);
      }
    }, 80);
  }, [busy, balance, onPlay]);

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <p className="text-xs text-muted-foreground font-mono mb-4">Saldo: {formatBRL(balance)}</p>
      <div className="flex gap-3 justify-center mb-6 relative">
        {[0, 1, 2].map(i => (
          <div key={i} className={`slot-display w-20 h-20 rounded-xl bg-black border-2 border-gold/50 flex items-center justify-center overflow-hidden ${nearMiss ? 'border-red-500' : ''}`}>
            <span className={`font-mono text-3xl font-bold ${nearMiss ? 'neon-red' : 'text-gold'} ${rolling ? 'slot-rolling' : ''}`}>
              {displaySymbols[i] || '?'}
            </span>
          </div>
        ))}
      </div>
      <button onClick={handleSpin} disabled={busy || balance < 10} className="bet-btn w-full">
        {busy ? '🎰 Girando…' : '🎰 GIRAR'}
      </button>
    </div>
  );
}
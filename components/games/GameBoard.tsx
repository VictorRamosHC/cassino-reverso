'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { formatBRL } from '@/lib/utils-data';

interface Props {
  onPlay: () => void;
  busy: boolean;
  balance: number;
  onWin?: () => void;
  onLoss?: () => void;
}

export default function GameBoard({ onPlay, busy, balance, onWin, onLoss }: Props) {
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isNegative, setIsNegative] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const handleRoll = useCallback(() => {
    if (busy || balance < 10) return;
    setMessage('🎲 Rolando...');
    setScreenShake(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const isNeg = Math.random() < 0.70;
      setLastRoll(roll);
      setIsNegative(isNeg);
      setMessage(isNeg ? '🏠 Casa absorve sua aposta!' : '🟢 Casa neutra — você observa.');
      if (isNeg && onLoss) onLoss();
      setTimeout(() => {
        setScreenShake(false);
        onPlay();
        setMessage('');
      }, 1500);
    }, 800);
  }, [busy, balance, onPlay, onLoss]);

  return (
    <div className={`flex flex-col items-center gap-4 py-4 transition-transform duration-100 ${
      screenShake ? 'translate-x-1' : ''
    }`}>
      <p className="text-xs text-muted-foreground font-mono">
        Saldo: {formatBRL(balance)}
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="inline-block w-28 h-28 rounded-xl bg-black border-4 border-gold/50 flex items-center justify-center">
          {lastRoll ? (
            <span className="font-mono text-5xl font-bold text-gold neon-text">
              {lastRoll}
            </span>
          ) : (
            <span className="text-5xl">🎲</span>
          )}
        </div>
        {message && (
          <div
            className={`rounded-xl p-3 text-sm ${
              isNegative
                ? 'danger-zone text-red-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}
          >
            {message}
          </div>
        )}
      </div>
      <button
        onClick={handleRoll}
        disabled={busy || balance < 10}
        className="bet-btn w-full max-w-xs"
      >
        {busy ? '🎲 Rolando…' : '🎲 JOGAR'}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        70% das casas são negativas — a banca absorve sua aposta.
      </p>
    </div>
  );
}
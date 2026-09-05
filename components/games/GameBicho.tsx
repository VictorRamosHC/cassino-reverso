'use client';

import { useState, useCallback } from 'react';
import { formatBRL } from '@/lib/utils-data';
import { ANIMALS } from '@/lib/utils-data';

interface Props {
  onPlay: (animal: string) => void;
  busy: boolean;
  balance: number;
  onWin?: () => void;
  onLoss?: () => void;
}

export default function GameBicho({ onPlay, busy, balance, onWin, onLoss }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [lastAnimal, setLastAnimal] = useState<string | null>(null);

  const handlePick = useCallback((animalId: string) => {
    if (busy || picking) return;
    setSelected(animalId);
    setLastAnimal(null);
  }, [busy, picking]);

  const handleSpin = useCallback(() => {
    if (busy || !selected || balance < 10) return;
    setPicking(true);
    setTimeout(() => {
      setPicking(false);
      setLastAnimal(selected);
      onPlay(selected);
    }, 600);
  }, [busy, selected, balance, onPlay]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <p className="text-center text-xs text-muted-foreground font-mono mb-3">Saldo: {formatBRL(balance)}</p>
      <p className="text-center text-sm text-muted-foreground mb-3">Escolha um animal:</p>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {ANIMALS.map(a => (
          <button
            key={a.id}
            onClick={() => handlePick(a.id)}
            disabled={busy || picking}
            className={`animal-card p-2 text-center transition-all ${selected === a.id ? 'selected border-gold border-2' : ''} ${busy || picking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-xl block mb-1">{a.emoji}</span>
            <span className="text-xs font-mono text-muted-foreground">{a.id.slice(0, 3)}</span>
          </button>
        ))}
      </div>
      <button onClick={handleSpin} disabled={busy || picking || !selected || balance < 10} className="bet-btn w-full">
        🐴 APOSTAR
      </button>
    </div>
  );
}
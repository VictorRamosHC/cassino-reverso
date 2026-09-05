'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Trophy, Coins } from 'lucide-react';
import { formatBRL } from '@/lib/utils-data';
import { playRoulette } from '@/lib/game-engine';

export default function GameRoulette({ onPlay, busy, balance }: {
  onPlay: (data: { game: 'roulette'; betType: string; value?: number }) => void;
  busy: boolean;
  balance: number;
}) {
  const [betType, setBetType] = useState<'numero' | 'par' | 'impar' | 'vermelho' | 'preto'>('numero');
  const [value, setValue] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ number: number; color: string; won: boolean; payout: number; text: string } | null>(null);
  const [history, setHistory] = useState<{ number: number; color: string }[]>([]);
  const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors: { id: typeof betType; label: string; css: string }[] = [
    { id: 'numero', label: 'Número', css: 'text-gold' },
    { id: 'par', label: 'Par', css: 'text-emerald-400' },
    { id: 'impar', label: 'Ímpar', css: 'text-emerald-400' },
    { id: 'vermelho', label: 'Vermelho', css: 'text-red-400' },
    { id: 'preto', label: 'Preto', css: 'text-gray-300' },
  ];

  const betAmount = 10;

  const numberColor = (n: number): string => {
    if (n === 0) return 'green';
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return reds.includes(n) ? 'red' : 'black';
  };

  const spin = useCallback(() => {
    if (busy || balance < betAmount) return;
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    // Chama o backend
    const payload: any = { game: 'roulette', betType, value: value !== null ? value : undefined };
    // Roda direto chamando onPlay (que no page faz o fetch e atualiza snapshot)
    onPlay(payload).then((d: any) => {
      if (d?.snapshot) {
        // Atualiza o contexto de balance via o próprio onPlay já retorna a snapshot
        // O page.tsx faz o loadDashboard após onPlay, então balance é atualizado no componente pai
      }
      const won = d?.won ?? false;
      const payout = won ? betAmount * (d?.multiplier ?? 0) : 0;
      const outcomeText = d?.outcomeText ?? '';
      const number = d?.result ?? 0;
      const color = numberColor(number);
      setResult({ number, color, won, payout, text: outcomeText });
      setHistory(prev => [{ number, color }, ...prev.slice(0, 14)]);
    }).catch(() => {
      setResult({ number: 0, color: 'black', won: false, payout: 0, text: 'Erro ao girar.' });
    }).finally(() => {
      setSpinning(false);
    });
  }, [busy, balance, betAmount, spinning, betType, value, onPlay]);

  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* ROLETA VISUAL */}
      <div className="relative w-56 h-56 mx-auto mb-4 rounded-full border-4 border-gold/40 overflow-hidden bg-black shadow-2xl">
        {/* LEDs superiores */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
          <span className={`w-2 h-2 rounded-full ${spinning ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
          <span className={`w-2 h-2 rounded-full ${spinning ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
          <span className={`w-2 h-2 rounded-full ${spinning ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
        </div>
        {/* Número central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className={`text-7xl font-black font-mono drop-shadow-2xl ${
                result?.color === 'red' ? 'text-red-500' : result?.color === 'black' ? 'text-gray-100' : 'text-green-400'
              } ${spinning ? 'animate-pulse' : ''}`}
            >
              {spinning ? '?' : result?.number ?? '?'}
            </div>
            <div className="mt-2 text-xs font-mono uppercase tracking-widest text-gray-400">
              {result?.color === 'red' ? 'Vermelho' : result?.color === 'black' ? 'Preto' : 'Verde'}
            </div>
          </div>
        </div>
        {/* Anéis decorativos */}
        <div className="absolute inset-3 rounded-full border-2 border-gold/30" />
        <div className="absolute inset-6 rounded-full border border-gold/20" />
        <div className="absolute inset-10 rounded-full border border-gold/10" />
      </div>

      {/* Tipo de aposta e valor */}
      <div className="mb-4 flex flex-col gap-2">
        <p className="text-xs font-mono text-gold uppercase tracking-wider text-center">Tipo de aposta</p>
        <div className="grid grid-cols-5 gap-1">
          {colors.map(c => (
            <button
              key={c.id}
              onClick={() => { setBetType(c.id); setValue(null); setResult(null); }}
              disabled={spinning}
              className={`py-2 px-1 rounded text-xs font-mono border transition-all ${
                betType === c.id
                  ? 'bg-gold/20 border-gold text-gold font-bold'
                  : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gold/40'
              } ${spinning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Se for número, mostra grid 0-36 */}
        {betType === 'numero' && (
          <div className="mt-2">
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-1">Escolha o número</p>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 37 }, (_, i) => i).map(n => {
                const color = numberColor(n);
                const selected = value === n;
                return (
                  <button
                    key={n}
                    onClick={() => { setValue(n); setResult(null); }}
                    disabled={spinning}
                    className={`w-10 h-10 rounded text-sm font-mono font-bold transition-all ${
                      selected ? 'ring-2 ring-gold scale-110' : ''
                    } ${color === 'red' ? 'bg-red-600 text-white' : color === 'black' ? 'bg-gray-900 text-white border border-gray-600' : 'bg-green-700 text-white'} ${spinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <p className="text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Histórico</p>
          <div className="flex gap-1.5">
            {history.map((h, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded text-xs font-mono font-bold flex items-center justify-center ${
                  h.color === 'red' ? 'bg-red-700 text-white' : h.color === 'black' ? 'bg-gray-800 text-white border border-gray-600' : 'bg-green-700 text-white'
                }`}
              >
                {h.number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm font-mono ${
            result.won
              ? 'border border-green-500/50 bg-green-500/10 text-green-300 win-bloom'
              : 'border border-red-500/50 bg-red-500/10 text-red-300 loss-flash'
          }`}
        >
          <p className="font-bold">{result.text}</p>
          <p className="mt-1 text-xs text-gray-400">Pagamento: {formatBRL(result.payout)}</p>
        </div>
      )}

      {/* Botão girar */}
      <button
        onClick={spin}
        disabled={spinning || balance < betAmount}
        className="bet-btn w-full flex items-center justify-center gap-2"
      >
        {spinning ? (
          <>
            <Trophy className="w-4 h-4 animate-spin" />
            Girando...
          </>
        ) : (
          <>
            <Trophy className="w-4 h-4" />
            Girar Roleta — {formatBRL(betAmount)}
          </>
        )}
      </button>

      {/* Info */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="stat-card p-2">
          <span className="stat-label text-[10px]">Aposta</span>
          <span className="stat-value text-sm">{formatBRL(betAmount)}</span>
        </div>
        <div className="stat-card p-2">
          <span className="stat-label text-[10px]">Saldo</span>
          <span className="stat-value text-sm">{formatBRL(balance)}</span>
        </div>
      </div>

      {/* Probabilidades */}
      <div className="mt-4 text-[10px] font-mono text-gray-500 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-3">
        <span>Número: 1/37 (2.7%)</span>
        <span className="text-gray-600">|</span>
        <span>Par/Ímpar: 18/37 (48.6%)</span>
        <span className="text-gray-600">|</span>
        <span>Vermelho/Preto: 18/37 (48.6%)</span>
      </div>
    </div>
  );
}

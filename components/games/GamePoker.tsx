'use client';

/* ============================================================
   GAME PÔKER — 5-card hand evaluation, client-side visual,
   server-side balance update via API.
   
   Flow: component chama onPlay({ game: 'poker' }) → page chama API →
   API retorna resultado com cartas → component exibe.
   ============================================================ */

import { useState, useCallback } from 'react';
import { Trophy, Coins } from 'lucide-react';
import { formatBRL } from '@/lib/utils-data';

// ----------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------
type Suit = '♠' | '♥' | '♦' | '♣';

interface Card {
  rank: string;
  suit: Suit;
  value: number;
}

// ----------------------------------------------------------------------
// Baralho
// ----------------------------------------------------------------------
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUE: Record<string, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'J':11,'Q':12,'K':13,'A':14
};

// ----------------------------------------------------------------------
// Avaliação de mão (usada apenas para exibir o rank name do backend)
// O backend já avalia, mas precisamos do nome para exibir
// ----------------------------------------------------------------------
function evaluateHand(cards: Card[]): { name: string; rank: number } {
  const values = cards.map(c => c.value).sort((a,b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  
  let isStraight = false;
  let straightHigh = 0;
  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
    straightHigh = values[0];
  }
  if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }
  
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts).map(([val, count]) => ({ val: +val, count })).sort((a,b) => b.count - a.count || b.val - a.val);
  
  const trips = groups.find(g => g.count === 3);
  const pairs = groups.filter(g => g.count === 2);
  
  if (isFlush && isStraight && straightHigh >= 10) return { name: 'Royal Flush', rank: 9 };
  if (isFlush && isStraight) return { name: 'Straight Flush', rank: 8 };
  if (groups.length === 2 && groups[0].count === 4) return { name: 'Four of a Kind', rank: 7 };
  if (groups.length === 2 && groups[0].count === 3 && groups[1].count === 2) return { name: 'Full House', rank: 6 };
  if (isFlush) return { name: 'Flush', rank: 5 };
  if (isStraight) return { name: 'Straight', rank: 4 };
  if (trips) return { name: 'Three of a Kind', rank: 3 };
  if (pairs.length === 2) return { name: 'Two Pair', rank: 2 };
  if (pairs.length === 1) return { name: 'Pair', rank: 1 };
  return { name: `High Card ${values[0]}`, rank: 0 };
}

// ----------------------------------------------------------------------
// Helpers de UI
// ----------------------------------------------------------------------
function cardColor(card: Card): 'red' | 'black' {
  return (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
}

// ----------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------
interface Props {
  onPlay: (data: { game: 'poker' }) => Promise<any>;
  onWin: () => void;
  onLoss: () => void;
  busy: boolean;
  balance: number;
}

export default function GamePoker({ onPlay, onWin, onLoss, busy, balance }: Props) {
  const [phase, setPhase] = useState<'idle' | 'dealing' | 'result'>('idle');
  const [holeCards, setHoleCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [result, setResult] = useState<{
    won: boolean;
    payout: number;
    text: string;
    playerRank: string;
    dealerRank: string;
  } | null>(null);
  const [history, setHistory] = useState<Array<{ rank: string; won: boolean }>>([]);

  const betAmount = 10;

  const play = useCallback(async () => {
    if (busy || balance < betAmount) return;
    if (phase === 'dealing') return;

    setPhase('dealing');
    setHoleCards([]);
    setCommunityCards([]);
    setResult(null);

    try {
      // Chama o back-end para gerar o jogo
      const apiResult = await onPlay({ game: 'poker' });
      
      // Back-end retorna: { holeCards, community, dealerHand, playerRank, dealerRank, won, multiplier, outcomeText, snapshot }
      if (apiResult?.holeCards && apiResult?.community) {
        const hc: Card[] = apiResult.holeCards.map((c: any) => ({
          rank: c.rank, suit: c.suit as Suit, value: c.value,
        }));
        const cc: Card[] = apiResult.community.map((c: any) => ({
          rank: c.rank, suit: c.suit as Suit, value: c.value,
        }));
        setHoleCards(hc);
        setCommunityCards(cc);

        const won = apiResult?.won ?? false;
        const payout = won ? betAmount * (apiResult?.multiplier ?? 0) : 0;
        const playerRankName = apiResult?.playerRank?.name ?? 'Sem classificação';
        const dealerRankName = apiResult?.dealerRank?.name ?? 'Sem classificação';
        const outcomeText = apiResult?.outcomeText ?? '';

        setResult({
          won,
          payout,
          text: outcomeText,
          playerRank: playerRankName,
          dealerRank: dealerRankName,
        });

        setHistory(prev => [{ rank: playerRankName, won }, ...prev.slice(0, 14)]);

        if (won) onWin();
        else onLoss();
      } else {
        // Fallback se back-end não retornar cartas
        setResult({
          won: false,
          payout: 0,
          text: 'Erro ao obter resultado do servidor.',
          playerRank: '',
          dealerRank: '',
        });
        onLoss();
      }
    } catch {
      setResult({
        won: false,
        payout: 0,
        text: 'Erro de conexão.',
        playerRank: '',
        dealerRank: '',
      });
      onLoss();
    } finally {
      setPhase('result');
    }
  }, [busy, balance, betAmount, phase, onPlay, onWin, onLoss]);

  const reset = useCallback(() => {
    setPhase('idle');
    setHoleCards([]);
    setCommunityCards([]);
    setResult(null);
  }, []);

  // Junta as 7 cartas para exibir (2 hole + 5 community)
  const allCards = [...holeCards, ...communityCards];

  // Exibe as cartas
  const renderCard = (card: Card, isHole?: boolean) => (
    <div
      key={card.rank + card.suit + (isHole ? 'h' : 'c')}
      className={`w-14 h-20 rounded-lg border-2 flex flex-col items-center justify-center font-mono font-bold text-xl transition-all ${
        cardColor(card) === 'red'
          ? 'text-red-500 border-red-400 bg-gray-900'
          : 'text-white border-gray-500 bg-gray-800'
      }`}
    >
      <span className="text-xs opacity-70">{card.rank}</span>
      <span className="text-2xl my-1">{card.suit}</span>
      <span className="text-xs opacity-70 rotate-180">{card.rank}</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Área de jogo */}
      <div className="flex flex-col items-center gap-3 my-4">
        {/* Community cards */}
        {communityCards.length > 0 && (
          <div className="flex justify-center gap-2">
            {communityCards.map((card, i) => renderCard(card, false))}
          </div>
        )}
        
        {/* Hole cards */}
        {holeCards.length > 0 && (
          <div className="flex justify-center gap-2 mt-2">
            {holeCards.map((card, i) => renderCard(card, true))}
          </div>
        )}

        {/* Mensagem de resultado */}
        {result && (
          <div
            className={`mb-2 rounded-lg p-3 text-sm font-mono text-center w-full ${
              result.won
                ? 'border border-green-500/50 bg-green-500/10 text-green-300 win-bloom'
                : 'border border-red-500/50 bg-red-500/10 text-red-300 loss-flash'
            }`}
          >
            <p className="font-bold">{result.playerRank} vs {result.dealerRank}</p>
            <p>{result.text}</p>
          </div>
        )}

        {/* Payout */}
        {result && result.payout !== 0 && (
          <div className="text-center text-sm font-mono mb-1">
            <span className={result.payout > 0 ? 'text-green-400' : 'text-red-400'}>
              {result.payout > 0 ? `+${formatBRL(result.payout * 100)}` : `-${formatBRL(Math.abs(result.payout * 100))}`}
            </span>
          </div>
        )}

        {/* Ranking comparativo */}
        {result && (
          <div className="text-xs font-mono text-gray-500 text-center w-full">
            Você: {result.playerRank} | Banca: {result.dealerRank}
          </div>
        )}
      </div>

      {/* Histórico de mãos */}
      {history.length > 0 && (
        <div className="max-h-20 overflow-y-auto space-y-1 mb-3">
          {history.map((h, i) => (
            <div
              key={i}
              className={`text-xs font-mono text-center py-1 rounded ${
                h.won ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {h.rank} {h.won ? '✅' : '❌'}
            </div>
          ))}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2 mt-4">
        {phase === 'idle' && (
          <button
            onClick={play}
            disabled={busy || balance < betAmount}
            className="bet-btn flex-1 flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Jogar Pôker — {formatBRL(betAmount)}
          </button>
        )}
        {phase === 'result' && (
          <button
            onClick={reset}
            disabled={busy}
            className="bet-btn flex-1 flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            Nova mão — {formatBRL(betAmount)}
          </button>
        )}
        {phase === 'dealing' && (
          <button disabled className="bet-btn flex-1 flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
            <Trophy className="w-4 h-4 animate-spin" />
            Comprando cartas…
          </button>
        )}
      </div>

      {/* Info de aposta e saldo */}
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

      {/* Ranking de mãos (legend) */}
      <div className="mt-4 text-[10px] font-mono text-gray-500 flex flex-wrap gap-1 border-t border-gold/10 pt-3">
        <span className="px-1 bg-gold/10 rounded">Royal Flush: 50x</span>
        <span className="px-1 bg-gold/10 rounded">Straight Flush: 25x</span>
        <span className="px-1 bg-gold/10 rounded">Four of a Kind: 10x</span>
        <span className="px-1 bg-gold/10 rounded">Full House: 5x</span>
        <span className="px-1 bg-gold/10 rounded">Flush: 3x</span>
        <span className="px-1 bg-gold/10 rounded">Straight: 2x</span>
        <span className="px-1 bg-gold/10 rounded">Three of a Kind: 1.5x</span>
        <span className="px-1 bg-gold/10 rounded">Two Pair: 1x</span>
        <span className="px-1 bg-gold/10 rounded">Pair: 0.5x</span>
        <span className="px-1 bg-red-900/30 rounded text-red-400">High Card: perde</span>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { ShieldCheck as Winner } from 'lucide-react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const VAL: Record<string,number> = {
  A:11, '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  J:10, Q:10, K:10
};

type Card = { rank: string; suit: string; val: number; faceUp: boolean };

function newDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < SUITS.length; s++)
    for (let r = 0; r < RANKS.length; r++)
      d.push({ rank: RANKS[r], suit: SUITS[s], val: VAL[RANKS[r]], faceUp: true });
  return d;
}

function shuffle(a: Card[]): Card[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function softTotal(cards: Card[]): number {
  let t = 0, aces = 0;
  for (const c of cards) t += c.val;
  while (t > 21 && aces < countAces(cards)) { t -= 10; aces++; }
  return t;
}

function countAces(cards: Card[]): number {
  let n = 0;
  for (const c of cards) if (c.rank === 'A') n++;
  return n;
}

function score(cards: Card[]): number { return softTotal(cards); }
function isBlackjack(cards: Card[]): boolean { return cards.length === 2 && score(cards) === 21; }

function suitColor(suit: string): string {
  return suit === '♥' || suit === '♦' ? 'text-red-400' : 'text-white';
}

interface Props {
  onPlay: (data: { game: 'blackjack'; bet_amount: number; delta_cents: number }) => void;
  onWin: () => void;
  onLoss: () => void;
  busy: boolean;
  balance: number;
}

export default function GameBlackjack({ onPlay, onWin, onLoss, busy, balance }: Props) {
  const [deck, setDeck] = useState<Card[]>(shuffle(newDeck()));
  const [hand, setHand] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<'idle'|'bet'|'cards'|'result'>('idle');
  const [message, setMessage] = useState('');
  const [resultColor, setResultColor] = useState<'gold'|'green'|'red'>('gold');
  const [log, setLog] = useState<string[]>([]);
  const betAmount = 10;

  const startRound = useCallback(() => {
    if (balance < betAmount) { setMessage('Saldo insuficiente para apostar R$10,00'); return; }
    const d = shuffle(newDeck());
    const h1 = d[0], h2 = d[1], d1 = d[2], d2 = d[3];
    const newHand = [h1, h2];
    const newDealer = [d1, { ...d2, faceUp: false }];
    setDeck(d.slice(4));
    setHand(newHand);
    setDealer(newDealer);
    setPhase('cards');
    setMessage('');
    const bjP = isBlackjack(newHand), bjD = isBlackjack(newDealer);
    if (bjP || bjD) {
      setDealer(prev => prev.map((c,i) => i === 1 ? { ...c, faceUp: true } : c));
      if (bjP && bjD) {
        setMessage('Empate! Ambos Blackjack.');
        setResultColor('gold');
        setPhase('result');
        onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: 0 });
      } else if (bjP) {
        setMessage('BLACKJACK! Você ganhou 130% da aposta.');
        setResultColor('green');
        setPhase('result');
        onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: Math.round(betAmount * 1.30 * 100) });
        onWin();
      } else {
        setMessage('Dealer Blackjack. Você perdeu.');
        setResultColor('red');
        setPhase('result');
        onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: -betAmount * 100 });
        onLoss();
      }
    } else {
      logMsg('Mão distribuída. Sua vez.');
    }
  }, [balance, onPlay, onWin, onLoss]);

  const logMsg = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  const hit = useCallback(() => {
    if (phase !== 'cards') return;
    const d = deck;
    if (d.length === 0) { setMessage('Baralho esgotado.'); return; }
    const card = d[0];
    setDeck(d.slice(1));
    const newHand = [...hand, card];
    setHand(newHand);
    logMsg(`Você recebeu ${card.rank}${card.suit} — total: ${score(newHand)}`);
    if (score(newHand) > 21) {
      setDealer(prev => prev.map(c => ({ ...c, faceUp: true })));
      setMessage(`Estourou com ${score(newHand)}! Dealer ganhou.`);
      setResultColor('red');
      setPhase('result');
      onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: -betAmount * 100 });
      onLoss();
    } else if (score(newHand) === 21) {
      logMsg('Blackjack! Dealer joga...');
      dealerPlay(newHand, dealer, d.slice(1));
    }
  }, [phase, deck, hand, dealer, onPlay, onLoss]);

  const stand = useCallback(() => {
    if (phase !== 'cards') return;
    setDealer(prev => prev.map(c => ({ ...c, faceUp: true })));
    dealerPlay(hand, dealer, deck);
  }, [phase, deck, hand, dealer, onPlay, onWin, onLoss]);

  function dealerPlay(playerHandLocal: Card[], dealerLocal: Card[], d: Card[]): void {
    let currentDeck = d;
    let currentDealer = [...dealerLocal];
    const step = () => {
      const ds = score(currentDealer);
      if (ds < 17) {
        if (currentDeck.length === 0) {
          setMessage(`Dealer não pode mais comprar. Dealer: ${ds} vs Você: ${score(playerHandLocal)}`);
          finalize(playerHandLocal, currentDealer, currentDeck);
          return;
        }
        const card = currentDeck[0];
        currentDeck = currentDeck.slice(1);
        currentDealer = [...currentDealer, card];
        logMsg(`Dealer comprou ${card.rank}${card.suit} — total: ${score(currentDealer)}`);
        setTimeout(step, 400);
      } else {
        finalize(playerHandLocal, currentDealer, currentDeck);
      }
    };
    step();
  }

  function finalize(playerCards: Card[], dealerCards: Card[], remainingDeck: Card[]): void {
    const pScore = score(playerCards);
    const dScore = score(dealerCards);
    setDeck(remainingDeck);
    setDealer(dealerCards.map(c => ({ ...c, faceUp: true })));

    if (dScore > 21) {
      setMessage(`Dealer estourou com ${dScore}! Você ganhou.`);
      setResultColor('green');
      onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: Math.round(betAmount * 1.0 * 100) });
      onWin();
    } else if (pScore > dScore) {
      setMessage(`Você venceu! ${pScore} vs ${dScore}. Ganhou 100%.`);
      setResultColor('green');
      onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: Math.round(betAmount * 1.0 * 100) });
      onWin();
    } else if (pScore === dScore) {
      setMessage(`Empate. ${pScore} vs ${dScore}. Volta tudo.`);
      setResultColor('gold');
      onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: 0 });
    } else {
      setMessage(`Dealer vence com ${dScore} vs ${pScore}. Você perdeu.`);
      setResultColor('red');
      onPlay({ game: 'blackjack', bet_amount: betAmount, delta_cents: -betAmount * 100 });
      onLoss();
    }
    setPhase('result');
  }

  const renderCardInner = (c: Card, faceDown?: boolean) => {
    if (!c) return null;
    const down = faceDown ? ' card-down' : '';
    const red = suitColor(c.suit);
    return (
      <div key={`${c.rank}-${c.suit}`} className={`card${down}`}>
        <div className={`card-rank ${red}`}>{faceDown ? '🂠' : c.rank}</div>
        <div className="card-center">{faceDown ? '' : c.suit}</div>
        <div className={`card-rank card-bottom ${red}`}>{faceDown ? '' : c.suit}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-xs text-muted-foreground font-mono">
        Saldo: {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>

      {message && (
        <div className={`rounded-lg p-3 text-sm font-mono w-full ${
          resultColor === 'green' ? 'border border-green-500/50 bg-green-500/10 text-green-300' :
          resultColor === 'red' ? 'border border-red-500/50 bg-red-500/10 text-red-300' :
          'border border-gold/50 bg-gold/10 text-gold'
        }`}>
          {message}
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="text-5xl mb-2">🃏</div>
          <p className="text-muted-foreground text-sm font-mono">Blackjack contra a banca</p>
          <button
            onClick={startRound}
            disabled={busy || balance < betAmount}
            className="gold-sheen mt-2 px-6 py-2 rounded-lg font-mono font-bold text-white"
          >
            {busy ? 'Aguarde…' : `Iniciar • R$${betAmount}`}
          </button>
        </div>
      )}

      {(phase === 'cards' || phase === 'result') && (
        <div className="space-y-3 w-full max-w-md">
          <div className="space-y-1">
            <p className="text-xs font-mono tracking-widest text-gold uppercase">
              Dealer <span className="text-muted-foreground normal-case">
                ({score(dealer.filter(c=>c.faceUp))} pts {score(dealer.filter(c=>c.faceUp)) > 21 ? '💥' : ''})
              </span>
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {dealer.map((c,i) => renderCardInner(c, i === 1 && phase === 'cards' ? true : false))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono tracking-widest text-gold uppercase">
              Você <span className="text-muted-foreground normal-case">
                ({score(hand)} pts {score(hand) > 21 ? '💥' : ''})
              </span>
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {hand.map(c => renderCardInner(c, false))}
            </div>
          </div>

          {phase === 'cards' && (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={hit}
                disabled={busy}
                className="gold-sheen px-6 py-2 rounded-lg font-mono font-bold text-white text-sm"
              >
                🂡 Hit
              </button>
              <button
                onClick={stand}
                disabled={busy}
                className="bet-btn px-6 py-2 rounded-lg font-mono font-bold text-white text-sm border-2 border-white/20 hover:border-white/50"
              >
                🛑 Stand
              </button>
            </div>
          )}
        </div>
      )}

      {log.length > 0 && (
        <div className="max-h-[60px] overflow-y-auto text-xs font-mono text-muted-foreground space-y-1 leading-tight w-full max-w-md">
          {log.map((l,i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
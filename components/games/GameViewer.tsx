import React, { useState, useEffect, useRef } from 'react';
import { CurrencyRupee, Play, Target, Timer, Eye, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { formatBRL, formatTimeAgo } from '@/lib/utils-data';
import { useParticleEffects } from '@/hooks/useParticleEffects';

// ============================================================
// DATA
// ============================================================
const GAMES_LIST = [
  { type: 'slot', label: 'Slot', icon: '🎰', description: 'Rolete as rodadas e combinações vencedoras' },
  { type: 'roulette', label: 'Roleta', icon: '🎡', description: 'Aposte em números, cores ou paridade' },
  { type: 'blackjack', label: 'Blackjack', icon: '🃏', description: 'Chegue mais perto de 21 que o dealer' },
  { type: 'poker', label: 'Poker', icon: '🂡', description: 'Melhor mão de 5 cartas vence' },
  { type: 'bicho', label: 'Bicho', icon: '🐰', description: 'Escolha um animal — cada um com odds' },
  { type: 'dados', label: 'Dados', icon: '🎲', description: 'Aposte em qual face do dado sairá' },
];

const GAMES_CONFIG: Record<string, {
  name: string;
  icon: string;
  description: string;
  minBet: number;
  maxBet: number;
  defaultBet: number;
  outcomes: Array<{
    id: string;
    title: string;
    description: string;
    odds: number;
    probability: number;
    category: 'win' | 'loss' | 'neutral';
  }>;
}> = {
  slot: {
    name: 'Slot',
    icon: '🎰',
    description: 'Rolete as rodadas e combinações vencedoras',
    minBet: 10,
    maxBet: 5000,
    defaultBet: 50,
    outcomes: [
      { id: 'cherry', title: 'Cereja', description: '3 cerejas na linha de pagamento', odds: 2, probability: 0.12, category: 'win' },
      { id: 'seven', title: '777', description: 'Três 7s — jackpot!', odds: 50, probability: 0.005, category: 'win' },
      { id: 'lemon', title: 'Limão', description: '3 limões — pequena vitória', odds: 1.5, probability: 0.08, category: 'win' },
      { id: 'loss', title: 'Perda', description: 'Combinação não pagadora', odds: 0, probability: 0.795, category: 'loss' },
    ],
  },
  roulette: {
    name: 'Roleta',
    icon: '🎡',
    description: 'Aposte em números, cores ou paridade',
    minBet: 10,
    maxBet: 1000,
    defaultBet: 50,
    outcomes: [
      { id: 'red', title: 'Vermelho', description: 'A bola cai em número vermelho', odds: 1, probability: 18/37, category: 'neutral' },
      { id: 'black', title: 'Preto', description: 'A bola cai em número preto', odds: 1, probability: 18/37, category: 'neutral' },
      { id: 'green', title: 'Verde (zero)', description: 'A casa ganha — zero na roleta', odds: 0, probability: 1/37, category: 'loss' },
      { id: 'specific', title: 'Número específico', description: 'Adivinhe o número exato (0-36)', odds: 35, probability: 1/37, category: 'win' },
    ],
  },
  blackjack: {
    name: 'Blackjack',
    icon: '🃏',
    description: 'Chegue mais perto de 21 que o dealer, sem estourar',
    minBet: 10,
    maxBet: 2000,
    defaultBet: 50,
    outcomes: [
      { id: 'bj', title: 'Blackjack natural', description: '21 exato com 2 cartas — paga 3:2', odds: 1.5, probability: 0.0475, category: 'win' },
      { id: 'win', title: 'Você vence', description: 'Mão mais alta que o dealer, sem estourar', odds: 1, probability: 0.35, category: 'win' },
      { id: 'push', title: 'Empate', description: 'Mesmo valor que o dealer — aposta volta', odds: 0, probability: 0.08, category: 'neutral' },
      { id: 'lose', title: 'Dealer vence', description: 'Dealer tem mão mais alta ou você estoura', odds: 0, probability: 0.5225, category: 'loss' },
    ],
  },
  poker: {
    name: 'Poker',
    icon: '🂡',
    description: 'Melhor mão de 5 cartas vence — ranking comparativo',
    minBet: 10,
    maxBet: 1000,
    defaultBet: 50,
    outcomes: [
      { id: 'royal', title: 'Royal Flush', description: 'A-K-Q-J-10 mesmo naipe — 50x', odds: 50, probability: 0.0000015, category: 'win' },
      { id: 'straight_flush', title: 'Straight Flush', description: '5 cartas sequenciais mesmo naipe — 25x', odds: 25, probability: 0.000014, category: 'win' },
      { id: 'four', title: 'Four of a Kind', description: '4 cartas do mesmo rank — 10x', odds: 10, probability: 0.00024, category: 'win' },
      { id: 'full_house', title: 'Full House', description: 'Trinca + par — 5x', odds: 5, probability: 0.00144, category: 'win' },
      { id: 'flush', title: 'Flush', description: '5 cartas mesmo naipe — 3x', odds: 3, probability: 0.00197, category: 'win' },
      { id: 'straight', title: 'Straight', description: '5 cartas sequenciais — 2x', odds: 2, probability: 0.00393, category: 'win' },
      { id: 'three', title: 'Trinca', description: '3 cartas do mesmo rank — 1.5x', odds: 1.5, probability: 0.0211, category: 'win' },
      { id: 'two_pair', title: 'Two Pair', description: 'Dois pares — 1x', odds: 1, probability: 0.0475, category: 'win' },
      { id: 'pair', title: 'Par', description: 'Um par — 0.5x', odds: 0.5, probability: 0.4226, category: 'win' },
      { id: 'high_card', title: 'High Card', description: 'Nenhuma das anteriores — perda', odds: 0, probability: 0.502, category: 'loss' },
    ],
  },
  bicho: {
    name: 'Jogo do Bicho',
    icon: '🐰',
    description: 'Escolha um animal. Cada animal tem probabilidade diferente',
    minBet: 10,
    maxBet: 5000,
    defaultBet: 50,
    outcomes: (() => {
      const animals = [
        { id: 'ave', name: 'Ave', emoji: '🦅', probability: 0.08, odds: 12 },
        { id: 'urso', name: 'Urso', emoji: '🐻', probability: 0.06, odds: 15 },
        { id: 'coelho', name: 'Coelho', emoji: '🐇', probability: 0.04, odds: 22 },
        { id: 'cabra', name: 'Cabra', emoji: '🐐', probability: 0.10, odds: 9 },
        { id: 'cachorro', name: 'Cachorro', emoji: '🐕', probability: 0.07, odds: 13 },
        { id: 'gato', name: 'Gato', emoji: '🐈', probability: 0.05, odds: 18 },
        { id: 'elefante', name: 'Elefante', emoji: '🐘', probability: 0.09, odds: 10 },
        { id: 'leao', name: 'Leão', emoji: '🦁', probability: 0.03, odds: 30 },
        { id: 'tubarao', name: 'Tubarão', emoji: '🦈', probability: 0.12, odds: 7 },
        { id: 'porco', name: 'Porco', emoji: '🐖', probability: 0.15, odds: 6 },
        { id: 'galo', name: 'Galo', emoji: '🐓', probability: 0.08, odds: 11 },
        { id: 'oficial', name: 'Oficial', emoji: '🎖️', probability: 0.08, odds: 11 },
        { id: 'coruja', name: 'Coruja', emoji: '🦉', probability: 0.05, odds: 18 },
      ];
      return animals.map(a => ({
        id: a.id,
        title: a.name,
        description: `Sai o ${a.name} ${a.emoji}`,
        odds: a.odds,
        probability: a.probability,
        category: 'win' as const,
      }));
    })(),
  },
  dados: {
    name: 'Dados',
    icon: '🎲',
    description: 'Aposte em qual face do dado sairá',
    minBet: 10,
    maxBet: 1000,
    defaultBet: 50,
    outcomes: [
      { id: '1', title: '1', description: 'O dado mostra 1', odds: 5, probability: 1/6, category: 'win' },
      { id: '2', title: '2', description: 'O dado mostra 2', odds: 5, probability: 1/6, category: 'win' },
      { id: '3', title: '3', description: 'O dado mostra 3', odds: 5, probability: 1/6, category: 'win' },
      { id: '4', title: '4', description: 'O dado mostra 4', odds: 5, probability: 1/6, category: 'win' },
      { id: '5', title: '5', description: 'O dado mostra 5', odds: 5, probability: 1/6, category: 'win' },
      { id: '6', title: '6', description: 'O dado mostra 6', odds: 5, probability: 1/6, category: 'win' },
    ],
  },
};

// ============================================================
// HELPER FORMAT
// ============================================================
function formatProb(p: number): string {
  if (p <= 0.001) return `${(p * 100).toFixed(4)}%`;
  if (p <= 0.01) return `${(p * 100).toFixed(3)}%`;
  return `${(p * 100).toFixed(1)}%`;
}

// ============================================================
// ÍCONES
// ============================================================
function WonIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2 2 4-4" />
    </svg>
  );
}

function LostIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
}

function Loader2Icon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

// ============================================================
// Jogo
// ============================================================
function Game({
  type,
  initialBet,
}: {
  type: string;
  initialBet?: number;
}) {
  const config = GAMES_CONFIG[type] || GAMES_CONFIG['slot'];
  const [state, setState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [betAmount, setBetAmount] = useState(initialBet ?? config.defaultBet);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [result, setResult] = useState<{
    won: boolean;
    payout: number;
    outcomeTitle: string;
    message: string;
  } | null>(null);
  const [history, setHistory] = useState<Array<{
    outcomeTitle: string;
    won: boolean;
    payout: number;
    timestamp: number;
  }>>([]);
  const [busy, setBusy] = useState(false);
  const { canvasRef, containerRef, triggerWin, triggerLoss } = useParticleEffects();

  // Reset ao trocar de jogo
  useEffect(() => {
    setState('idle');
    setResult(null);
    setSelectedOutcome(null);
    setHistory([]);
    setBusy(false);
    setBetAmount(config.defaultBet);
  }, [type]);

  const handlePlay = async () => {
    if (!selectedOutcome || busy) return;

    setBusy(true);
    setState('playing');

    // Delay dramático
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    // Escolhe resultado baseado em probabilidades
    const rand = Math.random();
    let cumulative = 0;
    let chosen: typeof config.outcomes[0] | null = null;

    for (const outcome of config.outcomes) {
      cumulative += outcome.probability;
      if (rand <= cumulative) {
        chosen = outcome;
        break;
      }
    }

    if (!chosen) chosen = config.outcomes[config.outcomes.length - 1];

    const won = chosen.category === 'win';
    const payout = won ? betAmount * chosen.odds : 0;

    setResult({
      won,
      payout,
      outcomeTitle: chosen.title,
      message: chosen.description,
    });

    setHistory(prev => [
      { outcomeTitle: chosen.title, won, payout, timestamp: Date.now() },
      ...prev.slice(0, 49),
    ]);

    setState('result');

    if (won) triggerWin();
    else triggerLoss();

    setBusy(false);
  };

  const betPresets = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100].map(
    mult => Math.round(config.defaultBet * mult)
  ).filter(v => v >= config.minBet && v <= config.maxBet);

  return (
    <div className="game-viewer">
      {/* Canvas de fundo */}
      <div ref={containerRef} className="game-viewer__particle-overlay">
        <canvas ref={canvasRef} className="game-viewer__canvas" />
      </div>

      {/* Header */}
      <div className="game-viewer__header">
        <div className="game-viewer__title-row">
          <span className="game-viewer__icon">{config.icon}</span>
          <h2 className="game-viewer__name">{config.name}</h2>
        </div>
        <p className="game-viewer__desc">{config.description}</p>
      </div>

      {/* Estado: idle */}
      {state === 'idle' && (
        <div className="game-viewer__idle">
          {/* Bet control */}
          <div className="bet-control">
            <div className="bet-control__label-row">
              <CurrencyRupee size={14} className="text-dim" />
              <span className="bet-control__label">Aposta</span>
            </div>
            <input
              type="number"
              className="bet-input"
              value={betAmount}
              min={config.minBet}
              max={config.maxBet}
              onChange={e => {
                const v = parseInt(e.target.value) || 0;
                setBetAmount(Math.max(config.minBet, Math.min(config.maxBet, v)));
              }}
            />
            <div className="bet-presets">
              {betPresets.map(val => (
                <button
                  key={val}
                  className={`bet-preset ${betAmount === val ? 'bet-preset--active' : ''}`}
                  onClick={() => setBetAmount(val)}
                  title={formatBRL(val)}
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Outcomes por categoria */}
          {(['win', 'neutral', 'loss'] as const).map(category => {
            const outcomes = config.outcomes.filter(o => o.category === category);
            if (outcomes.length === 0) return null;
            const label = category === 'win' ? 'PAGAMENTOS' : category === 'loss' ? 'PERDAS' : 'NEUTROS';
            const isWin = category === 'win';

            return (
              <div key={category} className={`outcomes-group outcomes-group--${category}`}>
                <p className="outcomes-group__label">{label}</p>
                <div className="outcomes-grid">
                  {outcomes.map(outcome => (
                    <button
                      key={outcome.id}
                      className={`outcome-card ${selectedOutcome === outcome.id ? 'outcome-card--selected' : ''}`}
                      onClick={() => {
                        setSelectedOutcome(outcome.id);
                        setResult(null);
                      }}
                      title={outcome.description}
                    >
                      <span className="outcome-card__title">{outcome.title}</span>
                      <span className="outcome-card__odds">
                        {outcome.odds > 0 ? `×${outcome.odds}` : outcome.category === 'loss' ? '—' : 'devolve'}
                      </span>
                      <span className="outcome-card__prob">{formatProb(outcome.probability)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Botão jogar */}
          <button
            className="btn btn--primary play-btn"
            onClick={handlePlay}
            disabled={busy || !selectedOutcome}
            style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
          >
            {busy ? (
              <>
                <Loader2Icon size={16} />
                JOGANDO...
              </>
            ) : (
              <>
                <Play size={16} />
                JOGAR {formatBRL(betAmount)}
              </>
            )}
          </button>
        </div>
      )}

      {/* Estado: resultado */}
      {state === 'result' && result && (
        <div className={`game-result game-result--${result.won ? 'win' : 'loss'}`}>
          <div className="game-result__icon">
            {result.won ? <WonIcon /> : <LostIcon />}
          </div>
          <p className="game-result__title">
            {result.won ? 'PARABÉNS!' : 'A CASA GANHOU'}
          </p>
          <p className="game-result__outcome">{result.outcomeTitle}</p>
          <p className="game-result__message">{result.message}</p>
          {result.won && result.payout > 0 && (
            <p className="game-result__payout">
              <CurrencyRupee size={16} />
              +{formatBRL(result.payout)}
            </p>
          )}
          <div className="game-result__actions">
            <button
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setState('idle');
                setResult(null);
                setSelectedOutcome(null);
              }}
            >
              Jogar novamente
            </button>
          </div>
        </div>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <div className="history">
          <div className="history__header">
            <Eye size={12} className="text-dim" />
            <span className="label">Últimas {Math.min(history.length, 10)} rodadas</span>
          </div>
          <div className="history__list">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className={`history__item history__item--${h.won ? 'win' : 'loss'}`}>
                <span className="history__outcome">{h.outcomeTitle}</span>
                <span className="history__payout">
                  {h.payout > 0
                    ? `+${formatBRL(h.payout)}`
                    : h.payout === 0
                    ? '—'
                    : `-${formatBRL(Math.abs(h.payout))}`}
                </span>
                <span className="history__time">{formatTimeAgo(h.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamesSection({ onGameSelect }: { onGameSelect?: (type: string) => void }) {
  const [selectedGame, setSelectedGame] = useState('slot');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { canvasRef, containerRef, triggerWin, triggerLoss } = useParticleEffects();

  const handleGameSelect = (type: string) => {
    setSelectedGame(type);
    onGameSelect?.(type);
  };

  return (
    <div className="games-section">
      {/* Overlay de partículas */}
      <div ref={containerRef} className="games-section__particle-overlay">
        <canvas ref={canvasRef} className="games-section__canvas" />
      </div>

      {/* Header */}
      <div className="games-section__header">
        <div className="games-section__header-inner">
          <div className="games-section__brand">
            <Sparkles size={18} className="text-gold" />
            <span className="games-section__title">CASSINO REVERSO</span>
          </div>
          <div className="games-section__actions">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowLeaderboard(!showLeaderboard)}
            >
              <Target size={14} />
              Ranking
            </button>
          </div>
        </div>
      </div>

      <div className="games-section__main">
        {/* Tabs de jogos */}
        <div className="game-tabs" role="tablist" aria-label="Selecione o jogo">
          {GAMES_LIST.map(game => (
            <button
              key={game.type}
              role="tab"
              aria-selected={selectedGame === game.type}
              className={`game-tab ${selectedGame === game.type ? 'game-tab--selected' : ''}`}
              onClick={() => handleGameSelect(game.type)}
            >
              <span className="game-tab__icon" aria-hidden="true">{game.icon}</span>
              <span className="game-tab__label">{game.label}</span>
            </button>
          ))}
        </div>

        {/* Panel do jogo */}
        <div className="game-panel" role="region" aria-label={`Jogo: ${GAMES_LIST.find(g => g.type === selectedGame)?.label}`}>
          <Game type={selectedGame} />
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="leaderboard-panel" role="region" aria-label="Ranking">
            <div className="leaderboard-panel__header">
              <Target size={16} className="text-gold" />
              <span className="leaderboard-panel__title">Ranking</span>
            </div>
            <div className="leaderboard-empty">
              <CheckCircle size={24} className="text-dim" />
              <p>Faça algumas apostas para aparecer no ranking.</p>
              <p className="body-small">Quem perde menos ganha.</p>
            </div>
          </div>
        )}
      </div>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker__indicator" aria-hidden="true"></div>
        <span className="ticker__label">AO VIVO</span>
        <div className="ticker__content">
          <div className="ticker__track">
            {Array.from({ length: 8 }, (_, i) => [
              ...LIVE_MESSAGES,
              ...LIVE_MESSAGES,
            ][i] || LIVE_MESSAGES[i % LIVE_MESSAGES.length]).map((m, i) => {
              // Deduplicate: show 16 items
              const item = LIVE_MESSAGES[i % LIVE_MESSAGES.length];
              return (
                <span key={i} className="ticker__item">
                  <span className="ticker__item__user">{item.user}</span>
                  <span className="ticker__item__action ticker__item__action--win">{item.action}</span>
                  <span className="ticker__item__time">{item.time}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

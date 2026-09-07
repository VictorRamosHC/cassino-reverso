'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, Heart, Zap, Target, Activity, LogOut, ArrowRight, Shield, Sparkles, Trophy } from 'lucide-react';
import { formatBRL } from '@/lib/utils-data';
import { GAMES, LIVE_MESSAGES } from '@/lib/utils-data';
import { TelaLogin } from '@/components/layout/TelaLogin';
import { Leaderboard } from '@/components/layout/Leaderboard';
import GameSlot from '@/components/games/GameSlot';
import GameBicho from '@/components/games/GameBicho';
import GameBoard from '@/components/games/GameBoard';
import GameRoulette from '@/components/games/GameRoulette';
import GameBlackjack from '@/components/games/GameBlackjack';
import GamePoker from '@/components/games/GamePoker';
import SurvivalChart from '@/components/charts/SurvivalChart';
import { useParticleEffects } from '@/hooks/useParticleEffects';

type Snapshot = {
  balance: number;
  totalLost: number;
  rounds: number;
  riskScore: number;
  recent: Array<{
    tipo_jogo: string;
    resultado: string;
    saldo_depois_centavos: number;
  }>;
};

type Leader = {
  nome: string;
  matricula: string;
  balance: number;
  rounds: number;
  lost: number;
};

export default function Home() {
  const [user, setUser] = useState<{ nome: string; matricula: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [activeGame, setActiveGame] = useState('slot');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [register, setRegister] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [animalSelected, setAnimalSelected] = useState('Águia');
  const [betAmount, setBetAmount] = useState(10);
  const [winEffect, setWinEffect] = useState(false);
  const [lossEffect, setLossEffect] = useState(false);

  const { canvasRef, containerRef, triggerWin, triggerLoss } = useParticleEffects();

  async function loadDashboard() {
    try {
      const r = await fetch('/api/dashboard');
      if (r.ok) {
        const d = await r.json();
        setSnapshot(d.snapshot);
        setLeaders(d.leaderboard);
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
          loadDashboard();
        }
      });
  }, []);

  const handlePlay = useCallback(
    async (extra?: any) => {
      if (busy) return;
      setBusy(true);
      setMessage('Resolvendo no servidor…');
      try {
        const payload: any = { game: activeGame, bet_amount: betAmount };
        if (activeGame === 'animal') payload.animal = animalSelected;
        if (activeGame === 'roulette') {
          payload.betType = extra?.betType;
          payload.value = extra?.value;
        }
        const r = await fetch('/api/games', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) {
          setMessage(d.error || 'Erro no jogo.');
        } else {
          setSnapshot(d.snapshot);
          if (d.won) {
            triggerWin();
            setWinEffect(true);
            setTimeout(() => setWinEffect(false), 2000);
          } else {
            triggerLoss();
            setLossEffect(true);
            setTimeout(() => setLossEffect(false), 1000);
          }
          if (activeGame === 'slot')
            setMessage(d.won ? '🎉 GANHOU! Bônus na banca!' : '💀 A banca venceu. Tente de novo.');
          else if (activeGame === 'animal')
            setMessage(
              d.won
                ? `🎉 SAIU O ${d.animal}! Você ganhou R$13,50.`
                : `💀 NÃO SAIU. A banca ficou com sua aposta.`
            );
          else if (activeGame === 'board')
            setMessage(d.won ? '🟢 Casa neutra — você preservou.' : '🏠 A banca absorveu sua aposta.');
          else if (activeGame === 'roulette')
            setMessage(d.won ? `🎯 ${d.outcomeText} GANHOU!` : `🎯 ${d.outcomeText} PERDEU.`);
          else if (activeGame === 'blackjack') setMessage(d.won ? `🃏 ${d.resultText}` : `🃏 ${d.resultText}`);
          else if (activeGame === 'poker') setMessage(d.won ? `🂡 ${d.outcomeText}` : `🂡 ${d.outcomeText}`);
          await loadDashboard();
        }
      } catch (e: any) {
        setMessage('Erro de conexão. Tente novamente.');
      }
      setBusy(false);
    },
    [activeGame, busy, animalSelected, betAmount, triggerWin, triggerLoss]
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(
        register ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            register ? { nome, matricula, senha } : { matricula, senha }
          ),
        }
      );
      const d = await r.json();
      if (!r.ok) {
        setMessage(d.error || 'Não foi possível continuar.');
      } else {
        setUser(d.user);
        await loadDashboard();
        setMessage('');
      }
    } catch {
      setMessage('Erro de conexão.');
    }
    setBusy(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSnapshot(null);
  };

  if (!user)
    return (
      <TelaLogin
        matricula={matricula}
        setMatricula={setMatricula}
        senha={senha}
        setSenha={setSenha}
        nome={nome}
        setNome={setNome}
        busy={busy}
        register={register}
        setRegister={setRegister}
        message={message}
        handleSubmit={handleRegister}
      />
    );

  const game = GAMES.find((g) => g.id === activeGame) || GAMES[0];
  const winMessage =
    message.includes('GANHOU') ||
    message.includes('ACERTOU') ||
    message.includes('Saiu');

  const renderGame = () => {
    switch (activeGame) {
      case 'slot':
        return (
          <GameSlot
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
      case 'animal':
        return (
          <GameBicho
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
      case 'board':
        return (
          <GameBoard
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
      case 'roulette':
        return <GameRoulette onPlay={handlePlay} busy={busy} balance={snapshot?.balance || 0} />;
      case 'blackjack':
        return (
          <GameBlackjack
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
      case 'poker':
        return (
          <GamePoker
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
      default:
        return (
          <GameSlot
            onPlay={handlePlay}
            busy={busy}
            balance={snapshot?.balance || 0}
            onWin={() => triggerWin()}
            onLoss={() => triggerLoss()}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* PARTICLES CANVAS */}
      <div ref={containerRef} className="fixed inset-0 pointer-events-none z-50">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="gold-sheen grid size-9 place-items-center rounded-lg overflow-hidden">
              <Sparkles size={19} className="text-gold" />
            </div>
            <span className="font-mono text-sm font-bold tracking-wider text-gold neon-text">
              CASSINO REVERSO
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline font-mono text-xs">
              {user?.nome}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-red-400 text-xs"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 pb-28">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {/* BANNER */}
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm">
            <Shield size={18} className="shrink-0 text-gold" />
            <span>
              <strong className="text-gold">A casa sempre lucra.</strong>{' '}
              Sua missão: sobreviver o máximo possível.
            </span>
          </div>

          {/* HERO */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
            <div>
              <p className="eyebrow">Painel de sobrevivência</p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-balance neon-text md:text-4xl">
                Quem perde menos, ganha.
              </h1>
              <p className="mt-1 text-muted-foreground text-sm">
                Seu saldo é sua pontuação. O ranking mostra quem conseguiu preservar mais.
              </p>
            </div>
            <div className="flex self-start items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm md:self-auto">
              <Activity size={16} className="text-emerald" />
              <span className="font-mono text-xs text-emerald">SERVIDOR ONLINE</span>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            <div className="stat-card">
              <Coins className="mx-auto mb-1" size={18} color="var(--gold)" />
              <p className="stat-label">Saldo</p>
              <p className="stat-value sm:text-lg">{formatBRL(snapshot?.balance || 0)}</p>
            </div>
            <div className="stat-card">
              <Heart className="mx-auto mb-1" size={18} color="var(--red)" />
              <p className="stat-label">Perdido</p>
              <p className="stat-value sm:text-lg text-red-400">
                {formatBRL(snapshot?.totalLost || 0)}
              </p>
            </div>
            <div className="stat-card">
              <Zap className="mx-auto mb-1" size={18} color="var(--gold)" />
              <p className="stat-label">Rodadas</p>
              <p className="stat-value sm:text-lg">{snapshot?.rounds || 0}</p>
            </div>
            <div className="stat-card">
              <Target className="mx-auto mb-1" size={18} color="var(--gold)" />
              <p className="stat-label">Risco</p>
              <p className="stat-value sm:text-lg">{snapshot?.riskScore || 0}/100</p>
            </div>
          </div>

          {/* MENSAGEM */}
          {message && (
            <div
              className={`mb-5 rounded-lg p-4 text-sm font-mono ${
                winMessage
                  ? 'border border-green-500/50 bg-green-500/10 text-green-300 win-bloom'
                  : 'border border-red-500/50 bg-red-500/10 text-red-300 loss-flash'
              }`}
            >
              {message}
            </div>
          )}

          {/* GAME SECTION */}
          <div className="mb-6">
            {/* GAME HEADER */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-mono text-gold uppercase tracking-wider">
                Jogos
              </h2>
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Aposta:</label>
                <select
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="h-8 w-20 rounded bg-background border border-gold/30 px-2 text-gold font-mono text-sm"
                >
                  {[5, 10, 25, 50, 100].map((v) => (
                    <option key={v} value={v} className="bg-black">
                      R$ {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GAME TABS */}
            <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGame(g.id);
                    setMessage('');
                  }}
                  className={`game-btn text-center p-2 rounded-lg border transition-all ${
                    activeGame === g.id
                      ? 'border-gold bg-gold/10 shadow-md'
                      : 'border-gold/20 bg-card/50 hover:border-gold/40'
                  }`}
                >
                  <span className="emoji block text-2xl mb-1">{g.icon}</span>
                  <span className="text-xs font-mono font-bold text-gold">{g.title}</span>
                </button>
              ))}
            </div>

            {/* GAME STAGE */}
            <div
              className={`game-stage rounded-xl p-4 transition-all ${
                winEffect ? 'win-bloom' : ''
              } ${lossEffect ? 'loss-flash' : ''}`}
            >
              <div className="mx-auto max-w-2xl">{renderGame()}</div>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => handlePlay()}
              disabled={busy || (snapshot?.balance || 0) < betAmount}
              className="bet-btn flex-1 min-w-[140px] flex items-center justify-center gap-2 text-sm"
            >
              {busy ? '⏳ processing...' : '🎯 APOSTAR'}
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setShowSecondary(!showSecondary)}
              className="premium-card px-4 py-2 rounded-lg font-mono font-bold transition-colors text-gold hover:text-white text-xs"
            >
              🏆 Ranking {leaders.length > 0 ? `• #1: ${leaders[0].nome}` : ''}
            </button>
            <button
              onClick={() => setShowSecondary(!showSecondary)}
              className="premium-card px-4 py-2 rounded-lg font-mono font-bold transition-colors text-muted-foreground hover:text-white text-xs"
            >
              📊 Extrato
            </button>
          </div>

          {/* SECONDARY INFO */}
          {showSecondary && (
            <div className="grid gap-4 mb-6 md:grid-cols-2">
              <div className="premium-card p-4">
                <h3 className="mb-3 text-sm font-mono text-gold uppercase tracking-wider">
                  🏆 Ranking — Quem perdeu menos
                </h3>
                <Leaderboard leaders={leaders} />
              </div>
              <div className="premium-card p-4">
                <h3 className="mb-3 text-sm font-mono text-gold uppercase tracking-wider">
                  📊 Evolução da banca
                </h3>
                <SurvivalChart recent={snapshot?.recent || []} />
              </div>
            </div>
          )}

          {/* HISTÓRICO RECENTE */}
          {!showSecondary && (
            <div className="premium-card p-4">
              <h3 className="mb-3 text-sm font-mono text-gold uppercase tracking-wider">
                📊 Histórico recente
              </h3>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {snapshot?.recent && snapshot.recent.length > 0 ? (
                  snapshot.recent.slice(0, 8).map((r, i) => {
                    const prevSaldo =
                      i > 0 ? snapshot.recent[i - 1]?.saldo_depois_centavos || 0 : 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b border-gold/10 py-1 text-xs font-mono last:border-0"
                      >
                        <span className="text-muted-foreground">{r.tipo_jogo}</span>
                        <span
                          className={
                            r.saldo_depois_centavos > prevSaldo
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {(r.saldo_depois_centavos / 100).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Faça uma aposta para ver o histórico aqui.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* LIVE TICKER */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold/30 bg-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl overflow-hidden px-4 py-2">
          <div className="mb-1 flex items-center gap-2 text-xs font-mono text-gold">
            <span className="led-red inline-block size-2 rounded-full" />
            AO VIVO
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <div className="ticker inline-block">
              {[...LIVE_MESSAGES, ...LIVE_MESSAGES].map((m, i) => (
                <span key={i} className="inline-block mr-8 text-xs text-muted-foreground">
                  <span className="text-gold font-bold">
                    {m.emoji} {m.user}
                  </span>{' '}
                  {m.game}:{' '}
                  <span
                    className={
                      m.action.includes('GANHOU') ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {m.action}
                  </span>{' '}
                  <span className="opacity-50 text-xs">{m.time}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

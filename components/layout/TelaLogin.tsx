'use client';

import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface TelaLoginProps {
  matricula: string;
  setMatricula: (v: string) => void;
  senha: string;
  setSenha: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  busy: boolean;
  register: boolean;
  setRegister: (v: boolean) => void;
  message: string;
  handleSubmit: (e: React.FormEvent) => void;
}

export function TelaLogin({
  matricula, setMatricula,
  senha, setSenha,
  nome, setNome,
  busy, register, setRegister,
  message, handleSubmit
}: TelaLoginProps) {
  return (
    <main className="grid min-h-screen place-items-center p-4 bg-[var(--bg)]">
      <section className="premium-card w-full max-w-sm rounded-2xl p-8 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="gold-sheen grid size-10 place-items-center rounded-xl overflow-hidden">
            <ShieldCheck size={20} className="text-gold" />
          </div>
          <div>
            <p className="eyebrow">Laboratório de risco</p>
            <h1 className="font-serif text-xl font-bold neon-text">CASSINO REVERSO</h1>
          </div>
        </div>

        <h2 className="mt-2 font-serif text-2xl font-bold text-balance">
          {register ? 'Criar sua banca' : 'Iniciar sessão'}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Seu saldo inicial é sua pontuação. Quem conservar mais, ganha a rodada.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {register && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">Nome completo</span>
              <input
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="h-11 rounded-lg border border-gold/30 bg-surface px-3 text-gold placeholder:text-dim focus:outline-none focus:ring-1 focus:ring-gold/50"
                placeholder="Seu nome"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">Matrícula</span>
            <input
              required
              value={matricula}
              onChange={e => setMatricula(e.target.value)}
              className="h-11 rounded-lg border border-gold/30 bg-surface px-3 text-gold placeholder:text-dim focus:outline-none focus:ring-1 focus:ring-gold/50"
              placeholder="Ex: 20260001"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">Senha</span>
            <input
              required
              minLength={6}
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="h-11 rounded-lg border border-gold/30 bg-surface px-3 text-gold placeholder:text-dim focus:outline-none focus:ring-1 focus:ring-gold/50"
              placeholder="••••••"
            />
          </label>

          <button
            disabled={busy}
            className="gold-sheen mt-1 flex h-11 items-center justify-center gap-2 rounded-lg font-bold disabled:opacity-50 text-white"
          >
            {busy ? 'Aguarde…' : register ? 'Criar banca' : 'Entrar'}
            <ArrowRight size={16} />
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-red-400 font-mono">{message}</p>
        )}

        <div className="mt-5 flex items-center justify-between text-xs">
          <button
            onClick={() => setRegister(!register)}
            className="text-gold/70 hover:text-gold transition-colors"
          >
            {register ? 'Já tenho banca' : 'Criar nova banca'}
          </button>
          <span className="text-muted-foreground">v1.0</span>
        </div>
      </section>
    </main>
  );
}
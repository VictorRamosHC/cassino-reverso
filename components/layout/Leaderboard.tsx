'use client';

import { Trophy, Crown, Medal } from 'lucide-react';
import { Leader } from '@/app/page';

interface Props {
  leaders: Leader[];
}

export function Leaderboard({ leaders }: Props) {
  return (
    <div className="premium-card rounded-xl p-5 mb-6">
      <h2 className="font-mono text-lg font-bold text-gold mb-4 flex items-center gap-2">
        <Trophy className="text-gold" size={20} />
        🏆 Quem PERDEU MENOS — Ranking
      </h2>
      <div className="space-y-2">
        {leaders.map((l, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={l.matricula} className={`leaderboard-row ${i === 0 ? 'winner' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold">{medals[i] || `#${i + 1}`}</span>
                <div>
                  <p className="font-mono text-sm text-white">{l.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">{l.matricula}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">{l.rounds} rod.</span>
                <span className={`font-mono text-sm font-bold ${l.lost > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {l.lost > 0 ? `R$ ${l.lost}` : '0'} perdido
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-center text-muted-foreground">
        A posição de cada jogador reflete quanto ele conseguiu PRESERVAR. Quem menos perdeu, é o vencedor.
      </p>
    </div>
  );
}

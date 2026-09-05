'use server';

import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function TransactionHistory() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('cassino_session')?.value;
  if (!sessionId) return null;
  const user = await getSessionUser(sessionId);
  if (!user) return null;

  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY criado_em DESC LIMIT 20'
  ).all(user.id) as any[];

  if (transactions.length === 0) {
    return (
      <div className="premium-card rounded-xl p-5 mb-6">
        <h2 className="font-mono text-lg font-bold text-gold mb-4">📊 Extrato</h2>
        <p className="text-sm text-muted-foreground text-center">Nenhuma transação ainda.</p>
      </div>
    );
  }

  return (
    <div className="premium-card rounded-xl p-5 mb-6">
      <h2 className="font-mono text-lg font-bold text-gold mb-4 flex items-center gap-2">
        <span>💰</span> Extrato de Apostas
      </h2>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {transactions.map(t => (
          <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-gold/10">
            <div className="flex items-center gap-2">
              <span className={`font-mono ${t.tipo === 'resultado' ? 'text-green-400' : 'text-red-400'}`}>
                {t.tipo === 'resultado' ? '+' : '-'}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(t.criado_em).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-bold ${t.valor_centavos > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {t.tipo === 'resultado' ? '+' : '-'}R$ {(t.valor_centavos / 100).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{t.tipo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

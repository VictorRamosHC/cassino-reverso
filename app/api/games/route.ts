import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initializeDatabase } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { playSlot, playAnimal, playBoard, playRoulette, playBlackjack, playPoker } from '@/lib/game-engine';
initializeDatabase();

export async function POST(req: Request) {
  try {
    const cookie = (await cookies()).get('cassino_session')?.value;
    const user: any = cookie ? await getSessionUser(cookie) : null;
    if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    if (!checkRateLimit(user.id)) return NextResponse.json({ error: 'Aguarde entre rodadas.' }, { status: 429 });

    const body = await req.json();
    const bet = Math.round(Number(body.bet_amount) * 100);
    if (!Number.isFinite(bet) || bet <= 0) return NextResponse.json({ error: 'Aposta inválida.' }, { status: 400 });

    let result: any;
    switch (body.game) {
      case 'slot':
        result = playSlot(user.id, bet);
        break;
      case 'animal':
        result = playAnimal(user.id, bet, String(body.animal || 'Avestruz'));
        break;
      case 'board':
        result = playBoard(user.id, bet);
        break;
      case 'roulette':
        result = playRoulette(user.id, bet, String(body.betType) as any, body.value ? Number(body.value) : undefined);
        break;
      case 'blackjack':
        result = playBlackjack(user.id, bet);
        break;
      case 'poker':
        result = playPoker(user.id, bet);
        break;
      default:
        return NextResponse.json({ error: 'Jogo não encontrado.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao resolver rodada.' }, { status: 400 });
  }
}

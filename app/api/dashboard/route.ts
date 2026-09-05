import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initializeDatabase } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { snapshot, leaderboard } from '@/lib/game-engine';
initializeDatabase();
export async function GET() { const id = (await cookies()).get('cassino_session')?.value; const user: any = id ? await getSessionUser(id) : null; if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }); return NextResponse.json({ snapshot: snapshot(user.id), leaderboard: leaderboard() }); }

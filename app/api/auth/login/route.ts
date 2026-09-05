import { NextResponse } from 'next/server';
import { getUserByMatricula, verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';
initializeDatabase();
export async function POST(req: Request) {
  try { const { matricula, senha } = await req.json(); if (!matricula || !senha) return NextResponse.json({ error: 'Preencha matrícula e senha.' }, { status: 400 }); const user: any = getUserByMatricula(matricula); if (!user || !(await verifyPassword(senha, user.senha_hash))) return NextResponse.json({ error: 'Matrícula ou senha inválida.' }, { status: 401 }); const session = await createSession(user.id); await setSessionCookie(session); return NextResponse.json({ user: { nome: user.nome, matricula: user.matricula } }); } catch { return NextResponse.json({ error: 'Não foi possível entrar.' }, { status: 500 }); }
}

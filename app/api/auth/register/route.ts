import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'
import { createSession, createUser, getUserByMatricula, hashPassword, setSessionCookie } from '@/lib/auth'

initializeDatabase()

// Sanitiza strings para prevenir XSS e entradas maliciosas
function sanitize(value: string): string {
  return value.replace(/[<>'"]/g, '').trim();
}

export async function POST(req: Request) {
  try {
    const { nome, matricula, senha } = await req.json()

    // Sanitizar inputs
    const cleanNome = sanitize(String(nome || ''));
    const cleanMatricula = sanitize(String(matricula || ''));
    const cleanSenha = String(senha || '');

    if (cleanNome.length < 3 || cleanMatricula.length < 3 || cleanSenha.length < 6) {
      return NextResponse.json({ error: 'Informe nome, matrícula e senha válida.' }, { status: 400 })
    }

    if (cleanNome.length > 100 || cleanMatricula.length > 50) {
      return NextResponse.json({ error: 'Dados muito longos.' }, { status: 400 })
    }

    if (getUserByMatricula(cleanMatricula)) {
      return NextResponse.json({ error: 'Esta matrícula já possui acesso.' }, { status: 409 })
    }

    const userId = createUser(cleanNome, cleanMatricula, await hashPassword(cleanSenha))
    await setSessionCookie(await createSession(userId))
    return NextResponse.json({ user: { nome: cleanNome, matricula: cleanMatricula } }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Não foi possível criar o acesso.' }, { status: 500 }) }
}

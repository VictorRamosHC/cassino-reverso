import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'
import { createSession, createUser, getUserByMatricula, hashPassword, setSessionCookie } from '@/lib/auth'

initializeDatabase()
export async function POST(req: Request) {
  try {
    const { nome, matricula, senha } = await req.json()
    if (typeof nome !== 'string' || nome.trim().length < 3 || typeof matricula !== 'string' || matricula.trim().length < 3 || typeof senha !== 'string' || senha.length < 6) return NextResponse.json({ error: 'Informe nome, matrícula e senha válida.' }, { status: 400 })
    if (getUserByMatricula(matricula.trim())) return NextResponse.json({ error: 'Esta matrícula já possui acesso.' }, { status: 409 })
    const userId = createUser(nome.trim(), matricula.trim(), await hashPassword(senha))
    await setSessionCookie(await createSession(userId))
    return NextResponse.json({ user: { nome: nome.trim(), matricula: matricula.trim() } }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Não foi possível criar o acesso.' }, { status: 500 }) }
}

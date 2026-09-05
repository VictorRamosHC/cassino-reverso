import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { initializeDatabase } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

initializeDatabase()
export async function GET() {
  const value = (await cookies()).get('cassino_session')?.value
  const user: any = value ? await getSessionUser(value) : null
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  return NextResponse.json({ user: { nome: user.nome, matricula: user.matricula } })
}

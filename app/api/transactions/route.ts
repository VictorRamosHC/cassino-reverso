import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import db, { initializeDatabase } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

initializeDatabase()

export async function GET(request: Request) {
  const sessionId = (await cookies()).get('cassino_session')?.value
  const user = sessionId ? await getSessionUser(sessionId) : null
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 })
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const offset = (page - 1) * limit
  const rows = db.prepare(`SELECT id, tipo, valor_centavos, saldo_anterior_centavos, saldo_novo_centavos, descricao, criado_em FROM transactions WHERE user_id = ? ORDER BY criado_em DESC LIMIT ? OFFSET ?`).all(user.id, limit, offset)
  const total = (db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(user.id) as { count: number }).count
  return NextResponse.json({ transactions: rows, page, pages: Math.ceil(total / limit), total })
}

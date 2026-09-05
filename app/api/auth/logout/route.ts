import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearSessionCookie, deleteSession } from '@/lib/auth'

export async function POST() {
  const store = await cookies()
  const value = store.get('cassino_session')?.value
  if (value) await deleteSession(value)
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import db from './db';
import { randomBytes } from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
);

const SESSION_COOKIE_NAME = 'cassino_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface SessionData {
  userId: string;
  matricula: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const stmt = db.prepare(
    'INSERT INTO sessions (id, user_id, expira_em, criado_em) VALUES (?, ?, ?, ?)'
  );
  stmt.run(sessionId, userId, expiresAt, Date.now());

  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

export async function getSessionUser(sessionId: string): Promise<any | null> {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    INNER JOIN sessions s ON s.user_id = u.id
    WHERE s.id = ? AND s.expira_em > ?
    LIMIT 1
  `);
  return stmt.get(sessionId, Date.now()) || null;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const user = await getSessionUser(sessionId);
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      matricula: user.matricula,
    };
  } catch (error) {
    console.error('[auth] Error getting current user:', error);
    return null;
  }
}

export function getUserById(userId: string): any | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
  return stmt.get(userId) || null;
}

export function getUserByMatricula(matricula: string): any | null {
  const stmt = db.prepare('SELECT * FROM users WHERE matricula = ? LIMIT 1');
  return stmt.get(matricula) || null;
}

export function createUser(
  nome: string,
  matricula: string,
  senhaHash: string
): string {
  const userId = randomBytes(16).toString('hex');
  const now = Date.now();

  const stmt = db.prepare(
    `INSERT INTO users (id, nome, matricula, senha_hash, saldo_centavos, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(userId, nome, matricula, senhaHash, 100000, now, now);

  return userId;
}

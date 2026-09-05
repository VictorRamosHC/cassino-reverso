import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cassino.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema on first run
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      saldo_centavos INTEGER NOT NULL DEFAULT 100000,
      total_perdido_centavos INTEGER NOT NULL DEFAULT 0,
      rodadas_jogadas INTEGER NOT NULL DEFAULT 0,
      criado_em INTEGER NOT NULL,
      atualizado_em INTEGER NOT NULL
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expira_em INTEGER NOT NULL,
      criado_em INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Rounds table (detailed log of each jogo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tipo_jogo TEXT NOT NULL,
      aposta_centavos INTEGER NOT NULL,
      resultado TEXT NOT NULL,
      multiplicador REAL NOT NULL,
      saldo_antes_centavos INTEGER NOT NULL,
      saldo_depois_centavos INTEGER NOT NULL,
      criado_em INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL,
      saldo_anterior_centavos INTEGER NOT NULL,
      saldo_novo_centavos INTEGER NOT NULL,
      descricao TEXT,
      criado_em INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create indices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_matricula ON users(matricula);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expira_em ON sessions(expira_em);
    CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_criado_em ON rounds(criado_em);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  `);
}

export default db;

// ============================================================
// CASSINO REVERSO — TESTE RÁPIDO
// Validação manual dos endpoints essenciais
// ============================================================

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_DB = join(process.cwd(), '.data', 'test-quick.db');
if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
mkdirSync(join(process.cwd(), '.data'), { recursive: true });

const db = new Database(TEST_DB);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE users (id TEXT PRIMARY KEY, nome TEXT, matricula TEXT UNIQUE, senha_hash TEXT, saldo_centavos INTEGER DEFAULT 100000, total_perdido_centavos INTEGER DEFAULT 0, rodadas_jogadas INTEGER DEFAULT 0, criado_em INTEGER, atualizado_em INTEGER);
  CREATE TABLE rounds (id TEXT PRIMARY KEY, user_id TEXT, tipo_jogo TEXT, aposta_centavos INTEGER, resultado TEXT, multiplicador REAL, saldo_antes_centavos INTEGER, saldo_depois_centavos INTEGER, criado_em INTEGER);
`);

function transact(userId, game, bet, outcome, multiplier) {
  const run = db.transaction(() => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    if (bet <= 0) throw new Error('Bet must be positive');
    if (bet > user.saldo_centavos) throw new Error('Insufficient balance');
    const before = user.saldo_centavos;
    const payout = Math.round(bet * multiplier);
    const after = Math.max(0, before - bet + payout);
    const loss = Math.max(0, before - after);
    const now = Date.now();
    db.prepare('UPDATE users SET saldo_centavos=?, total_perdido_centavos=total_perdido_centavos+?, rodadas_jogadas=rodadas_jogadas+1, atualizado_em=? WHERE id=?').run(after, loss, now, userId);
    db.prepare('INSERT INTO rounds VALUES (?,?,?,?,?,?,?,?,?)').run(randomBytes(16).toString('hex'), userId, game, bet, outcome, multiplier, before, after, now);
    return { before, after, loss };
  });
  return run();
}

const users = {};
function createUser(nome, matricula, saldo = 100000) {
  const id = randomBytes(8).toString('hex');
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?)').run(id, nome, matricula, 'hash', saldo, 0, 0, Date.now(), Date.now());
  users[matricula] = id;
  return id;
}

let ok = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); ok++; }
  catch(e) { console.log(`✗ ${name}: ${e.message}`); fail++; }
}

// BLOCO 1: Criar usuários
console.log('── BLOCO 1: Usuários ──');
test('U1: criar usuário com saldo padrão', () => {
  const id = createUser('Teste U1', 'u1');
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (u.saldo_centavos !== 100000) throw new Error(`Esperado 100000, obtido ${u.saldo_centavos}`);
});
test('U2: criar usuário com saldo custom', () => {
  const id = createUser('Teste U2', 'u2', 50000);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (u.saldo_centavos !== 50000) throw new Error(`Esperado 50000, obtido ${u.saldo_centavos}`);
});
test('U3: matrícula única', () => {
  createUser('Teste U3a', 'u3');
  try {
    createUser('Teste U3b', 'u3');
    throw new Error('Deve ter falhado com UNIQUE');
  } catch(e) {
    if (!e.message.includes('UNIQUE')) throw e;
  }
});

// BLOCO 2: Transações básicas
console.log('\n── BLOCO 2: Transações ──');
test('T1: perder uma aposta', () => {
  const id = createUser('Teste T1', 't1');
  const r = transact(id, 'slot', 1000, 'Perdeu', 0);
  if (r.after !== 99000) throw new Error(`Esperado 99000, obtido ${r.after}`);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (u.total_perdido_centavos !== 1000) throw new Error(`Perda total incorreta: ${u.total_perdido_centavos}`);
});
test('T2: ganhar aposta 2.2x', () => {
  const id = createUser('Teste T2', 't2');
  const r = transact(id, 'slot', 1000, 'GANHOU 777', 2.2);
  if (r.after !== 101200) throw new Error(`Esperado 101200, obtido ${r.after}`);
});
test('T3: multiplicador fracionário 1.35x', () => {
  const id = createUser('Teste T3', 't3');
  const r = transact(id, 'bicho', 1000, 'Acertou', 1.35);
  if (r.after !== 100350) throw new Error(`Esperado 100350, obtido ${r.after}`);
});
test('T4: empate devolve aposta (mult=1)', () => {
  const id = createUser('Teste T4', 't4');
  const r = transact(id, 'blackjack', 1000, 'Empate', 1);
  if (r.after !== 100000) throw new Error(`Esperado 100000, obtido ${r.after}`);
  if (r.loss !== 0) throw new Error(`Perda deveria ser 0, obtido ${r.loss}`);
});

// BLOCO 3: Validações
console.log('\n── BLOCO 3: Validações ──');
test('V1: não pode apostar mais que saldo', () => {
  const id = createUser('Teste V1', 'v1', 500);
  try {
    transact(id, 'slot', 1000, 'Tentativa', 0);
    throw new Error('Deve ter falhado');
  } catch(e) {
    if (!e.message.includes('Insufficient')) throw e;
  }
});
test('V2: aposta zero não é permitida', () => {
  const id = createUser('Teste V2', 'v2');
  try {
    transact(id, 'slot', 0, 'Tentativa', 0);
    throw new Error('Deve ter falhado');
  } catch(e) {
    if (!e.message.includes('positive')) throw e;
  }
});
test('V3: usuário inexistente', () => {
  try {
    transact('inexistente', 'slot', 1000, 'Tentativa', 0);
    throw new Error('Deve ter falhado');
  } catch(e) {
    if (!e.message.includes('not found')) throw e;
  }
});

// BLOCO 4: Histórico
console.log('\n── BLOCO 4: Histórico ──');
test('H1: cada transação gera um round', () => {
  const id = createUser('Teste H1', 'h1');
  transact(id, 'slot', 1000, 'R1', 0);
  transact(id, 'bicho', 2000, 'R2', 1.35);
  const rounds = db.prepare('SELECT * FROM rounds WHERE user_id=? ORDER BY criado_em DESC').all(id);
  if (rounds.length !== 2) throw new Error(`Esperado 2 rounds, obtido ${rounds.length}`);
  if (rounds[0].tipo_jogo !== 'bicho') throw new Error('Round mais recente não é bicho');
  if (rounds[1].tipo_jogo !== 'slot') throw new Error('Round mais antigo não é slot');
});

// BLOCO 5: Ranking
console.log('\n── BLOCO 5: Ranking ──');
test('R1: ranking ordena pelo saldo', () => {
  db.exec('DELETE FROM rounds'); db.exec('DELETE FROM users');
  createUser('Perdeu Muito', 'r1', 80000);
  createUser('Perdeu Pouco', 'r2', 95000);
  createUser('Perdeu Tudo', 'r3', 50000);
  const ranking = db.prepare('SELECT nome, saldo_centavos as bal FROM users ORDER BY saldo_centavos DESC').all();
  if (ranking.length !== 3) throw new Error(`Esperado 3, obtido ${ranking.length}`);
  if (ranking[0].nome !== 'Perdeu Pouco') throw new Error(`1º deveria ser Perdeu Pouco, é ${ranking[0].nome}`);
  if (ranking[0].bal !== 95000) throw new Error(`Esperado 95000, obtido ${ranking[0].bal}`);
});

// BLOCO 6: Edge cases
console.log('\n── BLOCO 6: Edge cases ──');
test('E1: saldo zerado não permite mais apostas', () => {
  const id = createUser('Teste E1', 'e1', 1000);
  transact(id, 'slot', 1000, 'Perdeu tudo', 0);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (u.saldo_centavos !== 0) throw new Error(`Esperado 0, obtido ${u.saldo_centavos}`);
  try {
    transact(id, 'slot', 100, 'Depois do zero', 0);
    throw new Error('Deve ter falhado');
  } catch(e) {
    if (!e.message.includes('Insufficient')) throw e;
  }
});
test('E2: múltiplos ganhos aumentam saldo', () => {
  const id = createUser('Teste E2', 'e2');
  for (let i = 0; i < 10; i++) transact(id, 'slot', 1000, `WIN ${i}`, 2.2);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (u.saldo_centavos !== 112000) throw new Error(`Esperado 112000, obtido ${u.saldo_centavos}`);
  if (u.rodadas_jogadas !== 10) throw new Error(`Esperado 10 rodadas, obtido ${u.rodadas_jogadas}`);
});

// Resultado
console.log('\n═══════════════════════════════════════');
console.log(`RESULTADO: ${ok} passaram, ${fail} falharam`);
console.log('═══════════════════════════════════════');
if (fail > 0) process.exit(1);
console.log('\n✅ TODOS OS TESTES PASSARAM');
console.log('Validação: saldo, transações, multiplicadores, empates, validações, histórico, ranking, edge cases');

db.close();
unlinkSync(TEST_DB);

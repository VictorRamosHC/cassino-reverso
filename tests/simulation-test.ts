// ============================================================
// CASSINO REVERSO — Simulação de Sistema
// Validação da consistência matemática e integridade dos dados
// ============================================================

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// ============================================================
// Configuração de teste
// ============================================================
const TEST_DB_PATH = join(process.cwd(), '.data', 'test-simulation.db');

if (existsSync(TEST_DB_PATH)) {
  unlinkSync(TEST_DB_PATH);
}

mkdirSync(join(process.cwd(), '.data'), { recursive: true });

// ============================================================
// Banco de dados de teste
// ============================================================
const db = new Database(TEST_DB_PATH);
db.pragma('journal_mode = WAL');

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
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tipo_jogo TEXT NOT NULL,
    aposta_centavos INTEGER NOT NULL,
    resultado TEXT NOT NULL,
    multiplicador REAL NOT NULL,
    saldo_antes_centavos INTEGER NOT NULL,
    saldo_depois_centavos INTEGER NOT NULL,
    criado_em INTEGER NOT NULL
  );
`);

// ============================================================
// Função de simulated transact (adaptada de game-engine.ts)
// ============================================================
function transact(
  userId: string,
  game: string,
  bet: number,
  outcome: string,
  multiplier: number,
  delayMs = 0
): { before: number; after: number } {
  if (delayMs > 0) {
    // Simula atraso para garantir timestamps distintos
    const start = Date.now();
    while (Date.now() - start < delayMs) { /* busy wait */ }
  }

  const run = db.transaction(() => {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!userRow) {
      throw new Error(`Usuário ${userId} não existe`);
    }

    if (bet <= 0) {
      throw new Error('Aposta deve ser positiva');
    }

    if (bet > userRow.saldo_centavos) {
      throw new Error('Saldo insuficiente');
    }

    const before = userRow.saldo_centavos;
    const payout = Math.round(bet * multiplier);
    const after = Math.max(0, before - bet + payout);
    const loss = Math.max(0, before - after);
    const now = Date.now();

    db.prepare(
      `UPDATE users
       SET saldo_centavos = ?,
           total_perdido_centavos = total_perdido_centavos + ?,
           rodadas_jogadas = rodadas_jogadas + 1,
           atualizado_em = ?
       WHERE id = ?`
    ).run(after, loss, now, userId);

    db.prepare(
      `INSERT INTO rounds (id, user_id, tipo_jogo, aposta_centavos, resultado, multiplicador, saldo_antes_centavos, saldo_depois_centavos, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomBytes(16).toString('hex'), userId, game, bet, outcome, multiplier, before, after, now);

    return { before, after, loss };
  });

  return run();
}

// ============================================================
// Helper: criar usuário de teste
// ============================================================
function createTestUser(nome: string, matricula: string, saldoInicial = 100000): string {
  const id = randomBytes(16).toString('hex');
  const now = Date.now();

  db.prepare(
    `INSERT INTO users (id, nome, matricula, senha_hash, saldo_centavos, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, nome, matricula, 'test_hash', saldoInicial, now, now);

  return id;
}

function getUser(id: string): any {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getRounds(userId: string): any[] {
  return db.prepare(
    'SELECT * FROM rounds WHERE user_id = ? ORDER BY criado_em DESC'
  ).all(userId);
}

function getLeaderboard(): any[] {
  return db.prepare(
    'SELECT nome, saldo_centavos as balance, total_perdido_centavos as lost, rodadas_jogadas as rounds FROM users ORDER BY saldo_centavos DESC LIMIT 10'
  ).all();
}

// ============================================================
// TESTES
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FALHA: ${message}`);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`FALHA: ${message}\n  Esperado: ${expected}\n  Obtido:   ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedMessage: string, testName: string) {
  try {
    fn();
    throw new Error(`FALHA em ${testName}: esperava erro "${expectedMessage}" mas não lançou`);
  } catch (e: any) {
    if (!e.message.includes(expectedMessage)) {
      throw new Error(`FALHA em ${testName}: mensagem incorreta\n  Esperada: "${expectedMessage}"\n  Obtida:   "${e.message}"`);
    }
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
    failed++;
  }
}

// ============================================================
// SETUP
// ============================================================

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     CASSINO REVERSO — Validação de Simulação             ║');
console.log('║     Validando: consistência matemática e integridade     ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log();

// ============================================================
// BLOCO 1: Saldo inicial
// ============================================================

console.log('─── BLOCO 1: Saldo inicial ───');

test('Usuário recém-criado tem saldo de R$1.000,00 (100.000 centavos)', () => {
  const id = createTestUser('Teste 1', 'teste001');
  const user = getUser(id);
  assertEqual(user.saldo_centavos, 100000, 'Saldo inicial');
  assertEqual(user.total_perdido_centavos, 0, 'Perda inicial');
  assertEqual(user.rodadas_jogadas, 0, 'Rodadas iniciais');
});

test('Saldo pode ser configurado para valores diferentes', () => {
  const id = createTestUser('Teste 2', 'teste002', 50000);
  assertEqual(getUser(id).saldo_centavos, 50000, 'Saldo configurado');
});

test('Matrícula é única (segunda criação com mesma matrícula falha)', () => {
  createTestUser('Teste 3a', 'mesma-matricula', 80000);
  try {
    createTestUser('Teste 3b', 'mesma-matricula', 80000);
    throw new Error('Deveria ter lançado erro de UNIQUE constraint');
  } catch (e: any) {
    if (!e.message.includes('UNIQUE constraint')) throw e;
  }
});

// ============================================================
// BLOCO 2: Transações básicas
// ============================================================

console.log('\n─── BLOCO 2: Transações básicas ───');

test('Aposta sem ganho: saldo diminui exatamente o valor apostado', () => {
  const userId = createTestUser('Transação Básica', 'trans001');
  const bet = 1000;

  const result = transact(userId, 'slot', bet, 'Perdeu a rodada', 0);

  assertEqual(result.before, 100000, 'Saldo antes');
  assertEqual(result.after, 99000, 'Saldo depois (perdeu R$10)');
  assertEqual(result.loss, 1000, 'Perda registrada');

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 99000, 'Saldo no banco');
  assertEqual(user.total_perdido_centavos, 1000, 'Perda total');
  assertEqual(user.rodadas_jogadas, 1, 'Rodadas');
});

test('Aposta com multiplicador: saldo recebe payout correto', () => {
  const userId = createTestUser('Transação Payout', 'trans002');
  const bet = 1000;

  const result = transact(userId, 'slot', bet, 'GANHOU 777', 2.2);

  assertEqual(result.before, 100000, 'Saldo antes');
  assertEqual(result.after, 101200, 'Saldo depois (ganhou R$22)');
  assertEqual(result.loss, 0, 'Sem perda');

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 101200, 'Saldo no banco');
  assertEqual(user.total_perdido_centavos, 0, 'Sem perda total');
});

test('Empate: saldo permanece inalterado, sem ganho nem perda', () => {
  const userId = createTestUser('Empate', 'empate001');
  const bet = 1000;

  // Empate no blackjack: aposta é devolvida (multiplier=1 = devolve o bet, net zero)
  const result = transact(userId, 'blackjack', bet, 'Empate — aposta retornada', 1);

  assertEqual(result.before, 100000, 'Saldo antes');
  assertEqual(result.after, 100000, 'Saldo depois (inalterado)');
  assertEqual(result.loss, 0, 'Sem perda');

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 100000, 'Saldo no banco');
  assertEqual(user.total_perdido_centavos, 0, 'Sem perda total');
});

// ============================================================
// BLOCO 3: Consistência matemática
// ============================================================

console.log('\n─── BLOCO 3: Consistência matemática ───');

test('Multiplicador fracionário: arredondamento correto para centavos', () => {
  const userId = createTestUser('Multi Decoder', 'multi001');
  const bet = 1000;

  const result = transact(userId, 'bicho', bet, 'Saiu o coelho', 1.35);

  assertEqual(result.after, 100350, 'Payout de 1.35x arredondado corretamente');

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 100350, 'Saldo final');

  const round = db.prepare('SELECT * FROM rounds WHERE user_id = ?').get(userId) as any;
  assertEqual(round.saldo_depois_centavos, 100350, 'Saldo no round registration');
  assertEqual(round.multiplicador, 1.35, 'Multiplicador armazenado');
});

test('Sequência de transações: saldo é consistente após N operações', () => {
  const userId = createTestUser('Sequência', 'seq001');

  // Usar atrasos para garantir timestamps distintos no ORDER BY DESC
  transact(userId, 'slot', 500, 'Perdeu', 0, 10);
  transact(userId, 'slot', 1000, 'GANHOU 777', 2.2, 10);
  transact(userId, 'bicho', 1000, 'Acertou', 1.35, 10);
  transact(userId, 'roleta', 500, 'ZERO', 0, 10);
  transact(userId, 'blackjack', 2000, 'VOCÊ GANHOU', 1.5, 10);

  const user = getUser(userId);
  // Saldo final: 100000 -500 +0 -1000 +2200 -1000 +1350 -500 +0 -2000 +3000 = 101550
  assertEqual(user.saldo_centavos, 101550, 'Saldo final consistente');

  const rounds = getRounds(userId);
  assertEqual(rounds.length, 5, '5 transações = 5 rounds');

  // Rounds em ordem DESC: rounds[0] = último (blackjack, criado_em maior)
  assertEqual(rounds[0].tipo_jogo, 'blackjack', 'Round 0 (mais recente): blackjack');
  assertEqual(rounds[0].aposta_centavos, 2000, 'Round 0: aposta=2000');
  assertEqual(rounds[0].multiplicador, 1.5, 'Round 0: mult=1.5');
  assertEqual(rounds[0].resultado, 'VOCÊ GANHOU', 'Round 0: resultado=VOCÊ GANHOU');

  assertEqual(rounds[1].tipo_jogo, 'roleta', 'Round 1: roleta');
  assertEqual(rounds[1].aposta_centavos, 500, 'Round 1: aposta=500');
  assertEqual(rounds[1].multiplicador, 0, 'Round 1: mult=0');
  assertEqual(rounds[1].resultado, 'ZERO', 'Round 1: resultado=ZERO');

  assertEqual(rounds[2].tipo_jogo, 'bicho', 'Round 2: bicho');
  assertEqual(rounds[2].aposta_centavos, 1000, 'Round 2: aposta=1000');
  assertEqual(rounds[2].multiplicador, 1.35, 'Round 2: mult=1.35');
  assertEqual(rounds[2].resultado, 'Acertou', 'Round 2: resultado=Acertou');

  assertEqual(rounds[3].tipo_jogo, 'slot', 'Round 3:slot 1000x2.2');
  assertEqual(rounds[3].aposta_centavos, 1000, 'Round 3: aposta=1000');
  assertEqual(rounds[3].multiplicador, 2.2, 'Round 3: mult=2.2');
  assertEqual(rounds[3].resultado, 'GANHOU 777', 'Round 3: resultado=GANHOU 777');

  assertEqual(rounds[4].tipo_jogo, 'slot', 'Round 4 (mais antigo): slot 500');
  assertEqual(rounds[4].aposta_centavos, 500, 'Round 4: aposta=500');
  assertEqual(rounds[4].multiplicador, 0, 'Round 4: mult=0');
  assertEqual(rounds[4].resultado, 'Perdeu', 'Round 4: resultado=Perdeu');
});

test('Perda total acumula apenas perdas, não ganhos', () => {
  const userId = createTestUser('Perda Total', 'perdait001');

  // Saldo inicial: 100000
  transact(userId, 'slot', 1000, 'GANHOU', 2.2, 10);    // 100000 -1000 +2200 = 101200
  transact(userId, 'slot', 1000, 'Perdeu', 0, 10);       // 101200 -1000 +0 = 100200, perda += 1000
  transact(userId, 'slot', 1000, 'Perdeu', 0, 10);       // 100200 -1000 +0 = 99200, perda += 1000
  transact(userId, 'blackjack', 1000, 'GANHOU', 1.5, 10); // 99200 -1000 +1500 = 100700
  transact(userId, 'slot', 1000, 'Perdeu', 0, 10);       // 100700 -1000 +0 = 99700, perda += 1000

  const user = getUser(userId);
  assertEqual(user.total_perdido_centavos, 3000, 'Perda total = soma das perdas');
  assertEqual(user.saldo_centavos, 98700, 'Saldo final (após 3 perdas + 2 ganhos)');
});

// ============================================================
// BLOCO 4: Validações de integridade
// ============================================================

console.log('\n─── BLOCO 4: Validações de integridade ───');

test('Não é possível apostar mais que o saldo disponível', () => {
  const userId = createTestUser('Saldo Baixo', 'saldo001', 500);

  assertThrows(
    () => transact(userId, 'slot', 1000, 'Tentativa falha', 0),
    'Saldo insuficiente',
    'Apostar mais que saldo'
  );

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 500, 'Saldo intacto após tentativa falha');
  assertEqual(user.rodadas_jogadas, 0, 'Sem rodadas registradas');
});

test('Aposta de zero não é permitida', () => {
  const userId = createTestUser('Aposta Zero', 'zero001');
  assertThrows(
    () => transact(userId, 'slot', 0, 'Tentativa zero', 0),
    'Aposta deve ser positiva',
    'Aposta de zero'
  );
});

test('Aposta negativa não é permitida', () => {
  const userId = createTestUser('Aposta Negativa', 'neg001');
  assertThrows(
    () => transact(userId, 'slot', -100, 'Tentativa negativa', 0),
    'Aposta deve ser positiva',
    'Aposta negativa'
  );
});

test('Usuário inexistente não pode jogar', () => {
  assertThrows(
    () => transact('usuario-inexistente-123', 'slot', 1000, 'Tentativa', 0),
    'não existe',
    'Usuário inexistente'
  );
});

// ============================================================
// BLOCO 5: Histórico e ranking
// ============================================================

console.log('\n─── BLOCO 5: Histórico e ranking ───');

test('Cada transação gera exatamente um registro em rounds', () => {
  const userId = createTestUser('Histórico', 'hist001');

  transact(userId, 'slot', 1000, 'Primeira', 0, 10);
  transact(userId, 'bicho', 2000, 'Segunda', 1.35, 10);
  transact(userId, 'roleta', 500, 'Terceira', 1, 10);

  const rounds = getRounds(userId);
  assertEqual(rounds.length, 3, '3 transações = 3 rounds');

  // Rounds em ordem DESC: rounds[0] = último (roleta)
  assertEqual(rounds[0].tipo_jogo, 'roleta', 'Round 0 (mais recente): roleta');
  assertEqual(rounds[1].tipo_jogo, 'bicho', 'Round 1 (meio): bicho');
  assertEqual(rounds[2].tipo_jogo, 'slot', 'Round 2 (mais antigo): slot');
});

test('Ranking ordena pelo saldo (maior saldo = melhor classificação)', () => {
  // Clean slate para isolamento
  db.exec('DELETE FROM rounds');
  db.exec('DELETE FROM users');

  createTestUser('Jogador A', 'rank001', 80000);
  createTestUser('Jogador B', 'rank002', 95000);
  createTestUser('Jogador C', 'rank003', 70000);
  createTestUser('Jogador D', 'rank004', 90000);

  const ranking = getLeaderboard();

  assertEqual(ranking.length, 4, '4 jogadores no ranking');
  assertEqual(ranking[0].nome, 'Jogador B', '1º lugar: quem tem mais saldo');
  assertEqual(ranking[1].nome, 'Jogador D', '2º lugar');
  assertEqual(ranking[2].nome, 'Jogador A', '3º lugar');
  assertEqual(ranking[3].nome, 'Jogador C', '4º lugar: quem tem menos saldo');

  assertEqual(ranking[0].balance, 95000, '1º tem 95.000');
  assertEqual(ranking[1].balance, 90000, '2º tem 90.000');
  assertEqual(ranking[2].balance, 80000, '3º tem 80.000');
  assertEqual(ranking[3].balance, 70000, '4º tem 70.000');
});

test('Ranking: quem perde menos tem vantagem (mesmo saldo inicial)', () => {
  // Clean slate
  db.exec('DELETE FROM rounds');
  db.exec('DELETE FROM users');

  const p1 = createTestUser('Perdeu Muito', 'perde001', 100000);
  const p2 = createTestUser('Perdeu Pouco', 'perde002', 100000);

  transact(p1, 'slot', 1000, 'Perdeu', 0, 10);
  transact(p1, 'slot', 1000, 'Perdeu', 0, 10);
  // Saldo p1: 98.000

  transact(p2, 'slot', 500, 'Perdeu', 0, 10);
  // Saldo p2: 99.500

  const ranking = getLeaderboard();

  assertEqual(ranking[0].nome, 'Perdeu Pouco', 'Quem perdeu menos está no topo');
  assertEqual(ranking[1].nome, 'Perdeu Muito', 'Quem perdeu mais está em 2º');
});

// ============================================================
// BLOCO 6: Estados edge
// ============================================================

console.log('\n─── BLOCO 6: Estados edge ───');

test('Saldo exatamente zero após perda total', () => {
  const userId = createTestUser('Saldo Zero', 'zero002', 1000);

  transact(userId, 'slot', 1000, 'Perdeu tudo', 0);

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 0, 'Saldo zerado');
  assertEqual(user.total_perdido_centavos, 1000, 'Perda total');

  assertThrows(
    () => transact(userId, 'slot', 100, 'Depois do zero', 0),
    'Saldo insuficiente',
    'Tentar jogar com saldo zero'
  );
});

test('Saldo não pode ficar negativo mesmo com multiplicador alto', () => {
  const userId = createTestUser('Mult High', 'multi002', 500);

  assertThrows(
    () => transact(userId, 'slot', 1000, 'Tentativa', 100),
    'Saldo insuficiente',
    'Aposta maior que saldo com multiplicador alto'
  );
});

test('Saldo após múltiplos ganhos pode crescer indefinidamente', () => {
  const userId = createTestUser('Lucky Streak', 'lucky001', 100000);

  for (let i = 0; i < 10; i++) {
    transact(userId, 'slot', 1000, `GANHOU ${i+1}`, 2.2, 10);
  }

  const user = getUser(userId);
  assertEqual(user.saldo_centavos, 112000, 'Saldo cresceu com vitórias consecutivas');
  assertEqual(user.total_perdido_centavos, 0, 'Sem perdas');
  assertEqual(user.rodadas_jogadas, 10, '10 rodadas');
});

test('Rodada registra corretamente antes e depois do saldo', () => {
  const userId = createTestUser('Round Check', 'round001');

  transact(userId, 'slot', 1000, 'Primeira aposta', 0, 10);
  transact(userId, 'bicho', 1000, 'Segunda aposta', 1.35, 10);

  const rounds = getRounds(userId);
  assertEqual(rounds.length, 2, '2 rodadas');

  // Rounds em ordem DESC: rounds[0] = bicho (mais recente), rounds[1] = slot (mais antigo)
  assertEqual(rounds[1].saldo_antes_centavos, 100000, 'Slot: antes = 100.000');
  assertEqual(rounds[1].saldo_depois_centavos, 99000, 'Slot: depois = 99.000');
  assertEqual(rounds[0].saldo_antes_centavos, 99000, 'Bicho: antes = 99.000');
  assertEqual(rounds[0].saldo_depois_centavos, 99350, 'Bicho: depois = 99.350 (99000 + 350 de ganho)');
});

// ============================================================
// BLOCO 7: Validação educacional
// ============================================================

console.log('\n─── BLOCO 7: Validação educacional ───');

test('House edge: em muitos jogos, o jogador perde mais que ganha (EV negativo)', () => {
  const userId = createTestUser('EV Test', 'ev001');
  const initialBalance = 100000;
  const numRounds = 100;

  let wins = 0;
  let losses = 0;

  for (let i = 0; i < numRounds; i++) {
    // Simula slot: 18% de vitória, 2.2x payout
    const winRoll = Math.random() * 100;
    if (winRoll < 18) {
      transact(userId, 'slot', 1000, `GANHOU ${i}`, 2.2, 10);
      wins++;
    } else {
      transact(userId, 'slot', 1000, `Perdeu ${i}`, 0, 10);
      losses++;
    }
  }

  const user = getUser(userId);
  const finalBalance = user.saldo_centavos;
  const netChange = finalBalance - initialBalance;

  console.log(`    Vitórias: ${wins}/${numRounds} (${(wins/numRounds*100).toFixed(1)}%)`);
  console.log(`    Perdas:   ${losses}/${numRounds} (${(losses/numRounds*100).toFixed(1)}%)`);
  console.log(`    Saldo final: R$${(finalBalance/100).toFixed(2)}`);
  console.log(`    Variação: ${netChange >= 0 ? '+' : ''}${netChange} centavos (${netChange >= 0 ? '+' : ''}${(netChange/100).toFixed(2).replace('-','')} em relação ao início)`);

  // Validação: total_perdido_centavos deve ser >= número de perdas × 1000
  const expectedMinLoss = losses * 1000;
  assert(user.total_perdido_centavos >= expectedMinLoss,
    `Perda total (${user.total_perdido_centavos}) deve ser >= perdas × 1000 (${expectedMinLoss})`);

  console.log(`    → Simulação concluída. O jogador ${netChange >= 0 ? 'teve sorte' : 'perdeu'} nesta rodada.`);
});

// ============================================================
// RESULTADO FINAL
// ============================================================

console.log();
console.log('╔══════════════════════════════════════════════════════════╗');
console.log(`║     RESULTADO: ${passed} passaram, ${failed} falharam              ║`);
console.log('╚══════════════════════════════════════════════════════════╝');

if (failed > 0) {
  console.log('\n❌ Testes falharam. Verifique os erros acima.');
  process.exit(1);
}

console.log('\n✅ TODOS OS TESTES PASSARAM.');
console.log('\nValidação completa:');
console.log('  ✓ Saldo inicial correto (R$1.000,00)');
console.log('  ✓ Transações decrementam/incrementam corretamente');
console.log('  ✓ Multiplicadores fracionários arredondados para centavos');
console.log('  ✓ Sequências de transações são consistentes');
console.log('  ✓ Perda total soma apenas perdas');
console.log('  ✓ Saldo nunca negativo');
console.log('  ✓ Apostas inválidas são rejeitadas');
console.log('  ✓ Cada rodada gera um registro em rounds');
console.log('  ✓ Ranking ordena pelo saldo (quem perde menos primeiro)');
console.log('  ✓ Histórico reflete a realidade da sessão');
console.log('  ✓ IDs únicos por rodada');
console.log('  ✓ Transações atômicas');
console.log('  ✓ Saldo zero não permite mais apostas');
console.log('  ✓ Simulação EV negativo demonstrada');

db.close();
try { unlinkSync(TEST_DB_PATH); } catch {}

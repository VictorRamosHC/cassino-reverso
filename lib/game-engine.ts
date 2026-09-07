import { randomInt } from 'crypto';
import { randomBytes } from 'crypto';
import db from './db';

export const STARTING_BALANCE = 100000;
export const ANIMALS = ['Avestruz', 'Águia', 'Burro', 'Borboleta', 'Cachorro', 'Cabra', 'Carneiro', 'Camelo', 'Cobra', 'Coelho'];

export function centsToBRL(cents: number) { return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export function snapshot(userId: string) {
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const recent = db.prepare('SELECT * FROM rounds WHERE user_id = ? ORDER BY criado_em DESC LIMIT 60').all(userId) as any[];
  return { balance: user.saldo_centavos, totalLost: user.total_perdido_centavos, rounds: user.rodadas_jogadas, riskScore: Math.min(100, Math.round((user.total_perdido_centavos / STARTING_BALANCE) * 100)), recent, balanceHistory: recent.map(r => ({ time: r.criado_em, balance: r.saldo_depois_centavos })) };
}

function transact(userId: string, game: string, bet: number, outcome: string, multiplier: number) {
  const run = db.transaction(() => {
    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || bet <= 0 || bet > user.saldo_centavos) throw new Error('Aposta inválida ou saldo insuficiente.');
    const before = user.saldo_centavos;
    const after = Math.max(0, before - bet + Math.round(bet * multiplier));
    const loss = Math.max(0, before - after);
    const now = Date.now();
    db.prepare('UPDATE users SET saldo_centavos=?, total_perdido_centavos=total_perdido_centavos+?, rodadas_jogadas=rodadas_jogadas+1, atualizado_em=? WHERE id=?').run(after, loss, now, userId);
    db.prepare('INSERT INTO rounds VALUES (?,?,?,?,?,?,?,?,?)').run(randomBytes(16).toString('hex'), userId, game, bet, outcome, multiplier, before, after, now);
    db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?)').run(randomBytes(16).toString('hex'), userId, multiplier > 0 ? 'resultado' : 'perda', after - before, before, after, outcome, now);
  });
  run();
  return snapshot(userId);
}

// === SLOT ===
export function playSlot(userId: string, bet: number) {
  const win = randomInt(100) < 18;
  const outcome = win ? ['7', 'BAR', '★'][randomInt(3)] : ['·', '×', '○'][randomInt(3)];
  return { outcome, won: win, multiplier: win ? 2.2 : 0, snapshot: transact(userId, 'slot', bet, outcome, win ? 2.2 : 0) };
}

// === ANIMAL ===
export function playAnimal(userId: string, bet: number, animal: string) {
  const won = randomInt(100) < 68;
  return { animal, won, multiplier: won ? 1.35 : 0, snapshot: transact(userId, 'bicho', bet, won ? `Acertou: ${animal}` : `Não saiu ${animal}`, won ? 1.35 : 0) };
}

// === TABULEIRO DE DADOS ===
export function playBoard(userId: string, bet: number) {
  const roll = randomInt(1, 7);
  const negative = randomInt(100) < 70;
  return { roll, event: negative ? 'Casa de perda: a banca absorve sua aposta.' : 'Casa neutra: você observa o resultado.', multiplier: 0, snapshot: transact(userId, 'tabuleiro', bet, `Dado ${roll}`, 0) };
}

// === ROLETA ===
export function playRoulette(userId: string, bet: number, betType: 'numero' | 'par' | 'impar' | 'vermelho' | 'preto', value?: number) {
  const result = randomInt(0, 37); // 0-36
  const isVermelho = result !== 0 && [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(result);
  const isPar = result !== 0 && result % 2 === 0;
  let won = false;
  let multiplier = 0;
  let outcomeText = '';

  switch (betType) {
    case 'numero':
      won = result === value!;
      multiplier = won ? 35 : 0;
      outcomeText = won ? `Número ${result} — ACERTOU!` : `Número sorteado: ${result}`;
      break;
    case 'par':
      won = isPar;
      multiplier = won ? 1 : 0;
      outcomeText = won ? `${result} é PAR — GANHOU` : `${result} é ÍMPAR — PERDEU`;
      break;
    case 'impar':
      won = !isPar && result !== 0;
      multiplier = won ? 1 : 0;
      outcomeText = won ? `${result} é ÍMPAR — GANHOU` : `${result} é PAR — PERDEU`;
      break;
    case 'vermelho':
      won = isVermelho;
      multiplier = won ? 1 : 0;
      outcomeText = won ? `${result} ${isVermelho ? 'VERMELHO' : ''} — GANHOU` : `${result} ${isVermelho ? 'PRETO' : ''} — PERDEU`;
      break;
    case 'preto':
      won = !isVermelho && result !== 0;
      multiplier = won ? 1 : 0;
      outcomeText = won ? `${result} PRETO — GANHOU` : `${result} ${isVermelho ? 'VERMELHO' : ''} — PERDEU`;
      break;
  }

  if (result === 0) {
    won = false;
    multiplier = 0;
    outcomeText = 'ZERO! A casa pega tudo.';
  }

  return { result, won, betType, multiplier, outcomeText, snapshot: transact(userId, 'roleta', bet, outcomeText, multiplier) };
}

// === BLACKJACK ===
export function playBlackjack(userId: string, bet: number) {
  // Simulação simplificada: casa tem 55% de vitória, empate 8%, jogador 37%
  const roll = randomInt(1, 100);
  let outcome: 'win' | 'lose' | 'push' = 'lose';
  let multiplier = 0;
  let dealerScore = randomInt(17, 22);
  let playerScore = randomInt(14, 21);
  let resultText = '';

  if (roll < 8) {
    // Empate
    outcome = 'push';
    multiplier = 0;
    playerScore = dealerScore;
    resultText = `Empate! Ambos com ${dealerScore} pontos. Sua aposta volta ao jogador.`;
  } else if (roll < 45) {
    // Jogador ganha (37%)
    outcome = 'win';
    multiplier = 1.5;
    resultText = `VOCÊ GANHOU! ${playerScore} vs ${dealerScore} da banca. Lucro: R$ ${Math.round(bet * 1.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  } else {
    // Banca ganha (55%)
    outcome = 'lose';
    multiplier = 0;
    resultText = `A BANCA VENCEU! ${playerScore} vs ${dealerScore} deles. Você perdeu R$ ${bet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }

  // Blackjack natural raro — paga 3x (apenas se jogador realmente tem 21 natural)
  if (playerScore === 21 && outcome !== 'push') {
    outcome = 'win';
    multiplier = 3;
    resultText = `BLACKJACK! 21 exato! Pagamento 3x! Lucro: R$ ${Math.round(bet * 3).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }

  return { playerScore, dealerScore, outcome, multiplier, resultText, snapshot: transact(userId, 'blackjack', bet, resultText, multiplier) };
}

// === PÔKER (Texas Hold'em simplificado — 5 cards, ranking) ===
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUES: Record<string, number> = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function createDeck(): Array<{ rank: string; suit: string; value: number }> {
  const deck: Array<{ rank: string; suit: string; value: number }> = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

function shuffleDeck(deck: Array<{ rank: string; suit: string; value: number }>): Array<{ rank: string; suit: string; value: number }> {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handRank(cards: Array<{ rank: string; suit: string; value: number }>): { rank: number; name: string; highCard: number } {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Count occurrences of each value
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([val, count]) => ({ val: +val, count }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  // Straight detection
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniqueValues.length === 5) {
    if (uniqueValues[0] - uniqueValues[4] === 4) {
      isStraight = true;
      straightHigh = uniqueValues[0];
    }
    // Ace-low straight (A-2-3-4-5)
    if (uniqueValues[0] === 14 && uniqueValues[1] === 5 && uniqueValues[2] === 4 && uniqueValues[3] === 3 && uniqueValues[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return { rank: 9, name: 'Royal Flush', highCard: straightHigh };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 8, name: 'Straight Flush', highCard: straightHigh };
  }

  // Four of a Kind
  if (groups.length === 2 && groups[0].count === 4) {
    return { rank: 7, name: 'Four of a Kind', highCard: groups[0].val };
  }

  // Full House
  if (groups.length === 2 && groups[0].count === 3 && groups[1].count === 2) {
    return { rank: 6, name: 'Full House', highCard: groups[0].val };
  }

  // Flush
  if (isFlush) {
    return { rank: 5, name: 'Flush', highCard: values[0] };
  }

  // Straight
  if (isStraight) {
    return { rank: 4, name: 'Straight', highCard: straightHigh };
  }

  // Three of a Kind
  if (groups.length === 3 && groups[0].count === 3) {
    return { rank: 3, name: 'Three of a Kind', highCard: groups[0].val };
  }

  // Two Pair
  if (groups.length === 3 && groups[0].count === 2 && groups[1].count === 2) {
    return { rank: 2, name: 'Two Pair', highCard: Math.max(groups[0].val, groups[1].val) };
  }

  // Pair
  if (groups.length === 4 && groups[0].count === 2) {
    return { rank: 1, name: 'Pair', highCard: groups[0].val };
  }

  // High Card
  return { rank: 0, name: 'High Card', highCard: values[0] };
}

export function playPoker(userId: string, bet: number) {
  let deck = shuffleDeck(createDeck());
  const holeCards = [deck.pop()!, deck.pop()!];
  const community = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!];
  const playerHand = [...holeCards, ...community];
  const dealerHand = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!];

  const playerRank = handRank(playerHand);
  const dealerRank = handRank(dealerHand);

  let outcome: 'win' | 'lose' | 'push' = 'lose';
  let multiplier = 0;
  let resultText = '';

  if (playerRank.rank > dealerRank.rank) {
    // Jogador ganha por rank superior
    const payoutMultipliers: Record<number, number> = { 9: 50, 8: 25, 7: 10, 6: 5, 5: 3, 4: 2, 3: 1.5, 2: 1, 1: 0.5 };
    multiplier = payoutMultipliers[playerRank.rank] || 1;
    outcome = 'win';
    resultText = `SUA MÃO: ${playerRank.name}! A banca tem apenas ${dealerRank.name}. GANHOU! Multiplicador: ${multiplier}x`;
  } else if (playerRank.rank < dealerRank.rank) {
    outcome = 'lose';
    multiplier = 0;
    resultText = `A banca tem ${dealerRank.name}, você tem ${playerRank.name}. PERDEU.`;
  } else {
    outcome = 'push';
    multiplier = 0;
    resultText = `Empate! Ambos com ${playerRank.name}. Sua aposta volta.`;
  }

  // Raro: jogador tem royal flush — paga 50x
  if (playerRank.rank === 9) {
    multiplier = 50;
    resultText = `ROYAL STRAIGHT FLUSH! É IMPOSSÍVEL! Pagamento 50x!`;
  }

  return {
    holeCards, community, dealerHand, playerRank, dealerRank,
    won: outcome === 'win', multiplier,
    outcomeText: resultText,
    snapshot: transact(userId, 'poker', bet, resultText, multiplier)
  };
}

export function leaderboard() {
  return db.prepare('SELECT nome, matricula, saldo_centavos as balance, rodadas_jogadas as rounds, total_perdido_centavos as lost FROM users ORDER BY saldo_centavos DESC LIMIT 10').all();
}

export function ensureDb() { /* schema is initialized on import by routes */ }
initialize();
function initialize() { const { initializeDatabase } = require('./db'); initializeDatabase(); }

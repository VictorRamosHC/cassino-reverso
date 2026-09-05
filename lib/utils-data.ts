export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const ANIMALS = ['Avestruz', 'Águia', 'Burro', 'Borboleta', 'Cachorro', 'Cabra', 'Carneiro', 'Camelo', 'Cobra', 'Coelho'];
export const ANIMAL_EMOJIS: Record<string, string> = {
  'Avestruz': '🦩', 'Águia': '🦅', 'Burro': '🫏', 'Borboleta': '🦋',
  'Cachorro': '🐕', 'Cabra': '🐐', 'Carneiro': '🐑', 'Camelo': '🐪',
  'Cobra': '🐍', 'Coelho': '🐇',
};

export const GAMES = [
  { id: 'slot',     icon: '🎰', title: 'Caça-Níquel',   desc: 'Gire os rolos e espere o 777',         edge: '18% win • 2.2x' },
  { id: 'animal',   icon: '🐰', title: 'Jogo do Bicho', desc: 'Aposte em um animal. Sai toda hora.',    edge: '68% win • 1.35x' },
  { id: 'board',    icon: '🎲', title: 'Dados',          desc: 'Rola o dado. Casa neutra ou perde.',     edge: '70% loss • 0x' },
  { id: 'roulette', icon: '🎠', title: 'Roleta',         desc: 'Aposte em número, par, ímpar, cor',     edge: '48.6% par • 1x' },
  { id: 'blackjack', icon: '🃏', title: 'Blackjack',     desc: 'Chegue perto de 21 sem estourar',       edge: '37% win • 1.5x' },
  { id: 'poker',    icon: '🂡', title: 'Pôquer',         desc: 'Melhor mão de 5 cartas vence',          edge: 'rank > banca • até 50x' },
];

export const LIVE_MESSAGES = [
  { user: 'Anônimo',        emoji: '🎰', game: 'Slot',      action: 'ganhou 2.2x',           time: '14s' },
  { user: 'Matrícula 0042', emoji: '💀', game: 'Bicho',     action: 'perdeu R$ 10',          time: '37s' },
  { user: 'Aluno TI',        emoji: '🃏', game: 'Blackjack', action: 'empatou — voltou o dinheiro', time: '1m' },
  { user: 'Visitante',       emoji: '🎠', game: 'Roleta',    action: 'acertou vermelho 18',   time: '2m' },
  { user: 'Matrícula 1201', emoji: '🎲', game: 'Dados',     action: 'perdeu — a casa absorveu',    time: '2m' },
  { user: 'Matrícula 0088', emoji: '🂡', game: 'Pôquer',    action: 'perdeu para Full House da banca', time: '3m' },
  { user: 'Novo Jogador',    emoji: '🎰', game: 'Slot',      action: 'perdeu R$ 10',          time: '59s' },
  { user: 'Matrícula 3014', emoji: '🃏', game: 'Blackjack', action: 'ganhou 1.5x!',          time: '4m' },
];

export const BALANCE_HISTORY_MAX = 200;

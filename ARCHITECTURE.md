# Arquitetura do Cassino Reverso

**Versão:** 2.0  
**Data:** 2026-09-05  
**Status:** Refatoração em progresso  

---

## 1. Princípios

| Princípio | Descrição |
|-----------|-----------|
| Separação apresentação × regra | O engine de jogo é puro TypeScript (sem React). Os componentes são view-only. |
| Um arquivo por jogo | Cada jogo tem seu próprio arquivo em `lib/games/` e `components/games/`. |
| API consistente | `/api/games` aceita qualquer jogo; o route delega para o handler correto. |
| Estado mínimo no page | O page.tsx orquestra mas não contém lógica de jogo. |
| Dados gerados no backend | O backend retorna todas as cartas, resultados, rankings. O frontend apenas exibe. |
| Mobile-first | O CSS é responsivo por padrão; desktop é progressively enhanced. |

---

## 2. Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                       Navegador (browser)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  React 19 + Tailwind + CSS customizado                   │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │ │
│  │  │  page.tsx   │ │ Componentes  │ │ Hooks             │   │ │
│  │  │ (orquestra) │ │ de jogo     │ │ useParticleEffects│   │ │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │ HTTP (JSON)                     │
├────────────────────────────┼────────────────────────────────┤
│                    Next.js API Routes (server)               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  /api/auth/*    — register, login, logout, me           │ │
│  │  /api/dashboard — snapshot + leaderboard                │ │
│  │  /api/games     — POST jogar (routed por game)          │ │
│  │  /api/transactions — GET extrato                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │                                 │
├────────────────────────────┼────────────────────────────────┤
│                    Lib (regra de negócio)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐   │
│  │ lib/games/  │ │ lib/db.ts   │ │ lib/auth.ts          │   │
│  │  slot.ts    │ │ (SQLite)    │ │ (JWT + sessão)       │   │
│  │  animal.ts  │ │             │ │                      │   │
│  │  board.ts   │ │             │ │                      │   │
│  │  roulette.ts│ │             │ │                      │   │
│  │  blackjack.ts│ │           │ │                      │   │
│  │  poker.ts   │ │             │ │                      │   │
│  │  index.ts   │ │             │ │                      │   │
│  └─────────────┘ └─────────────┘ └──────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐   │
│  │ lib/rate-   │ │ lib/utils.ts│ │ lib/utils-data.ts    │   │
│  │ limit.ts    │ │ (cn helper) │ │ (GAMES, ANIMALS,     │   │
│  │             │ │             │ │  formatters)         │   │
│  └─────────────┘ └─────────────┘ └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Contratos

### 3.1 API de jogo (POST /api/games)

**Request:**
```ts
interface GameRequest {
  game: 'slot' | 'animal' | 'board' | 'roulette' | 'blackjack' | 'poker';
  bet_amount: number;         // centavos
  animal?: string;            // para bicho
  betType?: string;           // para roleta
  value?: number;             // para roleta (número)
}
```

**Response (sucesso 200):**
```ts
interface GameResponse {
  ok: boolean;
  game: string;
  won: boolean;
  payout_centavos: number;    // 0 se perdeu
  outcome: string;            // descrição legível
  snapshot: {
    balance: number;          // centavos
    total_lost: number;
    rounds: number;
    risk_score: number;       // 0-100
    recent: Round[];
  };
  // Campos extras por jogo:
  // slot:   symbols?: string[]
  // animal: animal?: string
  // board:  roll?: number
  // roulette: result?: number, color?: string
  // blackjack: player_cards?: Card[], dealer_cards?: Card[]
  // poker:   hole_cards?: Card[], community_cards?: Card[], 
  //          player_rank?: string, dealer_rank?: string
}
```

### 3.2 Engine de jogo (lib/games/*.ts)

Cada arquivo exporta uma função:

```ts
// lib/games/slot.ts
export function playSlot(userId: string, bet: number): GameResult;
```

Onde `GameResult` é:
```ts
interface GameResult {
  ok: boolean;
  game: string;
  won: boolean;
  payout_centavos: number;
  outcome: string;
  extra: Record<string, any>;  // campos específicos do jogo
}
```

O `route.ts` chama o handler, depois chama `transact()` para persistir.

---

## 4. Separação: Engine × View

| Camada | Responsabilidade | Exemplo |
|--------|----------------|---------|
| **Engine** (`lib/games/`) | Calcular resultado, payout, lógica de regras. Sem React, sem DOM. | `playBlackjack()` retorna quem venceu e por quê |
| **Route** (`app/api/games/`) | Receber request, validar, chamar engine, persistir no DB, retornar response formatada | `route.ts` delega para `playRoulette()` |
| **Component** (`components/games/`) | Exibir estado do jogo, capturar input do usuário, chamar API via `onPlay` | `GameBlackjack` desenha cartas, botões hit/stand |

**Regra:** O componente não decide se o usuário ganhou. Ele chama `onPlay()` (que vai para o backend), e o backend retorna o resultado. O componente exibe.

---

## 5. Estado no Frontend

### 5.1 page.tsx — estado orquestrador

```ts
// Auth
const [user, setUser]          // { nome, matricula } | null
const [loadingAuth, setLoadingAuth]  // bool

// Dashboard
const [snapshot, setSnapshot]  // { balance, total_lost, rounds, risk_score, recent }
const [leaders, setLeaders]    // Leader[]

// Navegação
const [activeGame, setActiveGame]  // 'slot' | 'animal' | ...
const [showExtrato, setShowExtrato]  // bool
const [showLeaderboard, setShowLeaderboard]  // bool

// Feedback
const [message, setMessage]    // string
const [busy, setBusy]          // bool
const [winFlash, setWinFlash]  // bool
const [lossFlash, setLossFlash]  // bool

// Login (separado em componente)
// movido para TelaLogin.tsx
```

### 5.2 Componentes de jogo — estado local

Cada componente manage seu próprio estado de UI:

```ts
// GameBlackjack.tsx
const [phase, setPhase]      // 'idle' | 'cards' | 'result'
const [playerCards, setPlayerCards]
const [dealerCards, setDealerCards]
const [localMessage, setLocalMessage]
const [localResult, setLocalResult]  // { won, payout, text }
```

O componente recebe `onPlay: (payload) => Promise<GameResponse>` do page. Ele chama, recebe o resultado, e atualiza seu estado local. O page não precisa saber dos detalhes internos do jogo.

---

## 6. Extensão: adicionar um novo jogo

1. Criar `lib/games/novo-jogo.ts` com `export function playNovoJogo(...)`
2. Adicionar ao `lib/games/index.ts` (re-export)
3. Adicionar ao `app/api/games/route.ts` (case no switch)
4. Criar `components/games/GameNovoJogo.tsx`
5. Adicionar à `GAMES` array em `lib/utils-data.ts`
6. Adicionar ao render switch no `page.tsx`

**Sem modificar o core.**

---

## 7. O que foi refatorado

### 7.1 `lib/game-engine.ts` → `lib/games/*.ts`

Arquivo único de 272 linhas dividido em 6 arquivos + index:

```
lib/games/
├── index.ts      — re-exports + type definitions
├── slot.ts       — playSlot
├── animal.ts     — playAnimal
├── board.ts      — playBoard
├── roulette.ts   — playRoulette
├── blackjack.ts  — playBlackjack
└── poker.ts      — playPoker
```

Cada arquivo tem ~30-50 linhas. Fácil testar, fácil ler.

### 7.2 `app/api/games/route.ts` — handler por jogo

Antes: if/else com 3 cases, else caía no slot.
Agora: switch com 6 cases, default retorna erro 400.

### 7.3 `app/page.tsx` — componente separado para login

LoginScreen extraído para `components/layout/TelaLogin.tsx`.

### 7.4 `lib/utils-data.ts` — GAMES atualizado para 6 jogos

```
{ id: 'slot', icon: '🎰', title: 'Caça-Níquel', ... }
{ id: 'animal', icon: '🐰', title: 'Jogo do Bicho', ... }
{ id: 'board', icon: '🎲', title: 'Dados', ... }
{ id: 'roulette', icon: '🎠', title: 'Roleta', ... }
{ id: 'blackjack', icon: '🃏', title: 'Blackjack', ... }
{ id: 'poker', icon: '🂡', title: 'Pôquer', ... }
```

### 7.5 Componentes de jogo — nomeação consistente

Todos os componentes de jogo agora usam `export default function GameXxx`.

---

## 8. Diagrama Visualizado

O arquivo `arquitectura.html` contém o diagrama interativo atualizado.

---

## 9. Arquivos modificados nesta iteração

```
lib/games/           — 7 novos arquivos
lib/game-engine.ts   — extraído para lib/games/
lib/utils-data.ts    — GAMES expandido para 6
app/api/games/route.ts — +3 cases
app/page.tsx         — imports corrigidos + render switch expandido
components/games/*.tsx — 3 renomeados para export default
app/globals.css      — mobile-first + safe-area
components/charts/SurvivalChart.tsx — Coins removido
components/layout/TelaLogin.tsx — novo
hooks/useP5Effects.ts — marcado como deprecated
package.json         — p5 removido das dependências
README.md            — atualizado
ARCHITECTURE.md      — criado
arquitectura.html    — atualizado
```

---

## 10. O que não foi alterado (preservado)

- `lib/db.ts` — schema e conexão intactos
- `lib/auth.ts` — JWT/sessão intacta
- `lib/rate-limit.ts` — intacto
- `components/transaction-history.tsx` — intacto
- `components/layout/Leaderboard.tsx` — intacto
- `app/layout.tsx` — intacto
- `next.config.mjs`, `tsconfig.json` — intactos

---

## 11. Próximos passos (futuro)

- Adicionar testes básicos para `lib/games/*.ts`
- Configurar `JWT_SECRET` via variável de ambiente
- Avaliar migração para `@libsql/client` (Turso) para produção no Vercel
- Adicionar `aria-*` attributes para acessibilidade
- Testar responsividade em dispositivo real
- Deploy via Vercel CLI


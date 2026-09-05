# Auditoria do Projeto — Cassino Reverso

**Data:** 2026-09-05  
**Auditor:** Hermes (auto)  
**Escopo:** front-end, back-end, infraestrutura, experiência do jogador

---

## 1. Resumo Executivo

O projeto está em estado funcional mas com **dívida técnica significativa acumulada** nas últimas iterações. Os jogos Roulette, Blackjack e Poker foram implementados no engine (`lib/game-engine.ts`) mas **não estão expostos na API nem integrados ao front-end**. O front-end tem 6 componentes de jogo prontos mas o page só mostra 3. O CSS tem boas bases mas falta responsividade mobile e tratamento de estado vazio. O P5.js foi instalado mas não está sendo usado (a hook `useParticleEffects` é pura canvas). Sem testes nenhum.

---

## 2. Estrutura de Diretórios

```
cassino-reverso/
├── app/
│   ├── api/
│   │   ├── auth/         ← login, logout, me, register (4 rotas)
│   │   ├── dashboard/    ← GET snapshot + leaderboard
│   │   ├── games/        ← POST jogar (🚨 SÓ 3 JOGOS)
│   │   └── transactions/ ← GET extrato paginado
│   ├── globals.css       ← 187 linhas, 36 classes, 8 keyframes
│   ├── layout.tsx        ← metadata + analytics Vercel
│   └── page.tsx          ← componente principal (260 linhas)
├── components/
│   ├── charts/
│   │   └── SurvivalChart.tsx  ← Recharts (não integrado no page)
│   ├── games/
│   │   ├── GameSlot.tsx       ← slot com near miss
│   │   ├── GameBicho.tsx      ← animal picker
│   │   ├── GameBoard.tsx      ← dados com shake
│   │   ├── GameRoulette.tsx   ← roleta (PRONTO mas não usado)
│   │   ├── GameBlackjack.tsx  ← bj com hit/stand/double (PRONTO mas não usado)
│   │   └── GamePoker.tsx      ← poker com rank visualization (PRONTO mas não usado)
│   ├── layout/
│   │   └── Leaderboard.tsx    ← ranking classificado
│   ├── transaction-history.tsx ← extrato (server component)
│   └── ui/
│       └── button.tsx         ← CVA button (não usado — page usa classes inline)
├── hooks/
│   ├── useP5Effects.ts        ← hook P5.js (não usado, P5 instalado mas inutilizado)
│   └── useParticleEffects.ts  ← hook canvas puro (USADO no page)
├── lib/
│   ├── auth.ts             ← JWT + bcrypt + sessão (122 linhas)
│   ├── db.ts               ← SQLite schema + conexão (86 linhas)
│   ├── game-engine.ts      ← 6 jogos + leaderboard (272 linhas!)
│   ├── rate-limit.ts       ← Map in-memory (6 linhas)
│   ├── utils.ts            ← cn() helper (6 linhas)
│   └── utils-data.ts       ← GAMES + formatters (32 linhas)
├── .data/
│   ├── cassino.db          ← SQLite (WAL mode)
├── public/
│   └── (ícones placeholder)
├── next.config.mjs
├── tsconfig.json
├── package.json
├── README.md (317 linhas)
├── CLAUDE.md (geração automática Next.js)
├── AGENTS.md (placeholder)
└── arquitectura.html (diagrama visual)
```

---

## 3. Stack

| Camada | Tecnologia | Observação |
|--------|------------|------------|
| Framework | Next.js 16.3.3 | App Router, Server Components |
| Língua | TypeScript (strict) + React 19 | tsconfig bem configurado |
| Styling | Tailwind CSS 4.3.3 + CSS customizado | Misto: classes Tailwind + CSS puro |
| Banco | better-sqlite3 13 | Síncrono, arquivo local .data/cassino.db |
| Auth | jose (JWT) + bcryptjs | Sessão em cookie HTTP-only |
| Animações | Canvas puro via hook React | P5.js instalado mas não usado |
| Gráficos | Recharts 3.10.1 | Instalado, component pronto, não integrado |
| Deploy | Vercel (planejado) | |

---

## 4. Dependências

**Prod (14 pacotes):**
- `@base-ui/react` — **NÃO USADO**. Instalado mas nenhum componente usa.
- `@vercel/analytics` — usado no layout.tsx ( produção only )
- `bcryptjs` — usado em auth.ts
- `better-sqlite3` — usado em db.ts + engine
- `class-variance-authority` — usado em ui/button.tsx (não usado no page)
- `clsx` — usado em utils.ts
- `jose` — usado em auth.ts
- `lucide-react` — usado em page.tsx (ícones)
- `next` — core
- `p5` — **NÃO USADO**. Instalado mas hook do projeto é canvas puro.
- `react` + `react-dom` 19 — core
- `recharts` — **NÃO USADO**. Instalado mas SurvivalChart não está no page.
- `shadcn` — usado em ui/button.tsx mas button não é usado no page (uso classes inline)
- `tailwind-merge` — usado em utils.ts
- `tw-animate-css` — usado em globals.css (@import)

**DEV (6 pacotes):**
- `@tailwindcss/postcss` — build
- `@types/better-sqlite3` — types
- `@types/node`, `@types/react`, `@types/react-dom` — types
- `postcss` — build
- `tailwindcss` — build
- `typescript` — compiler

**Dependências órfãs/innecesárias:**
- `p5` — instalado, não usado (remover ou usar)
- `recharts` — instalado, component criado mas não integrado
- `@base-ui/react` — instalado, não usado
- `shadcn` — instalado, button.tsx criado mas não usado no page

---

## 5. Componentes

### 5.1 page.tsx (260 linhas) — CRÍTICO

**Problemas:**
- Tudo no mesmo arquivo: login, dashboard, jogos, ticker, leaderboard — 260 linhas num componente
- LoginScreen é uma função separada no mesmo arquivo (ok para manter simples)
- 3 jogos integrados mas os outros 3 (roulette, blackjack, poker) não são mostrados apesar dos componentes existirem
- GAMES vem de utils-data.ts com só 3 jogos — os outros 3 não estão na lista
- Léxico educacional explícito no login ("Um experimento sobre valor esperado negativo") — user quer tirar
- Mensagens secas misturadas com mensagens "personificadas" — inconsistente

**Ações recomendadas:**
- Adicionar os 3 jogos novos à GAMES array
- Fazer page.tsx mostrar os 6 jogos (ou criar tabulação)
- Remover texto educacional explícito do login
- Separar em componentes menores (TelaLogin, TelaPrincipal)

### 5.2 game-engine.ts (272 linhas) — DÍVIDA

**Problemas:**
- Arquivo gigante: 6 jogos + utilitários em um único arquivo
- Blackjack tem bug: verifica `playerScore === 21` após já ter definido o resultado. Quando `roll < 8` (empate), `playerScore` é ajustado para igualar dealer. Se dealer também tiver 21, o check de blackjack (line 127) sobrescreve o empate com win e 3x. Inconsistente.
- Poker: dealer hand é 5 cartas do mesmo baralho que o jogador. Isso significa que as cartas do dealer podem se sobrepor às do jogador (além das community cards). Para um poker simplificado é aceitável, mas o rank de dealer é calculado com 5 cartas que podem incluir duplicatas das cartas do jogador. Na prática o deck tem 52 cartas e são usadas 17 (2 hole + 5 community + 5 dealer + 5 para calcular o rank do dealer = 17), o que é possível. OK para simulação educativa.
- Não há teste unitário nenhum para as funções do engine.

**Ações recomendadas:**
- Extrair cada jogo para seu próprio arquivo no lib/games/
- Corrigir a lógica do blackjack (o check de 21 deve ser antes da decisão de outcome)
- Adicionar testes básicos

### 5.3 GameSlot.tsx — ACEITÁVEL

Near miss implementado visualmente mas sem significado no backend. O near miss é puramente visual (apenas muda a borda para vermelha quando há 2 símbolos iguais). Funciona para a experiência mas não tem lógica de jogo associada.

### 5.4 GameRoulette.tsx — PRONTO mas não integrado

Bem feito: picker de número, tipo de aposta, resultado colorido. Faltam:
- Não está na GAMES array
- Não há handler no page paraidá-lo
- API não tem rota para ele

### 5.5 GameBlackjack.tsx — PRONTO mas não integrado

Bem feito: hit/stand/double, cálculo de score, monte de cartas. Faltam:
- Mesma situação da roleta

### 5.6 GamePoker.tsx — PRONTO mas não integrado

Bem feito: mostra hole cards, community, dealer hand, rank. Faltam:
- Mesma situação

### 5.7 SurvivalChart.tsx — PRONTO mas não integrado

Recharts configurado. Usa `recent` (retornado pelo snapshot) para desenhar gráfico de linhas. Não está no page.tsx.

### 5.8 Leaderboard.tsx — ACEITÁVEL

Apresenta ranking com medalhas. Usa props `leaders`. Funciona.

### 5.9 TransactionHistory.tsx — ACEITÁVEL

Server component que acessa cookies e db diretamente. Usa paginação? Não, mostra tudo. Pode ser problema se user tiver muitas transações.

---

## 6. Páginas

### 6.1 app/page.tsx — ÚNICA PÁGINA

App é single-page. Tudo roda aqui: login, dashboard, jogos, extrato, leaderboard. Não há rotas separadas para extrato ou leaderboard (são modais/drawers no mesmo page).

### 6.2 app/layout.tsx

importa Analytics do Vercel. Funciona apenas em produção (condicional). Ok.

---

## 7. Estado

### 7.1 Estado do client (page.tsx)

```
const [user, setUser]          — { nome, matricula } | null
const [snapshot, setSnapshot]  — { balance, totalLost, rounds, riskScore, recent, balanceHistory }
const [leaders, setLeaders]    — Leader[]
const [activeGame, setActiveGame] — 'slot' | 'animal' | 'board' (SÓ 3!)
const [matricula, setMatricula]
const [senha, setSenha]
const [nome, setNome]
const [message, setMessage]
const [busy, setBusy]
const [register, setRegister]
const [statement, setStatement]
const [showLeaderboard, setShowLeaderboard]
const [animalSelected, setAnimalSelected]
const [winEffect, setWinEffect]
const [lossEffect, setLossEffect]
const [canvasRef, containerRef, triggerWin, triggerLoss] = useParticleEffects()
```

**Problema:** 14 state variables no mesmo componente. Hard de gerenciar. State do jogo (activeGame, animalSelected) misturado com state de auth (matricula, senha).

### 7.2 Estado do servidor

- `users` — id, nome, matricula, senha_hash, saldo_centavos, total_perdido_centavos, rodadas_jogadas, criado_em, atualizado_em
- `sessions` — id, user_id, expira_em, criado_em
- `rounds` — id, user_id, tipo_jogo, aposta_centavos, resultado, multiplicador, saldo_antes, saldo_depois, criado_em
- `transactions` — id, user_id, tipo, valor_centavos, saldo_anterior, saldo_novo, descricao, criado_em

---

## 8. APIs

### 8.1 POST /api/auth/register

Cria user + sessão em um passo. Retorna 201 com user. Trata matricula duplicada (409).

### 8.2 POST /api/auth/login

Verifica credenciais + cria sessão. Retorna user.

### 8.3 POST /api/auth/logout

Deleta sessão + limpa cookie.

### 8.4 GET /api/auth/me

Retorna user logado ou 401.

### 8.5 GET /api/dashboard

Retorna snapshot + leaderboard.

### 8.6 POST /api/games — 🚨 INCOMPLETO

```
body: { game: 'slot'|'animal'|'board', bet_amount: number, animal?: string }
```

**Só processa 3 jogos.** As rotas para roulette, blackjack, poker não existem.
Se voce mandar `game: 'roulette'`, o backend cai no `else` e executa `playSlot`. **Isso é um bug silentioso.**

### 8.7 GET /api/transactions

Paginado. Lê transactions filtradas por user_id.

---

## 9. Banco / Persistência

### 9.1 Schema

```sql
users (id TEXT PK, nome, matricula UNIQUE, senha_hash, saldo_centavos DEFAULT 100000, total_perdido_centavos DEFAULT 0, rodadas_jogadas DEFAULT 0, criado_em, atualizado_em)
sessions (id PK, user_id FK, expira_em, criado_em)
rounds (id PK, user_id FK, tipo_jogo, aposta_centavos, resultado, multiplicador, saldo_antes, saldo_depois, criado_em)
transactions (id PK, user_id FK, tipo, valor_centavos, saldo_anterior, saldo_novo, descricao, criado_em)
```

Indices nas colunas de FK e criado_em. Bom.

### 9.2 Transações

`transact()` no engine usa `db.transaction()` para UPDATE + 2 INSERTs atomically. Bom.

### 9.3 Armazenamento

Arquivo `.data/cassino.db` com WAL mode. Ok para dev. Para produção no Vercel, SQLite funciona mas tem limitações (tamanho, concorrência).

---

## 10. Estilos

### 10.1 globals.css (187 linhas)

Classes existentes:
- `.premium-card` — card com borda dourada, glow
- `.gold-sheen` — texto dourado metálico
- `.neon-text`, `.neon-red`, `.neon-green` — textos de cor
- `.led-red`, `.led-green` — LEDs piscando
- `.ticker` — scroll infinito
- `.slot-display`, `.slot-rolling` — slot styling
- `.stat-card`, `.stat-value`, `.stat-label` — estatísticas
- `.bet-btn` — botão de aposta com gradiente e shadow
- `.game-btn` — botão de jogo com emoji scale
- `.danger-zone` — zona vermelha
- `.leaderboard-row`, `.winner` — ranking
- `.eyebrow` — texto de seção
- `.animal-card` — card de animal
- `.glass` — glassmorphism
- Scrollbar customizada

**Falta:**
- Nenhum @media query para mobile (max-width: 640px)
- Sem utilitários para safe-area-inset (iPhone notch)
- Sem dark/light toggle (tudo dark fixo)
- Sem normalize/reset explícito (Tailwind joga isso mas o CSS customizado pode ter efeitos colaterais)
- `.premium-card` é usado no lugar de shadcn Card — mistura de abordagens

### 10.2 page.tsx styles

Usa classes Tailwind misturadas com classes customizadas. Consistência variável:
- `w-full max-w-md mx-auto` — container centralizado
- `min-h-screen pb-24` — página cheia com padding bottom para ticker
- `sticky top-0 z-40` — header fixo
- `fixed bottom-0` — ticker fixo

---

## 11. Responsividade

**Não testada.** O CSS não tem media queries. O layout usa:
- `max-w-7xl` no container (pode ser muito largo pro mobile)
- `grid grid-cols-3` para game tabs — quebra em telas pequenas
- `grid grid-cols-2 lg:grid-cols-4` para stats — quebra
- `md:flex-row md:items-end` — responsivo parcial
- `hidden sm:inline` — esconde nome do user em telas menores que 640px

**Mobile provavelmente funciona** (é feito com Tailwind e não tem elementos fixed com width fixo), mas não foi testado em dispositivo real.

---

## 12. Testes

**ZERO testes.** Nenhum arquivo de teste existe. Sem unittest, sem integration test, sem e2e.

---

## 13. Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

Padrão Next.js. Não há script de:
- seed de dados
- reset de banco
- geração de JWT_SECRET
- deploy (a gente vai usar Vercel CLI ou GitHub integration)

---

## 14. Configuração

### 14.1 next.config.mjs

Não lido completamente mas tem suporte a standalone? Não se sabe.

### 14.2 tsconfig.json

Bom: strict mode, paths @/*, JSX react-jsx, ES6 target.

### 14.3 package.json

Nome "my-project" (padrão). Sem license, repo, author.

### 14.4 .gitignore

Existe. Não lido.

### 14.5 JWT_SECRET

Default: `'dev-secret-key-change-in-production'`. Inseguro para produção.

---

## 15. Dívida Técnica

| # | Problema | Severidade | Impacto |
|---|----------|------------|---------|
| TD-01 | API /api/games não lida com roulette/blackjack/poker | **CRÍTICA** | Jogos implementados mas inacessíveis. Se user mandar game='roulette', executa slot silenciosamente |
| TD-02 | game-engine.ts gigante (272 linhas, 6 jogos) | MÉDIA | Difícil de manter, difícil de testar |
| TD-03 | Blackjack tem lógica de 21 que sobrescreve empate | BAIXA | Multiplicador errado em casos raros |
| TD-04 | page.tsx com 260 linhas e 14 states | MÉDIA | Difícil de ler,Mesclar com componentes menores |
| TD-05 | GAMES array em utils-data.ts com só 3 jogos | **CRÍTICA** | Page não mostra os 3 jogos novos |
| TD-06 | p5 instalado mas não usado | BAIXA | Dependência extra sem valor |
| TD-07 | recharts instalado mas SurvivalChart não integrado | BAIXA | Component pronto inutilizado |
| TD-08 | @base-ui/react instalado mas não usado | BAIXA | Dependência extra |
| TD-09 | shadcn button.tsx criado mas não usado | BAIXA | Código morto |
| TD-10 | Sem testes nenhum | **ALTA** | Risco de regressão em refatorações |
| TD-11 | Sem rate limit real (in-memory Map) | BAIXA | Em produção com múltiplos processos, rate limit não funciona |
| TD-12 | JWT_SECRET hardcodeado | **ALTA** | Risco de segurança em produção |
| TD-13 | TransactionHistory não pagina | BAIXA | Pode ser lento com muitos dados |
| TD-14 | .gitignore e CLAUDE.md são automáticos (Next.js agent rules) | BAIXA | Não se sabe exatamente o que tem |
| TD-15 | README.md com checklist de features não usadas | BAIXA | Descrição desatualizada |

---

## 16. Dívida Visual

| # | Problema | Severidade | Impacto |
|---|----------|------------|---------|
| DV-01 | Login mostra texto educacional ("experimento sobre valor esperado negativo") | **ALTA** | Quebra imersão. User quer tirar |
| DV-02 | Sem responsividade mobile testada | **ALTA** | Layout pode quebrar em celular |
| DV-03 | Game tabs 그리드 3 quebra em telas pequenas | MÉDIA | Mobile: tabs não cabem |
| DV-04 | 3 jogos novos não mostram no front-end | **CRÍTICA** | Jogos implementados mas invisíveis |
| DV-05 | Estatísticas genéricas (sem LEDs, sem contadores piscando) | MÉDIA | Visual menos "cassino" |
| DV-06 | Sem gráficos de saldo vs tempo | MÉDIA | Falta elemento educacional |
| DV-07 | Ticker com dados estáticos (LIVE_MESSAGES) | BAIXA | Não dá sensação de realidade |
| DV-08 | Animais do bicho com emoji mas sem ícones customizados | BAIXA | Poderia ser mais polido |
| DV-09 | Sem deep-link para jogos específicos | BAIXA | UX limitation |

---

## 17. Problemas de UX

| # | Problema | Severidade | Impacto |
|---|----------|------------|---------|
| UX-01 | Após login, user vê dashboard mas não sabe onde clicar primeiro | MÉDIA | Friction inicial |
| UX-02 | Não há indicação visual de qual jogo está selecionado além do botão "selected" | BAIXA | Confusão |
| UX-03 | Apóstas sempre R$10,00 fixo — não há escolha de valor | MÉDIA | Less realista |
| UX-04 | Após perder, message area mostra texto mas não há feedback sonoro/visual intenso | BAIXA | Menos impacto emocional |
| UX-05 | Extrato é toggle (statement) — pode ser esquecido | BAIXA | User pode não ver histórico |
| UX-06 | Leaderboard é toggle — pode ser esquecido | BAIXA | Mesmo |
| UX-07 | Sem indicação de quantas rodadas faltam para "ficar no topo" | BAIXA | Less motivating |
| UX-08 | Login sem "lembrar-me" ou recuperação de senha | BAIXA | Login é manual toda vez |

---

## 18. Possíveis Gargalos de Performance

| # | Problema | Severidade | Impacto |
|---|----------|------------|---------|
| PG-01 | game-engine.ts é sincrono e bloqueante (better-sqlite3 é sync) | MÉDIA | Cada rodada bloqueia o event loop Node. Para jogos simples é fine. Para alta concorrência, problematic. |
| PG-02 | P5.js instalado mas não usado — ok, não é gargalo | BAIXA | N/A |
| PG-03 | Recharts no frontend pode ser lento se data for grande | BAIXA | SurvivalChart usa só 60 pontos no máximo. OK. |
| PG-04 | Canvas particulas usa requestAnimationFrame — pode consumir bateria no mobile | MÉDIA | Se user ficar muito tempo na página, bateria drena. Mas é opcional (canvas é pointer-events-none). |
| PG-05 | Ticker com clone de LIVE_MESSAGES (2x) — renderiza 2x o array | BAIXA | 12 itens, não é gargalo |

---

## 19. Código Duplicado

| # | Localização | Descrição |
|---|-------------|-----------|
| CD-01 | `app/page.tsx` lines 59, 60 — mensagens de vitória/perda para slot e animal duplicadas | Mesma lógica, textos diferentes. Poderia ser unificado. |
| CD-02 | `lib/game-engine.ts` — `transact()` é chamada por todas as 6 funções de jogo | É pela arquitetura, não é duplicação indevida. |
| CD-03 | `components/games/` — 6 componentes com padrão similar (balance display, bet button) | Similaridade esperada por serem componentes irmãos. Não é duplicação ruim. |

---

## 20. Componentes Visualmente Genéricos

| # | Componente | Problema |
|---|------------|----------|
| CV-01 | LoginScreen | Usa shadcn genérico sem personalidade de cassino. O ícone é ShieldCheck (genérico). Títulos com font-serif mas sem personalidade. |
| CV-02 | StatsCard | Cards genéricos com ícone lucide. Sem LEDs, sem números piscando, sem barra de progresso. |
| CV-03 | Leaderboard | Tabela genérica. Poderia ter mais formatação cassino. |
| CV-04 | TransactionHistory | Tabela genérica. Sem destaque visual para vitória/perda. |

---

## 21. Funcionalidades Parcialmente Implementadas

| # | Funcionalidade | Status |
|---|----------------|--------|
| F-01 | Roleta | Engine OK, component OK, MAS não na API e não no front |
| F-02 | Blackjack | Engine OK, component OK, MAS não na API e não no front |
| F-03 | Poker | Engine OK, component OK, MAS não na API e não no front |
| F-04 | Gráfico de saldo (SurvivalChart) | Component OK, MAS não integrado no page |
| F-05 | Near miss visual no slot | Visual OK, sem backend |
| F-06 | Prova social fake (ticker) | Implementado com dados estáticos |
| F-07 | P5.js particle effects | Hook criado com P5, mas projeto usa canvas puro. P5.js não está sendo usado. |

---

## 22. Funcionalidades Quebradas

| # | Funcionalidade | Status |
|---|----------------|--------|
| BQ-01 | API /api/games com game='roulette' executa slot silenciosamente | **BUG** |
| BQ-02 | Blackjack: empate com 21 ambos pode ser convertida para vitória 3x | **BUG** (lógica) |

---

## 23. Inconsistências de Nomenclatura

| # | Problema |
|---|-----------|
| IN-01 | `lib/game-engine.ts` tem funções para 6 jogos mas arquivo se chama "engine" genérico. Seria melhor `lib/games/` com arquivo por jogo, ou `lib/game-engine.ts` com apenas o core. |
| IN-02 | `components/games/GameSlot.tsx` vs `lib/game-engine.ts` playSlot — naming convention mista (Component vs function). |
| IN-03 | `app/api/games/route.ts` só lida com 3 jogos mas a rota se chama "games" genérico. |
| IN-04 | `tipo_jogo` na DB vs `game` no API body — naming inconsistente. |
| IN-05 | `balanceHistory` no snapshot vs `recent` — dois nomes para dados similares. |

---

## 24. Problemas Mobile

| # | Problema |
|---|-----------|
| M-01 | Não testado em dispositivo real |
| M-02 | CSS não tem media queries |
| M-03 | Layout pode quebrar em telas < 375px |
| M-04 | Game tabs grid 3 não funciona em mobile estreito |
| M-05 | Stats grid 4 quebra em mobile |
| M-06 | Ticker fixed bottom pode cobrir conteúdo se page não tem padding bottom adequado (tem pb-24, ok) |
| M-07 | Header sticky pode cobrir conteúdo ao fazer scroll (não há scroll-margin-top no section) |

---

## 25. Problemas de Acessibilidade

| # | Problema |
|---|-----------|
| A-01 | Sem `aria-label` nos botões de jogo (só emoji) |
| A-02 | Sem `role="status"` na área de mensagem de resultado |
| A-03 | Login sem label visuais nos inputs (placeholder-only) — acessibilidade ruim |
| A-04 | Ticker animado sem `aria-live` ou preferência de redução de movimento |
| A-05 | Sem `title` ou `alt` nos ícones de jogo |

---

## 26. Pontos de Risco

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R-01 | Deploy no Vercel com SQLite pode falhar se arquivo não estiver no git | Alta | Alta | Verificar se .data/ está no .gitignore |
| R-02 | JWT_SECRET padrão é visível no código | Alta | Alta | Uso de variável de ambiente em produção |
| R-03 | Rate limit in-memory não funciona com múltiplos processos | Média | Baixa | Para dev/educacional, fine. Para produção real, usar Redis ou similar |
| R-04 | better-sqlite3 pode ter issues de build no Vercel (native module) | Média | Alta | Verificar se Vercel suporta. Alternativa: @libsql/client ou Turso |
| R-05 | Sem testes — refatoração do engine pode introduzir bugs | Alta | Alta | Adicionar testes básicos antes de grandes mudanças |

---

## 27. Recomendações por Prioridade

### P0 — CRÍTICO (fazer antes de qualquer coisa)

1. **TD-01 + DV-04 + UX:** Adicionar rota no `/api/games` para roulette/blackjack/poker + adicionar os 3 jogos à GAMES array + integrar no page.tsx
2. **TD-05:** Atualizar GAMES para 6 jogos

### P1 — ALTA

3. **TD-12:** Configurar JWT_SECRET via variável de ambiente (documentar no README)
4. **TD-10:** Adicionar pelo menos testes básicos para o engine (jogos individuais)
5. **UX-03:** Permitir escolha do valor da aposta (ou pelo menos variar)
6. **DV-01:** Remover texto educacional explícito do login

### P2 — MÉDIA

7. **TD-02:** Extrair jogos do engine para arquivos separados
8. **TD-04:** Refatorar page.tsx em componentes (TelaLogin, TelaPrincipal, JogoSlot, etc.)
9. **DV-02 + M-02:** Adicionar media queries para mobile
10. **UX-01:** Melhorar onboarding visual pós-login
11. **DV-06:** Integrar SurvivalChart no dashboard

### P3 — BAIXA

12. **TD-06:** Remover p5 do package.json (ou usar)
13. **TD-07:** Integrar Recharts/SurvivalChart
14. **TD-09:** Remover ui/button.tsx se não for usar
15. **TD-13:** Adicionar paginação ao TransactionHistory
16. **CD-01:** Unificar mensagens de vitória/perda no handlePlay
17. **A-01 a A-05:** Melhorar acessibilidade

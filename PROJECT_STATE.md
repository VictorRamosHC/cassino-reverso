# Estado do Projeto — Cassino Reverso

**Data:** 2026-09-05  
**Versão:** 1.0.0 (estimada)  
**Status:** funcional mas com dívida  
**Time:** Victor (líder TI) + 1 dev front-end  
**Escopo:** app educacional de apostas — quem perde menos ganha  

---

## Visão Geral

App single-page que simula 6 jogos de cassino para fins educacionais. O jogador loga, joga, e o objetivo é perder o mínimo possível. Quem perde menos no ranking ganha o "jogo".

A lógica de negócio está no backend (Next.js API Routes + better-sqlite3). O frontend é React com Tailwind + CSS customizado.

---

## O que está funcionando

- [x] Auth completo: register, login, logout, sessão (JWT + cookie HTTP-only)
- [x] 3 jogos no frontend: Slot, Bicho, Dados
- [x] 3 jogos no backend: Slot, Bicho, Dados
- [x] Dashboard com saldo, total perdido, rodadas, risco
- [x] Leaderboard (top 10 quem perdeu menos)
- [x] Extrato de transações (paginado)
- [x] Ticker de "prova social" fake
- [x] CSS cassino básico (dourado, preto, vermelho, neon)
- [x] Animações: LEDs piscando, ticker, slot rolling, win/loss flash
- [x] Particle effects via canvas (useParticleEffects hook)
- [x] Banco SQLite com schema completo (users, sessions, rounds, transactions)

---

## O que está implementado mas não conectado

- [ ] **Roulette** — engine ok, componente ok (GameRoulette.tsx), MAS:
  - Não está no `GAMES` array (utils-data.ts)
  - Não há rota no `/api/games` para ele
  - Não está no page.tsx
- [ ] **Blackjack** — engine ok, componente ok (GameBlackjack.tsx), MAS:
  - Não está no `GAMES` array
  - Não há rota no `/api/games`
  - Não está no page.tsx
- [ ] **Poker** — engine ok, componente ok (GamePoker.tsx), MAS:
  - Não está no `GAMES` array
  - Não há rota no `/api/games`
  - Não está no page.tsx
- [ ] **SurvivalChart** (Recharts) — componente criado em `components/charts/` MAS:
  - Não está no page.tsx
  - Depende de `balanceHistory` que o snapshot retorna mas não está sendo usado

---

## O que não existe

- [ ] Testes (unitário, integração, e2e)
- [ ] Rate limit persistente (atualmente Map in-memory — não funciona com múltiplos processos)
- [ ] Escolha de valor da aposta (sempre R$10,00 fixo)
- [ ] Mensagens personalizadas por jogo (slot e bicho têm mensagens no handlePlay, jogo board tem sua própria mensagem no componente)
- [ ] Deep links para jogos específicos
- [ ] Modo competição entre turmas
- [ ] Export PDF do extrato
- [ ] Timer de "quentes jogando agora" real

---

## Backlog (do README.md — não entregue)

- [ ] Definir paleta exata de cores (hex codes) — FEITO parcialmente
- [ ] Criar ícones dos animais e simbolos do slot (SVG/emoji) — FEITO com emoji
- [ ] Escrever o novo `globals.css` com a identidade de cassino — FEITO
- [ ] Refatorar `app/page.tsx` em componentes menores — PEU feito (separou LoginScreen)
- [ ] Implementar animações de resultado — FEITO parcialmente (win/loss flash, LED, ticker, P5 particles)
- [ ] Adicionar efeitos sonoros — NÃO FEITO (e não é prioridade)
- [ ] Testar no celular (responsividade touch) — NÃO FEITO
- [ ] Criar conta Vercel e conectar repositório — NÃO FEITO
- [ ] Documentar no README como acessar o app deployado — NÃO FEITO

---

## Riscos ativos

- JWT_SECRET hardcoded no código (`dev-secret-key-change-in-production`)
- `api/games` não lida com os 3 novos jogos (rota genérica → cai no else e executa slot)
- `p5` e `recharts` instalados mas não usados (dependências órfãs)
- `better-sqlite3` é módulo nativo — pode dar problema no Vercel
- Sem testes — qualquer mudança no engine é de risco

---

## Arquivos críticos

| Arquivo | O que faz | Risco se mexer |
|---------|-----------|----------------|
| `lib/game-engine.ts` | 6 jogos + leaderboard + snapshot + transact | Quanta a lógica de negócio. Mudar sem testes = risco |
| `lib/db.ts` | Schema SQLite + conexão | Criar tabelas, indices. Risco: alterar schema quebra dados existentes |
| `lib/auth.ts` | JWT + bcrypt + sessão | Risco: mudar lógica de sessão quebra login/logout |
| `app/api/games/route.ts` | Rota principal de jogos. Só lida com 3 jogos | **BUG: não tem os 3 novos jogos** |
| `app/page.tsx` | Tudo no frontend (login, dashboard, jogos, ticker) | 260 linhas, difícil de mexer sem quebrar |
| `app/globals.css` | Tema cassino + animações | 187 linhas, bem estruturado |
| `components/games/*.tsx` | 6 componentes de jogo | 3 prontos e integrados, 3 prontos mas não integrados |
| `components/charts/SurvivalChart.tsx` | Gráfico Recharts | Pronto mas não integrado |
| `hooks/useParticleEffects.ts` | Canvas particulas | Usado no page |
| `hooks/useP5Effects.ts` | Hook P5.js (alternativo) | Não usado (código morto) |
| `components/ui/button.tsx` | CVA button | Não usado (código morto) |

---

## Decisões técnicas

- **SQLite** em vez de PostgreSQL: escolha para simplificar dev. Para produção com muitos usuários, limitado. Para turma de ~50 alunos, ok.
- **JWT em cookie HTTP-only**: escolha segura para autenticação stateless.
- **better-sqlite3** (síncrono): escolha por simplicidade. Event loop bloqueia durante cada operação. Para app educacional com poucos usuários simultâneos, ok.
- **P5.js não usado**: installado, hook criado, mas implementação final usa canvas puro. P5.js pode ser removido.
- **Recharts instalado mas não integrado**: componente pronto, faltou o último passo de adicioná-lo ao dashboard.

---

## Próximos passos (do README)

1. [ ] Adicionar os 3 jogos novos ao GAMES array (utils-data.ts)
2. [ ] Adicionar rota no api/games para roulette, blackjack, poker
3. [ ] Integrar os 3 jogos no page.tsx
4. [ ] Integrar SurvivalChart no dashboard
5. [ ] Testar responsividade (mobile)
6. [ ] Remover texto educacional explícito do login
7. [ ] Adicionar testes básicos ao engine
8. [ ] Configurar JWT_SECRET de variável de ambiente
9. [ ] Verificar se .data/ está no gitignore (se estiver, o SQLite não vai para o Vercel)
10. [ ] Deploy no Vercel

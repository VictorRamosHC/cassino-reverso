# Cassino Reverso — App de Bets Educacionais

> **Quem perde menos, ganha.**  
> Um app mobile de apostas onde a casa sempre tem vantagem — e o objetivo do jogador é sobreviver o máximo possível.  
> Feito para a aula de educação financeira: mostrar na prática por que apostar é perda de dinheiro.

---

## 🎯 O que é isso

É um **simulador de cassino estilo "tigrinho" / "coelhinho" / lotérica** feito totalmente com fins educacionais. O jogador começa com uma banca (ex: R$100,00), faz rodadas de apostas nos jogos, e **vence quem ao final tiver perdido menos dinheiro**.

**Isso inverte a lógica normal dos jogos de azar**: normalmente você quer ganhar o máximo. Aqui você quer perder o mínimo. O resultado é uma ferramenta poderosa para o Brasil entender (ou sentir) o problema das bets.

---

## 📱 O app — como vai parecer

### Visual "Cassino Brasileiro" (a identidade do projeto)

O app vai ter a estética de uma **casa de apostas brasileira real**, com:

- **Paleta agressiva**: vermelho vivo, dourado/chumbo, preto profundo — o clássico das casas de jogo
- **LEDs e contadores piscando**: número da aposta e saldo com efeito "neon" piscando
- **Animais do jogo do bicho**: coelho, águia, avestruz, etc. como ícones dos jogos (vetores simples em SVG)
- **Tambores / roleta de cores**: visual de "tigrinho" com as 10 faixas coloridas e o animal em destaque
- **Vibração e efeitos sonoros** (opcional): feedback quando ganha/perde, como um app real de aposta
- **Mobile-first**: designed para caber num celular na vertical — como um app de bets de verdade

### O que o jogador vê

1. **Tela de login/registro** — matricula + senha, simples
2. **Dashboard** — mostra:
   - Saldo atual (R$)
   - Total perdido (R$)
   - Rodadas jogadas
   - "Risco / perda" em porcentagem
   - Classificação ("quem perdeu menos") entre todos os jogadores
3. **3 jogos disponíveis**:
   - 🎰 **Caça-Níquel** — slot com 3 posições, probabilidade baixa de ganho
   - 🐰 **Jogo do Bicho** — escolha um animal, tenta adivinhar se sai
   - 🎲 **Tabuleiro com Dados** — rolagem de dado, risco alto
4. **Extrato de apostas** — histórico completo de cada rodada (data, jogo, resultado, valor, saldo depois)

### O que o jogador SENTE

O app é propositalmente **viciante na forma, mas educativo no conteúdo**. A cada rodada o jogador vê o saldo cair. No final, o dashboard mostra "você perdeu X reais" e a classificação o coloca no contexto: "você foi o 3° a menos perder hoje".

A experiência deve gerar vontade de jogar mais (porque é um app investigado de cassino) mas o reflexo educativo é: "ainda assim eu perdi dinheiro".

---

## 🧠 A lógica por trás dos jogos (regras claras)

### 1. Caça-Níquel (Slot)

- Aposta de R$10,00 (configurável)
- 18% de chance de ganhar (ou seja, 82% de perda — margem alta)
- Se ganhar: recebe 2,2× a aposta (R$22,00 de volta, lucro de R$12,00)
- Se perder: perde a aposta inteira
- Visual: 3 posições com símbolos (7, BAR, ★) que rodam e travem

### 2. Jogo do Bicho

- 10 animais disponíveis: Avestruz, Águia, Burro, Borboleta, Cachorro, Cabra, Carneiro, Camelo, Cobra, Coelho
- Escolha um animal e aposte
- 68% de chance de ganhar (é "mais fácil") mas o retorno é só 1,35× — ou seja, a casa ainda lucra
- Se ganhar: recebe 1,35× a aposta
- Se perder: perde tudo
- Visual: mostra o animal escolhido + o resultado com ícone

### 3. Tabuleiro com Dados

- Rola um dado de 6 faces
- 70% de chance de "casa absorver a aposta" (perda garantida)
- 30% de "casa neutra" ( você só continua, sem ganho nem perda)
- Nenhum multiplicador positivo — é só risco
- Visual: mostra o dado + uma frase de resultado

---

## 🛠️ Como foi construído (arquitetura)

O app usa **Next.js 16** (React + TypeScript) com uma arquitetura de servidor segura. Veja o diagrama:

```mermaid
flowchart TD
    U[👤 Usuário no Celular] -->|HTTPS| F[🖥️ Front-end Mobile<br/>Next.js App]
    F -->|fetch('/api/...')| A[⚙️ API Routes<br/>Next.js Server]
    A -->|JWT Session| C{🔐 Auth Layer<br/>login/logout/sessão}
    A -->|bcrypt + SQLite| DB[(💾 banco SQLite<br/>usuários, rodadas, transações)]
    A -->|jogo selectionado| GE[🎲 Game Engine<br/>slot, bicho, dados]
    GE -->|randomBytes + crypto| R[🎯 Resultado Determinado<br/>no servidor]
    R -->|atualiza| DB
    DB -->|retorna| A
    A -->|resposta com saldo| F
    F -->|atualiza tela| U
```

### Camadas do sistema

| Camada | O que faz | Tecnologia |
|--------|-----------|------------|
| **Front-end** | Tela do jogador, animações, renderização | Next.js + React + TypeScript + CSS customizada |
| **API Routes** | Endpoints `/api/auth/*`, `/api/games`, `/api/dashboard` | Next.js App Router (server-side) |
| **Auth** | Login, registro, sessão via cookie, JWT | jose + bcryptjs + cookies HTTP-only |
| **Game Engine** | Lógica dos 3 jogos, RNG seguro, cálculo de saldo | Node crypto, funções puras |
| **Banco de dados** | Persistência de usuários, sessões, rodadas, transações | SQLite via better-sqlite3 (arquivo local) |

### Segurança

- **Tudo que importa roda no servidor**: resultado do jogo, saldo, registros — nunca confiável ao navegador
- **Sessão segura**: cookie HTTP-only, JWT assinado, 24h de duração
- **Senhas**: hash bcrypt (nunca armazenadas em texto)
- **Transações**: o update de saldo + registro da rodada roda em uma única transação SQLite — não pode ficar meio salvo

---

## 🚀 Como rodar hoje

Do terminal, na pasta `cassino-reverso`:

```bash
# 1. Baixar dependências
pnpm install

# 2. Rodar o servidor de desenvolvimento
pnpm dev
```

Depois abra `http://localhost:3000` no navegador.

Na primeira vez, o app cria o banco de dados automaticamente. Para a versão de produção, cria-se uma variável de ambiente `JWT_SECRET` com uma chave longa e aleatória antes de subir.

---

## 📂 Pastas importantes

```
cassino-reverso/
├── app/
│   ├── api/          ← endpoints do servidor (auth, games, dashboard)
│   ├── page.tsx      ← tela principal do app (front-end)
│   ├── layout.tsx    ← estrutura base (html, head, body)
│   └── globals.css   ← estilo global do app
├── components/
│   └── transaction-history.tsx  ← tabela de extrato
├── lib/
│   ├── db.ts         ← conexão SQLite + criação das tabelas
│   ├── auth.ts       ← login, registro, sessão, JWT
│   ├── game-engine.ts ← lógica dos 3 jogos
│   ├── rate-limit.ts ← controle de запросы por IP
│   └── utils.ts      ← helpers (cn = combinação de classes)
├── .data/            ← banco de dados SQLite (arquivo local)
└── public/           ← ícones, imagens fixas
```

---

## 🎨 O plano de transformação visual (o que vamos mexer)

O foco agora é **transformar o front-end atual (bonito mas genérico) em um app que parece uma casa de apostas brasileira real**, mantendo toda a lógica de servidor intacta.

### O que vai mudar

| O que tem hoje | O que vai ficar |
|---------------|-----------------|
| Tela sobrescrita com `premium-card` shadcn | Telas com fundo escuro intenso, bordas douradas, texturas |
| Ícones lucide genéricos (ShieldCheck, Activity) | Ícones dos animais + emojis + ícones de cassino customizados em SVG inline |
| Layout com grid 7xl | Layout mobile-first, coluna única, botões grandes, fácil de tocar |
| Mensagens secas ("Você perdeu R$10,00") | Mensagens com personality: "A banca ficou com seu dinheiro 🔥", "Tapa na cara, perdeu de novo" |
| Cards de estatísticas simples | Painel estilo cassino com LEDs, contadores piscando, barras de progresso |
| Nenhuma animação de jogo | Animações de rodada: tambores girando, números correndo, resultado com destaque |

### O que NÃO vai mudar (não toca)

- **Lógica dos jogos** (`lib/game-engine.ts`) — os cálculos, probabilidades, multiplicadores
- **Auth** (`lib/auth.ts`, rotas `/api/auth/*`) — login, sessão, registro
- **Banco de dados** (`lib/db.ts`) — schema, tabelas
- **API Routes** (`app/api/`) — os endpoints, exceto por ajustes de resposta para a nova UI
- **Segurança** — nada que garanta que o servidor não seja fraudável

---

## 🧩 O que o programador vai mexer (tecnicamente)

### 1. Novo CSS — `app/globals.css`

Substituir o tema shadcn por fundamentos de cassino: fundo escuro, dourado como cor de destaque, vermelho para perdas, brilhos, efeitos neon. Pode-se usar CSS puro ou Tailwind configurado com essa paleta.

### 2. Novo `app/page.tsx`

Refatorar esse arquivo gigante (hoje ~300 linhas num único componente) em componentes menores:

- `<TelaLogin />` — formulário de acesso
- `<TelaPrincipal />` — dashboard + jogos + extrato
- `<PainelEstatisticas />` — cards de saldo, total perdido, rodadas
- `<Classificacao />` — leaderboard com quem perdeu menos
- `<JogoSlot />`, `<JogoBicho />`, `<JogoDados />` — cada jogo com sua animação
- `<Extrato />` — tabela de histórico

Isso deixa o código mais legível e permite que duas pessoas trabalhem em paralelo sem dar conflitos.

### 3. Novos vetores / assets

Criar ou adaptar:
- Ícones dos 10 animais (SVG simples ou emoji alt)
- Símbolos do slot (7, BAR, ★, etc.)
- Ícone de dado, tambores, etc.

Pode ser tudo feito com SVG inline no React, ou arquivos em `public/`.

### 4. Touch feedback e animações

- Botões com efeito de pressão (scale down no :active)
- Resultado com destaque (parpadeio, fade-in, confetti simples de vitória)
- Contadores com números piscando antes de mostrar o resultado

---

## 🎓 Por que essa arquitetura é a melhor para o time

### Para o programador (TI)

- **Next.js** é o framework mais adotado para apps React no Brasil — fácil de encontrar material, fóruns, exemplos
- **App Router** já separa rotas server-side das client-side — seguro por padrão
- **SQLite** não precisa de instalção de banco externo — tudo roda num arquivo. Ideal para começar rapidamente
- **TypeScript** evita erros bobos de tipo — ajuda muito quando dois programadores tocam no mesmo código
- **Componentização** (separar jogos em components próprios) vai deixar o código sustentável à medida que new jogos são adicionados

### Para o resto da turma (leigos em TI)

- É só abrir o link no celular ou no computador — não precisa instalar nada
- O app já vem pronto para rodar com um único comando (`pnpm dev`)
- Quando for para o Vercel, será um link pra todo mundo acessar de verdade

---

## 🌐 Deploy no Vercel (passo a passo futuro)

Quando quiserem disponibilizar para toda a turma:

1. **Criar conta no Vercel** (gratuita para projetos educacionais)
2. **Conectar o repositório do GitHub** ao Vercel
3. **Configurar variáveis de ambiente**:
   - `JWT_SECRET` = uma string longa e aleatória (gera com `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
4. **Deploy automático**: toda vez que alguém envia código para o `main`, o Vercel rebuilda e disponibiliza o app num link tipo `cassino-reverso.vercel.app`

O Vercel já suporta o `better-sqlite3` nativamente (basta garantir que `npm` ou `pnpm` instala as dependências corretas). Para produção com banyak usuários, o SQLite tem limitações, mas para uma turma de ~50 pessoas, funciona sem problemas.

---

## 👥 Como o time trabalha

### Papéis sugeridos

| Função | Responsável | O que faz |
|--------|-------------|-----------|
| **Líder de TI** | você | Arquitetura, decisões técnicas, revisão de código, integração |
| **Dev front-end** | colega | CSS, animações, componentização, touch feedback |
| **Todo mundo** | turma | Testar o app, sugerir melhorias, avaliar se a experiência "vende" a ideia educacional |

### Fluxo de desenvolvimento

1. **`git checkout -b nome-da-feature`** — cada feature em seu ramo
2. **Codar, testar localmente**
3. **`git push` e abrir Pull Request** — o líder revisa
4. **Merge no main** — deploy automático (quando conectado ao Vercel)

---

## ✅ Checklist do que falta fazer

- [ ] Definir paleta exata de cores (hex codes)
- [ ] Criar os ícones dos animais e simbolos do slot (SVG/emoji)
- [ ] Escrever o novo `globals.css` com a identidade de cassino
- [ ] Refatorar `app/page.tsx` em componentes menores
- [ ] Implementar animações de resultado (slot, bicho, dados)
- [ ] Adicionar efeitos sonoros (opcional, pode ser desligado)
- [ ] Testar no celular (responsividade touch)
- [ ] Criar conta Vercel e conectar repositório
- [ ] Documentar no README como acessar o app deployado

---

## 🎲 Exemplo de rodada — o que o jogador experimenta

> 1. Jogador entra com matrícula e senha
> 2. Vê saldo: **R$100,00**
> 3. Clica em "Jogo do Bicho"
> 4. Escolhe "Coelho" e aposta R$10,00
> 5. O servidor sorteia: **não saiu o coelho**
> 6. Tela mostra: **"NÃO SAIU O COELHO! Você perdeu R$10,00"** com efeito vermelho e piscando
> 7. Saldo atualizado: **R$90,00**
> 8. Jogador anda para o slot, tenta de novo...
> 9. No final da sessão, veio no dashboard: "Você perdeu R$35,00 e ficou no 4° lugar entre 20 jogadores"

---

## ✨ Ideias futuras (se tiver tempo)

- Adicionar jogo da roleta (vermelho/ Preto, com probabilidades e multiplicadores)
- Timer de "temperatura" — mostrar quantas pessoas estão jogando agora
- Gráfico de saldo ao longo do tempo (linha caindo)
- Modo "competição entre turmas" — TI vs ADM
- Exportar PDF do extrato para usar na aula de educação financeira

---

## 📞 Contato do líder de TI

Se tiver dúvida sobre qualquer decisão técnica, converse com o líder da turma de TI antes de mexer no core (`lib/`, `app/api/`). Para mudanças visuais, podem experimentar diretamente no CSS e no front-end.

---

> **Lembrete final:** O app é uma ferramenta educacional. Ele não promove apostas. Ele mostra através da experiência por que as casas de jogo sempre lucram e por que quem joga perde dinheiro.

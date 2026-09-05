
# Guia de Implantação da Vendedora

## O que é o "Cassino Reverso"?

---

O Cassino Reverso é um **projeto educativo de programação** que simula uma casa de apostas online para demonstrar, de forma interativa, como as casas de jogos sempre têm vantagem matemática sobre os jogadores. O objetivo pedagógico é mostrar que, em jogos de azar, a casa sempre lucra a longo prazo, e que o jogador que "perde menos" é, na verdade, o vencedor do jogo.

### Como funciona o jogo?

A lógica do Cassino Reverso baseia-se no conceito de **valor esperado negativo**. Em cada rodada, o jogador faz uma aposta, e o sistema determina o resultado com base em probabilidades que favorecem a casa. O jogador pode ganhar algumas rodadas, mas a longo prazo, a casa sempre sai lucrativa.

### Regras do jogo

1. O jogador começa com um "saldo inicial" de 100.000,00 (cem mil) em créditos fictícios.
2. A cada rodada, o jogador escolhe um jogo (Caça-Níquel, Jogo do Bicho, ou Tabuleiro de Dados) e faz uma aposta.
3. O sistema sorteia o resultado com base em probabilidades pré-definidas.
4. Se o jogador ganhar, seu saldo é acrescido do valor da aposta multiplicado pelo multiplicador da vitória.
5. Se o jogador perder, o valor da aposta é descontado do saldo.
6. O jogo continua até que o jogador decida parar, ou até que seu saldo chegue a zero.

### Jogos disponíveis

#### 1. Caça-Níquel (Slot Machine)
- **Descrição:** Uma simulação de caça-níquel com 3 rolos.
- **Probabilidade de vitória:** 18% (a casa possui 82% de chance de ganhar).
- **Multiplicador de vitória:** 2.2x (o jogador ganha o dobro da aposta mais 20% de bônus).
- **Objetivo:** Encher a tela com símbolos ganhadores.
- **Simulação de queda:** O sistema usa efeitos visuais de queda para simular a física do jogo. Isso inclui partículas, confetes e tremores de tela para criar uma experiência imersiva de vitória.

#### 2. Jogo do Bicho
- **Descrição:** Uma simulação do tradicional "jogo do bicho" brasileiro, onde o jogador aposta em um dos 25 animais.
- **Probabilidade de vitória:** 68% para cada animal (a casa possui 32% de chance de ganhar).
- **Multiplicador de vitória:** 1.35x (o jogador ganha 35% a mais que a aposta).
- **Mecânica:** O jogador escolhe um animal e aposta. O sistema sorteia um animal aleatório. Se for o animal escolhido, o jogador ganha; caso contrário, perde.
- **Dica:** A estratégia ótima é apostar no animal com menor probabilidade de sair (que é o Coelho, com 68% de chance de vitória). Isso porque, com um multiplicador de 1.35x, o valor esperado da aposta é positivo, mas a casa ainda tem vantagem a longo prazo.

#### 3. Tabuleiro de Dados
- **Descrição:** Uma simulação de tabuleiro de dados onde o jogador lança um dado e tenta adivinhar o resultado.
- **Probabilidade de vitória (casa neutra):** 70% (a casa não tem vantagem, mas o jogador pode ganhar ou perder igualmente).
- **Mecânica:** O jogador lança um dado e o sistema informa se a casa absorveu a aposta (casa neutra) ou se o jogador ganhou. O jogo é puramente aleatório, sem vantagem da casa.
- **Dica:** Não há estratégia ótima para este jogo, pois a probabilidade é 50/50. O jogador pode ganhar ou perder igualmente.

### Pontuação e ranking

O sistema mantém um ranking dos jogadores com base no saldo final e no número de rodadas jogadas. Quanto maior o saldo final, melhor a posição no ranking. Isso incentiva os jogadores a desenvolver estratégias para perder menos.

### Recursos adicionais

- **Painel de controle:** Exibe informações sobre o saldo, total perdido, número de rodadas e risco de perda.
- **Extrato de transações:** Mostra o histórico de todas as apostas e resultados.
- **Ranking:** Lista os melhores jogadores (quem perdeu menos).
- **Ticker ao vivo:** Mostra mensagens de jogadores que estão jogando agora, criando uma sensação de comunidade.

### Desenvolvimento

O projeto é desenvolvido com:
- **Next.js 16** (framework React)
- **Tailwind CSS 4** (estilização)
- **TypeScript** (tipagem estática)
- **SQLite** (banco de dados local)
- **Auth**: Sistema de autenticação básico com login e registro.

### Como rodar o projeto?

1. **Pré-requisitos:**
   - Node.js 18+ instalado
   - npm ou yarn

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Rodar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acessar o aplicativo:**
   Abra o navegador em `http://localhost:3000`

### Segurança e responsabilidade

Este é um **simulador educacional** e não incentiva jogos de azar. O objetivo é conscientizar sobre os riscos financeiros das apostas. O sistema não lida com dinheiro real e não deve ser usado para apostas reais.

### Autor

Victor Souza - Estudante de TI  
Turma de Tecnologia - Instituto Formar  
Curso de Educação Financeira

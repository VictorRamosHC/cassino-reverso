/* ============================================================
   CASSINO REVERSO — Visual System Evolution
   Queremos:
   - excesso controlado (casino real é caótico, mas é caos organizado)
   - urgência ( LEDs piscando, contadores, efeitos de pressão)
   - recompensa visual ( ouro, brilho, confete controlado, não spam)
   - artificialidade comercial ( istot é fake, deve parecer fake por design)
   
   ERROS A EVITAR:
   - neon em tudo → vire ruído visual, perde o foco
   - bordas em tudo → card tem bordas 4, botões têm bordas, inputs têm bordas...
   - glow indistinto → texto igual menu igual botão igual
   - tipografia genérica sem hierarquia → Inter padrão todo lugar
   - gradientes aleatórios → ruído, não intenção
   
   Decisões:
   - Fundo profundo #050505 como tela
   - Apenas UMA cor de destaque: ouro #FFD700 para ações primárias e dados críticos
   - Verde #22c55e apenas para vitória
   - Vermelho #ef4444 apenas para derrota/erro
   - Texto secundário: cinza quente #8b7355 (marrom-ouro desaturado) em vez de cinza frio
   - Tipografia mono para dados/números/código (JetBrains Mono / Fira Code)
   - Tipografia display para títulos impactantes (Space Grotesk bold)
   - Tipografia body legível (Inter ou system-ui)
   - Shadow sutil e definido, não multiple shadows de neon
   - Buttons: gradiente sutil + borda de ouro + shadow definido
   - Cards: fundo quase preto com borda sutil e sombra definida
   - Estado de vitória: flash verde breve + confete controlado (p5 ou CSS canvas)
   - Estado de derrota: flash vermelho breve + texto mais intenso
   - Ticker: barra inferior fixa, dados fictícios "prova social" mas claramente fake
   - Mobile: layout single-column, botões grandes (min 44px), touch-friendly
   - Loading: skeleton não spinners genéricos — usar placeholder animado
   - Erro: vermelho suave, não alarmeTODO write_file

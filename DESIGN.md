---
name: "The Pulse Game"
description: "Sistema visual do portal de jogos The Pulse."
colors:
  cyan: "#17695f"
  green: "#356548"
  gold: "#805419"
  coral: "#95452f"
  violet: "#bca7ff"
  bg: "#eee7d9"
  surface: "#e3dac9"
  raised: "#d9cdb9"
  text: "#302f27"
  muted: "#625c4e"
  subtle: "#5f594b"
  line: "#b9ad98"
  primary-ink: "#f8f0df"
  cyan-hover: "#235a50"
  preview-wordbomb: "#c7d9cb"
  preview-elevator: "#e4c6ae"
  preview-classic: "#d4cee1"
  preview-daily: "#ded3ad"
  preview-echo: "#d8cbb7"
  preview-crossword: "#c9d6c6"
  cross-paper: "#f7f0df"
  cross-ink: "#172d2a"
  cross-word: "#d8e4cb"
  cross-active: "#b2cfb6"
  cross-clue: "#1c4850"
  cross-clue-text: "#e8f4f0"
  cross-focus: "#155c52"
  cross-error: "#f0c3b6"
  dark-cyan: "#55d8e8"
  dark-green: "#9be3b2"
  dark-gold: "#f5c568"
  dark-coral: "#ffb39e"
  dark-bg: "#0b1017"
  dark-surface: "#141e29"
  dark-raised: "#1c2a38"
  dark-text: "#f3f6fa"
  dark-muted: "#b4c2d1"
  dark-subtle: "#8d9fb3"
  dark-line: "#2b3b4e"
  dark-primary-ink: "#08252e"
  dark-cyan-hover: "#8ceaf4"
  dark-preview-wordbomb: "#10313a"
  dark-preview-elevator: "#382b2b"
  dark-preview-classic: "#28243c"
  dark-preview-daily: "#1b322c"
  dark-preview-echo: "#322e21"
  dark-preview-crossword: "#17322f"
  dark-cross-paper: "#edf3f0"
  dark-cross-word: "#c7e9dd"
  dark-cross-active: "#8cd9c4"
  dark-cross-error: "#f0c3b6"
  answer-hover-bg: "#d1ddce"
  answer-hover-border: "#6b8165"
  answer-good-bg: "#c5dcc1"
  answer-good-border: "#507554"
  answer-good-ink: "#25492d"
  answer-bad-bg: "#e9c8b7"
  answer-bad-border: "#95614d"
  answer-bad-ink: "#713b29"
  bank-bg: "#c9dcc4"
  bank-ink: "#24482f"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 4vw, 2.5rem)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.02em"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
  meta:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: ".875rem"
    lineHeight: 1.5
rounded:
  small: "8px"
  control: "10px"
  tile: "12px"
  panel: "16px"
  character: "14px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  panel-mobile: "20px"
  section: "24px"
  shelf: "28px"
components:
  button-primary:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.cyan-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.raised}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "24px"
  answer-option:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.small}"
    padding: "10px 32px 10px 12px"
  crossword-cell:
    backgroundColor: "{colors.cross-paper}"
    textColor: "{colors.cross-ink}"
    width: "var(--cell-size, 54px)"
    height: "var(--cell-size, 54px)"
    padding: "0"
  crossword-cell-active:
    backgroundColor: "{colors.cross-active}"
  crossword-clue:
    backgroundColor: "{colors.cross-clue}"
    textColor: "{colors.cross-clue-text}"
    width: "var(--cell-size, 54px)"
    height: "var(--cell-size, 54px)"
    padding: "3px"
---

# Design System: The Pulse Game

## Overview

**Creative North Star: "O pulso de The Pulse"**

The Pulse apresenta seis experiências em uma grade ilustrada, com entrada direta por toque. A primeira visita usa Claro · Papel e tinta: fundo areia, superfícies quentes, tinta escura e verde. Escuro · Noite preserva marinho e ciano como opção nas configurações, persistida neste navegador. Símbolo de pulso, personagens e cofre de pontos permanecem. A linguagem de navegação usa Explorar, abrir e continuar. Não há apresentação comercial, missões na entrada ou tutorial obrigatório.

Outfit dá forma aos títulos e números; Plus Jakarta Sans sustenta os controles e as poucas linhas de apoio. Sinais, pistas com setas, bomba, andares, cronômetro e pontos representam as experiências. Ajuda, consulta de palavras e preferências ficam em diálogos ou detalhes recolhidos. A coleção amplia os personagens existentes com afinidades visuais e efeitos cosméticos.

**Key Characteristics:**

- Seis prévias geométricas, com nome curto e uma linha de convite.
- Papel quente e tinta no padrão inicial; noite marinho/ciano opcional, com acentos por experiência.
- Números expressivos, controles de toque e poucas camadas.
- Feedback breve, explicação opcional e cosméticos sem vantagem nas regras.

Registro baseado em `src/App.tsx`, `src/styles/global.css`, `CharacterCollection.tsx`, `CrosswordExperience.tsx` e `EchoExperience.tsx`. Evidência visual em `.impeccable/review/`: `experiences-home-1440.png`, `experiences-home-390.png`, `experiences-crossword-390.png`, `experiences-crossword-1440.png`, `experiences-crossword-hard-mobile.png`, `experiences-collection-390.png`, `experiences-collection-1440.png` e `experiences-echo-390.png`. O refinamento acrescenta `refinement-*.png` e `refinement-results.json`, com quatro larguras (320, 390, 768 e 1440px), geometria de abas/personagens, pistas flutuantes e preservação das respostas. As capturas `daylight-*.png` e o relatório de `tests/daylight.cjs` registram o tema claro e o fluxo de abertura em quatro larguras. As capturas `fit-orbit-1366.png`, `fit-monuments-1366.png` e `daylight-board-390.png` registram o ajuste de altura e de Órbita. `tests/fit-audio.cjs` cobre o encaixe das 20 edições em 1366×768; `tests/sound-resume.cjs` cobre retomada e descarte de áudio pendente. As capturas `results-corners*` e `results-editions*` registram comparação nas células e marcações na escolha em 390px e 1366px. As capturas `hover-experience-0.png` a `hover-experience-5.png` e `hover-mobile-static.png`, com `tests/hover-experiences.cjs`, registram os gestos e a composição estática no toque. A auditoria `tests/theme-contrast.cjs` e `contrast-*.png` cobre 148 estados em 390/1440px nos dois temas: texto pequeno ≥4.5:1 e grande ≥3:1 nos fundos sólidos amostrados. Imagens e controles nativos ficam fora dessa medição. O teste de hover verifica loop durante interação, parada na saída e movimento reduzido. As capturas são de navegador; não confirmam teclado móvel, leitor de tela ou uso em dispositivo físico.

## Colors

Os valores sem prefixo no frontmatter descrevem o tema claro inicial; `dark-*` preserva as substituições do tema noturno. Cores de prévia e da grade são superfícies específicas das experiências. A troca de aparência fica somente nas configurações e persiste neste navegador, inclusive na inicialização antes do React.

### Primary

- **Verde de tinta:** ação principal, foco, progresso e Bomba de palavras no tema claro. O token histórico `cyan` acompanha o tema; à noite volta a ciano.
- **Papel da ação / verde de hover:** texto claro do botão principal e sua resposta ao ponteiro no tema claro. Os tokens `dark-*` registram os valores preservados do tema noturno.

### Secondary

- **Coral:** O Elevador e feedback de erro.
- **Violeta:** Arena Pulse e afinidade de Luna.
- **Verde:** Cruzadas Diretas, Desafio do dia, acertos e pontos no cofre.
- **Dourado:** Ecos, fragmentos, efeitos vivos e pavio da Bomba.

### Neutral

- **Fundo / superfície / elevada:** página, painel de rodada e estados de controles.
- **Texto / secundário / discreto:** títulos, apoio e metadados.
- **Linha:** contornos e divisores.
- **Prévias:** seis bases tonais para distinguir as experiências.
- **Papel / tinta das Cruzadas:** células claras com letras escuras; verde suave distingue palavra selecionada e célula ativa. Pistas usam petróleo com texto claro. Após Concluir, células corretas usam verde (#c7e2c3) e incorretas usam vermelho suave nos dois temas. A resposta certa fica central; a letra errada digitada aparece em vermelho escuro (#792e23), no canto inferior direito, em 11px. A comparação também usa `aria-invalid` e rótulo da letra original; não há exclamação.

**The Estado Legível Rule.** Acerto e seleção têm texto, ícone ou semântica de estado junto à cor. Ao mudar o fundo no hover, resultado ou desativação, preservar um par de tinta/fundo legível; no claro, feedback semântico prevalece sobre afinidades cosméticas.

## Typography

**Display Font:** Outfit, com system-ui e sans-serif.
**Body Font:** Plus Jakarta Sans, com system-ui e sans-serif.

As fontes são locais em WOFF2, com `font-display: swap`. Corpo de 16px, entrelinha 1.5; títulos gerais com peso 650. Os nomes de experiências usam peso 600: 1.55rem no desktop, 1.2rem até 760px e 1.13rem até 420px.

Perguntas usam `clamp(1.25rem, 3vw, 1.6rem)`, entrelinha 1.3; no celular, 1.25rem. Metadados variam entre .75rem e .875rem. A sequência da Bomba usa `clamp(3.5rem, 12vw, 5rem)`; o resultado usa `clamp(3.5rem, 10vw, 5rem)`. Pontuação e relógio usam algarismos tabulares.

Ecos destaca os valores com Outfit 600, `clamp(2.5rem, 8vw, 4rem)` e entrelinha 1. As letras da grade usam Outfit 500, com tamanho proporcional à célula e limites de 16px a 25px. Pistas impressas dentro das células variam entre 8px e 11px conforme o tamanho medido da célula, e são condensadas de propósito: o texto completo aparece em pista flutuante de 1rem, entrelinha 1.5, por hover, foco ou toque. A pista ampliada é parte obrigatória desse padrão; esse tamanho condensado não é escala para instruções gerais.

## Layout

Conteúdo principal até 960px, margens de 24px e distância vertical de 24px. A página reserva espaço para a barra de rolagem (`scrollbar-gutter: stable`) e mantém o alinhamento entre destinos. As experiências abertas limitam-se a 700px; Cruzadas usa até 1160px. A grade inicial usa três colunas, prévias de 186px de altura e intervalos de 28px por 24px no desktop.

Até 760px, margens de 16px, intervalo vertical de 20px e navegação fixa com Explorar, Recordes e Coleção. As prévias passam a 180px e duas colunas; até 420px, a 148px, com intervalo horizontal de 14px. A experiência aberta oculta a navegação inferior e reduz o espaço reservado. Áreas seguras são consideradas na base mobile. Até 350px, o cabeçalho aceita quebra de linha.

A coleção tem três colunas em todas as faixas. O destaque mantém retrato e descrição lado a lado, com texto à esquerda no celular. O retrato destacado passa de 180px para 140px até 760px e 64px até 500px. Nome, descrição, custo e aviso reservam altura entre seleções; cartões reservam duas linhas para nomes e espaço para o estado de efeito. Os retratos dos cartões passam de 84px para 64px até 500px e 54px até 420px. Espaços da grade passam de 14px para 10px e 8px.

Ecos mantém três sinais lado a lado e reduz espaçamento até 500px. Nas Cruzadas, a escolha de edição ocupa quatro colunas, ou duas até 760px. Nível e Abrir cruzada ficam numa faixa inferior sticky a 12px; abrir remove os seletores e deixa a grade dedicada. Concluir e Limpar ficam antes do tabuleiro. A pista completa flutua junto à célula, sem faixa permanente, com largura máxima de 320px e margem mínima de 12px na janela. A grade mede a altura disponível abaixo das ações e desconta 64px de respiro. Divide esse espaço pelo número de linhas, preservando células quadradas de 32–64px no desktop e 44–46px até 760px, com intervalos de 1px e largura própria. A janela interna usa essa altura medida e mantém pan quando os mínimos impedem encaixe completo. Arrastar a grade no celular é intencional: preservar a área de toque e ler a pista ampliada tem prioridade sobre reduzir a edição inteira à largura da tela.

Botões comuns têm altura mínima de 48px; controles compactos e seletores, 44px; campos comuns, 50px; alternativas, 54px. Células da grade usam o mínimo específico de 44px no celular e 32px no desktop, conforme a altura disponível.

## Elevation & Depth

A profundidade vem dos tons, contornos e blocos de prévia. Painéis comuns não recebem sombra. O diálogo usa `0 18px 60px #0008`, com backdrop `#03090fd9`. A pista flutuante usa `0 8px 24px #0006` para destacar a leitura sobre a grade; no tema papel, mantém fundo verde escuro e texto claro. A área fora da experiência aberta recebe uma iluminação radial estática de ciano com baixa opacidade; ela não atravessa os controles nem cria uma camada animada.

**The Superfície Calma Rule.** A sombra marcada identifica o diálogo ou a pista flutuante; o portal e a rodada usam profundidade tonal.

Em Explorar, mouse preciso com hover ou foco visível eleva a prévia em 4px, com sombra suave (`0 9px 20px #182b2314`); legenda e play deslocam 2px. A entrada da prévia dura 340ms e a legenda, 280ms, com curva `cubic-bezier(.16,1,.3,1)`; o fundo responde em 200ms. Durante toda a interação, cada experiência mantém um gesto suave: sinais de Ecos pulsam em sequência, Cruzadas simula preenchimento, Bomba move letras, Elevador desloca andares, Arena responde nas alternativas e Diário nos pontos. Transições internas usam 420ms; loops de 2.8–3.8s mantêm respiração de até 6px, balanço, preenchimento e respostas somente enquanto hover ou foco visível estiver ativo. A saída interrompe os loops. Toque mantém a composição estática. Movimento reduzido do sistema ou configuração local remove animação e deslocamento, preservando as posições de base do sinal central de Ecos e do andar destacado. No tema claro, play ativo usa verde escuro (#315f4c) e creme (#f8f0df). O canvas de celebração é breve e acionado por eventos.

Órbita gira em 9s; Aurora, em 12s; Fantasma oscila em 4s, com deslocamento de 5px e opacidade mínima .68. Esses efeitos pertencem somente aos retratos destacados ou equipados; a grade permanece estática. A animação pausa em aba oculta e respeita movimento reduzido. O som de hover/foco é breve, limitado por intervalo de 180ms e condicionado ao desbloqueio de áudio pelo navegador. O volume inicial é 50%, com silêncio persistente; feedback visual continua disponível sem áudio. O primeiro clique comum solicita a retomada do AudioContext; os sinais aguardam o desbloqueio concluído. Silenciar durante essa espera descarta os sinais pendentes.

## Shapes

Prévias e painéis usam cantos de 16px; cartões de personagem, retratos comuns e sinais de Ecos, 14px; botões e campos, 10px; navegação e seletores, 8px. Retratos antigos do seletor mantêm 12px. A marca da Bomba e o perfil usam círculos. O play fica em círculo dentro da prévia; a área clicável é o botão completo. As células impressas das Cruzadas são quadradas, com foco interno de 3px para não alterar a geometria da grade.

## Components

### Buttons

Principal verde com texto claro no tema papel, ciano com texto escuro no tema noite; secundário transparente e contornado. Espaçamento de 12px 18px, peso 700 e cantos de 10px. Hover clareia o principal e usa superfície elevada no secundário. Foco visível: contorno da ação do tema de 3px, afastado 4px. No claro, desabilitados mantêm opacidade total com pares de tinta/fundo próprios; no escuro, principal e Guardar também usam pares próprios sem redução de opacidade. Alternativas respondidas e sinais de Ecos mantêm opacidade total.

### Chips

Temas ficam nas configurações: seletores contornados, 44px de altura, cantos de 8px e espaçamento de 10px 12px. Seleção combina fundo tonal, borda e `aria-pressed`.

### Cards / Containers

Cada experiência é um botão completo com prévia e legenda externas ao bloco colorido. O painel da rodada usa a superfície do tema, cantos de 16px e espaçamento de 24px, reduzido a 20px 16px no celular. Recordes usam linhas abertas com divisores. A coleção usa o mesmo fundo de superfície; borda da ação do tema de 2px identifica o cartão selecionado, e o estado de posse aparece em texto.

### Inputs / Fields

Fundo da página, contorno de linha, cantos de 10px e espaçamento de 12px 14px. A Bomba tem rótulo acessível, placeholder curto e envio por botão de seta. Consulta e perfil têm rótulos visíveis; falha de cópia revela textarea selecionável. Seletores nativos de sinal, nível e edição mantêm contorno, fundo de superfície e rótulo visível.

### Navigation

Três destinos: Explorar, Recordes, Coleção. No desktop, o atual usa texto e fundo elevado do tema; no celular, ícone e texto usam o acento de ação do tema. Ambos usam `aria-current`. Voltar é o primeiro controle à esquerda em todas as experiências. Pausa e ajuda permanecem no cabeçalho das quatro rodadas originais. A linguagem pública privilegia experiência, abrir, continuar e repetir.

### Answer options

Botões numerados de largura completa, com contorno e espaçamento de 12px 14px; até 420px, 11px 10px. Acerto ganha verde e check; erro ganha tom quente e resposta textual. O feedback avança automaticamente quando habilitado. “Por quê?” abre a explicação e interrompe esse avanço; “Próxima” permanece disponível. Afinidades podem trocar acabamento; no claro, cores semânticas de resposta e texto de feedback prevalecem sobre os pastéis cosméticos. Hover, acerto, erro e Guardar usam pares de fundo e tinta compatíveis. A letra da alternativa herda a tinta do resultado. Categorias selecionadas e sinais de Ecos também usam pares próprios no claro. Regras, tempo e pontuação permanecem iguais.

### Ecos

Três sinais A, B e C mostram valor, barras e molde. Dourado identifica valores em andamento; alinhamento usa verde e o alvo continua escrito. O próximo eco recebe marcador +1 e uma mensagem de status explica o efeito adiado. Desfazer e Recomeçar permanecem próximos; a explicação detalhada fica recolhida. Os oito sinais reutilizam essa estrutura.

### Cruzadas Diretas

A edição adapta a grade impressa com pistas e setas em células anteriores ou na margem. As 20 edições importadas sob MIT, com 160 respostas, preservam pistas, respostas e topologia; a documentação de origem fica no acervo, sem crédito técnico na interface. A pista completa aparece ao passar o ponteiro, focar ou tocar na célula de pista. Escape, toque fora, digitação ou arraste dispensam a camada. Não há faixa persistente, contagem de acertos ao vivo ou painéis de ajuda e de todas as pistas.

A seleção colore a palavra e destaca sua célula ativa. Digitação contínua, substituição da mesma letra, colagem, cruzamentos compartilhados, setas, espaço para direção, Backspace e Home/End mantêm o preenchimento fluido. Tab e Enter avançam por palavras; no final, o foco sai para Concluir. Shift+Tab na primeira palavra sai para Concluir, pois o seletor de nível fica fora da tela de preenchimento. A saída do teclado deve permanecer disponível. Resize de `visualViewport` recalcula a janela da grade e traz o input focado à vista. As letras ficam entre 16px e 25px; o viewport preserva zoom por gesto. Esse tratamento não comprova o comportamento do teclado em aparelho físico.

Fácil fornece primeiras letras. Nos três níveis, Concluir revela a resposta certa no centro de cada célula; acertos ficam verdes e erros vermelhos. Uma letra errada digitada permanece pequena no canto inferior direito; campos antes vazios não recebem letra original. Não há lista textual de resultados. Próxima substitui Editar respostas e retorna à escolha de edição, com a seguinte selecionada. Concluir marca a edição como Concluída mesmo com erros; só abrir ou preencher não marca. Esse histórico persiste separado do preenchimento. Reabrir uma edição finalizada limpa apenas suas respostas para nova tentativa; o reset geral apaga também o histórico. Apenas submissão totalmente correta rende a recompensa idempotente da edição. A linha Banco usa escolhas editoriais por edição para vocabulário menos óbvio, como VIOLAO na primeira; comprimento não define a escolha. Edições maiores continuam pendentes de fonte permitida: as 20 edições existentes, com oito palavras cada, permanecem sem alteração. Estado, falha de carregamento com tentativa, falha de salvamento e confirmação antes de limpar têm texto visível. O preenchimento é retomado neste navegador.

### Character collection

O destaque reúne retrato, afinidade, descrição, custo e ação. Os seis personagens base são Kael, Luna, Leo, Maya, Shinobi e 8-Bit; Órbita, Aurora e Fantasma são três variantes cosméticas. No tema claro, Órbita usa verde (#287468) e contorno (#528478); Aurora combina violeta (#79528c) e verde (#4d7655). Esses ajustes dos efeitos não alteram o tema noturno. A grade diferencia “Na coleção”, “Em uso”, custo em fragmentos e “Efeito vivo”. Aquisição e uso só se habilitam com saldo suficiente; a falta de fragmentos aparece abaixo do botão. A explicação de ganhos fica recolhida. Afinidades e efeitos não modificam respostas, relógio ou pontuação.

### Dialogs

`dialog` nativo até 560px, fundo de superfície e altura limitada à janela. Espaçamento interno de 24px, reduzido a 20px até 420px. Escape e backdrop fecham a camada; o foco anterior é restaurado. Os glifos atuais de ajuda/fechar e a marca textual de silêncio são dívida existente, não um repertório de ícones para novas superfícies.

## Do's and Don'ts

### Do:

- **Do** preservar as seis prévias, os nomes curtos e a entrada direta nas experiências.
- **Do** manter Outfit nos títulos e números, com Plus Jakarta Sans nos controles.
- **Do** manter verde no tema papel e ciano no tema noite para ação principal e foco.
- **Do** manter explicações opcionais e respeitar movimento reduzido e silêncio persistente.
- **Do** ajustar células quadradas à altura disponível, preservando 32–64px no desktop, 44–46px no celular, pan interno e pista completa fora da grade nas Cruzadas.
- **Do** manter afinidades e efeitos estritamente cosméticos.

### Don't:

- **Don't** transformar a seleção em apresentação comercial, hub de missões ou tutorial obrigatório.
- **Don't** adicionar créditos técnicos visíveis à interface.
- **Don't** adicionar sombras aos painéis comuns.
- **Don't** promover os glifos atuais de ajuda, fechar e silêncio a padrão de ícones.
- **Don't** usar as pistas condensadas como escala de instrução ou remover a leitura ampliada.
- **Don't** bloquear a saída por Tab da grade ou depender de áudio para comunicar estado.

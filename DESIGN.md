---
name: "The Pulse Game"
description: "Sistema visual do portal de jogos The Pulse."
colors:
  cyan: "#55d8e8"
  green: "#9be3b2"
  gold: "#f5c568"
  coral: "#ffb39e"
  violet: "#bca7ff"
  bg: "#0b1017"
  surface: "#141e29"
  raised: "#1c2a38"
  text: "#f3f6fa"
  muted: "#b4c2d1"
  subtle: "#8d9fb3"
  line: "#2b3b4e"
  primary-ink: "#08252e"
  cyan-hover: "#8ceaf4"
  preview-wordbomb: "#10313a"
  preview-elevator: "#382b2b"
  preview-classic: "#28243c"
  preview-daily: "#1b322c"
  preview-echo: "#322e21"
  preview-crossword: "#17322f"
  cross-paper: "#edf3f0"
  cross-ink: "#172d2a"
  cross-word: "#c7e9dd"
  cross-active: "#8cd9c4"
  cross-clue: "#1c4850"
  cross-clue-text: "#e8f4f0"
  cross-focus: "#155c52"
  cross-error: "#ffdbca"
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
    width: "46px"
    height: "46px"
    padding: "0"
  crossword-cell-active:
    backgroundColor: "{colors.cross-active}"
  crossword-clue:
    backgroundColor: "{colors.cross-clue}"
    textColor: "{colors.cross-clue-text}"
    width: "46px"
    height: "46px"
    padding: "3px"
---

# Design System: The Pulse Game

## Overview

**Creative North Star: "O pulso de The Pulse"**

The Pulse apresenta seis experiências em uma grade ilustrada, com entrada direta por toque. A identidade mantém fundo azul quase preto, ciano, símbolo de pulso, personagens e cofre de pontos. A linguagem de navegação usa Explorar, abrir e continuar. Não há apresentação comercial, missões na entrada ou tutorial obrigatório.

Outfit dá forma aos títulos e números; Plus Jakarta Sans sustenta os controles e as poucas linhas de apoio. Sinais, pistas com setas, bomba, andares, cronômetro e pontos representam as experiências. Ajuda, consulta de palavras e preferências ficam em diálogos ou detalhes recolhidos. A coleção amplia os personagens existentes com afinidades visuais e efeitos cosméticos.

**Key Characteristics:**

- Seis prévias geométricas, com nome curto e uma linha de convite.
- Fundo escuro, iluminação estática discreta e acentos próprios por experiência.
- Números expressivos, controles de toque e poucas camadas.
- Feedback breve, explicação opcional e cosméticos sem vantagem nas regras.

Registro baseado em `src/App.tsx`, `src/styles/global.css`, `CharacterCollection.tsx`, `CrosswordExperience.tsx` e `EchoExperience.tsx`. Evidência visual em `.impeccable/review/`: `experiences-home-1440.png`, `experiences-home-390.png`, `experiences-crossword-390.png`, `experiences-crossword-1440.png`, `experiences-crossword-hard-mobile.png`, `experiences-collection-390.png`, `experiences-collection-1440.png` e `experiences-echo-390.png`. As capturas são de navegador; não confirmam teclado móvel, leitor de tela ou uso em dispositivo físico.

## Colors

Os valores normativos estão no frontmatter; cores de prévia e da grade são superfícies específicas das experiências.

### Primary

- **Ciano do pulso:** ação principal, foco, progresso e Bomba de palavras.
- **Tinta da ação / ciano de hover:** texto do botão principal e sua resposta ao ponteiro.

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
- **Papel / tinta das Cruzadas:** células claras com letras escuras; verde suave distingue palavra selecionada e célula ativa. Pistas usam petróleo com texto claro. Erros conferidos combinam fundo quente, exclamação e estado inválido.

**The Estado Legível Rule.** Acerto e seleção têm texto, ícone ou semântica de estado junto à cor.

## Typography

**Display Font:** Outfit, com system-ui e sans-serif.
**Body Font:** Plus Jakarta Sans, com system-ui e sans-serif.

As fontes são locais em WOFF2, com `font-display: swap`. Corpo de 16px, entrelinha 1.5; títulos gerais com peso 650. Os nomes de experiências usam peso 600: 1.55rem no desktop, 1.2rem até 760px e 1.13rem até 420px.

Perguntas usam `clamp(1.25rem, 3vw, 1.6rem)`, entrelinha 1.3; no celular, 1.25rem. Metadados variam entre .75rem e .875rem. A sequência da Bomba usa `clamp(3.5rem, 12vw, 5rem)`; o resultado usa `clamp(3.5rem, 10vw, 5rem)`. Pontuação e relógio usam algarismos tabulares.

Ecos destaca os valores com Outfit 600, `clamp(2.5rem, 8vw, 4rem)` e entrelinha 1. As letras da grade usam Outfit 500 em 1.3rem. Pistas impressas dentro das células têm 8px e são condensadas de propósito: o texto completo aparece fora da grade em .95rem, ou .9rem até 500px, entrelinha 1.5. A pista ampliada é parte obrigatória desse padrão; 8px não é escala para instruções gerais.

## Layout

Conteúdo principal até 960px, margens de 24px e distância vertical de 24px. As experiências abertas limitam-se a 700px. A grade inicial usa três colunas, prévias de 186px de altura e intervalos de 28px por 24px no desktop.

Até 760px, margens de 16px, intervalo vertical de 20px e navegação fixa com Explorar, Recordes e Coleção. As prévias passam a 180px e duas colunas; até 420px, a 148px, com intervalo horizontal de 14px. A experiência aberta oculta a navegação inferior e reduz o espaço reservado. Áreas seguras são consideradas na base mobile. Até 350px, o cabeçalho aceita quebra de linha.

A coleção tem três colunas em todas as faixas. O destaque do personagem dispõe retrato e descrição lado a lado; até 500px, empilha e centraliza ambos. O retrato destacado passa de 180px para 140px até 760px. Os retratos dos cartões passam de 84px para 64px até 500px e 54px até 420px. Espaços da grade passam de 14px para 10px e 8px.

Ecos mantém três sinais lado a lado e reduz espaçamento até 500px. Nas Cruzadas, seletores de nível e edição ficam em duas colunas. A pista completa permanece acima do tabuleiro, com posição sticky a 8px e altura mínima de 94px. A grade mantém células de 46px, intervalos de 1px e largura própria; a janela interna tem rolagem horizontal e vertical e altura máxima `min(62dvh, 640px)`. Arrastar a grade no celular é intencional: preservar a área de toque e ler a pista ampliada tem prioridade sobre reduzir a edição inteira à largura da tela.

Botões comuns têm altura mínima de 48px; controles compactos e seletores, 44px; campos comuns, 50px; alternativas, 54px. Células da grade são a exceção específica de 46px.

## Elevation & Depth

A profundidade vem dos tons, contornos e blocos de prévia. Painéis comuns não recebem sombra. O diálogo usa `0 18px 60px #0008`, com backdrop `#03090fd9`. A área fora da experiência aberta recebe uma iluminação radial estática de ciano com baixa opacidade; ela não atravessa os controles nem cria uma camada animada.

**The Superfície Calma Rule.** A sombra marcada identifica a camada modal; o portal e a rodada usam profundidade tonal.

O hover das prévias altera o fundo em 200ms, apenas com ponteiro compatível. O andar destacado desloca-se brevemente; toque ativo clareia a prévia. Preferência do sistema ou controle local de movimento reduzido removem animações e transições. O canvas de celebração é breve e acionado por eventos.

Órbita gira em 9s; Aurora, em 12s; Fantasma oscila em 4s, com deslocamento de 5px e opacidade mínima .68. Esses efeitos pertencem somente aos retratos destacados ou equipados; a grade permanece estática. A animação pausa em aba oculta e respeita movimento reduzido. O som de hover/foco é breve, limitado por intervalo de 180ms e condicionado ao desbloqueio de áudio pelo navegador. O volume inicial é 50%, com silêncio persistente; feedback visual continua disponível sem áudio.

## Shapes

Prévias e painéis usam cantos de 16px; cartões de personagem, retratos comuns e sinais de Ecos, 14px; botões e campos, 10px; navegação e seletores, 8px. Retratos antigos do seletor mantêm 12px. A marca da Bomba e o perfil usam círculos. O play fica em círculo dentro da prévia; a área clicável é o botão completo. As células impressas das Cruzadas são quadradas, com foco interno de 3px para não alterar a geometria da grade.

## Components

### Buttons

Principal ciano, texto escuro; secundário transparente e contornado. Espaçamento de 12px 18px, peso 700 e cantos de 10px. Hover clareia o principal e usa superfície elevada no secundário. Foco visível: contorno ciano de 3px, afastado 4px. Desabilitados usam opacidade .55; alternativas respondidas e sinais de Ecos mantêm opacidade total.

### Chips

Temas ficam nas configurações: seletores contornados, 44px de altura, cantos de 8px e espaçamento de 10px 12px. Seleção combina fundo tonal, borda e `aria-pressed`.

### Cards / Containers

Cada experiência é um botão completo com prévia e legenda externas ao bloco colorido. O painel da rodada tem superfície escura, cantos de 16px e espaçamento de 24px, reduzido a 20px 16px no celular. Recordes usam linhas abertas com divisores. A coleção usa o mesmo fundo de superfície; borda ciano de 2px identifica o cartão selecionado, e o estado de posse aparece em texto.

### Inputs / Fields

Fundo da página, contorno de linha, cantos de 10px e espaçamento de 12px 14px. A Bomba tem rótulo acessível, placeholder curto e envio por botão de seta. Consulta e perfil têm rótulos visíveis; falha de cópia revela textarea selecionável. Seletores nativos de sinal, nível e edição mantêm contorno, fundo de superfície e rótulo visível.

### Navigation

Três destinos: Explorar, Recordes, Coleção. No desktop, o atual tem texto claro e fundo elevado; no celular, ícone e texto ficam ciano. Ambos usam `aria-current`. Pausa, ajuda e saída pertencem ao cabeçalho da rodada. Ecos e Cruzadas têm Voltar no cabeçalho. A linguagem pública privilegia experiência, abrir, continuar e repetir.

### Answer options

Botões numerados de largura completa, com contorno e espaçamento de 12px 14px; até 420px, 11px 10px. Acerto ganha verde e check; erro ganha tom quente e resposta textual. O feedback avança automaticamente quando habilitado. “Por quê?” abre a explicação e interrompe esse avanço; “Próxima” permanece disponível. Afinidades podem trocar acabamento e cor do acerto; regras, tempo e pontuação permanecem iguais.

### Ecos

Três sinais A, B e C mostram valor, barras e molde. Dourado identifica valores em andamento; alinhamento usa verde e o alvo continua escrito. O próximo eco recebe marcador +1 e uma mensagem de status explica o efeito adiado. Desfazer e Recomeçar permanecem próximos; a explicação detalhada fica recolhida. Os oito sinais reutilizam essa estrutura.

### Cruzadas Diretas

A edição adapta a grade impressa com pistas e setas em células anteriores ou na margem. As 20 edições importadas sob MIT, com 160 respostas, preservam pistas, respostas e topologia; a documentação de origem fica no acervo, sem crédito técnico na interface. Selecionar pista ou letra traz a pista completa para o painel acima da janela móvel. “Todas as pistas” oferece outra leitura em lista recolhida.

A seleção colore a palavra e destaca sua célula ativa. Digitação contínua, substituição da mesma letra, colagem, cruzamentos compartilhados, setas, espaço para direção, Backspace e Home/End mantêm o preenchimento fluido. Tab e Enter avançam por palavras; no final, o foco sai para Conferir ou Limpar quando Conferir está desabilitado. Shift+Tab na primeira palavra retorna ao nível. A saída do teclado deve permanecer disponível.

Fácil fornece primeiras letras; Médio permite conferir letras; Difícil libera conferência somente com a edição preenchida e não expõe marcação por letra. Estado, falha de carregamento com tentativa, falha de salvamento e confirmação antes de limpar têm texto visível. O preenchimento é retomado neste navegador.

### Character collection

O destaque reúne retrato, afinidade, descrição, custo e ação. Os seis personagens base são Kael, Luna, Leo, Maya, Shinobi e 8-Bit; Órbita, Aurora e Fantasma são três variantes cosméticas. A grade diferencia “Na coleção”, “Em uso”, custo em fragmentos e “Efeito vivo”. Aquisição e uso só se habilitam com saldo suficiente; a falta de fragmentos aparece abaixo do botão. A explicação de ganhos fica recolhida. Afinidades e efeitos não modificam respostas, relógio ou pontuação.

### Dialogs

`dialog` nativo até 560px, fundo de superfície e altura limitada à janela. Espaçamento interno de 24px, reduzido a 20px até 420px. Escape e backdrop fecham a camada; o foco anterior é restaurado. Os glifos atuais de ajuda/fechar e a marca textual de silêncio são dívida existente, não um repertório de ícones para novas superfícies.

## Do's and Don'ts

### Do:

- **Do** preservar as seis prévias, os nomes curtos e a entrada direta nas experiências.
- **Do** manter Outfit nos títulos e números, com Plus Jakarta Sans nos controles.
- **Do** manter ciano para ação principal e foco.
- **Do** manter explicações opcionais e respeitar movimento reduzido e silêncio persistente.
- **Do** preservar células de 46px, pan interno e pista completa fora da grade nas Cruzadas.
- **Do** manter afinidades e efeitos estritamente cosméticos.

### Don't:

- **Don't** transformar a seleção em apresentação comercial, hub de missões ou tutorial obrigatório.
- **Don't** adicionar créditos técnicos visíveis à interface.
- **Don't** adicionar sombras aos painéis comuns.
- **Don't** promover os glifos atuais de ajuda, fechar e silêncio a padrão de ícones.
- **Don't** usar as pistas condensadas de 8px como escala de instrução ou remover a leitura ampliada.
- **Don't** bloquear a saída por Tab da grade ou depender de áudio para comunicar estado.

# The Pulse

Explore experiências de palavras, raciocínio e curiosidade. Sem cadastro ou backend; progresso neste navegador.

## Executar

Node.js 22.12 ou superior.

```bash
npm install
npm run dev
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5180
```

Com a prévia aberta:

```bash
npm run test:browser
npm run test:experiences
node tests/touch.cjs
```

O build estático fica em `dist/`. Publique todos os arquivos dessa pasta. `sync.ps1` testa e compila; publicação não é automática.

## Experiências

Ecos tem oito sinais com consequências adiadas: o toque soma no sinal escolhido e deixa um eco para o próximo. Há desfazer e recomeçar, sem necessidade de cronômetro ou moedas para resolver.

Cruzadas Diretas importa 20 edições existentes em português, com 160 respostas e três níveis. Grades, respostas e pistas vêm do acervo registrado em `public/crosswords/source.json`; não são geradas em tempo de execução. Pistas foram inseridas nas casas anteriores às palavras e numa margem de borda. Fácil oferece iniciais, médio permite conferir letras, e difícil permite conferir a edição somente depois de preenchida.

Toque numa pista ou letra e digite. Setas movem pela grade; espaço troca direção num cruzamento; Tab/Enter passam à próxima palavra, com saída pelos controles ao terminar a lista. Backspace apaga e recua. Colagem de respostas e acentos são normalizados. As casas têm 46px, com rolagem interna e pista ampliada; o preenchimento é salvo localmente. Limpar exige confirmação.

Bomba de palavras permanece sempre com tempo, inclusive para perfis antigos. Elevador, Arena de 60 segundos e Desafio do dia preservam o motor de rodada. Explicações são opcionais. A primeira rodada completa do diário é preservada.

## Coleção e som

Kael, Luna, Leo, Maya, Shinobi e 8-Bit, com três variantes de efeitos mais custosas. Afinidades alteram apresentação e celebrações; nenhuma muda respostas, pontos ou relógio. Kael/Luna são iniciais. Perfis da versão anterior mantêm os seis personagens base destes estilos.

Fragmentos vêm de sinais/edições concluídos pela primeira vez e do primeiro resultado com acerto de cada experiência tradicional por dia. Repetições não geram outro prêmio. Aquisições são diretas, sem dinheiro real ou sorteios. Saldo inicial: 12; personagens custam 18–88 fragmentos. Compra e equipamento são operações separadas e validadas no estado; o botão de compra realiza ambas em uma atualização.

Som padrão 50%, com silêncio persistente. Hover curto nas prévias, limitado em frequência. O navegador pode exigir um clique ou tecla antes de liberar áudio. Efeitos animados são restritos aos retratos equipados/em destaque, respeitam movimento reduzido e pausam em aba oculta.

## Verificação e dados

Suítes de navegador usam Chrome/Edge instalado ou Chromium do Playwright. `PULSE_CHROMIUM` seleciona o executável; `PULSE_BASE_URL` altera o servidor. Testes cobrem regras, corpus, importação das 20 cruzadas, soluções de Ecos, compra/recompensa, cinco larguras nos modos anteriores, quatro nas novas experiências, teclado rápido, viewport curto, toque, falha/repetição de carregamento, diário e persistência. Emulação não verifica teclado virtual nem leitor de tela reais.

Sem multiplayer ou ranking online. A coleção é local e não é uma economia protegida por servidor. Redefinir progresso apaga também o preenchimento das cruzadas.

Atribuições ficam em `public/THIRD-PARTY-NOTICES.txt`, `public/avatars/NOTICE.md`, `public/fonts/NOTICE.md`, `public/lexicon/` e `public/crosswords/LICENSE.txt`; não são exibidas na interface. O corpus de grafias continua separado das pistas de cruzadas. `scripts/sync-crosswords.mjs` importa o commit fixo do acervo; não gera novas grades.

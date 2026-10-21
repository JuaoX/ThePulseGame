# The Pulse Game: diagnóstico e direção de produto

> Registro histórico da versão inicial. Os achados descrevem `ec0a2ee`; as implementações seguintes estão resumidas no [estado da entrega](plano-evolucao.md). Não use este documento como lista de defeitos ainda presentes.

Data: 20/10/2026. Base inspecionada: `main`, commit `ec0a2ee`. O checkout estava limpo antes do trabalho.

## Veredito

O projeto funciona como um protótipo de arcade com perguntas e palavras. Ainda não demonstra aprendizagem, progressão pedagógica ou um diferencial suficiente para sustentar uma proposta educacional própria. Há um bloqueio no cronômetro, inconsistências no vocabulário e recursos apresentados como modos diferentes que compartilham quase toda a experiência.

Recomendo corrigir a confiança nas regras antes de ampliar o banco ou acrescentar efeitos. Depois, concentrar a identidade em um único ciclo: tomar uma decisão, observar a consequência, entender o erro e aplicar o conceito em outra situação.

O regulamento específico da participação escolar na 1MiO continua desconhecido. A página enviada retornou HTTP 403 na consulta automatizada. A busca localizou uma campanha de Minas Gerais, mas não há evidência de que seja a competição desta escola. Nenhuma conclusão deste documento pressupõe critérios de premiação ou elegibilidade.

## Evidências e limites

Foram lidos os arquivos de aplicação, os quatro modos, dados, armazenamento, áudio, partículas, CSS, configuração, testes e scripts de atualização. O projeto tem React 18, TypeScript e Vite, sem servidor de aplicação ou banco remoto no código inspecionado.

Foram exercitados os quatro modos e as cinco abas em Chrome/Chromium, incluindo toques emulados. Capturas em 320, 375, 390, 768 e 1440 pixels estão em [evidence/2026-10-20](evidence/2026-10-20/). A emulação não prova funcionamento de teclado virtual, Safari/iOS, leitor de tela, bateria, rede móvel ou aparelho físico. Não foi executada uma avaliação pedagógica com estudantes nem uma revisão factual externa de todas as perguntas.

| Verificação | Resultado | Limite |
| --- | --- | --- |
| `rtk proxy npm test` | Exit 0 | Apenas três verificações de presença de texto; não detectam os defeitos abaixo. |
| `rtk proxy npm run build` | Exit 0 | Compilação e pacote estático; não comprova regras corretas. |
| `rtk proxy npm audit --json` | Exit 1: dois pacotes vulneráveis | Vite: alto; esbuild: moderado. São ferramentas de desenvolvimento. Não foi demonstrada exploração do site estático publicado. |
| `node scripts/audit-content.mjs ...` | Scan concluído, exit 0 | É relatório diagnóstico, não aprovação de qualidade. [Dados completos](evidence/2026-10-20/content-baseline.json). |
| `node scripts/audit-browser.cjs` | Exit 0 | Reproduziu o cronômetro parado e mediu os cinco tamanhos. [Dados](evidence/2026-10-20/browser.json). |
| `node scripts/audit-flows.cjs` | Exit 0 | Reproduziu a troca de lógica por matemática e o Tab interceptado. [Dados](evidence/2026-10-20/flows.json). |
| Detector Impeccable | Exit 2, três avisos | Duas bordas laterais grossas e texto em gradiente. São alertas de estilo, não prova de inacessibilidade ou de autoria por IA. |

## Problemas por prioridade

P0 significa bloqueio de uma tarefa principal. P1 afeta confiança, acesso ou segurança do desenvolvimento. P2 significa melhoria relevante com alternativa de uso. As referências de linha abaixo correspondem ao código após a pequena alteração de avatares desta sessão.

Foram agrupados 13 achados: um P0, nove P1 e três P2. O último achado P2 reúne pendências técnicas relacionadas, detalhadas individualmente.

### P0 — cronômetro para depois de um timeout

`src/App.tsx:576–620`. Quando a rodada chega a zero, `tick()` agenda a transição e retorna antes de pedir o próximo `requestAnimationFrame`. A próxima rodada não reinicia esse ciclo: o efeito depende apenas de `inMatch`, que continua verdadeiro.

Reprodução: iniciar Bomba de Sílabas e esperar a primeira explosão. A próxima sequência apareceu com `11.0s`; duas leituras separadas por 1,4 segundo deram o mesmo valor. O tempo total também fica parado. Isso permite continuar sem limite real. O mesmo caminho de retorno existe nos quizzes; a reprodução temporal gravada foi na Bomba.

Correção: um ciclo contínuo enquanto a sessão está ativa, com relógio baseado em tempo decorrido e transições explícitas. Testar timeout, pausa, aba oculta, encerramento, saída e reinício sem timers antigos.

### P1 — dicionário rejeita palavras reais e aceita formas inventadas

`src/data/syllables.ts:26–205`, `src/engine/prng.ts:43–98`.

- O conjunto possui 4.623 entradas, mas parte delas vem de acrescentar `S` e terminações mecânicas, sem validar flexão.
- `AMORS` é aceita. `FLORES`, `CORACOES`, `MULHERES`, `CARNEIRO` e `COMPREENDER` não estão no conjunto.
- `COMPUTADOR` está no conjunto e aparece como sugestão, mas o filtro de palavrões rejeita a substring `PUTA`.
- A consulta da aba Palavras usa somente `Set.has`; informa que computador é aceita na arena, contradizendo a validação real.
- `c@a1sa` vira `CASA` e é aceita. A normalização apaga caracteres inválidos em vez de informar o erro de entrada.

Correção: corpus de português brasileiro com origem e licença registradas, formas flexionadas verificadas, política explícita para nomes próprios/hífens e validação compartilhada entre consulta e arena. Preservar grafia acentuada para ensinar; usar uma chave normalizada apenas na comparação. Retirar derivações genéricas e bloqueio indiscriminado por substring. “Não está no vocabulário do jogo” é uma mensagem correta para ausência; “não existe” é uma afirmação linguística que esse conjunto não sustenta.

### P1 — o jogo ensina exemplos incompatíveis com suas regras

`src/data/syllables.ts:3–23`. Existem 20 sequências e 377 exemplos. Vinte e cinco exemplos não contêm a sequência correspondente; somando COMPUTADOR bloqueada, 26 falham no validador real.

Exemplos: CADERNO para TER; ESTRELA e QUATRO para TRA; FLORESTA para FOR. Alguns aparecem na dica exibida ou na lista de respostas após uma explosão.

Além disso, EST, LIN e NAT funcionam como sequências de letras; a implementação não verifica divisão silábica. Apresentá-las como “sílabas” em um produto educacional é impreciso. Renomear para sequências/trechos ou implementar uma atividade de sílabas com conteúdo revisado.

Aceitação: toda dica e todo exemplo precisa passar pelo mesmo validador da partida, incluindo restrição da rodada e disponibilidade da palavra.

### P1 — categoria escolhida não é respeitada

`src/App.tsx:182–209`. Ao esgotar o banco, qualquer categoria cai no gerador de matemática. No navegador, as 15 questões de lógica foram respondidas; a 16ª foi `(14 + 11) × 13`.

Correção: fila de conteúdo por categoria, encerramento honesto quando o conteúdo terminar ou gerador específico revisado para aquela categoria. Não trocar silenciosamente a matéria.

### P1 — recursos competitivos não correspondem ao comportamento

`src/App.tsx:264–278`, `src/App.tsx:331–376`, `src/App.tsx:1113–1137`, `src/engine/storage.ts`.

“Jogar Ranqueado” abre a Bomba normal. A liga é uma faixa calculada do XP local; não há adversários, tabela compartilhada nem autoridade remota. O perfil começa com 520 XP mesmo sem partidas. Isso pode ser usado como progressão pessoal, desde que a interface diga o que é.

O Diário usa a data como seed, mas a escolha posterior depende da sequência de acertos. Jogadores que acertam e erram seguem caminhos diferentes. Não é uma mesma prova diária completa. `dailyHistory` não é preenchido na conclusão, e não há regra de tentativas para comparação justa.

Correção: definir se o diário é treino livre ou desafio comparável. Para comparação, fixar ordem/dificuldade independentemente do desempenho e separar treino de tentativa válida. Manter progresso local claramente identificado; adiar ranking remoto até existir necessidade real.

### P1 — acesso por teclado e feedback de pausa incompletos

`src/App.tsx:625–656`, componentes de modal e formulários.

Tab é interceptado durante partidas para blindar pontos, impedindo a navegação normal. O teste manteve o foco no botão Sair após Tab. Escape alterna uma pausa sem mostrar um estado de pausa ou botão de retomada; esse controle também não existe para toque. Os modais não possuem semântica de diálogo, gestão de foco ou tratamento específico de Escape. Alguns campos dependem de placeholder, e mensagens dinâmicas não têm anúncio para leitor de tela.

Correção: preservar Tab; usar atalho que não conflite com digitação/navegação; apresentar Pausar/Continuar no celular; tratar foco e teclado dos diálogos; associar rótulos e estados às entradas e ao feedback. Relaciona-se a navegação por teclado e foco (WCAG 2.1.1 e 2.4.3); conformidade integral exige avaliação própria.

### P1 — experiência móvel ainda não está resolvida

`src/styles/global.css`, `index.html:5` e composição da arena.

Na largura 320, as pílulas dos modos são cortadas e a marca disputa espaço no cabeçalho. O `overflow-x: hidden` esconde sintomas; não resolve o encaixe. Os botões Jogar dos cartões medem aproximadamente 67 × 24 pixels; controles do cabeçalho têm 38 pixels de altura. Quarenta e quatro pixels é a meta de usabilidade adotada aqui, sem afirmar que todo controle menor automaticamente viola WCAG AA.

O viewport proíbe zoom. Não há confirmação em aparelho real de que entrada, botão OK e feedback continuam alcançáveis com teclado aberto. Na arena de 320 pixels, o título já ocupa várias linhas antes dessa redução de altura.

Correção: cabeçalho com prioridades claras, modos em composição que suporte texto real, controles com área confortável de toque, zoom permitido e teste físico de teclado. Meta: 320 pixels, fontes ampliadas, paisagem, safe area, leitor de tela e navegação de uma mão.

### P1 — atualização automática pode sobrescrever trabalho e histórico

`sync.ps1:3–22`; `instalador-pulso.cjs` local, ignorado pelo Git.

O script executa código copiado da área de transferência, sobrescreve arquivos por um instalador, faz `git add .` e termina com `git push ... --force` na main. Ele não valida os códigos de saída de todas as operações nativas antes de anunciar sucesso. O instalador contém cópias completas de fontes e pode desfazer mudanças atuais se for reutilizado.

Não foi executado. Recomendo aposentá-lo como fluxo de desenvolvimento. Usar alterações revisáveis no Git, testes reais, push normal e uma etapa explícita de publicação. Um build aprovado não autoriza sobrescrita de histórico.

### P1 — dependências de desenvolvimento com alertas conhecidos

O npm audit apontou Vite 5.4.21 e sua dependência esbuild. O projeto deve atualizar Vite, plugin React e requisitos de Node em uma etapa própria, verificando build e servidor. Não executar `npm audit fix --force` sem revisar a migração.

Alertas retornados incluem [bypass de restrição de arquivos do Vite no Windows](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) e [acesso indevido ao servidor esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99). Esta análise não equipara exposição do servidor de desenvolvimento a uma falha comprovada do bundle publicado.

### P1 — testes atuais produzem uma conclusão que não verificam

`tests/audit.mjs:9–13`. O teste só confirma a presença de classes e safe area e imprime “sem defeitos”. Nenhuma das inconsistências acima o faz falhar.

Correção: cobrir máquina de estados, tempo, corpus, exemplos, unicidade, categoria, persistência e fluxos de navegador. Trocar a mensagem por uma descrição exata da cobertura. Os scripts desta auditoria preservam os defeitos como evidência; não substituem a futura suíte de regressão.

### P2 — repetição e progressão não medem aprendizagem

O banco possui 60 IDs e 60 enunciados distintos: 15 por categoria, cinco por dificuldade. Não há duplicação literal no banco fixo. A repetição entre partidas ocorre porque a lista de usados é zerada a cada início. O gerador fácil só varia uma expressão em 126 combinações possíveis: em uma amostra de 2.000 gerações, houve 1.874 enunciados repetidos. A amostra demonstra variedade limitada; não estima a frequência em uma partida normal.

`historyRef` é criado e zerado, mas não recebe respostas. Não há registro de habilidade, diagnóstico de erro, retomada ou transferência para uma situação nova. A dificuldade sobe por combo, e blindar pontos zera esse combo; estratégia de pontuação altera a dificuldade sem refletir domínio.

As explicações desaparecem em 850 ms após acerto ou 1.350 ms após erro. O tempo total para durante feedback, apesar da promessa de 60 segundos. A prioridade é velocidade e risco; um estudante iniciante tem pouco espaço para aprender.

Correção: permitir leitura sem pressa, revisão de erros, progresso por habilidade e repetição espaçada com novas variantes. Separar tempo de leitura de um eventual modo de velocidade. A prova de aprendizagem deve ser aplicar o conceito em um problema diferente depois, e não apenas aumentar XP.

### P2 — modos e menus prometem mais do que entregam

O Elevador usa o mesmo quiz, com vidas e redução de tempo; o número do andar é atualizado internamente, mas não é exibido. A aba Sílabas lista sequências, porém tocar uma delas inicia uma partida aleatória, sem treinar a escolha. Inglês e espanhol traduzem apenas alguns rótulos; conteúdo, mensagens e regras continuam em português.

Recomendação: definir uma função concreta para cada modo, ensinar a primeira ação antes do relógio, respeitar a seleção de treino e assumir português brasileiro até existir localização completa.

### P2 — desempenho, movimento, áudio e persistência precisam de tratamento

- A aplicação inteira é um componente grande, com estados duplicados em refs e hooks. O relógio solicita atualizações da árvore a cada quadro, muito além da precisão de décimos exibida.
- O canvas mantém um `requestAnimationFrame` mesmo sem partículas. Redução de movimento impede novas partículas, mas não encerra esse loop; a classe `reduced-motion` aplicada ao body não possui regra CSS correspondente. Também falta respeitar `prefers-reduced-motion`.
- O volume começa em 85%, e o controle só permite 15–100%; não há silêncio pela interface. O som também é disparado em cada alteração do campo da palavra.
- Fontes e bandeiras dependem de serviços externos. No teste sem rede externa, a bandeira falhou. Apenas os avatares selecionados receberam tratamento local nesta etapa.
- O perfil é local e pode ser alterado pelo usuário. Isso serve para treino pessoal, não para validar competição. `sanitizeProfile` aceita volume 999, cor `zzzzzz` e histórico diário sem validar entradas. Falhas de armazenamento são ignoradas sem informar que o progresso não foi salvo.
- Há ganho mínimo de dez moedas até em uma partida sem acertos; moedas e chaves não têm um ciclo de uso definido. Não expandir essa economia antes do ciclo de aprendizagem.

## Avaliação técnica Impeccable

Pontuação heurística desta auditoria, não uma certificação de acessibilidade ou um benchmark em celular.

| Dimensão | Nota / 4 | Fundamentação |
| --- | --- | --- |
| Acessibilidade | 1 | Tab bloqueado, pausa invisível, diálogos e rótulos incompletos. |
| Desempenho | 2 | Bundle pequeno, mas renderizações e canvas contínuos; sem medição física de quadros. |
| Sistema visual/temas | 2 | Há tokens de cor e fontes; muitas cores e dimensões inline. Só existe tema escuro, o que não é defeito por si só. |
| Responsividade | 2 | Há breakpoints e safe area; cortes em 320 e alvos de toque pequenos. |
| Integridade da implementação | 1 | Consulta contradiz arena, categoria muda e ranking não corresponde ao rótulo. |
| **Total** | **8/20** | **Requer correções importantes antes da demonstração educacional.** |

O detector encontrou três alertas estéticos. Bordas do cofre ajudam a separar estados e podem ser mantidas se a linguagem visual justificar. A pontuação baixa decorre dos comportamentos verificáveis, não desses alertas. Contraste de todos os estados não foi medido; não há alegação de aprovação WCAG.

## O que preservar

O cofre e a decisão de arriscar ou proteger oferecem uma mecânica que pode ser desenvolvida com identidade própria. A navegação inferior, a ausência de login obrigatório e o conjunto pequeno de dependências favorecem entrada rápida. Tipos definidos, PRNG reproduzível e separação inicial de dados/motor são úteis para corrigir o projeto sem reescrevê-lo inteiro.

## Direção recomendada: Pulso — uma cidade que aprende

Hipótese de produto para validar com alunos e professores; não há alegação de novidade mundial ou garantia de premiação.

O jogador recebe um pequeno problema de uma comunidade e precisa tomar decisões justificadas. Cada missão dura de três a cinco minutos. Palavras, dados e raciocínio mudam o que acontece no lugar. O jogador vê como seu entendimento produz uma consequência.

Exemplo: a escola quer reduzir o desperdício de água. O jogador interpreta um recado, compara medições, detecta um cálculo errado e escolhe uma intervenção. O mapa responde com uma mudança compreensível. Se errar uma porcentagem, o jogo mostra onde o raciocínio falhou e oferece outra situação curta para aplicar a mesma ideia.

O cofre passa a representar o que o jogador consegue sustentar com evidências. Para blindar uma decisão, ele identifica a justificativa, corrige um argumento ou conecta um dado à conclusão. Na volta, recebe outro problema com o mesmo conceito, sem decorar a alternativa anterior.

O diferencial que vale testar é a combinação de consequência visível, raciocínio explicitado e reaplicação. Avatares podem representar moradores ou equipes. Eles não devem conceder vantagens de aprendizagem a quem acumula mais moedas.

### Duas alternativas mais próximas do código atual

1. **Oficina dos erros:** o jogador conserta uma solução plausível, identifica o passo errado e testa a correção. Pode usar matemática e interpretação; o conteúdo precisa prever erros reais, não apenas alternativas aleatórias.
2. **Palavras em ação:** encontrar uma palavra resolve uma tarefa, mas o jogador também escolhe seu significado ou seu uso no contexto. O sistema mantém um caderno pessoal de descobertas e reapresenta dificuldades com exemplos novos.

Escolher uma direção principal. Uma coleção de minijogos com temas desconectados dilui o que vocês querem criar. “Todas as pessoas” deve orientar acessibilidade; o primeiro conteúdo precisa de um ponto de entrada claro. Minha proposta inicial é testar missões com estudantes e docentes da própria escola, oferecendo complexidade progressiva e modo sem pressão de tempo.

## Repositórios indicados: decisão de uso

| Recurso | Avaliação para este projeto | Decisão |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | Orienta revisão de interface, composição, adaptação e performance. Não acrescenta código ao bundle do jogo. | Instalado globalmente; context e detector executados. Usar nas etapas de interface. |
| [Humanizer](https://github.com/blader/humanizer) | Ajuda a editar instruções e explicações sem texto promocional ou afirmações inventadas. Não valida português ou fatos do banco. | Instalado globalmente e aplicado à redação deste diagnóstico. |
| [DiceBear](https://www.dicebear.com/licenses/) | O jogo já tinha seis famílias. Adventurer favorece identificação humana; Bottts combina com a identidade arcade; Pixel Art é leve. Os outros estilos podem continuar como escolha pessoal. | Os 12 presets existentes agora são SVGs locais, com créditos e fallback. Geração por seed personalizada continua remota. |
| [React Bits](https://reactbits.dev/animations/click-spark) | ClickSpark em TypeScript/CSS combina com um acerto. A aplicação já tem um canvas parecido: substituir ou melhorar, sem empilhar dois motores. | Preferência para uma reação pontual no jogo. Evitar shaders, cursores e fundos contínuos no fluxo de estudo. [Licença atual](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md): MIT com Commons Clause, distinta de MIT simples. |
| [Magic UI](https://magicui.design/docs/components/number-ticker) | NumberTicker pode servir ao resultado final; [a fonte](https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/number-ticker.tsx) usa `motion/react` e um utilitário de classes. O projeto atual não tem Motion ou Tailwind. | Usar seletivamente na tela de resultado se trouxer benefício medido. Não adicionar framework de estilo só para esse efeito. Licença MIT. |
| [UI SFX](https://github.com/romainsimon/uisfx) | O player atual já sintetiza áudio. UI SFX oferece eventos semânticos e controle central de som; o runtime descrito no README é sintetizado, sem precisar baixar todos os arquivos de áudio. | Candidato a substituir o player, após resolver silêncio, desbloqueio por gesto e feedback visual. Começar com seleção, acerto, erro suave, blindagem e conclusão. Avaliar packs `soft`, `organic` e `arcade` com usuários. |

React Bits e Magic UI não tornam o conteúdo original por si sós. Para a missão proposta, eu começaria com uma reação curta ao agir e uma transição da consequência no mapa. Texto e alternativas precisam estar estáveis para leitura e toque.

## Alterações realizadas nesta sessão

As regras dos jogos foram mantidas para preservar o diagnóstico inicial pedido. A única mudança funcional foi a integração de avatares:

- Doze SVGs da API DiceBear 9.x incluídos em `public/avatars`, cerca de 68 KB no total, carregados conforme necessário.
- Presets usam a origem do próprio site; perfis personalizados mantêm a API, com imagem local alternativa se falhar.
- Miniaturas com dimensões definidas, decodificação assíncrona e carregamento tardio; estado de seleção acessível.
- Autoria e licenças disponíveis na coleção e no perfil, preservando metadados dos arquivos.
- Nenhuma dependência nova de execução. No build final, o bundle JS passou de 72,56 para 72,82 KB gzip; CSS passou de 3,83 para 3,89 KB gzip.

O [teste específico](evidence/2026-10-20/avatars-verification.json) confirmou os 12 presets com a rede externa bloqueada, seleção, persistência após recarregar, fallback personalizado e créditos. O restante do site ainda depende da rede para fontes e bandeiras. Não há suporte offline completo.

## Ordem de trabalho

O [plano de evolução](plano-evolucao.md) define etapas e aceitação. Começar pelo cronômetro e pelo vocabulário; depois validar uma missão autoral antes de ampliar catálogo e decoração. Para interface, a sequência indicada é `$impeccable harden`, `$impeccable adapt`, `$impeccable optimize`, `$impeccable shape`, `$impeccable animate` e `$impeccable polish`. Repetir a auditoria após as correções, sem usar a pontuação como substituto dos testes de comportamento.

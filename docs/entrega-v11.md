# Entrega da versão 11

20/10/2026. Implementação local para a demonstração escolar; nenhuma publicação automática.

## O que está funcionando

Três missões de oito decisões com aplicação em contexto novo; Bomba de palavras, Diário, Elevador e Arena; explicações com avanço manual; modo sem tempo; revisão de erros; perfil/avatares e progresso pessoal. Dicionário com 317.695 grafias, consulta consistente e exemplos válidos.

Interface responsiva, zoom e Tab preservados, pausa visível, foco na próxima atividade, feedback revelado, diálogos nativos, movimento reduzido e sons UI SFX com silêncio persistente. Fontes e presets de avatar locais. O corpus é carregado sob demanda: 919.090 bytes comprimidos, com alternativa em texto para navegadores sem descompressão nativa.

## Verificação final

- `npm test`: 14 testes aprovados, incluindo timeouts consecutivos nos quatro modos, corpus/exemplos, categoria, diário, pausa e persistência.
- `npm run build`: aprovado. JavaScript: 92,35 KB gzip; CSS: 5,13 KB gzip. Fontes e corpus são arquivos separados.
- `npm audit`: zero vulnerabilidades após atualizar Vite/plugin React e instalar as ferramentas de teste.
- `npm run test:browser`: nove grupos de verificação aprovados; telas em 320, 375, 390, 768 e 1440 pixels, missão completa, correção de erro, primeira tentativa diária, cópia negada, corpus, pausa, Tab e persistência. Nenhum erro de página.
- `node tests/touch.cjs`: eventos de toque emulados aprovados para iniciar, responder, continuar, pausar/retomar, sair, navegar e selecionar avatar.
- Revisão independente Impeccable: três correções solicitadas e resolvidas — foco, ordem de título/contexto e recuperação da cópia. Disposição `ship` restrita às correções avaliadas. Dois avisos estéticos sobre a fonte existente foram mantidos conscientemente.

Capturas e resultados: `.impeccable/review/`. O diagnóstico anterior permanece como registro histórico. DESIGN.md documenta o sistema atual.

## O que ainda depende de verificação externa

Conferir a apresentação no aparelho real, principalmente teclado virtual e Safari/iOS. A emulação não comprova desempenho físico, bateria, leitor de tela ou eficácia pedagógica. Confirmar com a escola o regulamento da 1MiO. O progresso continua local; não há ranking online ou promessa de ganho de aprendizagem comprovado.

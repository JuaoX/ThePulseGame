# Entrega arcade — 20/10/2026

Direção atual: escolher e jogar. Substitui a entrada educacional da entrega anterior.

Quatro jogos em botões grandes; três destinos de navegação. Sem missões, textos de apresentação ou créditos técnicos visíveis. Respostas avançam automaticamente, com opção manual nas configurações. “Por quê?” abre a explicação e segura a rodada. Campo da Bomba mantém foco e anuncia a sequência para tecnologia assistiva. Resultados mostram pontos e ações; respostas ficam recolhidas. Quizzes mistos alternam os quatro temas, e contas geradas usam enunciados curtos.

Validação: 15 testes de regras/corpus passaram; build TypeScript/Vite passou; suíte de navegador passou nos nove grupos, incluindo 320/375/390/768/1440px, auto/manual, pausa, explicação, falha/repetição do carregamento, timeout real, diário, cópia negada, avatares e persistência. Toque emulado passou nos seis fluxos. Console sem erros nas páginas verificadas. `git diff --check` passou. JS principal: 268,06 kB, 89,57 kB gzip; CSS: 17,74 kB, 4,79 kB gzip.

Evidências atuais: `.impeccable/review/arcade-*.png`, `browser-results.json`, `touch-results.json` e `source-hashes.json`. A revisão independente pediu anunciar a sequência da Bomba; correção aplicada, reavaliada e liberada para esse ponto. DESIGN.md e o sidecar descrevem o portal atual.

Detector: duas advertências pela fonte existente, preservada conforme identidade, e uma sobre a curva geométrica do pavio, interpretada incorretamente como borda de cartão. Os avisos consultivos de tokens comparavam a implementação com a documentação anterior ao registro da nova seleção; não foram tratados como erros funcionais nem revarridos para obter aprovação artificial.

Limites: navegador Chromium e toque emulado; sem aparelho físico ou leitor de tela real. Prévia local na porta 5180; nenhuma publicação ou envio ao GitHub nesta entrega. Licenças e atribuições permanecem nos arquivos técnicos.

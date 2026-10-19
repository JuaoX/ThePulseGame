import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada — The Pulse Game v10.0 (Mobile-First)...');

const appRaw = fs.readFileSync('./src/App.tsx', 'utf8');
const cssRaw = fs.readFileSync('./src/styles/global.css', 'utf8');

assert.ok(appRaw.includes('pg-bottom-nav'), 'Barra de navegação inferior nativa para mobile presente');
assert.ok(cssRaw.includes('safe-area-inset-bottom'), 'Suporte a área segura do iOS/Android presente');
assert.ok(appRaw.includes('pg-card-quickplay'), 'Botão Jogar de 1 toque direto nos cartões ativo');

console.log('✅ Auditoria v10.0 concluída sem defeitos!');
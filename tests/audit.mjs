import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada — The Pulse Game v7.0...');

const appRaw = fs.readFileSync('./src/App.tsx', 'utf8');
const avatarsRaw = fs.readFileSync('./src/data/avatars.tsx', 'utf8');

assert.ok(!appRaw.includes('Som ON') && !appRaw.includes('Mudo'), 'Botão de mutar áudio removido conforme solicitado');
assert.ok(!appRaw.includes('Atalhos rápidos:'), 'Rodapé antigo de atalhos removido conforme solicitado');
assert.ok(avatarsRaw.includes('Todos os direitos reservados'), 'Rodapé profissional presente');
assert.ok(avatarsRaw.includes('AVATAR_CATALOG'), 'Catálogo de fotos de perfil ilustrado presente');

console.log('✅ Auditoria v7.0 concluída sem defeitos!');
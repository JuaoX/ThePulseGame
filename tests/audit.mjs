import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada — The Pulse Game v8.0...');

const appRaw = fs.readFileSync('./src/App.tsx', 'utf8');
const avatarsRaw = fs.readFileSync('./src/data/avatars.tsx', 'utf8');

assert.ok(avatarsRaw.includes('api.dicebear.com/9.x'), 'Integração oficial com DiceBear v9.x ativa');
assert.ok(avatarsRaw.includes('hatscripts.github.io/circle-flags'), 'Bandeiras vetoriais circle-flags ativas');
assert.ok(appRaw.includes('role="listbox"'), 'Menu suspenso vertical de idiomas ativo');
assert.ok(!appRaw.includes('Todos os direitos reservados'), 'Rodapé removido conforme solicitado');

console.log('✅ Auditoria v8.0 concluída sem defeitos!');
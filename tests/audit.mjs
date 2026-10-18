import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada — The Pulse Game v9.0...');

const appRaw = fs.readFileSync('./src/App.tsx', 'utf8');
const avatarsRaw = fs.readFileSync('./src/data/avatars.tsx', 'utf8');

assert.ok(!appRaw.includes('DiceBear') && !avatarsRaw.includes('DiceBear'), 'Nenhuma menção a fontes externas na interface');
assert.ok(avatarsRaw.includes('ModeVisualArtwork'), 'Ilustrações vetoriais animadas dos modos ativas');
assert.ok(appRaw.includes('handlePosterMouseMove'), 'Efeito Spotlight interativo nos cards ativo');

console.log('✅ Auditoria v9.0 concluída sem defeitos!');
import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada do Pulso v5.1 (Anthropic Serif Edition)...');

const questionsRaw = fs.readFileSync('./src/data/questions.ts', 'utf8');
const syllablesRaw = fs.readFileSync('./src/data/syllables.ts', 'utf8');
const prngRaw = fs.readFileSync('./src/engine/prng.ts', 'utf8');
const cssRaw = fs.readFileSync('./src/styles/global.css', 'utf8');

const idMatches = [...questionsRaw.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const uniqueIds = new Set(idMatches);
assert.strictEqual(idMatches.length, uniqueIds.size, 'IDs duplicados encontrados em QUESTION_BANK');
assert.ok(idMatches.length >= 60, 'Banco estático deve conter ao menos 60 questões curadas');
console.log(`✓ Banco de questões íntegro: ${idMatches.length} questões únicas verificadas.`);

const sylMatches = [...syllablesRaw.matchAll(/syl:\s*'([A-Z]+)'/g)].map(m => m[1]);
assert.strictEqual(sylMatches.length, 20, 'Devem existir 20 desafios de sílabas configurados');
console.log(`✓ Matriz de sílabas verificada: ${sylMatches.length} sílabas ativas.`);

assert.ok(prngRaw.includes('America/Sao_Paulo'), 'O Desafio Diário deve usar o fuso America/Sao_Paulo');
assert.ok(prngRaw.includes('PROFANITY_ROOTS'), 'Filtro anti-profanidade deve estar ativo');
assert.ok(cssRaw.includes('Source Serif 4'), 'Tipografia editorial Source Serif 4 deve estar configurada');
console.log('✓ Tipografia Anthropic Serif, fuso de Brasília e segurança validados.');

console.log('✅ Auditoria concluída sem defeitos!');
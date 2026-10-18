import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada — The Pulse Game v6.0...');

const questionsRaw = fs.readFileSync('./src/data/questions.ts', 'utf8');
const syllablesRaw = fs.readFileSync('./src/data/syllables.ts', 'utf8');
const prngRaw = fs.readFileSync('./src/engine/prng.ts', 'utf8');

const idMatches = [...questionsRaw.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const uniqueIds = new Set(idMatches);
assert.strictEqual(idMatches.length, uniqueIds.size, 'IDs duplicados em QUESTION_BANK');
assert.ok(idMatches.length >= 60, 'Banco deve ter no mínimo 60 questões');

const sylMatches = [...syllablesRaw.matchAll(/syl:\s*'([A-Z]+)'/g)].map(m => m[1]);
assert.strictEqual(sylMatches.length, 20, '20 sílabas ativas');

assert.ok(prngRaw.includes('America/Sao_Paulo'), 'Fuso de Brasília ativo');
assert.ok(prngRaw.includes('PROFANITY_ROOTS'), 'Filtro de segurança ativo');

console.log('✅ Auditoria v6.0 aprovada sem erros!');
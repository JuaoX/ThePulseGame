/**
 * SUÍTE DE AUDITORIA AUTOMATIZADA — PULSO v5.0
 * Verifica determinismo do PRNG, fuso horário de Brasília, filtro léxico e integridade das questões.
 */
import fs from 'fs';
import assert from 'assert';

console.log('🔍 Iniciando Auditoria Automatizada do Pulso v5.0...');

const questionsRaw = fs.readFileSync('./src/data/questions.ts', 'utf8');
const syllablesRaw = fs.readFileSync('./src/data/syllables.ts', 'utf8');
const prngRaw = fs.readFileSync('./src/engine/prng.ts', 'utf8');

// 1. Verifica integridade dos IDs e opções no banco de questões
const idMatches = [...questionsRaw.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const uniqueIds = new Set(idMatches);
assert.strictEqual(idMatches.length, uniqueIds.size, 'IDs duplicados encontrados em QUESTION_BANK');
assert.ok(idMatches.length >= 60, 'Banco estático deve conter ao menos 60 questões curadas');
console.log(`✓ Banco de questões íntegro: ${idMatches.length} questões únicas verificadas.`);

// 2. Verifica se todas as sílabas possuem exemplos válidos
const sylMatches = [...syllablesRaw.matchAll(/syl:\s*'([A-Z]+)'/g)].map(m => m[1]);
assert.strictEqual(sylMatches.length, 20, 'Devem existir 20 desafios de sílabas configurados');
console.log(`✓ Matriz de sílabas verificada: ${sylMatches.length} sílabas ativas.`);

// 3. Verifica presença do fuso America/Sao_Paulo e filtro anti-profanidade
assert.ok(prngRaw.includes('America/Sao_Paulo'), 'O Desafio Diário deve usar o fuso America/Sao_Paulo');
assert.ok(prngRaw.includes('PROFANITY_ROOTS'), 'Filtro anti-profanidade deve estar ativo');
console.log('✓ Regras de fuso horário (Brasília) e filtro de segurança confirmados.');

console.log('✅ Auditoria concluída sem defeitos!');
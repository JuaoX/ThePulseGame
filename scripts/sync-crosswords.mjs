import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Import a fixed, licensed edition bank. This script does not generate puzzles.
const commit = '1331d55ca4e3e523233d7faa2a32a06cbd5200cf';
const base = `https://raw.githubusercontent.com/4u-Labs/cruzadas/${commit}`;
const [data, license] = await Promise.all(['editions.json', 'LICENSE'].map(async name => {
  const response = await fetch(`${base}/${name}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.text();
}));
const bank = JSON.parse(data);
if (!Array.isArray(bank) || bank.length !== 20 || bank.some(edition => !Array.isArray(edition.words) || !Array.isArray(edition.grid))) throw new Error('Unexpected edition bank');
if (!license.includes('MIT License') || !license.includes('Fabiano Braga')) throw new Error('Unexpected license');
await fs.mkdir('public/crosswords', { recursive: true });
await fs.writeFile('public/crosswords/upstream.json', data);
await fs.writeFile('public/crosswords/LICENSE.txt', license);
await fs.writeFile('public/crosswords/source.json', JSON.stringify({ url: 'https://github.com/4u-Labs/cruzadas', commit, file: 'editions.json', license: 'MIT', sha256: createHash('sha256').update(data).digest('hex'), editions: bank.length, answers: bank.reduce((total, edition) => total + edition.words.length, 0) }, null, 2) + '\n');
console.log(`Imported ${bank.length} existing editions. Run npm test to validate answers and crossings.`);

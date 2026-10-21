import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';

const commit = await fetch('https://api.github.com/repos/fserb/pt-br/commits/master').then(r => { if (!r.ok) throw new Error(`GitHub ${r.status}`); return r.json(); });
const base = `https://raw.githubusercontent.com/fserb/pt-br/${commit.sha}/`;
const files = await Promise.all(['lexico', 'conjugações', 'LICENSE'].map(async file => {
  const response = await fetch(base + encodeURIComponent(file));
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  return response.text();
}));
const words = new Map();
for (const text of files.slice(0, 2)) {
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim().normalize('NFC').toLowerCase();
    if (!/^[a-zà-ü]{3,32}$/u.test(word)) continue;
    const key = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (!words.has(key) || word !== key.toLowerCase()) words.set(key, word);
  }
}
// Editorial additions cover everyday flexions not supplied as lexical headwords.
for (const word of ['flores', 'corações', 'mulheres', 'pães', 'cães', 'ações', 'aviões', 'leões', 'mães', 'pais', 'irmãos', 'irmãs', 'cidadãos', 'mãos', 'papéis', 'animais', 'fáceis', 'difíceis', 'felizes', 'professores', 'professoras', 'estudantes', 'alunos', 'alunas', 'carros', 'casas', 'crianças', 'computadores']) {
  words.set(word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(), word);
}
if (words.size < 100000) throw new Error(`Corpus too small: ${words.size}; verify upstream format`);
await fs.mkdir('public/lexicon', { recursive: true });
const data = [...words.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, word]) => word).join('\n') + '\n';
await fs.writeFile('public/lexicon/pt-BR.txt', data);
await fs.writeFile('public/lexicon/pt-BR.txt.gz', gzipSync(data, { level: 9 }));
await fs.writeFile('public/lexicon/LICENSE.txt', files[2]);
await fs.writeFile('public/lexicon/source.json', JSON.stringify({ source: 'https://github.com/fserb/pt-br', commit: commit.sha, license: 'MIT', files: ['lexico', 'conjugações'], editorialAdditions: 28, normalization: 'NFC; one word; 3–32 letters; compare accents using separate NFD keys', entries: words.size, bytes: Buffer.byteLength(data), sha256: crypto.createHash('sha256').update(data).digest('hex') }, null, 2) + '\n');
console.log(JSON.stringify({ entries: words.size, bytes: Buffer.byteLength(data), sample: data.slice(0, 180), commit: commit.sha }));

import fs from 'node:fs/promises';

// Fixed DiceBear 9.x presets only. Run explicitly when refreshing bundled art.
const source = await fs.readFile('src/data/avatars.tsx', 'utf8');
const presets = [...source.matchAll(/\{ id: '([^']+)', label: '[^']+', style: '([^']+)', seed: '([^']+)', bg: '([^']+)' \}/g)];
if (presets.length !== 6) throw new Error(`Expected 6 curated presets, received ${presets.length}`);
await fs.mkdir('public/avatars', { recursive: true });
for (const [, id, style, seed, bg] of presets) {
  const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=20`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  const svg = await response.text();
  if (!svg.includes('<svg') || /<script|<foreignObject|\bon\w+\s*=/i.test(svg)) throw new Error(`${id}: unexpected SVG content`);
  await fs.writeFile(`public/avatars/${id}.svg`, svg);
  console.log(`${id}: ${Buffer.byteLength(svg)} bytes`);
}

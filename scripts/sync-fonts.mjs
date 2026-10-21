import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

await fs.mkdir('public/fonts', { recursive: true });
for (const [family, name] of [['outfit', 'outfit'], ['plus-jakarta-sans', 'jakarta']]) {
  const metadata = await fetch(`https://registry.npmjs.org/@fontsource-variable/${family}/latest`).then(r => r.json());
  const archive = gunzipSync(Buffer.from(await fetch(metadata.dist.tarball).then(r => r.arrayBuffer())));
  let saved = false;
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    const path = header.subarray(0, 100).toString().replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim() || '0', 8);
    if (!path) break;
    if (path === `package/files/${family}-latin-wght-normal.woff2`) {
      await fs.writeFile(`public/fonts/${name}-latin.woff2`, archive.subarray(offset + 512, offset + 512 + size)); saved = true;
    }
    if (/^package\/(LICENSE|OFL)(\.txt)?$/i.test(path)) await fs.writeFile(`public/fonts/${name}-LICENSE.txt`, archive.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!saved) throw new Error(`Font file not found: ${family}`);
  console.log(`${family}: ${metadata.version}, self-hosted Latin variable font`);
}

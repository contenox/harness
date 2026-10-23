// Astro content collections in this version do not route docs through the
// markdown remark pipeline, so the rewrite runs on the emitted HTML instead:
// every root-relative docs media reference is replaced with its bucket URL.
// Only identity files stay under public/.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteMediaUrls } from '../src/lib/s3-media.mjs';

async function htmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

export default function s3Media() {
  return {
    name: 'contenox-s3-media',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        let rewritten = 0;
        for (const file of await htmlFiles(root)) {
          const html = await fs.readFile(file, 'utf8');
          const next = rewriteMediaUrls(html);
          if (next !== html) {
            await fs.writeFile(file, next);
            rewritten += 1;
          }
        }
        console.log(`s3-media: rewrote ${rewritten} HTML files`);
      },
    },
  };
}

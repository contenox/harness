import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const extensions = {
  linux: ['.deb', '.rpm'],
  darwin: ['.dmg', '.zip'],
  win32: ['.exe', '.zip'],
}[process.platform];
if (!extensions) throw new Error(`unsupported host ${process.platform}`);
const names = fs.readdirSync(dist)
  .filter(name => name.startsWith('Contenox-') && extensions.some(extension => name.endsWith(extension)))
  .sort();
for (const extension of extensions) {
  if (!names.some(name => name.endsWith(extension))) throw new Error(`no ${extension} artifact`);
}
const lines = [];
for (const name of names) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(path.join(dist, name))) hash.update(chunk);
  lines.push(`${hash.digest('hex')}  ${name}`);
}
fs.writeFileSync(path.join(dist, 'SHA256SUMS'), `${lines.join('\n')}\n`);
console.log(`wrote ${names.length} checksums`);

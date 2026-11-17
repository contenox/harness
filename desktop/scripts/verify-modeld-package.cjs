const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Compare packaged files with the runtime-verified worker distribution. This
// catches packaging filters that drop native libraries or third-party notices.
module.exports = async ({ artifactPaths, outDir }) => {
  const root = path.resolve(__dirname, '..', process.env.CONTENOX_PACKAGE_WORKER_DIR);
  const expected = ['resources/runtime/contenox-runtime.exe', 'resources/ui/index.html'];
  for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relative = path.relative(root, path.join(entry.parentPath, entry.name));
    expected.push('resources/modeld/' + relative.split(path.sep).join('/'));
  }
  for (const file of expected) {
    if (!fs.statSync(path.join(outDir, 'win-unpacked', file)).isFile()) {
      throw new Error(`Missing from unpacked application: ${file}`);
    }
  }
  for (const archive of artifactPaths.filter(file => /\.(appx|zip)$/.test(file))) {
    const entries = new Set(execFileSync('tar.exe', ['-tf', archive], { encoding: 'utf8' })
      .replaceAll('\\', '/').split(/\r?\n/));
    const prefix = archive.endsWith('.appx') ? 'app/' : '';
    for (const file of expected) {
      if (!entries.has(prefix + file)) throw new Error(`Missing from ${path.basename(archive)}: ${file}`);
    }
    console.log(`Verified the runtime, UI and all ${expected.length - 2} worker files in ${path.basename(archive)}.`);
  }
};

#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'runtime.lock.json'), 'utf8'));
const version = lock.version;
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version || '')) {
  throw new Error(`invalid runtime version: ${version}`);
}
const platform = { linux: 'linux', darwin: 'darwin', win32: 'windows' }[process.platform];
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!platform || !arch) {
  throw new Error(`unsupported host: ${process.platform}/${process.arch}`);
}
const base = `https://github.com/contenox/runtime/releases/download/${version}`;
const outputDir = path.join(root, '.runtime', version);
const assetName = `contenox-runtime-${platform}-${arch}${platform === 'windows' ? '.exe' : ''}`;
const output = path.join(outputDir, assetName);

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

const RETRIES = 4;

// Retries transient network failures (connection resets, timeouts, 5xx) with a short backoff.
async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { redirect: 'follow' });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error; // network error (reset, timeout, DNS): retry
    }
    if (response && !response.ok) {
      lastError = new Error(`download failed ${response.status}: ${url}`);
      const retryable = response.status >= 500 || response.status === 429;
      if (!retryable) throw lastError;
    }
    if (attempt < RETRIES) {
      const delay = 500 * 2 ** (attempt - 1);
      console.error(`download of ${url} failed (${lastError.cause?.code ?? lastError.message}); retrying in ${delay} ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`download failed after ${RETRIES} attempts: ${url}: ${lastError.cause?.code ?? lastError.message}`);
}

fs.mkdirSync(outputDir, { recursive: true });

// The manifest is pinned by hash in runtime.lock.json, so a cached copy that still matches the
// hash is as trustworthy as a fresh download. That keeps `npm run dev` working offline once the
// runtime has been fetched and verified.
const manifestCache = path.join(outputDir, 'runtime-manifest.json');
let manifestBytes = fs.existsSync(manifestCache) ? fs.readFileSync(manifestCache) : null;
if (!manifestBytes || digest(manifestBytes) !== lock.manifestSha256) {
  manifestBytes = await download(`${base}/runtime-manifest.json`);
}
const manifestHash = digest(manifestBytes);
if (manifestHash !== lock.manifestSha256) {
  throw new Error(`manifest sha256 mismatch: ${manifestHash}`);
}
if (!fs.existsSync(manifestCache) || digest(fs.readFileSync(manifestCache)) !== manifestHash) {
  fs.writeFileSync(manifestCache, manifestBytes);
}
const manifest = JSON.parse(manifestBytes.toString('utf8'));
if (manifest.version !== version) {
  throw new Error(`manifest version is ${manifest.version}, expected ${version}`);
}
const entry = (manifest.assets || []).find(item => item.file === assetName);
if (!entry) throw new Error(`manifest has no ${assetName}`);
let assetBytes = null;
if (fs.existsSync(output)) {
  assetBytes = fs.readFileSync(output);
  if (digest(assetBytes) !== entry.sha256) assetBytes = null;
}
if (assetBytes === null) {
  assetBytes = await download(`${base}/${assetName}`);
  const assetHash = digest(assetBytes);
  if (assetHash !== entry.sha256) {
    throw new Error(`asset sha256 mismatch: ${assetHash}`);
  }
  fs.writeFileSync(output, assetBytes);
}
if (platform !== 'windows') fs.chmodSync(output, 0o755);
const reported = execFileSync(output, ['version'], { encoding: 'utf8' }).trim().split(/\r?\n/, 1)[0];
if (!reported.endsWith(version)) {
  throw new Error(`bundled runtime reports ${reported}, expected ${version}`);
}
if (process.argv.includes('--print-path')) {
  process.stdout.write(output);
} else {
  console.log(output);
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { existingDir, validateWorkspace, workspaceFromArgv } from '../src/workspaces.mjs';

function tempDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'contenox-ws-')));
}

test('workspaceFromArgv: no argument means no workspace', () => {
  assert.equal(workspaceFromArgv([], '/tmp'), null);
});

test('workspaceFromArgv: "." resolves against the shell cwd', () => {
  assert.equal(workspaceFromArgv(['.'], '/home/me/project'), '/home/me/project');
});

test('workspaceFromArgv: an absolute path is kept', () => {
  assert.equal(workspaceFromArgv(['/srv/app'], '/home/me'), '/srv/app');
});

test('workspaceFromArgv: a relative path resolves against the shell cwd', () => {
  assert.equal(workspaceFromArgv(['src/api'], '/home/me'), '/home/me/src/api');
});

test('workspaceFromArgv: flags are skipped', () => {
  assert.equal(workspaceFromArgv(['--no-sandbox', '.'], '/home/me'), '/home/me');
});

test('workspaceFromArgv: electron app.asar paths are not workspaces', () => {
  assert.equal(workspaceFromArgv(['/opt/Contenox/resources/app.asar'], '/home/me'), null);
});

test('validateWorkspace: missing and empty paths are refused', () => {
  assert.match(validateWorkspace('', '/tmp').error, /Select a workspace folder/);
  assert.match(validateWorkspace(undefined, '/tmp').error, /Select a workspace folder/);
  assert.match(validateWorkspace('/definitely/not/here', '/tmp').error, /does not exist/);
});

test('validateWorkspace: the filesystem root is refused', () => {
  assert.match(validateWorkspace('/', '/tmp').error, /filesystem root/);
});

test('validateWorkspace: the home directory is refused', () => {
  const home = tempDir();
  assert.match(validateWorkspace(home, '/tmp', home).error, /home folder/);
});

test('validateWorkspace: a project directory is accepted and realpath-resolved', () => {
  const dir = tempDir();
  const link = path.join(tempDir(), 'link');
  fs.symlinkSync(dir, link);
  assert.deepEqual(validateWorkspace(dir, '/tmp', '/nonexistent-home'), { path: dir });
  assert.deepEqual(validateWorkspace(link, '/tmp', '/nonexistent-home'), { path: dir });
});

test('validateWorkspace: relative input resolves against the base directory', () => {
  const base = tempDir();
  const project = path.join(base, 'project');
  fs.mkdirSync(project);
  assert.deepEqual(validateWorkspace('project', base, '/nonexistent-home'), { path: project });
});

test('existingDir: files and missing paths are not directories', () => {
  const dir = tempDir();
  const file = path.join(dir, 'file.txt');
  fs.writeFileSync(file, 'x');
  assert.equal(existingDir(file), null);
  assert.equal(existingDir(path.join(dir, 'missing')), null);
  assert.equal(existingDir(dir), dir);
});

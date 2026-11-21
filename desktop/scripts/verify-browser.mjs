// Launch with Electron to exercise the same stdio command registered with rc.12.
import { app, BrowserWindow, nativeImage } from 'electron';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { browserConnector } from '../src/browserConnector.mjs';
import { createBrowserHost } from '../src/browser.mjs';

app.setPath('userData', mkdtempSync(path.join(tmpdir(), 'contenox-browser-test-')));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app
  .whenReady()
  .then(run)
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
async function run() {
  const id = randomUUID();
  const endpointFile = path.join(app.getPath('userData'), 'browser', 'endpoint.json');
  const config = browserConnector(id, endpointFile);
  let installed = true;
  const fixture = http.createServer((req, res) => {
    if (req.url === '/api/mcp-servers/by-name/browser') {
      res
        .writeHead(installed ? 200 : 404)
        .end(
          JSON.stringify(config),
        );
    } else {
      res
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end(
          '<title>Capture test</title><body style="background:blue">Browser test<script>const audio=new AudioContext();const tone=audio.createOscillator();tone.frequency.value=440;tone.connect(audio.destination);tone.start();</script>',
        );
    }
  });
  await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const win = new BrowserWindow({ show: false, width: 700, height: 500 });
  const host = createBrowserHost({
    window: () => win,
    runtimeOrigin: () => origin,
    protectedPorts: () => [],
    endpointFile,
  });
  await host.start();
  let child;
  const timeout = setTimeout(() => {
    child?.kill();
    app.exit(1);
  }, 45000);
  try {
    await host.mount(id);
    host.layout(id, { x: 0, y: 0, width: 640, height: 400 });
    win.showInactive();
    child = spawn(config.command, config.args, {
      env: { ...process.env, ...config.env },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
    let seq = 0;
    async function request(method, params) {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }) + '\n');
      let reply;
      do {
        const line = await lines.next();
        assert.ok(!line.done, 'MCP peer ended');
        reply = JSON.parse(line.value);
      } while (reply.method?.startsWith('notifications/'));
      assert.equal(reply.id, seq);
      assert.equal(reply.error, undefined);
      return reply.result;
    }
    const call = (name, args = {}) => request('tools/call', { name, arguments: args });
    await request('initialize', {
      protocolVersion: '2025-06-18',
      clientInfo: { name: 'smoke', version: '1' },
      capabilities: {},
    });
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    assert.ok((await request('tools/list', {})).tools.some((t) => t.name === 'tab_audio'));
    assert.ok(!(await call('navigate', { url: origin })).isError);
    assert.match((await call('snapshot')).content[0].text, /Capture test/);
    const guest = win.contentView.children[0].webContents;
    await guest.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const shot = (await call('screenshot')).content[0];
    assert.equal(shot.mimeType, 'image/jpeg', shot.text);
    assert.ok(Buffer.from(shot.data, 'base64').length > 500);
    const pixel = nativeImage
      .createFromBuffer(Buffer.from(shot.data, 'base64'))
      .toBitmap()
      .subarray(0, 3);
    assert.ok(
      pixel[0] > 230 && pixel[1] < 20 && pixel[2] < 20,
      'Screenshot must contain the blue test page',
    );
    host.layout(id, null); // Return to chat; capture the same tab through MCP.
    const background = (await call('screenshot')).content[0];
    assert.equal(background.mimeType, 'image/jpeg', background.text);
    const clip = (await call('tab_audio', { seconds: 2 })).content[0];
    assert.equal(clip.mimeType, 'audio/wav', clip.text);
    const wav = Buffer.from(clip.data, 'base64');
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt32LE(24), 16000);
    let crossings = 0;
    for (let i = 46; i < wav.length; i += 2)
      if (wav.readInt16LE(i - 2) <= 0 && wav.readInt16LE(i) > 0) crossings++;
    assert.ok(
      crossings > 600 && crossings < 1000,
      'Expected the 440 Hz tab tone, got ' + crossings + ' crossings',
    );
    const pendingMount = host.mount(id);
    host.close(id);
    await assert.rejects(pendingMount, /closed/);
    assert.ok(guest.isDestroyed());
    assert.equal(win.contentView.children.length, 0);
    const fresh = await host.mount(id);
    assert.ok(!fresh.url || fresh.url === 'about:blank');
    installed = false;
    assert.ok((await call('screenshot')).isError);
    console.log('Browser MCP passed navigation, snapshot, JPEG, 440 Hz tab audio, close, reopen and uninstall.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    child?.kill();
    host.stop();
    fixture.close();
    win.destroy();
    app.exit(process.exitCode || 0);
  }
}

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
          `<title>Capture test</title><body style="background:${req.url === '/second' ? 'red' : 'blue'}">
            <input style="position:absolute;left:30px;top:30px" oninput="document.querySelector('output').textContent=this.value">
            <output>Browser test</output><script>const audio=new AudioContext();const tone=audio.createOscillator();tone.frequency.value=440;tone.connect(audio.destination);tone.start();</script>`,
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
    await win.loadURL('data:text/html,Chat');
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
    async function checkScreenshot(color = 'blue') {
      const shot = (await call('screenshot')).content[0];
      assert.equal(shot.mimeType, 'image/jpeg', shot.text);
      const jpeg = Buffer.from(shot.data, 'base64');
      assert.ok(jpeg.length > 500);
      const [blue, green, red] = nativeImage.createFromBuffer(jpeg).toBitmap();
      assert.ok(
        green < 20 && (color === 'blue' ? blue > 230 && red < 20 : red > 230 && blue < 20),
        'Screenshot must contain the ' + color + ' test page',
      );
    }
    await request('initialize', {
      protocolVersion: '2025-06-18',
      clientInfo: { name: 'smoke', version: '1' },
      capabilities: {},
    });
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    const declared = (await request('tools/list', {})).tools;
    assert.deepEqual(Object.fromEntries(declared.map(t => [t.name, t.annotations.readOnlyHint])), {
      navigate: false, snapshot: true, screenshot: true, click: false, type_text: false, tab_audio: true,
    });
    assert.ok(!(await call('navigate', { url: origin })).isError);
    await checkScreenshot(); // MCP created this tab while chat was open.
    assert.match((await call('snapshot')).content[0].text, /Capture test/);
    assert.ok((await call('click', { x: 5000, y: 10 })).isError);
    assert.ok(!(await call('click', { x: 43, y: 40 })).isError);
    assert.ok(!(await call('type_text', { text: 'Typed from chat' })).isError);
    assert.match(JSON.parse((await call('snapshot')).content[0].text).text, /Typed from chat/);
    await host.mount(id);
    host.layout(id, { x: 0, y: 0, width: 640, height: 400 });
    const guest = win.contentView.children[0].webContents;
    guest.setZoomFactor(1.5);
    await guest.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await checkScreenshot();
    await guest.executeJavaScript('document.activeElement.blur()');
    assert.ok(!(await call('click', { x: 43, y: 40 })).isError);
    assert.equal(await guest.executeJavaScript('document.activeElement.tagName'), 'INPUT');
    host.layout(id, { x: 5000, y: 0, width: 640, height: 400 });
    assert.equal(win.contentView.children[0].getBounds().width, 640);
    host.layout(id, null); // Return to chat; capture the same tab through MCP.
    assert.ok(!(await call('navigate', { url: origin + '/second' })).isError);
    await checkScreenshot('red');
    async function checkAudio() {
      const clip = (await call('tab_audio', { seconds: 2 })).content[0];
      assert.equal(clip.mimeType, 'audio/wav', clip.text);
      const wav = Buffer.from(clip.data, 'base64');
      assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
      assert.equal(wav.readUInt32LE(24), 16000);
      let crossings = 0;
      for (let i = 46; i < wav.length; i += 2)
        if (wav.readInt16LE(i - 2) <= 0 && wav.readInt16LE(i) > 0) crossings++;
      assert.ok(crossings > 600 && crossings < 1000, 'Expected the 440 Hz tab tone, got ' + crossings + ' crossings');
    }
    await checkAudio();
    const pendingMount = host.mount(id);
    host.close(id);
    await assert.rejects(pendingMount, /closed/);
    assert.ok(guest.isDestroyed());
    assert.equal(win.contentView.children.length, 0);
    const fresh = await host.mount(id);
    assert.ok(!fresh.url || fresh.url === 'about:blank');
    assert.match((await call('screenshot')).content[0].text, /Open a page/);
    assert.ok(!(await call('navigate', { url: origin })).isError);
    await checkAudio(); // The new tab has never been displayed or captured.
    installed = false;
    assert.ok((await call('screenshot')).isError);
    console.log('Browser MCP passed fresh and background screenshots, page text, input, layout, 440 Hz tab audio, close, reopen and uninstall.');
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

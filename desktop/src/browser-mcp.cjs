// Executed over stdio by the released runtime using Electron's bundled Node.
const { readFile } = require('node:fs/promises');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const [endpointFile, installation] = process.argv.slice(2);
const limit = 5 * 1024 * 1024;
const server = new McpServer({ name: 'Browser', version: '1.0.0' });

async function call(action, args, signal) {
  const { port, key } = JSON.parse(await readFile(endpointFile, 'utf8'));
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-f0-9]{64}$/.test(key))
    throw new Error('Browser requires the running Contenox desktop app.');
  const response = await fetch(`http://127.0.0.1:${port}/${installation}/${action}`, {
    method: 'POST', redirect: 'error',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
  });
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('Browser capture exceeds 5 MiB.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (!response.ok) throw new Error(bytes.toString('utf8', 0, 2048) || 'Browser unavailable.');
  const mimeType = response.headers.get('content-type');
  if (mimeType === 'image/jpeg' || mimeType === 'audio/wav') {
    const type = mimeType === 'image/jpeg' ? 'image' : 'audio';
    return { content: [{ type, mimeType, data: bytes.toString('base64') }] };
  }
  return { content: [{ type: 'text', text: bytes.toString('utf8') }] };
}

function tool(name, description, inputSchema) {
  server.registerTool(name, { description, inputSchema },
    (input, { signal }) => call(name, input, signal));
}
tool('navigate', 'Open an HTTP or HTTPS URL in Browser.', { url: z.string() });
tool('snapshot', 'Read the address, title and visible text of the Browser tab.', {});
tool('screenshot', 'Capture the visible Browser tab as an image.', {});
tool('tab_audio', 'Record audio playing in the Browser tab as a WAV clip.', { seconds: z.number().int().min(1).max(10) });
tool('click', 'Click viewport CSS pixel coordinates.', { x: z.number().int().nonnegative(), y: z.number().int().nonnegative() });
tool('type_text', 'Type into the focused field in the Browser tab.', { text: z.string() });

server.connect(new StdioServerTransport()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

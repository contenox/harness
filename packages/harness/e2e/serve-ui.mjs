// Serve the built harness SPA and proxy /api, /acp, /ui to a running runtime.
// usage: node serve-ui.mjs <uiDir> <runtimeOrigin> <port>
import { startUiServer } from '../../../desktop/src/server.mjs';
const [uiDir, runtimeOrigin, port] = process.argv.slice(2);
await startUiServer({ uiDir, runtimeOrigin, port: Number(port) });
console.log(`ui server on ${port} -> ${runtimeOrigin}`);

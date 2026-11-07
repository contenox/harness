import http from 'node:http';

export function startMockOpenAI(port, models = ['mock-model', 'mock-alpha', 'mock-beta', 'mock-gamma', 'mock-delta']) {
  let failChat = false;
  const server = http.createServer((req, res) => {
    const url = req.url ?? '';
    const json = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && url === '/openapi.json') {
      return json(200, {
        openapi: '3.0.0',
        info: { title: 'E2E service', version: '1.0.0' },
        servers: [{ url: `http://127.0.0.1:${port}` }],
        paths: {
          '/items': {
            get: { operationId: 'listItems', summary: 'List items', responses: { 200: { description: 'ok' } } },
          },
          '/items/{id}': {
            get: {
              operationId: 'getItem',
              summary: 'Get one item',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
              responses: { 200: { description: 'ok' } },
            },
          },
        },
      });
    }
    if (req.method === 'GET' && /\/models$/.test(url)) {
      return json(200, {
        object: 'list',
        data: models.map(id => ({ id, object: 'model', owned_by: 'e2e' })),
      });
    }
    if (req.method === 'POST' && /\/chat\/completions$/.test(url)) {
      if (failChat) return json(400, { error: { message: 'e2e upstream failure', type: 'invalid_request_error' } });
      return json(200, {
        id: 'mock-1',
        object: 'chat.completion',
        model: models[0],
        choices: [
          { index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'mock reply' } },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    }
    json(404, { error: { message: 'not found' } });
  });
  server.setFailChat = value => {
    failChat = value;
  };
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (process.argv[1] && process.argv[1].endsWith('mock-openai.mjs')) {
  const port = Number(process.argv[2] ?? 32500);
  await startMockOpenAI(port);
  console.log(`mock openai on ${port}`);
}

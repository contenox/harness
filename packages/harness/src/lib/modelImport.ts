export type ImportSource = 'file' | 'folder' | 'hub' | 'url';

function cleanEndpoint(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('source');
  return url;
}

function validSegment(segment: string) {
  return (
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !/[\\/#?]/u.test(segment) &&
    Array.from(segment).every(c => c.charCodeAt(0) >= 32)
  );
}

export function modelSourceUrl(data: FormData, kind: 'hub' | 'url'): URL {
  const field = (name: string) => String(data.get(name) ?? '').trim();
  if (kind === 'url') {
    const url = cleanEndpoint(field('url'));
    if (!url.pathname.toLowerCase().endsWith('.gguf')) throw new Error('source');
    return url;
  }
  const base = cleanEndpoint(field('endpoint') || 'https://huggingface.co');
  const repo = field('repo').split('/');
  const revision = field('revision') || 'main';
  const file = field('filename').split('/');
  if (
    repo.length !== 2 ||
    !repo.every(validSegment) ||
    !revision.split('/').every(validSegment) ||
    !file.every(validSegment) ||
    !file.at(-1)?.toLowerCase().endsWith('.gguf')
  )
    throw new Error('source');
  base.pathname = [
    base.pathname.replace(/\/$/, ''),
    ...[...repo, 'resolve', revision, ...file].map(encodeURIComponent),
  ].join('/');
  return base;
}

export function modelUpload(
  files: File[],
  kind: 'file' | 'folder',
  lora?: { file: File; scale: number },
) {
  const body = new FormData();
  if (kind === 'file') {
    const file = files[0];
    if (!file || !file.name.toLowerCase().endsWith('.gguf')) throw new Error('bundle');
    body.append('model.gguf', file);
    if (lora) {
      if (
        !lora.file.name.toLowerCase().endsWith('.gguf') ||
        !Number.isFinite(lora.scale) ||
        lora.scale <= 0
      )
        throw new Error('adapter');
      body.append('adapter.gguf', lora.file);
      body.append(
        'adapter.json',
        new Blob([JSON.stringify({ scale: lora.scale })], { type: 'application/json' }),
        'adapter.json',
      );
    }
    return { body, engine: 'llama' };
  }
  const topLevel = files.filter(file => file.webkitRelativePath.split('/').length === 2);
  const ggufs = topLevel.filter(file => file.name.toLowerCase().endsWith('.gguf'));
  if (ggufs.length) {
    const weights = ggufs.filter(
      file =>
        !file.name.toLowerCase().startsWith('mmproj') && file.name.toLowerCase() !== 'adapter.gguf',
    );
    const projectors = ggufs.filter(file => file.name.toLowerCase().startsWith('mmproj'));
    if (weights.length !== 1 || projectors.length > 1) throw new Error('bundle');
    body.append('model.gguf', weights[0]);
    for (const file of topLevel) {
      if (projectors.includes(file)) body.append('mmproj.gguf', file);
      if (file.name.toLowerCase() === 'adapter.gguf') body.append('adapter.gguf', file);
      if (file.name === 'adapter.json') body.append(file.name, file);
      if (file.name === 'chat_template.jinja') body.append(file.name, file);
    }
    return { body, engine: 'llama' };
  }
  const names = new Set(topLevel.map(file => file.name));
  if (names.has('model_index.json')) {
    for (const file of files) {
      const relative = file.webkitRelativePath.split('/').slice(1);
      if (relative.length > 2 || !relative.every(validSegment)) continue;
      if (/\.(xml|bin|json|model|txt|jinja|tiktoken)$/i.test(file.name)) {
        body.append(relative.join('/'), file);
      }
    }
    return { body, engine: 'openvino' };
  }
  if (
    !['openvino_model', 'openvino_language_model'].some(
      base => names.has(base + '.xml') && names.has(base + '.bin'),
    )
  )
    throw new Error('bundle');
  for (const file of topLevel) {
    if (/\.(xml|bin|json|model|txt|jinja|tiktoken)$/i.test(file.name)) body.append(file.name, file);
  }
  return { body, engine: 'openvino' };
}

const PROJECT_SEGMENT = /(\/projects\/)[^/\s"'?#]+/g;

export function redactProject(text: string): string {
  return text.replace(PROJECT_SEGMENT, '$1…');
}

export function backendDisplayUrl(backend: { baseUrl: string; displayUrl?: string }): string {
  return backend.displayUrl || redactProject(backend.baseUrl);
}

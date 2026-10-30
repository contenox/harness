const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether a window.open target may be handed to the system browser:
 * https always, http only for loopback hosts, nothing else.
 */
export function isAllowedExternalUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:') return LOCAL_HOSTS.has(url.hostname.toLowerCase());
  return false;
}

import { describe, expect, it } from 'vitest';
import { backendDisplayUrl, redactProject } from './displayUrl';

describe('displayUrl', () => {
  it('hides the project in a Vertex URL', () => {
    expect(
      redactProject(
        'https://aiplatform.googleapis.com/v1/projects/my-secret-project/locations/global',
      ),
    ).toBe('https://aiplatform.googleapis.com/v1/projects/…/locations/global');
  });

  it('hides the project inside error text', () => {
    expect(redactProject('Post "https://x/v1/projects/abc-1/locations/eu:predict": 403')).toBe(
      'Post "https://x/v1/projects/…/locations/eu:predict": 403',
    );
  });

  it('prefers the runtime displayUrl and falls back to a redacted base URL', () => {
    expect(backendDisplayUrl({ baseUrl: 'http://a', displayUrl: 'http://b' })).toBe('http://b');
    expect(backendDisplayUrl({ baseUrl: 'https://h/v1/projects/p1/locations/g' })).toBe(
      'https://h/v1/projects/…/locations/g',
    );
    expect(backendDisplayUrl({ baseUrl: 'http://127.0.0.1:11434' })).toBe('http://127.0.0.1:11434');
  });
});

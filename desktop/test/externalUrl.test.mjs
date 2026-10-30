import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedExternalUrl } from '../src/externalUrl.mjs';

test('https is always allowed', () => {
  assert.equal(isAllowedExternalUrl('https://console.anthropic.com/settings/keys'), true);
  assert.equal(isAllowedExternalUrl('HTTPS://example.com'), true);
});

test('http is allowed only for loopback hosts', () => {
  assert.equal(isAllowedExternalUrl('http://localhost:8080/x'), true);
  assert.equal(isAllowedExternalUrl('http://127.0.0.1:11434'), true);
  assert.equal(isAllowedExternalUrl('http://[::1]:3000/'), true);
  assert.equal(isAllowedExternalUrl('http://example.com'), false);
  assert.equal(isAllowedExternalUrl('http://192.168.1.20:11434'), false);
  assert.equal(isAllowedExternalUrl('http://localhost.evil.com'), false);
  assert.equal(isAllowedExternalUrl('http://127.0.0.1.evil.com'), false);
});

test('other schemes and garbage are denied', () => {
  for (const url of ['file:///C:/Windows/System32/calc.exe', 'javascript:alert(1)', 'ms-settings:', 'ftp://example.com', 'data:text/html,x', '', 'not a url', '//example.com']) {
    assert.equal(isAllowedExternalUrl(url), false, url);
  }
});

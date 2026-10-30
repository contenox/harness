import { describe, expect, it } from 'vitest';
import i18n from './i18n';
import { CLOUD_PROVIDER_SETUPS } from './lib/providerCatalog';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leaves(value, `${prefix}${key}.`),
  );
}

function valueAt(tree: Tree, path: string): string {
  return path
    .split('.')
    .reduce<string | Tree>((node, part) => (node as Tree)[part], tree) as string;
}

describe('provider setup namespaces - en/de parity', () => {
  const en = i18n.getResourceBundle('en', 'translation') as Record<string, Tree>;
  const de = i18n.getResourceBundle('de', 'translation') as Record<string, Tree>;

  for (const ns of ['providers', 'connections', 'recovery']) {
    it(`${ns}: same keys, non-empty German, same placeholders`, () => {
      expect(en[ns]).toBeDefined();
      expect(de[ns]).toBeDefined();
      expect(leaves(de[ns]).sort()).toEqual(leaves(en[ns]).sort());
      for (const key of leaves(en[ns])) {
        const deText = valueAt(de[ns], key);
        expect(deText.trim().length, `${ns}.${key}`).toBeGreaterThan(0);
        const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort();
        expect(vars(deText), `${ns}.${key} placeholders`).toEqual(vars(valueAt(en[ns], key)));
      }
    });
  }
});

describe('provider one-liners', () => {
  for (const lng of ['en', 'de']) {
    it(`${lng}: every provider has a short description for list rows`, () => {
      for (const setup of CLOUD_PROVIDER_SETUPS) {
        const text = i18n.t(setup.shortKey, { lng });
        expect(text, setup.shortKey).not.toBe(setup.shortKey);
        expect(text.length, setup.shortKey).toBeLessThanOrEqual(40);
      }
    });
  }
});

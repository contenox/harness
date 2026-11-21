import { describe, expect, it } from 'vitest';
import { modelSourceUrl, modelUpload } from './modelImport';

const source = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([name, value]) => data.set(name, value));
  return data;
};
describe('model import', () => {
  it('keeps the selected Hub base path and encodes nested filenames and revision refs', () => {
    const data = source({
      repo: 'lab/model',
      revision: 'refs/pr/12',
      filename: 'quant/Q4 small.gguf',
      endpoint: 'https://models.example/hub',
    });
    expect(modelSourceUrl(data, 'hub').href).toBe(
      'https://models.example/hub/lab/model/resolve/refs%2Fpr%2F12/quant/Q4%20small.gguf',
    );
  });
  it.each([
    'https://u:pw@example.org/a.gguf',
    'https://example.org/a.gguf?token=secret',
    'http://example.org/a.gguf',
    'file:///model.gguf',
  ])('rejects an unsafe or credential-bearing source', url => {
    expect(() => modelSourceUrl(source({ url }), 'url')).toThrow();
  });
  it('rejects invalid paths and incompatible files', () => {
    expect(() =>
      modelSourceUrl(source({ repo: 'lab/model', filename: '../escape.gguf' }), 'hub'),
    ).toThrow();
    expect(() => modelUpload([new File(['text'], 'a.txt')], 'file')).toThrow();
  });
  it('preserves a folder projector and does not submit neighboring files', () => {
    const files = ['weights.gguf', 'mmproj-f16.gguf', 'personal.txt'].map(name =>
      Object.defineProperty(new File(['GGUF'], name), 'webkitRelativePath', {
        value: 'sample/' + name,
      }),
    );
    expect(Array.from(modelUpload(files, 'folder').body.keys())).toEqual([
      'model.gguf',
      'mmproj.gguf',
    ]);
  });
  it('uploads media pipeline components under their relative names', () => {
    const paths = [
      'model_index.json',
      'unet/openvino_model.xml',
      'unet/openvino_model.bin',
      'tokenizer/tokenizer.json',
      'unet/old/private.bin',
      'notes.md',
    ];
    const files = paths.map(name =>
      Object.defineProperty(new File(['fixture'], name.split('/').at(-1)!), 'webkitRelativePath', {
        value: 'pipeline/' + name,
      }),
    );
    const upload = modelUpload(files, 'folder');
    expect(upload.engine).toBe('openvino');
    expect([...upload.body.keys()]).toEqual(paths.slice(0, 4));
  });
  it('imports the chosen GGUF and adapter as a named variant with its strength', async () => {
    const base = new File(['GGUF'], 'base.gguf');
    const file = new File(['GGUF'], 'style.gguf');
    const variant = modelUpload([base], 'file', { file, scale: 0.75 });
    expect(variant.body.get('model.gguf')).toBe(base);
    expect(variant.body.get('adapter.gguf')).toBe(file);
    expect(JSON.parse(await (variant.body.get('adapter.json') as Blob).text())).toEqual({
      scale: 0.75,
    });
    expect(() => modelUpload([base], 'file', { file, scale: Infinity })).toThrow();
  });
});

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    chat: 'src/chat.ts',
    editor: 'src/components/editors/MonacoView.tsx',
    access: 'src/product/access/index.ts',
    inference: 'src/product/inference/index.ts',
    product: 'src/product/index.ts',
    'product-lib': 'src/product/lib/index.ts',
    session: 'src/product/session/index.ts',
    'session-state': 'src/session-state.ts',
    'session-lib': 'src/session-lib.ts',
    'session-ui': 'src/session-ui.ts',
    'session-workspace': 'src/session-workspace.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@contenox/ui', '@contenox/acp-client', '@monaco-editor/react', 'clsx', 'lucide-react', 'monaco-editor', 'react', 'react-dom', 'react-markdown', 'react-router-dom', 'remark-gfm', 'tailwind-merge'],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.js' };
  },
});

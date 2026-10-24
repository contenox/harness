import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';

const harnessPackageRoot = path.dirname(fileURLToPath(import.meta.url));
const harnessDistDir = path.resolve(harnessPackageRoot, 'dist');

function harnessSpaFallback(): Plugin {
  return {
    name: 'harness-spa-fallback',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.method !== 'GET' || !req.url) {
          next();
          return;
        }
        const pathname = req.url.split('?')[0] ?? '';
        if (pathname.startsWith('/api') || pathname.startsWith('/ui')) {
          next();
          return;
        }
        if (
          pathname.startsWith('/@') ||
          pathname.startsWith('/node_modules') ||
          pathname.startsWith('/src')
        ) {
          next();
          return;
        }
        if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
          next();
          return;
        }
        if (pathname === '/' || pathname === '') {
          next();
          return;
        }
        const q = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';
        req.url = `/index.html${q}`;
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, harnessPackageRoot, '');
  const devApiProxy = env.VITE_DEV_API_PROXY === '1' || env.VITE_DEV_API_PROXY === 'true' || process.env.VITE_DEV_API_PROXY === '1';
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:32123';

  return {
    envDir: harnessPackageRoot,
    plugins: [
      react(),
      tailwindcss(),
      ...(devApiProxy ? [harnessSpaFallback()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(harnessPackageRoot, './src'),
      },
    },
    build: {
      outDir: harnessDistDir,
      emptyOutDir: true,
    },
    base: '/',
    server: devApiProxy
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              ws: true,
              configure: proxy => {
                proxy.on('proxyReq', proxyReq => {
                  proxyReq.setHeader('origin', new URL(proxyTarget).origin);
                });
              },
            },
            '/acp': {
              target: proxyTarget,
              changeOrigin: true,
              ws: true,
            },
            '/ui': {
              target: proxyTarget,
              changeOrigin: true,
              configure: proxy => {
                proxy.on('proxyReq', proxyReq => {
                  proxyReq.setHeader('origin', new URL(proxyTarget).origin);
                });
              },
            },
          },
        }
      : undefined,
  };
});

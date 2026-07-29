import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'fuse.js',
        '@tanstack/react-query',
        'lucide-react'
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-table', '@tiptap/extension-table-cell', '@tiptap/extension-table-header', '@tiptap/extension-table-row', '@tiptap/extension-text-align', '@tiptap/extension-bubble-menu', '@tiptap/extension-image', '@aarkue/tiptap-math-extension', 'tiptap-extension-resize-image'],
            'vendor-ui': ['sweetalert2', 'react-hot-toast', 'lucide-react'],
            'vendor-utils': ['xlsx', 'papaparse', 'katex', 'html2canvas', 'clsx', 'tailwind-merge'],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err: any, _req: any, res: any) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                if (res && !res.headersSent && typeof res.writeHead === 'function') {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ message: 'Backend service initializing, please wait...' }));
                }
              }
            });
          }
        }
      },
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        host: '127.0.0.1',
        protocol: 'ws',
      },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

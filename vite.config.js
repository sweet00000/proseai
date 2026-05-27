import { defineConfig } from 'vite'

export default defineConfig({
  base: '/proseai/',   // GitHub Pages repo subpath
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        app:  'app.html',
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
})

import { defineConfig } from 'vite'

export default defineConfig({
  base: '/proseai/',
  build: {
    target: 'esnext',  // required for top-level await + transformers.js
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

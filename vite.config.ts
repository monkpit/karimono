import { defineConfig } from 'vite';

export default defineConfig({
  // Configure for GitHub Pages deployment (sub-URI, not root domain)
  base: process.env.NODE_ENV === 'production' ? '/karimono-v2/' : '/',

  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['typescript'],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [],
  },

  // Configure for TypeScript
  esbuild: {
    target: 'es2022',
  },
});

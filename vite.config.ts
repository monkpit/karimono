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
      input: {
        main: './index.html',
        demo: './demo.html',
      },
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
    watch: {
      ignored: [
        '**/coverage/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.jestcache/**',
        '**/coverage.txt',
        '**/coverage.json',
        '**/lcov.info',
        '**/*.lcov',
      ],
    },
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

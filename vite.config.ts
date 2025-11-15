import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'assets',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        help: resolve(__dirname, 'help.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
      output: {
        // Code splitting configuration
        manualChunks: {
          // Vendor chunk for any future dependencies
          // vendor: ['dependency-name'],
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
      format: {
        comments: false, // Remove comments
      },
    },
    sourcemap: true,
    cssCodeSplit: false, // Keep CSS together for theme consistency
    chunkSizeWarningLimit: 1000, // Warn if chunks exceed 1MB

    // Asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    assetsDir: 'assets',
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/frontend'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@worker': resolve(__dirname, 'src/worker'),
    },
  },

  server: {
    port: 8080,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Wrangler dev server
        changeOrigin: true,
        secure: false,
      },
    },
    cors: true,
  },

  preview: {
    port: 8080,
    strictPort: true,
    host: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: [],
  },

  // Define environment variables available in the app
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});

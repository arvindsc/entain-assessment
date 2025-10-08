import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2015',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs:
            mode === 'production'
              ? ['console.log', 'console.info', 'console.debug']
              : [],
        },
        mangle: {
          safari10: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'pinia'],
            axios: ['axios'],
            utils: ['src/utils/logger.ts', 'src/utils/validator.ts'],
          },
          // Ensure consistent chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: mode === 'development',
      // Optimize for production
      cssCodeSplit: true,
      reportCompressedSize: true,
      emptyOutDir: true,
    },
    optimizeDeps: {
      include: ['vue', 'pinia', 'axios'],
      exclude: ['@vue/test-utils'],
    },
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      host: true,
      open: true,
      cors: true,
      // Enable HTTPS in development if needed
      // https: true,
    },
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173', 10),
      host: true,
    },
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(
        env.VITE_BUILD_TIME || new Date().toISOString(),
      ),
    },
    // CSS configuration
    css: {
      devSourcemap: mode === 'development',
    },
    // Environment variables
    envPrefix: 'VITE_',
  };
});

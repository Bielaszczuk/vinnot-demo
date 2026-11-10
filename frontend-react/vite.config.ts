import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import securityHeaders from './security-headers.json' with { type: 'json' }
import { linkAssociations } from './config/link-associations.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || '/'

  return {
    base: basePath,
    plugins: [react(), {
      name: 'vinnot-link-associations',
      generateBundle() {
        for (const [name, source] of Object.entries(linkAssociations(env.VITE_APP_ENV, env.VITE_DEV_ANDROID_SHA256))) {
          this.emitFile({ type: 'asset', fileName: `.well-known/${name}`, source })
        }
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@app': path.resolve(import.meta.dirname, 'src/app'),
        '@shared': path.resolve(import.meta.dirname, 'src/shared'),
        '@domain': path.resolve(import.meta.dirname, 'src/domain'),
        '@application': path.resolve(import.meta.dirname, 'src/application'),
        '@infrastructure': path.resolve(import.meta.dirname, 'src/infrastructure'),
        '@presentation': path.resolve(import.meta.dirname, 'src/presentation'),
        '@api': path.resolve(import.meta.dirname, 'src/infrastructure/api'),
        '@config': path.resolve(import.meta.dirname, 'src/shared/config'),
        '@services': path.resolve(import.meta.dirname, 'src/application/services'),
        '@stores': path.resolve(import.meta.dirname, 'src/presentation/stores'),
        '@hooks': path.resolve(import.meta.dirname, 'src/presentation/hooks'),
        '@components': path.resolve(import.meta.dirname, 'src/presentation/components'),
        '@pages': path.resolve(import.meta.dirname, 'src/presentation/pages'),
        '@utils': path.resolve(import.meta.dirname, 'src/shared/utils'),
        '@i18n': path.resolve(import.meta.dirname, 'src/shared/i18n'),
        '@mocks': path.resolve(import.meta.dirname, 'src/infrastructure/mocks'),
        '@assets': path.resolve(import.meta.dirname, 'src/shared/assets'),
        '@types': path.resolve(import.meta.dirname, 'src/shared/types'),
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '^/share(?:/|\\?|$)': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: path => `/api${path}`,
        },
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: env.VITE_GENERATE_SOURCEMAP === 'true',
      chunkSizeWarningLimit: 1000,
    },
    preview: {
      port: 4173,
      headers: securityHeaders,
    },
  }
})

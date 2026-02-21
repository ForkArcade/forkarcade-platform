import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import path from 'path'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: '/',
  resolve: {
    alias: {
      '@editor': path.resolve(__dirname, '../editor/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
  server: {
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787',
      '/sdk': 'http://localhost:8787',
      '/local-games': 'http://localhost:8787',
    }
  },
  build: {
    rollupOptions: {
      plugins: [{
        name: 'resolve-external-module-deps',
        resolveId(source, importer) {
          if ((importer?.includes('/editor/src/') || importer?.includes('/narrative/src/')) && !source.startsWith('.') && !source.startsWith('/')) {
            return this.resolve(source, path.resolve(__dirname, 'src/App.jsx'), { skipSelf: true })
          }
        }
      }]
    }
  }
})

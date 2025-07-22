import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    host: true,
    strictPort: false,
    // Remove proxy for now to avoid hanging issues
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3001',
    //     changeOrigin: true
    //   }
    // }
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
  // Disable PWA plugin temporarily to avoid hanging issues
  // Can be re-enabled later once the basic server is working
})
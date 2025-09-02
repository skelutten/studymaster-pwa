/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Security headers plugin for production
const securityHeadersPlugin = () => ({
  name: 'security-headers',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      next()
    })
  }
})

// Note: Using Vite's built-in SPA fallback instead of custom plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    securityHeadersPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'StudyMaster - Flashcard Learning App',
        short_name: 'StudyMaster',
        description: 'A modern flashcard app with spaced repetition, gamification, and offline support',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    },
    // Ensure single instance of React dependencies to prevent runtime errors
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    hmr: {
      port: 3000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    // Enable SPA routing - serve index.html for all non-API routes
    middlewareMode: false,
    fs: {
      strict: false
    }
  },
  // Enable history API fallback for SPA routing and implement code splitting
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      external: (id) => {
        // Don't externalize these, but mark them for special handling
        return false;
      },
      output: {
        // Optimized chunk splitting for smaller initial bundle
        manualChunks: (id) => {
          // Heavy dependencies that should be separate chunks
          if (id.includes('sql.js')) return 'sql-vendor'
          if (id.includes('jszip')) return 'zip-vendor'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chart-vendor'
          
          // Core React ecosystem - keep ALL React-related together to prevent conflicts
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') ||
              id.includes('@tanstack/react-query') || id.includes('use-sync-external-store') ||
              id.includes('scheduler') || id.includes('react-hook-form') ||
              id.includes('react-chartjs-2') || id.includes('framer-motion')) {
            return 'react-vendor'
          }
          
          // Essential UI libraries (keep smaller)
          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'ui-vendor'
          }
          
          // Data management (non-React dependencies)
          if (id.includes('zustand') || id.includes('pocketbase')) {
            return 'data-vendor'
          }
          
          // Node modules (everything else external)
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          
          // App-specific chunks - only include if part of large components
          if (id.includes('src/services/')) return 'services'
          if (id.includes('src/stores/')) return 'stores'
          
          // Keep components in main bundle unless they're heavy
          if (id.includes('src/components/dashboard/') || 
              id.includes('src/components/gamification/')) {
            return 'components'
          }
        },
        // Use content-based hashing for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Reduce chunk size warning limit to catch large bundles  
    chunkSizeWarningLimit: 400,
    // Use safer minification to avoid React production issues
    minify: 'terser',
    // Safer terser options to prevent React issues
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug'],
        reduce_vars: false, // Safer for React
        toplevel: false,    // Safer for React
        keep_fnames: true   // Keep function names for React
      },
      mangle: {
        keep_fnames: true,  // Keep function names for React
        toplevel: false     // Safer for React
      }
    },
    // Keep console logs for debugging in production
    // terserOptions: {
    //   compress: {
    //     drop_console: false,
    //     drop_debugger: true,
    //     pure_funcs: [],
    //     dead_code: true,
    //     reduce_vars: false,
    //     toplevel: false
    //   },
    //   mangle: {
    //     toplevel: false
    //   }
    // }
    
  },
  // Add preview configuration for SPA fallback
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 20000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
})
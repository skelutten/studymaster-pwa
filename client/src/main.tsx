import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { initSyncQueueFlusher } from './services/syncQueueFlusher'

// Initialize performance monitoring if enabled
if (import.meta.env.VITE_WEB_VITALS_ENABLED === 'true') {
  import('./utils/performanceMonitoring').then(({ default: PerformanceMonitor }) => {
    PerformanceMonitor.initializeCoreWebVitals()
  }).catch(error => {
    console.warn('Failed to initialize performance monitoring:', error)
  })
}

// PWA functionality is handled by Vite PWA plugin

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Initialize offline sync queue flusher (fallback when SW Background Sync unavailable)
initSyncQueueFlusher()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
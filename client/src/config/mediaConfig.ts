export const MEDIA_CONFIG = {
  // Production settings
  OPTIMIZATION_ENABLED: import.meta.env.VITE_MEDIA_OPTIMIZATION_ENABLED === 'true',
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MEDIA_MAX_FILE_SIZE_MB || '10') * 1024 * 1024,
  MAX_BATCH_SIZE: parseInt(import.meta.env.VITE_MEDIA_MAX_BATCH_SIZE_MB || '100') * 1024 * 1024,
  CACHE_SIZE: parseInt(import.meta.env.VITE_MEDIA_CACHE_SIZE_MB || '100') * 1024 * 1024,
  PROCESSING_CONCURRENCY: parseInt(import.meta.env.VITE_MEDIA_PROCESSING_CONCURRENCY || '2'),
  URL_TTL_MINUTES: parseInt(import.meta.env.VITE_MEDIA_URL_TTL_MINUTES || '60'),
  
  // Security settings
  SECURITY_SCAN_ENABLED: import.meta.env.VITE_MEDIA_SECURITY_SCAN_ENABLED === 'true',
  STRIP_METADATA: import.meta.env.VITE_MEDIA_STRIP_METADATA === 'true',
  ALLOWED_TYPES: (import.meta.env.VITE_MEDIA_ALLOWED_TYPES || '').split(',').filter(Boolean),
  
  // Performance settings
  PRELOADING_ENABLED: import.meta.env.VITE_MEDIA_PRELOADING_ENABLED === 'true',
  OFFLINE_SYNC_ENABLED: import.meta.env.VITE_MEDIA_OFFLINE_SYNC_ENABLED === 'true',
  PROGRESSIVE_LOADING: import.meta.env.VITE_MEDIA_PROGRESSIVE_LOADING === 'true',
  LAZY_LOADING_THRESHOLD: parseInt(import.meta.env.VITE_MEDIA_LAZY_LOADING_THRESHOLD || '200'),
  
  // Monitoring
  ANALYTICS_ENABLED: import.meta.env.VITE_MEDIA_ANALYTICS_ENABLED === 'true',
  ERROR_REPORTING_ENABLED: import.meta.env.VITE_MEDIA_ERROR_REPORTING_ENABLED === 'true',
  PERFORMANCE_MONITORING: import.meta.env.VITE_MEDIA_PERFORMANCE_MONITORING === 'true',

  // Development/Debug
  DEBUG_MODE: import.meta.env.VITE_MEDIA_DEBUG_MODE === 'true',
  VERBOSE_LOGGING: import.meta.env.VITE_MEDIA_VERBOSE_LOGGING === 'true',
  SIMULATE_SLOW_NETWORK: import.meta.env.VITE_MEDIA_SIMULATE_SLOW_NETWORK === 'true',
} as const

// Validation
if (MEDIA_CONFIG.MAX_FILE_SIZE > MEDIA_CONFIG.MAX_BATCH_SIZE) {
  throw new Error('MEDIA_MAX_FILE_SIZE cannot exceed MEDIA_MAX_BATCH_SIZE')
}

if (MEDIA_CONFIG.ALLOWED_TYPES.length === 0) {
  console.warn('No allowed media types configured - using defaults')
  ;(MEDIA_CONFIG as any).ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
}

if (MEDIA_CONFIG.PROCESSING_CONCURRENCY < 1 || MEDIA_CONFIG.PROCESSING_CONCURRENCY > 8) {
  console.warn('Invalid processing concurrency, using default of 2')
  ;(MEDIA_CONFIG as any).PROCESSING_CONCURRENCY = 2
}

// Derived configurations
export const MEDIA_DERIVED_CONFIG = {
  // File size limits in human-readable format
  MAX_FILE_SIZE_MB: Math.round(MEDIA_CONFIG.MAX_FILE_SIZE / (1024 * 1024) * 100) / 100,
  MAX_BATCH_SIZE_MB: Math.round(MEDIA_CONFIG.MAX_BATCH_SIZE / (1024 * 1024) * 100) / 100,
  CACHE_SIZE_MB: Math.round(MEDIA_CONFIG.CACHE_SIZE / (1024 * 1024) * 100) / 100,
  
  // URL TTL in milliseconds
  URL_TTL_MS: MEDIA_CONFIG.URL_TTL_MINUTES * 60 * 1000,
  
  // Performance thresholds
  CRITICAL_FILE_SIZE: MEDIA_CONFIG.MAX_FILE_SIZE * 0.1, // 10% of max for critical preloading
  LARGE_FILE_SIZE: MEDIA_CONFIG.MAX_FILE_SIZE * 0.5,    // 50% of max for large file handling
  
  // Security levels
  SECURITY_LEVEL: MEDIA_CONFIG.SECURITY_SCAN_ENABLED ? 'strict' : 'basic',
  
  // Debug info
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const

// Export default configuration object
export default MEDIA_CONFIG
/**
 * Performance Configuration for StudyMaster PWA
 * Centralizes performance-related settings and thresholds
 */

export const PERFORMANCE_CONFIG = {
  // Component Performance Thresholds
  COMPONENT_RENDER_WARNING_MS: 16, // 60fps threshold
  COMPONENT_RENDER_ERROR_MS: 33,   // 30fps threshold
  MAX_RERENDERS_WARNING: 10,
  MEMORY_LEAK_THRESHOLD_MB: 50,

  // Media Performance Settings
  MEDIA: {
    LAZY_LOADING_ENABLED: import.meta.env.VITE_MEDIA_LAZY_LOADING_ENABLED !== 'false',
    PRELOADING_THRESHOLD_BYTES: parseInt(import.meta.env.VITE_MEDIA_PRELOADING_THRESHOLD || '500000'),
    CACHE_MAX_SIZE_BYTES: parseInt(import.meta.env.VITE_MEDIA_CACHE_MAX_SIZE || '52428800'), // 50MB
    CONCURRENT_PROCESSING: parseInt(import.meta.env.VITE_MEDIA_CONCURRENT_PROCESSING || '2'),
    LOAD_TIMEOUT_MS: 10000,
    RETRY_ATTEMPTS: 3
  },

  // Virtualization Settings
  VIRTUALIZATION: {
    OVERSCAN_COUNT: parseInt(import.meta.env.VITE_VIRTUALIZATION_OVERSCAN_COUNT || '3'),
    ITEM_HEIGHT: parseInt(import.meta.env.VITE_VIRTUALIZATION_ITEM_HEIGHT || '220'),
    ENABLE_INFINITE_LOADING: true,
    BATCH_SIZE: 50, // Load 50 items at a time
    BUFFER_SIZE: 100 // Keep 100 items in memory
  },

  // Bundle Performance
  BUNDLE: {
    SIZE_WARNING_KB: 400,
    SIZE_ERROR_KB: 1024,
    CHUNK_SIZE_WARNING_KB: 200,
    LAZY_LOAD_THRESHOLD_KB: 100
  },

  // Core Web Vitals Targets
  WEB_VITALS: {
    LCP_TARGET_MS: 2500,      // Largest Contentful Paint
    FID_TARGET_MS: 100,       // First Input Delay
    CLS_TARGET: 0.1,          // Cumulative Layout Shift
    FCP_TARGET_MS: 1800,      // First Contentful Paint
    TTI_TARGET_MS: 3800       // Time to Interactive
  },

  // Monitoring Configuration
  MONITORING: {
    ENABLED: import.meta.env.VITE_MEDIA_PERFORMANCE_MONITORING === 'true',
    REACT_PROFILER_ENABLED: import.meta.env.VITE_ENABLE_REACT_PROFILER === 'true',
    MEMORY_MONITORING_ENABLED: import.meta.env.VITE_MEMORY_MONITORING_ENABLED === 'true',
    WEB_VITALS_ENABLED: import.meta.env.VITE_WEB_VITALS_ENABLED !== 'false',
    SAMPLE_RATE: 0.1, // Monitor 10% of sessions
    MAX_METRICS_STORED: 100,
    METRICS_FLUSH_INTERVAL_MS: 30000 // 30 seconds
  }
}

// Performance budget validation
export const validatePerformanceBudget = () => {
  const warnings: string[] = []
  const errors: string[] = []

  // Check bundle size (would be implemented with actual bundle analysis)
  const bundleSize = 0 // Placeholder - would get from build stats

  if (bundleSize > PERFORMANCE_CONFIG.BUNDLE.SIZE_WARNING_KB * 1024) {
    warnings.push(`Bundle size (${Math.round(bundleSize / 1024)}KB) exceeds warning threshold`)
  }

  if (bundleSize > PERFORMANCE_CONFIG.BUNDLE.SIZE_ERROR_KB * 1024) {
    errors.push(`Bundle size (${Math.round(bundleSize / 1024)}KB) exceeds error threshold`)
  }

  // Check memory configuration
  if (PERFORMANCE_CONFIG.MEDIA.CACHE_MAX_SIZE_BYTES > 100 * 1024 * 1024) {
    warnings.push('Media cache size is very large - may cause memory issues on low-end devices')
  }

  // Check virtualization settings
  if (PERFORMANCE_CONFIG.VIRTUALIZATION.OVERSCAN_COUNT > 10) {
    warnings.push('Virtualization overscan count is high - may render too many items')
  }

  return { warnings, errors }
}

// Performance recommendations based on device capabilities
export const getDeviceOptimizedSettings = () => {
  const isLowEndDevice = () => {
    // Detect low-end devices based on available APIs
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory <= 4 // 4GB or less
    }
    
    if ('hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2 // 2 cores or less
    }
    
    // Fallback to connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')
    }
    
    return false
  }

  const isSlowNetwork = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return connection && (
        connection.effectiveType === '2g' || 
        connection.effectiveType === 'slow-2g' ||
        connection.saveData
      )
    }
    return false
  }

  const lowEndDevice = isLowEndDevice()
  const slowNetwork = isSlowNetwork()

  return {
    lowEndDevice,
    slowNetwork,
    
    // Recommended settings based on device capabilities
    recommendedSettings: {
      enablePreloading: !slowNetwork && !lowEndDevice,
      overscanCount: lowEndDevice ? 1 : PERFORMANCE_CONFIG.VIRTUALIZATION.OVERSCAN_COUNT,
      cacheSize: lowEndDevice 
        ? Math.round(PERFORMANCE_CONFIG.MEDIA.CACHE_MAX_SIZE_BYTES * 0.5) 
        : PERFORMANCE_CONFIG.MEDIA.CACHE_MAX_SIZE_BYTES,
      concurrentProcessing: lowEndDevice ? 1 : PERFORMANCE_CONFIG.MEDIA.CONCURRENT_PROCESSING,
      enableAnimations: !lowEndDevice,
      imageQuality: slowNetwork ? 'low' : 'high'
    }
  }
}

// Performance-aware component wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = React.forwardRef<any, P & { enablePerformanceMonitoring?: boolean }>((props, ref) => {
    const { enablePerformanceMonitoring = PERFORMANCE_CONFIG.MONITORING.ENABLED, ...restProps } = props

    const onRender = useCallback((
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (!enablePerformanceMonitoring) return

      if (actualDuration > PERFORMANCE_CONFIG.COMPONENT_RENDER_WARNING_MS) {
        console.warn(`[PERFORMANCE] Slow render in ${componentName}:`, {
          phase,
          actualDuration: Math.round(actualDuration),
          baseDuration: Math.round(baseDuration),
          timestamp: new Date().toISOString()
        })
      }
    }, [enablePerformanceMonitoring])

    if (enablePerformanceMonitoring && PERFORMANCE_CONFIG.MONITORING.REACT_PROFILER_ENABLED) {
      return (
        <React.Profiler id={componentName} onRender={onRender}>
          <Component ref={ref} {...(restProps as P)} />
        </React.Profiler>
      )
    }

    return <Component ref={ref} {...(restProps as P)} />
  })

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`
  return WrappedComponent
}

// Hook for performance-aware rendering
export const usePerformanceAwareRendering = (componentName: string) => {
  const [renderCount, setRenderCount] = useState(0)
  const renderTimesRef = useRef<number[]>([])

  const trackRender = useCallback(() => {
    const renderTime = performance.now()
    setRenderCount(prev => prev + 1)
    
    renderTimesRef.current.push(renderTime)
    
    // Keep only last 10 render times
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift()
    }

    // Check for excessive re-renders
    if (renderCount > PERFORMANCE_CONFIG.MAX_RERENDERS_WARNING) {
      console.warn(`[PERFORMANCE] Excessive re-renders in ${componentName}:`, {
        count: renderCount,
        recentRenderTimes: renderTimesRef.current.slice(-5)
      })
    }
  }, [componentName, renderCount])

  // Calculate average render frequency
  const averageRenderInterval = useMemo(() => {
    if (renderTimesRef.current.length < 2) return 0
    
    const intervals = []
    for (let i = 1; i < renderTimesRef.current.length; i++) {
      intervals.push(renderTimesRef.current[i] - renderTimesRef.current[i - 1])
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }, [renderCount])

  useEffect(() => {
    trackRender()
  })

  return {
    renderCount,
    averageRenderInterval,
    isRenderingTooFrequently: averageRenderInterval < 100 && renderCount > 5 // More than once per 100ms
  }
}
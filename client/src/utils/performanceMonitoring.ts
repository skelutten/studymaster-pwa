/**
 * Performance Monitoring Utilities for StudyMaster PWA
 * Implements Core Web Vitals tracking and React performance monitoring
 */

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
  delta?: number
  timestamp: number
}

interface MediaPerformanceMetrics {
  loadTime: number
  size: number
  type: string
  cached: boolean
  error?: string
}

interface ComponentPerformanceMetrics {
  componentName: string
  renderTime: number
  phase: 'mount' | 'update'
  propsChanged: string[]
  reRenderCount: number
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetric> = new Map()
  private mediaMetrics: Map<string, MediaPerformanceMetrics> = new Map()
  private componentMetrics: Map<string, ComponentPerformanceMetrics> = new Map()
  private isEnabled: boolean = false

  private constructor() {
    this.isEnabled = import.meta.env.VITE_MEDIA_PERFORMANCE_MONITORING === 'true' || 
                     process.env.NODE_ENV === 'development'
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  async initializeCoreWebVitals(): Promise<void> {
    if (!this.isEnabled) return

    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')

      const sendToAnalytics = (metric: any) => {
        this.recordMetric({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          delta: metric.delta,
          timestamp: Date.now()
        })

        // Log to console for development
        console.log(`[WEB_VITALS] ${metric.name}:`, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          rating: metric.rating,
          delta: metric.delta
        })
      }

      getCLS(sendToAnalytics)
      getFID(sendToAnalytics)
      getFCP(sendToAnalytics)
      getLCP(sendToAnalytics)
      getTTFB(sendToAnalytics)

      console.log('[PERFORMANCE] Core Web Vitals monitoring initialized')
    } catch (error) {
      console.warn('[PERFORMANCE] Failed to initialize Core Web Vitals:', error)
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return

    this.metrics.set(metric.id, metric)

    // Alert on poor performance
    if (metric.rating === 'poor') {
      console.warn(`[PERFORMANCE] Poor ${metric.name} detected:`, metric.value)
    }
  }

  /**
   * Track media loading performance
   */
  trackMediaPerformance(filename: string, metrics: MediaPerformanceMetrics): void {
    if (!this.isEnabled) return

    this.mediaMetrics.set(filename, {
      ...metrics,
      timestamp: Date.now()
    } as any)

    // Log slow media loading
    if (metrics.loadTime > 1000) {
      console.warn(`[PERFORMANCE] Slow media loading: ${filename}`, {
        loadTime: Math.round(metrics.loadTime),
        size: Math.round(metrics.size / 1024),
        cached: metrics.cached
      })
    }
  }

  /**
   * Track React component performance
   */
  trackComponentRender(
    componentName: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    propsChanged: string[] = []
  ): void {
    if (!this.isEnabled) return

    const existing = this.componentMetrics.get(componentName)
    const reRenderCount = existing ? existing.reRenderCount + 1 : 1

    this.componentMetrics.set(componentName, {
      componentName,
      renderTime: actualDuration,
      phase,
      propsChanged,
      reRenderCount
    })

    // Alert on slow renders
    if (actualDuration > 16) {
      console.warn(`[PERFORMANCE] Slow ${componentName} render:`, {
        renderTime: Math.round(actualDuration),
        phase,
        reRenderCount,
        propsChanged
      })
    }

    // Alert on excessive re-renders
    if (reRenderCount > 10) {
      console.warn(`[PERFORMANCE] Excessive re-renders in ${componentName}:`, {
        count: reRenderCount,
        lastPropsChanged: propsChanged
      })
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    coreWebVitals: PerformanceMetric[]
    mediaMetrics: { filename: string; metrics: MediaPerformanceMetrics }[]
    componentMetrics: ComponentPerformanceMetrics[]
    recommendations: string[]
  } {
    const recommendations: string[] = []

    // Check Core Web Vitals
    const lcp = this.metrics.get('LCP')
    const fid = this.metrics.get('FID')
    const cls = this.metrics.get('CLS')

    if (lcp && lcp.value > 2500) {
      recommendations.push(`LCP is ${Math.round(lcp.value)}ms - optimize largest contentful paint`)
    }
    if (fid && fid.value > 100) {
      recommendations.push(`FID is ${Math.round(fid.value)}ms - reduce input delay`)
    }
    if (cls && cls.value > 0.1) {
      recommendations.push(`CLS is ${cls.value.toFixed(3)} - reduce layout shifts`)
    }

    // Check media performance
    const slowMedia = Array.from(this.mediaMetrics.entries()).filter(
      ([_, metrics]) => metrics.loadTime > 1000
    )
    if (slowMedia.length > 0) {
      recommendations.push(`${slowMedia.length} media files loading slowly - consider optimization`)
    }

    // Check component performance
    const slowComponents = Array.from(this.componentMetrics.values()).filter(
      metrics => metrics.renderTime > 16
    )
    if (slowComponents.length > 0) {
      recommendations.push(`${slowComponents.length} components rendering slowly - consider memoization`)
    }

    return {
      coreWebVitals: Array.from(this.metrics.values()),
      mediaMetrics: Array.from(this.mediaMetrics.entries()).map(([filename, metrics]) => ({
        filename,
        metrics
      })),
      componentMetrics: Array.from(this.componentMetrics.values()),
      recommendations
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.mediaMetrics.clear()
    this.componentMetrics.clear()
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary()
    }, null, 2)
  }
}

// React hook for component performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance()

  const trackRender = useCallback((
    phase: 'mount' | 'update',
    actualDuration: number,
    propsChanged: string[] = []
  ) => {
    monitor.trackComponentRender(componentName, phase, actualDuration, propsChanged)
  }, [componentName, monitor])

  const trackMediaLoad = useCallback((filename: string, metrics: MediaPerformanceMetrics) => {
    monitor.trackMediaPerformance(filename, metrics)
  }, [monitor])

  return { trackRender, trackMediaLoad }
}

// React hook for memory monitoring
export const useMemoryMonitoring = (componentName: string) => {
  useEffect(() => {
    if (!performance.memory) return
    
    const logMemory = () => {
      const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2)
      const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
      
      console.log(`[MEMORY] ${componentName}:`, {
        used: `${used}MB`,
        total: `${total}MB`,
        timestamp: new Date().toISOString()
      })
    }
    
    const interval = setInterval(logMemory, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [componentName])
}

// Bundle size monitoring utility
export const checkBundleSize = async (): Promise<{
  totalSize: number
  chunks: Array<{ name: string; size: number }>
  recommendations: string[]
}> => {
  const recommendations: string[] = []
  
  try {
    // In a real implementation, this would parse the build manifest
    // For now, we'll use a placeholder
    const totalSize = 1024 * 1024 * 2 // 2MB placeholder
    const chunks = [
      { name: 'react-vendor', size: 512 * 1024 },
      { name: 'components', size: 256 * 1024 },
      { name: 'main', size: 128 * 1024 }
    ]

    if (totalSize > 1024 * 1024 * 3) { // 3MB
      recommendations.push('Total bundle size exceeds 3MB - implement more aggressive code splitting')
    }

    const largeChunks = chunks.filter(chunk => chunk.size > 1024 * 1024)
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`)
    }

    return { totalSize, chunks, recommendations }
  } catch (error) {
    console.error('[BUNDLE_SIZE] Failed to analyze bundle:', error)
    return { totalSize: 0, chunks: [], recommendations: ['Failed to analyze bundle size'] }
  }
}

export default PerformanceMonitor.getInstance()
/**
 * Optimized MediaContext Service with Performance Monitoring
 * Handles media URL resolution with minimal React re-renders
 */

/** Client-only build: PocketBase dependency removed */
import { debugLogger } from '../../utils/debugLogger'
import PerformanceMonitor from '../../utils/performanceMonitoring'

export interface MediaUrlMapping {
  originalFilename: string
  storedUrl: string
  secureUrl: string
  mediaId: string
  mimeType: string
  mediaType: 'image' | 'audio' | 'video'
  cached: boolean
  offlineAvailable: boolean
  accessCount: number
  lastAccessed: Date
  optimized?: boolean
  originalSize?: number
  optimizedSize?: number
}

export interface MediaContextConfig {
  enableOfflineCache: boolean
  enablePreloading: boolean
  maxCacheSize: number
  urlTtlMinutes: number
  enableAnalytics: boolean
  batchSize: number
  concurrentProcessing: number
}

export class OptimizedMediaContextService {
  private urlMappings = new Map<string, Map<string, MediaUrlMapping>>()
  private cache = new Map<string, string>() // filename -> resolved HTML cache
  private config: MediaContextConfig
  // In client-only build, PerformanceMonitor is a default-exported singleton-like object
  private performanceMonitor = PerformanceMonitor
  
  // Batch processing queue to prevent overwhelming the system
  private processingQueue = new Map<string, Promise<string>>()
  private maxConcurrentProcessing: number

  constructor(config: Partial<MediaContextConfig> = {}) {
    this.config = {
      enableOfflineCache: true,
      enablePreloading: false, // Disabled by default for performance
      maxCacheSize: 50, // Reduced from 100MB to 50MB
      urlTtlMinutes: 60,
      enableAnalytics: true,
      batchSize: 5, // Process 5 media files at a time
      concurrentProcessing: 2, // Limit concurrent operations
      ...config
    }
    this.maxConcurrentProcessing = this.config.concurrentProcessing
  }

  /**
   * Build URL mappings with optimized batch processing
   */
  async buildMappingsFromImport(
    deckId: string,
    mediaFiles: any[],
    userId: string
  ): Promise<void> {
    const startTime = performance.now()
    
    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Building media mappings with batch processing', { 
      deckId, 
      mediaCount: mediaFiles.length,
      batchSize: this.config.batchSize
    })

    const deckMappings = new Map<string, MediaUrlMapping>()

    // Process in batches to prevent memory spikes
    for (let i = 0; i < mediaFiles.length; i += this.config.batchSize) {
      const batch = mediaFiles.slice(i, i + this.config.batchSize)
      
      const batchPromises = batch.map(async (mediaFile) => {
        try {
          const mapping: MediaUrlMapping = {
            originalFilename: mediaFile.originalFilename,
            storedUrl: this.getDirectMediaUrl(mediaFile),
            secureUrl: this.getDirectMediaUrl(mediaFile), // Simplified for now
            mediaId: mediaFile.id,
            mimeType: mediaFile.mimeType,
            mediaType: this.getMediaType(mediaFile.mimeType),
            cached: false,
            offlineAvailable: false,
            accessCount: 0,
            lastAccessed: new Date(),
            optimized: mediaFile.optimization_applied || false,
            originalSize: mediaFile.original_size || 0,
            optimizedSize: mediaFile.processed_size || 0
          }

          return { filename: mediaFile.originalFilename, mapping }
        } catch (error) {
          debugLogger.error('[MEDIA_CONTEXT_OPT]', 'Failed to process media file', {
            filename: mediaFile.originalFilename,
            error
          })
          return null
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { filename, mapping } = result.value
          deckMappings.set(filename, mapping)
        }
      })

      // Yield control between batches
      if (i + this.config.batchSize < mediaFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    this.urlMappings.set(deckId, deckMappings)

    const processingTime = performance.now() - startTime
    this.performanceMonitor.trackComponentRender(
      'MediaContextService',
      'mount',
      processingTime,
      ['mappingsBuild']
    )

    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Media mappings built successfully', {
      deckId,
      mappingsCreated: deckMappings.size,
      processingTime: Math.round(processingTime)
    })
  }

  /**
   * Optimized media reference resolution with caching and batching
   */
  async resolveMediaReferences(htmlContent: string, deckId: string, userId: string): Promise<string> {
    if (!htmlContent || htmlContent.length === 0) return htmlContent

    const cacheKey = `${deckId}:${this.hashString(htmlContent)}`
    
    // Return cached result if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Check if already being processed to avoid duplicate work
    if (this.processingQueue.has(cacheKey)) {
      return this.processingQueue.get(cacheKey)!
    }

    // Start processing
    const processingPromise = this.processMediaReferences(htmlContent, deckId, userId, cacheKey)
    this.processingQueue.set(cacheKey, processingPromise)

    try {
      const result = await processingPromise
      return result
    } finally {
      this.processingQueue.delete(cacheKey)
    }
  }

  private async processMediaReferences(
    htmlContent: string, 
    deckId: string, 
    userId: string,
    cacheKey: string
  ): Promise<string> {
    const startTime = performance.now()
    
    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) {
      // Normal for text-only decks - return original HTML
      return htmlContent
    }

    let resolvedHtml = htmlContent

    // Process images asynchronously; audio/video handled synchronously below
    const imageProcessed = await this.replaceImageReferences(resolvedHtml, deckMappings)

    // Apply changes sequentially to avoid conflicts
    resolvedHtml = imageProcessed
    resolvedHtml = this.replaceAudioReferencesInHtml(resolvedHtml, deckMappings)
    resolvedHtml = this.replaceVideoReferencesInHtml(resolvedHtml, deckMappings)

    // Cache the result (with size limit)
    if (this.cache.size < 100) { // Limit cache size
      this.cache.set(cacheKey, resolvedHtml)
    } else {
      // Clear oldest entries if cache is full
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
        this.cache.set(cacheKey, resolvedHtml)
      }
    }

    const processingTime = performance.now() - startTime
    this.performanceMonitor.trackComponentRender(
      'MediaContextService',
      'update',
      processingTime,
      ['mediaResolution']
    )

    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Media resolution completed', {
      deckId,
      processingTime: Math.round(processingTime),
      cacheKey,
      originalLength: htmlContent.length,
      resolvedLength: resolvedHtml.length
    })

    return resolvedHtml
  }

  /**
   * Optimized image reference replacement
   */
  private async replaceImageReferences(
    html: string, 
    mappings: Map<string, MediaUrlMapping>
  ): Promise<string> {
    const imgPattern = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    
    return html.replace(imgPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        this.trackMediaAccess(mapping)
        
        // Enhanced img tag with progressive loading
        return match
          .replace(filename, mapping.secureUrl)
          .replace('<img', `<img loading="lazy" data-media-id="${mapping.mediaId}" data-original-filename="${filename}"`)
      }
      
      debugLogger.warn('[MEDIA_CONTEXT_OPT]', 'Image reference not found', { filename })
      return `<div class="missing-media" data-missing="${filename}">Missing image: ${filename}</div>`
    })
  }

  /**
   * Optimized audio reference replacement
   */
  private replaceAudioReferencesInHtml(
    html: string,
    mappings: Map<string, MediaUrlMapping>
  ): string {
    const audioPattern = /\[sound:([^\]]+)\]/gi
    
    return html.replace(audioPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        this.trackMediaAccess(mapping)
        
        return `<audio controls preload="none" data-media-id="${mapping.mediaId}" data-original-filename="${filename}">
                  <source src="${mapping.secureUrl}" type="${mapping.mimeType}">
                  <div class="missing-media">Your browser does not support audio playback.</div>
                </audio>`
      }
      
      debugLogger.warn('[MEDIA_CONTEXT_OPT]', 'Audio reference not found', { filename })
      return `<div class="missing-media" data-missing="${filename}">Missing audio: ${filename}</div>`
    })
  }

  /**
   * Optimized video reference replacement
   */
  private replaceVideoReferencesInHtml(
    html: string,
    mappings: Map<string, MediaUrlMapping>
  ): string {
    const videoPattern = /<video\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    
    return html.replace(videoPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        this.trackMediaAccess(mapping)
        
        return match
          .replace(filename, mapping.secureUrl)
          .replace('<video', `<video preload="metadata" data-media-id="${mapping.mediaId}" data-original-filename="${filename}"`)
      }
      
      debugLogger.warn('[MEDIA_CONTEXT_OPT]', 'Video reference not found', { filename })
      return `<div class="missing-media" data-missing="${filename}">Missing video: ${filename}</div>`
    })
  }

  /**
   * Non-blocking media access tracking
   */
  private trackMediaAccess(mapping: MediaUrlMapping): void {
    if (!this.config.enableAnalytics) return

    // Update in-memory immediately for responsiveness
    mapping.accessCount++
    mapping.lastAccessed = new Date()

    // Update database asynchronously without blocking
    this.updateMediaAccessStatsAsync(mapping)
  }

  /**
   * Async database update that doesn't block UI
   */
  private updateMediaAccessStatsAsync(mapping: MediaUrlMapping): void {
    // Client-only mode: persist lightweight analytics in a later phase (IndexedDB).
    // Non-blocking log for visibility during tests.
    setTimeout(() => {
      try {
        debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Access stats updated (in-memory only)', {
          mediaId: mapping.mediaId,
          accessCount: mapping.accessCount,
          lastAccessed: mapping.lastAccessed.toISOString()
        })
      } catch {
        // ignore
      }
    }, 0)
  }

  /**
   * Get media URL with minimal async overhead
   */
  getMediaUrlSync(originalFilename: string, deckId: string): string | null {
    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return null

    const mapping = deckMappings.get(originalFilename)
    if (!mapping) return null

    // Track access without async overhead
    mapping.accessCount++
    mapping.lastAccessed = new Date()

    return mapping.secureUrl
  }

  /**
   * Preload critical media with intelligent prioritization
   */
  async preloadCriticalMedia(deckId: string, maxPreloads: number = 5): Promise<void> {
    if (!this.config.enablePreloading) return

    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return

    const mappings = Array.from(deckMappings.values())
    
    // Prioritize: small images first, then audio, skip video
    const prioritizedMedia = mappings
      .filter(m => 
        m.mediaType === 'image' && 
        (m.originalSize || 0) < 500_000 && // Only preload images < 500KB
        !m.cached
      )
      .sort((a, b) => (a.originalSize || 0) - (b.originalSize || 0))
      .slice(0, maxPreloads)

    if (prioritizedMedia.length === 0) return

    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Starting critical media preload', {
      deckId,
      count: prioritizedMedia.length
    })

    // Preload in small batches to avoid overwhelming network
    const batchSize = 2
    for (let i = 0; i < prioritizedMedia.length; i += batchSize) {
      const batch = prioritizedMedia.slice(i, i + batchSize)
      
      const preloadPromises = batch.map(async (mapping) => {
        const startTime = performance.now()
        
        try {
          const response = await fetch(mapping.secureUrl, { 
            method: 'HEAD' // Just check if accessible, don't download
          })
          
          if (response.ok) {
            mapping.cached = true
            const loadTime = performance.now() - startTime
            
            this.performanceMonitor.trackMediaPerformance(mapping.originalFilename, {
              loadTime,
              size: mapping.originalSize || 0,
              type: mapping.mediaType,
              cached: true
            })
            
            debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Media preload successful', { 
              filename: mapping.originalFilename,
              loadTime: Math.round(loadTime)
            })
          }
        } catch (error) {
          debugLogger.warn('[MEDIA_CONTEXT_OPT]', 'Media preload failed', { 
            filename: mapping.originalFilename,
            error 
          })
        }
      })

      await Promise.allSettled(preloadPromises)

      // Small delay between batches
      if (i + batchSize < prioritizedMedia.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Cleanup with memory optimization
   */
  async cleanupDeckMedia(deckId: string): Promise<void> {
    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Cleaning up deck media', { deckId })

    // Clear in-memory caches first
    this.urlMappings.delete(deckId)
    
    // Clear related cache entries
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${deckId}:`))
    keysToDelete.forEach(key => this.cache.delete(key))

    // Database cleanup (async, non-blocking)
    this.cleanupDeckMediaAsync(deckId)
  }

  private cleanupDeckMediaAsync(deckId: string): void {
    // Client-only: media blobs are stored in IndexedDB and cleaned up by higher-level storage routines.
    // Keep async shape for compatibility and log for diagnostics.
    setTimeout(() => {
      debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Deck media cleanup skipped (client-only mode)', { deckId })
    }, 0)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(deckId: string): {
    mappingsCount: number
    cacheSize: number
    averageAccessCount: number
    processingQueueSize: number
    recommendations: string[]
  } {
    const deckMappings = this.urlMappings.get(deckId)
    const mappingsCount = deckMappings?.size || 0
    const cacheSize = this.cache.size
    const processingQueueSize = this.processingQueue.size
    
    const recommendations: string[] = []

    if (cacheSize > 50) {
      recommendations.push('Cache size is large - consider clearing old entries')
    }

    if (processingQueueSize > 10) {
      recommendations.push('High processing queue - consider reducing concurrent operations')
    }

    let averageAccessCount = 0
    if (deckMappings) {
      const mappings = Array.from(deckMappings.values())
      averageAccessCount = mappings.reduce((sum, m) => sum + m.accessCount, 0) / mappings.length
    }

    return {
      mappingsCount,
      cacheSize,
      averageAccessCount: Math.round(averageAccessCount * 100) / 100,
      processingQueueSize,
      recommendations
    }
  }

  /**
   * Clear caches to free memory
   */
  clearCaches(): void {
    this.cache.clear()
    this.processingQueue.clear()
    debugLogger.info('[MEDIA_CONTEXT_OPT]', 'Caches cleared')
  }

  // Helper methods
  private getDirectMediaUrl(_mediaFile: any): string {
    // Client-only: object URLs are created asynchronously in the non-optimized service.
    // The optimized variant does not perform network URL resolution.
    return ''
  }

  private getMediaType(mimeType: string): 'image' | 'audio' | 'video' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    return 'image'
  }

  private hashString(str: string): string {
    let hash = 0
    if (str.length === 0) return hash.toString()
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString()
  }

  // Async methods for compatibility
  private replaceImageReferencesSync(html: string, mappings: Map<string, MediaUrlMapping>): string {
    const imgPattern = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    
    return html.replace(imgPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        this.trackMediaAccess(mapping)
        return match
          .replace(filename, mapping.secureUrl)
          .replace('<img', `<img loading="lazy" data-media-id="${mapping.mediaId}" data-original-filename="${filename}"`)
      }
      
      return `<div class="missing-media" data-missing="${filename}">Missing image: ${filename}</div>`
    })
  }
}

// Export singleton instance for consistent usage
export const mediaContextService = new OptimizedMediaContextService()
export default OptimizedMediaContextService
import { pb } from '../../lib/pocketbase'
import { debugLogger } from '../../utils/debugLogger'
import { MediaAuthService } from './MediaAuthService'

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
}

export interface MediaContextConfig {
  enableOfflineCache: boolean
  enablePreloading: boolean
  maxCacheSize: number // in MB
  urlTtlMinutes: number
  enableAnalytics: boolean
}

export class MediaContextService {
  private urlMappings = new Map<string, Map<string, MediaUrlMapping>>() // deckId -> filename -> mapping
  private authService = new MediaAuthService()
  private config: MediaContextConfig
  private cache = new Map<string, string>() // filename -> resolved HTML cache
  
  constructor(config: Partial<MediaContextConfig> = {}) {
    this.config = {
      enableOfflineCache: true,
      enablePreloading: true,
      maxCacheSize: 100, // 100MB default
      urlTtlMinutes: 60,
      enableAnalytics: true,
      ...config
    }
  }

  /**
   * Build URL mappings from imported media files
   */
  async buildMappingsFromImport(
    deckId: string,
    mediaFiles: any[],
    userId: string
  ): Promise<void> {
    debugLogger.info('[MEDIA_CONTEXT]', 'Building media mappings', { 
      deckId, 
      mediaCount: mediaFiles.length 
    })

    const deckMappings = new Map<string, MediaUrlMapping>()

    for (const mediaFile of mediaFiles) {
      try {
        // Generate secure, time-limited URL
        const secureUrl = await this.authService.generateSecureMediaUrl(
          mediaFile.id, 
          userId, 
          this.config.urlTtlMinutes
        )

        const mapping: MediaUrlMapping = {
          originalFilename: mediaFile.originalFilename,
          storedUrl: this.getDirectMediaUrl(mediaFile),
          secureUrl,
          mediaId: mediaFile.id,
          mimeType: mediaFile.mimeType,
          mediaType: this.getMediaType(mediaFile.mimeType),
          cached: false,
          offlineAvailable: false,
          accessCount: 0,
          lastAccessed: new Date()
        }

        deckMappings.set(mediaFile.originalFilename, mapping)
        
        // Preload critical media if enabled
        if (this.config.enablePreloading && this.isCriticalMedia(mediaFile)) {
          this.preloadMedia(mapping).catch(error => 
            debugLogger.warn('[MEDIA_CONTEXT]', 'Preload failed', { 
              filename: mediaFile.originalFilename, 
              error 
            })
          )
        }

      } catch (error) {
        debugLogger.error('[MEDIA_CONTEXT]', 'Failed to process media file', {
          filename: mediaFile.originalFilename,
          error
        })
      }
    }

    this.urlMappings.set(deckId, deckMappings)

    debugLogger.info('[MEDIA_CONTEXT]', 'Media mappings built successfully', {
      deckId,
      mappingsCreated: deckMappings.size
    })
  }

  /**
   * Resolve media references in HTML content
   */
  async resolveMediaReferences(htmlContent: string, deckId: string, userId: string): Promise<string> {
    // Check cache first
    const cacheKey = `${deckId}:${this.generateContentHash(htmlContent)}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) {
      debugLogger.warn('[MEDIA_CONTEXT]', 'No media mappings found for deck', { deckId })
      return htmlContent
    }

    let resolvedHtml = htmlContent

    // Replace image references
    resolvedHtml = await this.replaceImageReferences(resolvedHtml, deckMappings, userId)
    
    // Replace audio references (Anki [sound:filename] format)
    resolvedHtml = await this.replaceAudioReferences(resolvedHtml, deckMappings, userId)
    
    // Replace video references
    resolvedHtml = await this.replaceVideoReferences(resolvedHtml, deckMappings, userId)

    // Cache the result with size limits and LRU behavior
    if (this.cache.size < 100) {
      this.cache.set(cacheKey, resolvedHtml)
    } else {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
        this.cache.set(cacheKey, resolvedHtml)
      }
    }

    return resolvedHtml
  }

  private async replaceImageReferences(
    html: string, 
    mappings: Map<string, MediaUrlMapping>,
    userId: string
  ): Promise<string> {
    // Match <img src="filename.ext"> patterns
    const imgPattern = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    
    return html.replace(imgPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        // Update access tracking
        this.trackMediaAccess(mapping)
        
        // Return enhanced img tag with secure URL and fallback handling
        return match.replace(filename, mapping.secureUrl)
          .replace('<img', `<img data-media-id="${mapping.mediaId}" data-original-filename="${filename}" loading="lazy"`)
      }
      
      // Log missing media reference
      debugLogger.warn('[MEDIA_CONTEXT]', 'Image reference not found', { filename })
      return `<div class="missing-media" style="padding: 8px; background: #f0f0f0; border: 1px dashed #ccc; text-align: center;">Missing image: ${filename}</div>`
    })
  }

  private async replaceAudioReferences(
    html: string,
    mappings: Map<string, MediaUrlMapping>,
    userId: string
  ): Promise<string> {
    // Match [sound:filename.ext] Anki audio format
    const audioPattern = /\[sound:([^\]]+)\]/gi
    
    return html.replace(audioPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        // Update access tracking
        this.trackMediaAccess(mapping)
        
        // Return HTML5 audio element with enhanced controls
        return `<div class="anki-audio-container" style="margin: 8px 0;">
                  <audio controls preload="none" data-media-id="${mapping.mediaId}" data-original-filename="${filename}" style="width: 100%; max-width: 300px;">
                    <source src="${mapping.secureUrl}" type="${mapping.mimeType}">
                    Your browser does not support the audio element.
                  </audio>
                  <div class="audio-filename" style="font-size: 12px; color: #666; margin-top: 2px;">${filename}</div>
                </div>`
      }
      
      debugLogger.warn('[MEDIA_CONTEXT]', 'Audio reference not found', { filename })
      return `<div class="missing-media" style="padding: 8px; background: #fff3cd; border: 1px dashed #ffc107; text-align: center;">Missing audio: ${filename}</div>`
    })
  }

  private async replaceVideoReferences(
    html: string,
    mappings: Map<string, MediaUrlMapping>,
    userId: string
  ): Promise<string> {
    // Match <video src="filename.ext"> or similar patterns
    const videoPattern = /<video\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    
    return html.replace(videoPattern, (match, filename) => {
      const mapping = mappings.get(filename)
      if (mapping) {
        this.trackMediaAccess(mapping)
        
        return match.replace(filename, mapping.secureUrl)
          .replace('<video', `<video data-media-id="${mapping.mediaId}" data-original-filename="${filename}" preload="metadata"`)
      }
      
      debugLogger.warn('[MEDIA_CONTEXT]', 'Video reference not found', { filename })
      return `<div class="missing-media" style="padding: 8px; background: #f8d7da; border: 1px dashed #dc3545; text-align: center;">Missing video: ${filename}</div>`
    })
  }

  private trackMediaAccess(mapping: MediaUrlMapping): void {
    if (!this.config.enableAnalytics) return

    mapping.accessCount++
    mapping.lastAccessed = new Date()

    // Async update to database (don't block rendering)
    this.updateMediaAccessStatsAsync(mapping)
  }

  private updateMediaAccessStatsAsync(mapping: MediaUrlMapping): void {
    setTimeout(async () => {
      try {
        await pb.collection('media_files').update(mapping.mediaId, {
          access_count: mapping.accessCount,
          last_accessed: mapping.lastAccessed.toISOString()
        })
      } catch (error) {
        debugLogger.warn('[MEDIA_CONTEXT]', 'Access stats update failed', { 
          mediaId: mapping.mediaId, 
          error 
        })
      }
    }, 0)
  }

  private getDirectMediaUrl(mediaFile: any): string {
    return pb.files.getUrl(mediaFile, mediaFile.media_file)
  }

  private getMediaType(mimeType: string): 'image' | 'audio' | 'video' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    return 'image' // fallback
  }

  private isCriticalMedia(mediaFile: any): boolean {
    // Define criteria for critical media (images < 100KB, audio < 1MB)
    return mediaFile.processedSize < (mediaFile.mediaType === 'image' ? 100_000 : 1_000_000)
  }

  private async preloadMedia(mapping: MediaUrlMapping): Promise<void> {
    try {
      const response = await fetch(mapping.secureUrl)
      if (response.ok) {
        mapping.cached = true
        debugLogger.info('[MEDIA_CONTEXT]', 'Media preloaded successfully', { 
          filename: mapping.originalFilename 
        })
      }
    } catch (error) {
      debugLogger.warn('[MEDIA_CONTEXT]', 'Media preload failed', { 
        filename: mapping.originalFilename,
        error 
      })
    }
  }

  private generateContentHash(content: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get specific media URL with access validation
   */
  async getMediaUrl(originalFilename: string, deckId: string, userId: string): Promise<string | null> {
    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return null

    const mapping = deckMappings.get(originalFilename)
    if (!mapping) return null

    // Validate access permissions
    const hasAccess = await this.authService.validateMediaAccess(
      mapping.mediaId, 
      userId, 
      deckId
    )
    
    if (!hasAccess) {
      debugLogger.warn('[MEDIA_CONTEXT]', 'Unauthorized media access attempt', {
        filename: originalFilename,
        deckId,
        userId
      })
      return null
    }

    this.trackMediaAccess(mapping)
    return mapping.secureUrl
  }

  /**
   * Clean up media mappings when deck is deleted
   */
  async cleanupDeckMedia(deckId: string): Promise<void> {
    debugLogger.info('[MEDIA_CONTEXT]', 'Cleaning up deck media', { deckId })

    const deckMappings = this.urlMappings.get(deckId)
    if (deckMappings) {
      // Remove from memory
      this.urlMappings.delete(deckId)
      
      // Clean up database entries
      try {
        const mediaFiles = await pb.collection('media_files').getFullList({
          filter: `deck_id = "${deckId}"`
        })
        
        await Promise.all(
          mediaFiles.map(file => pb.collection('media_files').delete(file.id))
        )
        
        debugLogger.info('[MEDIA_CONTEXT]', 'Deck media cleanup completed', { 
          deckId, 
          filesDeleted: mediaFiles.length 
        })
      } catch (error) {
        debugLogger.error('[MEDIA_CONTEXT]', 'Deck media cleanup failed', { deckId, error })
      }
    }

    // Clean up cache entries for this deck
    const cacheKeysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${deckId}:`)) {
        cacheKeysToDelete.push(key)
      }
    }
    
    cacheKeysToDelete.forEach(key => this.cache.delete(key))
    
    debugLogger.info('[MEDIA_CONTEXT]', 'Cache cleanup completed', {
      deckId,
      cacheEntriesDeleted: cacheKeysToDelete.length
    })
  }

  /**
   * Get media usage statistics
   */
  getDeckMediaStats(deckId: string): {
    totalMedia: number
    cachedMedia: number
    totalAccesses: number
    mostAccessedMedia: string[]
  } | null {
    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return null

    const mappings = Array.from(deckMappings.values())
    
    return {
      totalMedia: mappings.length,
      cachedMedia: mappings.filter(m => m.cached).length,
      totalAccesses: mappings.reduce((sum, m) => sum + m.accessCount, 0),
      mostAccessedMedia: mappings
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 5)
        .map(m => m.originalFilename)
    }
  }

  /**
   * Refresh expired URLs for a deck
   */
  async refreshExpiredUrls(deckId: string, userId: string): Promise<void> {
    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return

    debugLogger.info('[MEDIA_CONTEXT]', 'Refreshing expired URLs', { deckId })

    let refreshedCount = 0
    for (const [filename, mapping] of deckMappings.entries()) {
      try {
        // Check if URL is still valid (simplified check)
        const urlValid = await this.authService.validateSecureMediaUrl(mapping.secureUrl, userId)
        
        if (!urlValid) {
          // Regenerate secure URL
          const newSecureUrl = await this.authService.generateSecureMediaUrl(
            mapping.mediaId,
            userId,
            this.config.urlTtlMinutes
          )
          
          mapping.secureUrl = newSecureUrl
          refreshedCount++
        }
      } catch (error) {
        debugLogger.warn('[MEDIA_CONTEXT]', 'Failed to refresh URL', {
          filename,
          error
        })
      }
    }

    // Clear cache to force regeneration of HTML with new URLs
    const cacheKeysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${deckId}:`)) {
        cacheKeysToDelete.push(key)
      }
    }
    cacheKeysToDelete.forEach(key => this.cache.delete(key))

    debugLogger.info('[MEDIA_CONTEXT]', 'URL refresh completed', {
      deckId,
      urlsRefreshed: refreshedCount,
      cacheCleared: cacheKeysToDelete.length
    })
  }

  /**
   * Preload media for upcoming cards
   */
  async preloadDeckMedia(deckId: string, priorityFilenames: string[] = []): Promise<void> {
    if (!this.config.enablePreloading) return

    const deckMappings = this.urlMappings.get(deckId)
    if (!deckMappings) return

    debugLogger.info('[MEDIA_CONTEXT]', 'Starting deck media preload', { 
      deckId, 
      priorityCount: priorityFilenames.length,
      totalMedia: deckMappings.size
    })

    // Preload priority files first
    for (const filename of priorityFilenames) {
      const mapping = deckMappings.get(filename)
      if (mapping && !mapping.cached) {
        await this.preloadMedia(mapping)
      }
    }

    // Then preload other critical media
    const otherMedia = Array.from(deckMappings.values())
      .filter(m => !m.cached && !priorityFilenames.includes(m.originalFilename))
      .filter(m => this.isCriticalMedia({ mediaType: m.mediaType, processedSize: 50000 }))
      .slice(0, 10) // Limit to 10 additional files

    for (const mapping of otherMedia) {
      await this.preloadMedia(mapping)
    }

    debugLogger.info('[MEDIA_CONTEXT]', 'Deck media preload completed', { deckId })
  }
}
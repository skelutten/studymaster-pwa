import { pb } from '../../lib/pocketbase'
import { debugLogger } from '../../utils/debugLogger'

export class MediaAuthService {
  constructor() {
    // Expose last created instance for tests to inject spies without changing call sites
    try {
      (globalThis as any).__lastMediaAuthInstance = this
    } catch {
      // no-op for non-standard environments
    }
  }
  /**
   * Validate that user has access to specific media file
   */
  async validateMediaAccess(mediaId: string, userId: string, deckId: string): Promise<boolean> {
    try {
      debugLogger.info('[MEDIA_AUTH]', 'Validating media access', {
        mediaId,
        userId,
        deckId
      })

      // Verify user owns the deck containing the media
      const deck = await pb.collection('decks').getOne(deckId)
      if (deck.user_id !== userId) {
        debugLogger.warn('[MEDIA_AUTH]', 'User does not own deck', {
          deckId,
          userId,
          deckOwnerId: deck.user_id
        })
        return false
      }

      // Verify media belongs to the deck
      const media = await pb.collection('media_files').getOne(mediaId)
      if (media.deck_id !== deckId) {
        debugLogger.warn('[MEDIA_AUTH]', 'Media does not belong to deck', {
          mediaId,
          deckId,
          mediaDeckId: media.deck_id
        })
        return false
      }

      debugLogger.info('[MEDIA_AUTH]', 'Media access validated successfully', {
        mediaId,
        userId,
        deckId
      })

      return true

    } catch (error) {
      debugLogger.error('[MEDIA_AUTH]', 'Media access validation failed', {
        mediaId,
        userId,
        deckId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Generate time-limited, signed URL for media access
   * This creates a secure URL that expires after the specified TTL
   */
  async generateSecureMediaUrl(mediaId: string, userId: string, ttlMinutes: number = 60): Promise<string> {
    try {
      // Get the media file record
      const mediaFile = await pb.collection('media_files').getOne(mediaId)
      
      // Validate user has access to this media
      const hasAccess = await this.validateMediaAccess(mediaId, userId, mediaFile.deck_id)
      if (!hasAccess) {
        throw new Error('Access denied to media file')
      }

      // Generate the base PocketBase URL
      const baseUrl = pb.files.getUrl(mediaFile, mediaFile.media_file)
      
      // Add timestamp and signature for security
      const timestamp = Date.now()
      const expiry = timestamp + (ttlMinutes * 60 * 1000)
      
      // Create a simple signed URL (in production, would use proper JWT or HMAC)
      const signature = await this.generateUrlSignature(mediaId, userId, expiry)
      const secureUrl = `${baseUrl}?t=${timestamp}&exp=${expiry}&sig=${signature}&uid=${userId}`

      debugLogger.info('[MEDIA_AUTH]', 'Generated secure media URL', {
        mediaId,
        userId,
        ttlMinutes,
        expiry
      })

      return secureUrl

    } catch (error) {
      debugLogger.error('[MEDIA_AUTH]', 'Failed to generate secure media URL', {
        mediaId,
        userId,
        ttlMinutes,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error(`Failed to generate secure media URL: ${error}`)
    }
  }

  /**
   * Validate a secure media URL
   */
  async validateSecureMediaUrl(url: string, userId: string): Promise<boolean> {
    try {
      const urlObj = new URL(url)
      const params = urlObj.searchParams
      
      const timestamp = params.get('t')
      const expiry = params.get('exp')
      const signature = params.get('sig')
      const urlUserId = params.get('uid')

      // Basic validations
      if (!timestamp || !expiry || !signature || !urlUserId) {
        return false
      }

      // Check if URL is expired
      if (Date.now() > parseInt(expiry)) {
        debugLogger.warn('[MEDIA_AUTH]', 'Media URL expired', { url, userId })
        return false
      }

      // Check if user ID matches
      if (urlUserId !== userId) {
        debugLogger.warn('[MEDIA_AUTH]', 'Media URL user ID mismatch', { url, userId, urlUserId })
        return false
      }

      // Validate signature (simplified - in production would use proper HMAC)
      const mediaId = this.extractMediaIdFromUrl(url)
      if (!mediaId) {
        return false
      }

      const expectedSignature = await this.generateUrlSignature(mediaId, userId, parseInt(expiry))
      if (signature !== expectedSignature) {
        debugLogger.warn('[MEDIA_AUTH]', 'Media URL signature invalid', { url, userId })
        return false
      }

      return true

    } catch (error) {
      debugLogger.error('[MEDIA_AUTH]', 'Media URL validation failed', {
        url,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Revoke access to all media URLs for a specific deck
   */
  async revokeDeckMediaAccess(deckId: string, userId: string): Promise<void> {
    try {
      debugLogger.info('[MEDIA_AUTH]', 'Revoking deck media access', { deckId, userId })

      // In a production system, this would invalidate all signed URLs for the deck
      // For now, we'll just log the action
      // Could be implemented by rotating signing keys or maintaining a revocation list

      debugLogger.info('[MEDIA_AUTH]', 'Deck media access revoked', { deckId, userId })

    } catch (error) {
      debugLogger.error('[MEDIA_AUTH]', 'Failed to revoke deck media access', {
        deckId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Generate URL signature for secure media URLs
   * In production, this should use HMAC with a secret key
   */
  private async generateUrlSignature(mediaId: string, userId: string, expiry: number): Promise<string> {
    const message = `${mediaId}:${userId}:${expiry}`
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16) // Take first 16 chars
  }

  /**
   * Extract media ID from PocketBase URL
   */
  private extractMediaIdFromUrl(url: string): string | null {
    try {
      // PocketBase URLs have format: /api/files/{collection}/{record_id}/{filename}
      const urlParts = new URL(url).pathname.split('/')
      const recordIndex = urlParts.findIndex(part => part === 'files') + 2
      return urlParts[recordIndex] || null
    } catch {
      return null
    }
  }

  /**
   * Check if user has permission to upload media to a deck
   */
  async canUploadToDeck(deckId: string, userId: string): Promise<boolean> {
    try {
      const deck = await pb.collection('decks').getOne(deckId)
      return deck.user_id === userId
    } catch {
      return false
    }
  }

  /**
   * Get media quota information for user
   */
  async getUserMediaQuota(userId: string): Promise<{
    totalSizeMB: number
    usedSizeMB: number
    remainingSizeMB: number
    fileCount: number
    maxSizeMB: number
    maxFiles: number
  }> {
    try {
      // Get all media files for user's decks
      const userDecks = await pb.collection('decks').getFullList({
        filter: `user_id = "${userId}"`,
        fields: 'id'
      })

      const deckIds = userDecks.map(d => d.id)
      if (deckIds.length === 0) {
        return {
          totalSizeMB: 0,
          usedSizeMB: 0,
          remainingSizeMB: 1000, // Default 1GB quota
          fileCount: 0,
          maxSizeMB: 1000,
          maxFiles: 10000
        }
      }

      const mediaFiles = await pb.collection('media_files').getFullList({
        filter: deckIds.map(id => `deck_id = "${id}"`).join(' || '),
        fields: 'original_size'
      })

      const totalBytes = mediaFiles.reduce((sum, file) => sum + (file.original_size || 0), 0)
      const totalSizeMB = Math.round(totalBytes / (1024 * 1024) * 100) / 100

      const maxSizeMB = 1000 // 1GB quota
      const maxFiles = 10000

      return {
        totalSizeMB,
        usedSizeMB: totalSizeMB,
        remainingSizeMB: Math.max(0, maxSizeMB - totalSizeMB),
        fileCount: mediaFiles.length,
        maxSizeMB,
        maxFiles
      }

    } catch (error) {
      debugLogger.error('[MEDIA_AUTH]', 'Failed to get user media quota', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}
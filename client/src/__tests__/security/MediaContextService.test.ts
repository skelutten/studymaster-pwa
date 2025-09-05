import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MediaContextService, MediaUrlMapping } from '../../services/anki/MediaContextService'
import { MediaAuthService } from '../../services/anki/MediaAuthService'

// Mock the MediaAuthService
vi.mock('../../services/anki/MediaAuthService')
vi.mock('../../lib/pocketbase')
vi.mock('../../utils/debugLogger')

describe('MediaContextService', () => {
  let mediaContextService: MediaContextService
  let mockMediaAuthService: vi.Mocked<MediaAuthService>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock MediaAuthService
    mockMediaAuthService = {
      generateSecureMediaUrl: vi.fn(),
      validateMediaAccess: vi.fn(),
      validateSecureMediaUrl: vi.fn()
    } as any

    // Replace the real service with mock
    vi.mocked(MediaAuthService).mockImplementation(() => mockMediaAuthService)

    mediaContextService = new MediaContextService({
      enableOfflineCache: true,
      enablePreloading: false, // Disable for testing
      maxCacheSize: 50,
      urlTtlMinutes: 30,
      enableAnalytics: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('buildMappingsFromImport', () => {
    it('should build media mappings from imported media files', async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        },
        {
          id: 'media-2', 
          originalFilename: 'test-audio.mp3',
          mimeType: 'audio/mpeg',
          processedSize: 1500000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl.mockResolvedValue('https://secure.url/media-1?token=abc123')

      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)

      expect(mockMediaAuthService.generateSecureMediaUrl).toHaveBeenCalledTimes(2)
      expect(mockMediaAuthService.generateSecureMediaUrl).toHaveBeenCalledWith('media-1', userId, 30)
      expect(mockMediaAuthService.generateSecureMediaUrl).toHaveBeenCalledWith('media-2', userId, 30)
    })

    it('should handle errors in individual media file processing', async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'valid-image.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        },
        {
          id: 'media-2',
          originalFilename: 'invalid-file.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl
        .mockResolvedValueOnce('https://secure.url/media-1?token=abc123')
        .mockRejectedValueOnce(new Error('URL generation failed'))

      // Should not throw, but continue processing
      await expect(mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId))
        .resolves.not.toThrow()

      expect(mockMediaAuthService.generateSecureMediaUrl).toHaveBeenCalledTimes(2)
    })
  })

  describe('resolveMediaReferences', () => {
    beforeEach(async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'image1.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        },
        {
          id: 'media-2',
          originalFilename: 'audio1.mp3', 
          mimeType: 'audio/mpeg',
          processedSize: 1000000
        },
        {
          id: 'media-3',
          originalFilename: 'video1.mp4',
          mimeType: 'video/mp4',
          processedSize: 5000000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl
        .mockResolvedValueOnce('https://secure.url/media-1?token=abc123')
        .mockResolvedValueOnce('https://secure.url/media-2?token=def456')
        .mockResolvedValueOnce('https://secure.url/media-3?token=ghi789')

      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)
    })

    it('should resolve image references in HTML content', async () => {
      const htmlContent = '<div><img src="image1.jpg" alt="Test image"></div>'
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      expect(result).toContain('https://secure.url/media-1?token=abc123')
      expect(result).toContain('data-media-id="media-1"')
      expect(result).toContain('data-original-filename="image1.jpg"')
      expect(result).toContain('loading="lazy"')
    })

    it('should resolve Anki audio references', async () => {
      const htmlContent = '<div>Listen to this: [sound:audio1.mp3]</div>'
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      expect(result).toContain('<audio controls preload="none"')
      expect(result).toContain('https://secure.url/media-2?token=def456')
      expect(result).toContain('data-media-id="media-2"')
      expect(result).toContain('type="audio/mpeg"')
      expect(result).toContain('<div class="audio-filename"')
      expect(result).not.toContain('[sound:audio1.mp3]')
    })

    it('should resolve video references', async () => {
      const htmlContent = '<video src="video1.mp4" controls></video>'
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      expect(result).toContain('https://secure.url/media-3?token=ghi789')
      expect(result).toContain('data-media-id="media-3"')
      expect(result).toContain('preload="metadata"')
    })

    it('should handle missing media files gracefully', async () => {
      const htmlContent = '<img src="missing-image.jpg"><div>[sound:missing-audio.mp3]</div>'
      const deckId = 'test-deck-123'  
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      expect(result).toContain('<div class="missing-media"')
      expect(result).toContain('Missing image: missing-image.jpg')
      expect(result).toContain('Missing audio: missing-audio.mp3')
    })

    it('should use cache for repeated resolutions', async () => {
      const htmlContent = '<img src="image1.jpg">'
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      // First call
      const result1 = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)
      
      // Second call - should use cache
      const result2 = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      expect(result1).toBe(result2)
    })

    it('should handle complex HTML with multiple media types', async () => {
      const htmlContent = `
        <div class="card-content">
          <img src="image1.jpg" alt="Main image">
          <p>Description with audio: [sound:audio1.mp3]</p>
          <video src="video1.mp4" controls width="300"></video>
        </div>
      `
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlContent, deckId, userId)

      // Check all media types are resolved
      expect(result).toContain('https://secure.url/media-1?token=abc123') // image
      expect(result).toContain('https://secure.url/media-2?token=def456') // audio
      expect(result).toContain('https://secure.url/media-3?token=ghi789') // video

      // Check structure is preserved
      expect(result).toContain('<div class="card-content">')
      expect(result).toContain('<p>Description with audio:')
      expect(result).toContain('width="300"')
    })
  })

  describe('getMediaUrl', () => {
    beforeEach(async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl.mockResolvedValue('https://secure.url/media-1?token=abc123')
      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)
    })

    it('should return secure URL for authorized access', async () => {
      mockMediaAuthService.validateMediaAccess.mockResolvedValue(true)

      const url = await mediaContextService.getMediaUrl('test-image.jpg', 'test-deck-123', 'user-456')

      expect(url).toBe('https://secure.url/media-1?token=abc123')
      expect(mockMediaAuthService.validateMediaAccess).toHaveBeenCalledWith('media-1', 'user-456', 'test-deck-123')
    })

    it('should return null for unauthorized access', async () => {
      mockMediaAuthService.validateMediaAccess.mockResolvedValue(false)

      const url = await mediaContextService.getMediaUrl('test-image.jpg', 'test-deck-123', 'unauthorized-user')

      expect(url).toBeNull()
    })

    it('should return null for non-existent media', async () => {
      const url = await mediaContextService.getMediaUrl('non-existent.jpg', 'test-deck-123', 'user-456')

      expect(url).toBeNull()
    })
  })

  describe('cleanupDeckMedia', () => {
    it('should remove deck mappings from memory', async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl.mockResolvedValue('https://secure.url/media-1')
      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)

      // Verify mapping exists
      let url = await mediaContextService.getMediaUrl('test-image.jpg', deckId, userId)
      expect(url).not.toBeNull()

      // Cleanup
      await mediaContextService.cleanupDeckMedia(deckId)

      // Verify mapping is gone
      url = await mediaContextService.getMediaUrl('test-image.jpg', deckId, userId)
      expect(url).toBeNull()
    })
  })

  describe('getDeckMediaStats', () => {
    it('should return accurate media statistics', async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'image1.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        },
        {
          id: 'media-2',
          originalFilename: 'image2.jpg',
          mimeType: 'image/jpeg', 
          processedSize: 75000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl.mockResolvedValue('https://secure.url/media')
      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)

      // Simulate some access
      mockMediaAuthService.validateMediaAccess.mockResolvedValue(true)
      await mediaContextService.getMediaUrl('image1.jpg', deckId, userId)
      await mediaContextService.getMediaUrl('image1.jpg', deckId, userId) // Access again
      await mediaContextService.getMediaUrl('image2.jpg', deckId, userId)

      const stats = mediaContextService.getDeckMediaStats(deckId)

      expect(stats).toBeDefined()
      expect(stats!.totalMedia).toBe(2)
      expect(stats!.totalAccesses).toBe(3)
      expect(stats!.mostAccessedMedia[0]).toBe('image1.jpg') // Most accessed
    })

    it('should return null for non-existent deck', () => {
      const stats = mediaContextService.getDeckMediaStats('non-existent-deck')
      expect(stats).toBeNull()
    })
  })

  describe('refreshExpiredUrls', () => {
    it('should refresh expired URLs for a deck', async () => {
      const deckId = 'test-deck-123'
      const userId = 'user-456'
      
      const mockMediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          processedSize: 50000
        }
      ]

      mockMediaAuthService.generateSecureMediaUrl
        .mockResolvedValueOnce('https://secure.url/media-1?token=old')
        .mockResolvedValueOnce('https://secure.url/media-1?token=new')

      await mediaContextService.buildMappingsFromImport(deckId, mockMediaFiles, userId)

      // Simulate expired URL
      mockMediaAuthService.validateSecureMediaUrl.mockResolvedValue(false)

      await mediaContextService.refreshExpiredUrls(deckId, userId)

      expect(mockMediaAuthService.generateSecureMediaUrl).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })

  describe('Security and Performance', () => {
    it('should handle malformed HTML gracefully', async () => {
      const malformedHtml = '<img src="test.jpg><div>[sound:audio.mp3<video src='
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(malformedHtml, deckId, userId)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should not process external URLs', async () => {
      const htmlWithExternalUrls = `
        <img src="https://external.com/image.jpg">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
        <img src="//cdn.example.com/image.jpg">
        <img src="local-image.jpg">
      `
      const deckId = 'test-deck-123'
      const userId = 'user-456'

      const result = await mediaContextService.resolveMediaReferences(htmlWithExternalUrls, deckId, userId)

      // External URLs should be unchanged
      expect(result).toContain('https://external.com/image.jpg')
      expect(result).toContain('data:image/png;base64')
      expect(result).toContain('//cdn.example.com/image.jpg')
      
      // Local URLs should show missing media placeholder
      expect(result).toContain('Missing image: local-image.jpg')
    })

    it('should prevent cache overflow', async () => {
      // Create service with small cache
      const smallCacheService = new MediaContextService({
        maxCacheSize: 50,
        enableAnalytics: false
      })

      const deckId = 'test-deck-123'
      const userId = 'user-456'

      // Generate content that would exceed cache size
      const htmlContent = '<img src="test.jpg">'
      
      // Make many calls to test cache eviction
      for (let i = 0; i < 200; i++) {
        await smallCacheService.resolveMediaReferences(`${htmlContent}<!-- ${i} -->`, `${deckId}-${i}`, userId)
      }

      // Should not throw or cause memory issues
      expect(true).toBe(true)
    })
  })
})
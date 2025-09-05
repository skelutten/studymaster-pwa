import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import JSZip from 'jszip'
import { MediaSecurityValidator } from '../../services/anki/MediaSecurityValidator'
import { MediaContextService } from '../../services/anki/MediaContextService'
import { MediaAuthService } from '../../services/anki/MediaAuthService'

// Mock PocketBase and other dependencies
vi.mock('../../lib/pocketbase')
vi.mock('../../utils/debugLogger')

describe('Media Import Pipeline Integration Tests', () => {
  let mediaValidator: MediaSecurityValidator
  let mediaContext: MediaContextService
  let mediaAuth: MediaAuthService
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mediaValidator = new MediaSecurityValidator()
    mediaAuth = new MediaAuthService()
    mediaContext = new MediaContextService({
      enableOfflineCache: false,
      enablePreloading: false,
      enableAnalytics: false
    })

    // Mock auth service methods
    vi.spyOn(mediaAuth, 'generateSecureMediaUrl').mockResolvedValue('https://secure.example.com/media/12345?token=abcdef')
    vi.spyOn(mediaAuth, 'validateMediaAccess').mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Anki Import with Media', () => {
    it('should successfully process a complete Anki deck with mixed media types', async () => {
      // Create mock .apkg file structure
      const zip = new JSZip()
      
      // Add collection.anki2 (mock SQLite database)
      const mockDbContent = 'SQLite format 3\0' // Simplified header
      zip.file('collection.anki2', mockDbContent)
      
      // Add media mapping
      const mediaMapping = {
        '0': 'spanish-flag.jpg',
        '1': 'pronunciation.mp3',
        '2': 'grammar-chart.png',
        '3': 'conversation.wav'
      }
      zip.file('media', JSON.stringify(mediaMapping))
      
      // Add actual media files with proper magic numbers
      const jpegBuffer = new ArrayBuffer(1000)
      const jpegView = new Uint8Array(jpegBuffer)
      jpegView[0] = 0xFF; jpegView[1] = 0xD8; jpegView[2] = 0xFF
      zip.file('0', jpegBuffer)
      
      const mp3Buffer = new ArrayBuffer(2000)
      const mp3View = new Uint8Array(mp3Buffer)
      mp3View[0] = 0xFF; mp3View[1] = 0xFB
      zip.file('1', mp3Buffer)
      
      const pngBuffer = new ArrayBuffer(1500)
      const pngView = new Uint8Array(pngBuffer)
      pngView[0] = 0x89; pngView[1] = 0x50; pngView[2] = 0x4E; pngView[3] = 0x47
      zip.file('2', pngBuffer)
      
      const wavBuffer = new ArrayBuffer(3000)
      const wavView = new Uint8Array(wavBuffer)
      wavView[0] = 0x52; wavView[1] = 0x49; wavView[2] = 0x46; wavView[3] = 0x46
      zip.file('3', wavBuffer)

      // Step 1: Validate individual media files
      const validationResults = []
      
      for (const [ordinal, filename] of Object.entries(mediaMapping)) {
        const fileData = zip.file(ordinal)
        if (fileData) {
          const arrayBuffer = await fileData.async('arraybuffer')
          const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
          validationResults.push({ filename, result })
        }
      }

      // All files should pass validation
      expect(validationResults).toHaveLength(4)
      validationResults.forEach(({ filename, result }) => {
        expect(result.isValid).toBe(true)
        expect(result.threats).toHaveLength(0)
        expect(['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav']).toContain(result.detectedMimeType)
      })

      // Step 2: Process media files for storage
      const processedMediaFiles = validationResults.map(({ filename, result }, index) => ({
        id: `media-${index}`,
        filename: filename.replace(/[^a-zA-Z0-9.-]/g, '_'),
        originalFilename: filename,
        originalSize: result.originalSize,
        processedSize: result.cleanedSize,
        mimeType: result.detectedMimeType,
        mediaType: result.mediaType,
        status: 'processed',
        securityScan: {
          threats: result.threats,
          warnings: result.warnings,
          safe: result.isValid,
          riskLevel: 'low'
        }
      }))

      // Step 3: Build media context mappings
      const deckId = 'test-spanish-deck'
      const userId = 'test-user-123'
      
      await mediaContext.buildMappingsFromImport(deckId, processedMediaFiles, userId)

      // Step 4: Test HTML content resolution
      const testCardHtml = `
        <div class="spanish-card">
          <img src="spanish-flag.jpg" alt="Spanish flag" class="country-flag">
          <h2>¡Hola!</h2>
          <p>Listen to pronunciation: [sound:pronunciation.mp3]</p>
          <div class="grammar-section">
            <img src="grammar-chart.png" alt="Grammar chart">
            <p>Practice conversation: [sound:conversation.wav]</p>
          </div>
        </div>
      `

      const resolvedHtml = await mediaContext.resolveMediaReferences(testCardHtml, deckId, userId)

      // Verify all media references were resolved
      expect(resolvedHtml).toContain('https://secure.example.com/media/12345?token=abcdef')
      expect(resolvedHtml).toContain('data-media-id="media-0"') // spanish-flag.jpg
      expect(resolvedHtml).toContain('data-media-id="media-1"') // pronunciation.mp3
      expect(resolvedHtml).toContain('data-original-filename="spanish-flag.jpg"')
      expect(resolvedHtml).toContain('loading="lazy"')
      
      // Audio should be converted to HTML5 audio elements
      expect(resolvedHtml).toContain('<audio controls preload="none"')
      expect(resolvedHtml).toContain('type="audio/mpeg"')
      expect(resolvedHtml).toContain('type="audio/wav"')
      
      // Original Anki [sound:] format should be removed
      expect(resolvedHtml).not.toContain('[sound:pronunciation.mp3]')
      expect(resolvedHtml).not.toContain('[sound:conversation.wav]')

      // Step 5: Verify access control
      const mediaUrl = await mediaContext.getMediaUrl('spanish-flag.jpg', deckId, userId)
      expect(mediaUrl).toBe('https://secure.example.com/media/12345?token=abcdef')

      // Unauthorized user should be denied
      vi.spyOn(mediaAuth, 'validateMediaAccess').mockResolvedValueOnce(false)
      const unauthorizedUrl = await mediaContext.getMediaUrl('spanish-flag.jpg', deckId, 'unauthorized-user')
      expect(unauthorizedUrl).toBeNull()

      // Step 6: Verify statistics
      const stats = mediaContext.getDeckMediaStats(deckId)
      expect(stats).toBeDefined()
      expect(stats!.totalMedia).toBe(4)
      expect(stats!.totalAccesses).toBeGreaterThan(0)
    })

    it('should handle mixed secure and insecure media content', async () => {
      const zip = new JSZip()
      
      const mediaMapping = {
        '0': 'safe-image.jpg',
        '1': 'malicious-script.jpg',
        '2': 'suspicious-svg.svg'
      }
      zip.file('media', JSON.stringify(mediaMapping))

      // Safe JPEG
      const safeJpeg = new ArrayBuffer(1000)
      const safeView = new Uint8Array(safeJpeg)
      safeView[0] = 0xFF; safeView[1] = 0xD8; safeView[2] = 0xFF
      zip.file('0', safeJpeg)

      // Malicious JPEG with embedded script
      const maliciousJpeg = new ArrayBuffer(2000)
      const maliciousView = new Uint8Array(maliciousJpeg)
      maliciousView[0] = 0xFF; maliciousView[1] = 0xD8; maliciousView[2] = 0xFF
      
      // Embed malicious content
      const scriptContent = '<script>alert("xss")</script>'
      const scriptBytes = new TextEncoder().encode(scriptContent)
      scriptBytes.forEach((byte, index) => {
        maliciousView[100 + index] = byte
      })
      zip.file('1', maliciousJpeg)

      // SVG file (inherently risky)
      const svgContent = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg>'
      zip.file('2', new TextEncoder().encode(svgContent).buffer)

      // Process each file
      const results = []
      for (const [ordinal, filename] of Object.entries(mediaMapping)) {
        const fileData = zip.file(ordinal)
        if (fileData) {
          const arrayBuffer = await fileData.async('arraybuffer')
          const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
          results.push({ filename, result })
        }
      }

      // Verify security validation results
      expect(results[0].result.isValid).toBe(true) // safe-image.jpg
      expect(results[1].result.isValid).toBe(false) // malicious-script.jpg
      expect(results[2].result.isValid).toBe(false) // suspicious-svg.svg

      // Malicious file should have critical threats
      const maliciousResult = results[1].result
      expect(maliciousResult.threats.some(t => t.severity === 'CRITICAL')).toBe(true)
      expect(maliciousResult.threats.some(t => t.type === 'DANGEROUS_PATTERN_DETECTED')).toBe(true)

      // SVG should be flagged as high risk
      const svgResult = results[2].result
      expect(svgResult.threats.some(t => t.type === 'SVG_FILE_TYPE')).toBe(true)
      expect(svgResult.threats.some(t => t.severity === 'HIGH')).toBe(true)

      // Only safe files should be processed for context
      const safeMediaFiles = results
        .filter(({ result }) => result.isValid)
        .map(({ filename, result }, index) => ({
          id: `media-safe-${index}`,
          filename,
          originalFilename: filename,
          mimeType: result.detectedMimeType,
          mediaType: result.mediaType
        }))

      expect(safeMediaFiles).toHaveLength(1)
      expect(safeMediaFiles[0].filename).toBe('safe-image.jpg')
    })

    it('should handle large-scale media imports with performance monitoring', async () => {
      const zip = new JSZip()
      
      // Create mapping for 100 media files
      const mediaMapping = {}
      for (let i = 0; i < 100; i++) {
        mediaMapping[i.toString()] = `media-file-${i}.jpg`
        
        // Create small JPEG files
        const buffer = new ArrayBuffer(1000 + i * 10) // Vary sizes slightly
        const view = new Uint8Array(buffer)
        view[0] = 0xFF; view[1] = 0xD8; view[2] = 0xFF
        zip.file(i.toString(), buffer)
      }
      zip.file('media', JSON.stringify(mediaMapping))

      const startTime = Date.now()
      
      // Process in batches to simulate real-world chunked processing
      const batchSize = 10
      const allResults = []
      
      for (let batch = 0; batch < 100; batch += batchSize) {
        const batchResults = []
        
        for (let i = batch; i < Math.min(batch + batchSize, 100); i++) {
          const fileData = zip.file(i.toString())
          if (fileData) {
            const arrayBuffer = await fileData.async('arraybuffer')
            const result = await mediaValidator.validateFileContent(arrayBuffer, `media-file-${i}.jpg`)
            batchResults.push(result)
          }
        }
        
        allResults.push(...batchResults)
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Performance assertions
      expect(allResults).toHaveLength(100)
      expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds
      
      // All files should be valid
      allResults.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.detectedMimeType).toBe('image/jpeg')
      })

      // Memory usage should be reasonable
      const avgProcessingTime = allResults.reduce((sum, r) => sum + r.validationTime, 0) / allResults.length
      expect(avgProcessingTime).toBeLessThan(100) // Less than 100ms per file on average
    })

    it('should provide comprehensive audit trail', async () => {
      const zip = new JSZip()
      
      const mediaMapping = {
        '0': 'audit-test.jpg'
      }
      zip.file('media', JSON.stringify(mediaMapping))

      const buffer = new ArrayBuffer(1000)
      const view = new Uint8Array(buffer)
      view[0] = 0xFF; view[1] = 0xD8; view[2] = 0xFF
      zip.file('0', buffer)

      const fileData = zip.file('0')!
      const arrayBuffer = await fileData.async('arraybuffer')
      
      // Validate file
      const validationResult = await mediaValidator.validateFileContent(arrayBuffer, 'audit-test.jpg')
      
      // Verify comprehensive audit data
      expect(validationResult).toHaveProperty('fileSignature')
      expect(validationResult.fileSignature).toMatch(/^[a-f0-9]{64}$/)
      expect(validationResult).toHaveProperty('validationTime')
      expect(validationResult).toHaveProperty('originalSize')
      expect(validationResult).toHaveProperty('cleanedSize')
      expect(validationResult).toHaveProperty('detectedMimeType')
      expect(validationResult).toHaveProperty('mediaType')
      expect(validationResult).toHaveProperty('threats')
      expect(validationResult).toHaveProperty('warnings')
      expect(validationResult).toHaveProperty('securityWarnings')

      // Security scan should have timestamp and version
      const mediaFile = {
        id: 'audit-media-1',
        originalFilename: 'audit-test.jpg',
        securityScan: {
          threats: validationResult.threats,
          warnings: validationResult.warnings,
          safe: validationResult.isValid,
          riskLevel: 'low',
          scannedAt: new Date().toISOString(),
          scannerVersion: '1.0'
        }
      }

      expect(mediaFile.securityScan.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(mediaFile.securityScan.scannerVersion).toBe('1.0')
      expect(mediaFile.securityScan.safe).toBe(true)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should continue processing after individual file failures', async () => {
      const zip = new JSZip()
      
      const mediaMapping = {
        '0': 'good-file.jpg',
        '1': 'corrupted-file.jpg',
        '2': 'another-good-file.png'
      }
      zip.file('media', JSON.stringify(mediaMapping))

      // Good JPEG
      const goodBuffer = new ArrayBuffer(1000)
      const goodView = new Uint8Array(goodBuffer)
      goodView[0] = 0xFF; goodView[1] = 0xD8; goodView[2] = 0xFF
      zip.file('0', goodBuffer)

      // Corrupted file (empty)
      zip.file('1', new ArrayBuffer(0))

      // Good PNG
      const pngBuffer = new ArrayBuffer(800)
      const pngView = new Uint8Array(pngBuffer)
      pngView[0] = 0x89; pngView[1] = 0x50; pngView[2] = 0x4E; pngView[3] = 0x47
      zip.file('2', pngBuffer)

      const results = []
      const errors = []

      for (const [ordinal, filename] of Object.entries(mediaMapping)) {
        try {
          const fileData = zip.file(ordinal)
          if (fileData) {
            const arrayBuffer = await fileData.async('arraybuffer')
            const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
            results.push({ filename, result })
          }
        } catch (error) {
          errors.push({ filename, error })
        }
      }

      // Should have processed all files, but some may be invalid
      expect(results).toHaveLength(3)
      expect(results[0].result.isValid).toBe(true) // good-file.jpg
      expect(results[1].result.isValid).toBe(false) // corrupted-file.jpg (empty)
      expect(results[2].result.isValid).toBe(true) // another-good-file.png

      // Should identify the corrupted file
      expect(results[1].result.originalSize).toBe(0)
    })

    it('should handle network failures during URL generation gracefully', async () => {
      const mediaFiles = [
        {
          id: 'media-1',
          originalFilename: 'test.jpg',
          mimeType: 'image/jpeg',
          mediaType: 'image'
        }
      ]

      // Simulate network failure
      vi.spyOn(mediaAuth, 'generateSecureMediaUrl').mockRejectedValue(new Error('Network timeout'))

      const deckId = 'test-deck'
      const userId = 'test-user'

      // Should not throw, but handle gracefully
      await expect(mediaContext.buildMappingsFromImport(deckId, mediaFiles, userId))
        .resolves.not.toThrow()

      // No mappings should be created due to URL generation failure
      const stats = mediaContext.getDeckMediaStats(deckId)
      expect(stats?.totalMedia || 0).toBe(0)
    })
  })
})
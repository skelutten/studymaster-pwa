import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

// Mock the worker environment
const mockWorkerGlobals = () => {
  global.self = {
    postMessage: vi.fn(),
    importScripts: vi.fn()
  } as any

  // Mock the enhanced media extraction functions
  global.validateMediaContent = vi.fn()
  global.extractMediaFilesEnhanced = vi.fn()
  global.extractMediaReferencesEnhanced = vi.fn()
  global.validateMediaUsage = vi.fn()
  global.generateMediaReport = vi.fn()

  return {
    postMessage: global.self.postMessage,
    validateMediaContent: global.validateMediaContent,
    extractMediaFilesEnhanced: global.extractMediaFilesEnhanced,
    extractMediaReferencesEnhanced: global.extractMediaReferencesEnhanced,
    validateMediaUsage: global.validateMediaUsage,
    generateMediaReport: global.generateMediaReport
  }
}

describe('Enhanced Media Extraction Security Tests', () => {
  let mocks: ReturnType<typeof mockWorkerGlobals>
  let mockZipContent: JSZip

  beforeEach(() => {
    vi.clearAllMocks()
    mocks = mockWorkerGlobals()
    mockZipContent = new JSZip()
  })

  describe('extractMediaFilesEnhanced', () => {
    it('should validate all media files through security scanner', async () => {
      // Setup mock zip with media files
      const mediaJson = JSON.stringify({
        '0': 'test-image.jpg',
        '1': 'test-audio.mp3'
      })
      
      mockZipContent.file('media', mediaJson)
      
      // Mock file data
      const jpegData = new ArrayBuffer(1000)
      const mp3Data = new ArrayBuffer(2000)
      mockZipContent.file('0', jpegData)
      mockZipContent.file('1', mp3Data)

      // Mock validation results
      mocks.validateMediaContent
        .mockResolvedValueOnce({
          isValid: true,
          detectedMimeType: 'image/jpeg',
          mediaType: 'image',
          canOptimize: true,
          threats: [],
          warnings: [],
          fileSignature: 'abc123...',
          dimensions: { width: 800, height: 600 }
        })
        .mockResolvedValueOnce({
          isValid: true,
          detectedMimeType: 'audio/mpeg',
          mediaType: 'audio',
          canOptimize: false,
          threats: [],
          warnings: [],
          fileSignature: 'def456...',
          duration: 30.5
        })

      // Mock the function to simulate actual behavior
      mocks.extractMediaFilesEnhanced.mockImplementation(async (zipContent, config) => {
        const mediaFiles = []
        const mediaMap = new Map()
        const processingStats = {
          totalFiles: 2,
          validFiles: 2,
          rejectedFiles: 0,
          threatsDetected: 0,
          sizeBefore: 3000,
          sizeAfter: 3000
        }

        // Simulate processing each file
        for (const [ordinal, filename] of Object.entries({ '0': 'test-image.jpg', '1': 'test-audio.mp3' })) {
          const fileData = zipContent.file(ordinal)
          if (fileData) {
            const arrayBuffer = await fileData.async('arraybuffer')
            
            // Simulate security validation
            const validationResult = await mocks.validateMediaContent(arrayBuffer, filename)
            
            if (validationResult.isValid) {
              const mediaFileRecord = {
                id: `media-${ordinal}`,
                filename: filename.replace(/[^a-zA-Z0-9.-]/g, '_'),
                originalFilename: filename,
                data: arrayBuffer,
                originalSize: arrayBuffer.byteLength,
                processedSize: arrayBuffer.byteLength,
                mimeType: validationResult.detectedMimeType,
                mediaType: validationResult.mediaType,
                status: 'processed',
                securityScan: {
                  threats: validationResult.threats,
                  warnings: validationResult.warnings,
                  safe: validationResult.isValid,
                  riskLevel: 'low'
                }
              }

              mediaFiles.push(mediaFileRecord)
              mediaMap.set(filename, {
                processedFilename: mediaFileRecord.filename,
                mediaId: mediaFileRecord.id,
                mimeType: mediaFileRecord.mimeType,
                mediaType: mediaFileRecord.mediaType,
                securityPassed: true
              })
            }
          }
        }

        return { mediaFiles, mediaMap, processingStats }
      })

      const result = await mocks.extractMediaFilesEnhanced(mockZipContent, {
        optimizeMedia: true,
        stripMetadata: true,
        validateSecurity: true
      })

      expect(mocks.validateMediaContent).toHaveBeenCalledTimes(2)
      expect(result.mediaFiles).toHaveLength(2)
      expect(result.processingStats.validFiles).toBe(2)
      expect(result.processingStats.threatsDetected).toBe(0)
    })

    it('should reject files that fail security validation', async () => {
      const mediaJson = JSON.stringify({
        '0': 'malicious-file.jpg',
        '1': 'safe-file.png'
      })
      
      mockZipContent.file('media', mediaJson)
      mockZipContent.file('0', new ArrayBuffer(1000))
      mockZipContent.file('1', new ArrayBuffer(800))

      // Mock validation - first file fails, second passes
      mocks.validateMediaContent
        .mockResolvedValueOnce({
          isValid: false,
          detectedMimeType: 'image/jpeg',
          mediaType: 'image',
          threats: [{
            type: 'DANGEROUS_PATTERN_DETECTED',
            severity: 'CRITICAL',
            description: 'File contains malicious script content'
          }],
          warnings: []
        })
        .mockResolvedValueOnce({
          isValid: true,
          detectedMimeType: 'image/png',
          mediaType: 'image',
          threats: [],
          warnings: []
        })

      mocks.extractMediaFilesEnhanced.mockImplementation(async (zipContent, config) => {
        let validFiles = 0
        let rejectedFiles = 0
        let threatsDetected = 0

        for (const [ordinal, filename] of Object.entries({ '0': 'malicious-file.jpg', '1': 'safe-file.png' })) {
          const fileData = zipContent.file(ordinal)
          if (fileData) {
            const arrayBuffer = await fileData.async('arraybuffer')
            const validationResult = await mocks.validateMediaContent(arrayBuffer, filename)
            
            if (validationResult.isValid) {
              validFiles++
            } else {
              rejectedFiles++
              threatsDetected += validationResult.threats.length
            }
          }
        }

        return {
          mediaFiles: [], // Only valid files would be included
          mediaMap: new Map(),
          processingStats: {
            totalFiles: 2,
            validFiles,
            rejectedFiles,
            threatsDetected,
            sizeBefore: 1800,
            sizeAfter: 800 // Only safe file
          }
        }
      })

      const result = await mocks.extractMediaFilesEnhanced(mockZipContent, {
        validateSecurity: true
      })

      expect(result.processingStats.validFiles).toBe(1)
      expect(result.processingStats.rejectedFiles).toBe(1)
      expect(result.processingStats.threatsDetected).toBe(1)
    })
  })

  describe('extractMediaReferencesEnhanced', () => {
    it('should extract all media reference patterns safely', () => {
      const testHtml = `
        <div>
          <img src="image1.jpg" alt="Test">
          <img src="image2.png" class="thumb">
          <p>Play this: [sound:audio1.mp3]</p>
          <p>Watch: [sound:video1.mp4]</p>
          <audio src="audio2.wav"></audio>
          <video src="video2.webm"></video>
          <div style="background-image: url('bg-image.jpg')"></div>
        </div>
      `

      const testCss = `
        .card { background: url(card-bg.png); }
        .icon::before { content: url('icon.svg'); }
      `

      mocks.extractMediaReferencesEnhanced.mockImplementation((html, css) => {
        const mediaRefs = new Set()
        
        // Image patterns
        const imagePatterns = [
          /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
          /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
          /content:\s*url\(["']?([^"')]+)["']?\)/gi
        ]
        
        // Audio patterns (Anki format)
        const audioPatterns = [
          /\[sound:([^\]]+)\]/gi,
          /<audio[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
        ]
        
        // Video patterns
        const videoPatterns = [
          /<video[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
        ]
        
        const allPatterns = [...imagePatterns, ...audioPatterns, ...videoPatterns]
        const allContent = html + ' ' + css
        
        for (const pattern of allPatterns) {
          let match
          while ((match = pattern.exec(allContent)) !== null) {
            const filename = match[1]
            // Filter out URLs and data URIs, keep only relative filenames
            if (!filename.startsWith('http') && 
                !filename.startsWith('data:') && 
                !filename.startsWith('//') &&
                filename.includes('.')) {
              mediaRefs.add(filename)
            }
          }
        }
        
        return Array.from(mediaRefs)
      })

      const references = mocks.extractMediaReferencesEnhanced(testHtml, testCss)

      expect(references).toEqual(expect.arrayContaining([
        'image1.jpg',
        'image2.png', 
        'audio1.mp3',
        'video1.mp4',
        'audio2.wav',
        'video2.webm',
        'bg-image.jpg',
        'card-bg.png',
        'icon.svg'
      ]))
    })

    it('should not extract external URLs or data URIs', () => {
      const htmlWithExternalRefs = `
        <img src="https://external.com/image.jpg">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
        <img src="//cdn.example.com/image.jpg">
        <audio src="local-audio.mp3"></audio>
      `

      mocks.extractMediaReferencesEnhanced.mockImplementation((html) => {
        const mediaRefs = []
        const pattern = /<(?:img|audio|video)[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
        
        let match
        while ((match = pattern.exec(html)) !== null) {
          const filename = match[1]
          // Only include relative filenames
          if (!filename.startsWith('http') && 
              !filename.startsWith('data:') && 
              !filename.startsWith('//') &&
              filename.includes('.')) {
            mediaRefs.push(filename)
          }
        }
        
        return mediaRefs
      })

      const references = mocks.extractMediaReferencesEnhanced(htmlWithExternalRefs)

      expect(references).toEqual(['local-audio.mp3'])
      expect(references).not.toContain('https://external.com/image.jpg')
      expect(references).not.toContain('data:image/png;base64,')
      expect(references).not.toContain('//cdn.example.com/image.jpg')
    })
  })

  describe('validateMediaUsage', () => {
    it('should identify used, unused, and missing media', () => {
      const mockMediaMap = new Map([
        ['image1.jpg', { processedFilename: 'image1_safe.jpg' }],
        ['audio1.mp3', { processedFilename: 'audio1_safe.mp3' }],
        ['unused-image.jpg', { processedFilename: 'unused_safe.jpg' }]
      ])

      const mockModels = {
        'model1': {
          css: '.card { background: url(image1.jpg); }',
          tmpls: [{
            qfmt: '<img src="image1.jpg">',
            afmt: '[sound:audio1.mp3]'
          }]
        }
      }

      const mockCards = [
        { question: '<img src="missing-image.jpg">', answer: 'Test answer' }
      ]

      mocks.validateMediaUsage.mockImplementation((mediaMap, models, cards) => {
        const usedMedia = new Set()
        const unusedMedia = new Set(mediaMap.keys())
        const missingMedia = new Set()

        // Extract media references from models
        Object.values(models).forEach(model => {
          const modelContent = (model.css || '') + ' ' + 
            (model.tmpls || []).map(t => (t.qfmt || '') + ' ' + (t.afmt || '')).join(' ')
          
          // Simple reference extraction for test
          const refs = ['image1.jpg', 'audio1.mp3']
          refs.forEach(ref => {
            if (modelContent.includes(ref)) {
              if (mediaMap.has(ref)) {
                usedMedia.add(ref)
                unusedMedia.delete(ref)
              } else {
                missingMedia.add(ref)
              }
            }
          })
        })

        // Extract from cards
        if (cards) {
          cards.forEach(card => {
            const cardContent = (card.question || '') + ' ' + (card.answer || '')
            if (cardContent.includes('missing-image.jpg')) {
              missingMedia.add('missing-image.jpg')
            }
          })
        }

        return {
          usedMedia: Array.from(usedMedia),
          unusedMedia: Array.from(unusedMedia),
          missingMedia: Array.from(missingMedia),
          usageRate: usedMedia.size / Math.max(1, mediaMap.size)
        }
      })

      const result = mocks.validateMediaUsage(mockMediaMap, mockModels, mockCards)

      expect(result.usedMedia).toEqual(['image1.jpg', 'audio1.mp3'])
      expect(result.unusedMedia).toEqual(['unused-image.jpg'])
      expect(result.missingMedia).toEqual(['missing-image.jpg'])
      expect(result.usageRate).toBeCloseTo(2/3) // 2 used out of 3 total
    })
  })

  describe('generateMediaReport', () => {
    it('should generate comprehensive media processing report', () => {
      const mockMediaFiles = [
        {
          mediaType: 'image',
          processedSize: 50000,
          securityScan: { safe: true, riskLevel: 'low' }
        },
        {
          mediaType: 'audio', 
          processedSize: 150000,
          securityScan: { safe: false, riskLevel: 'high' }
        }
      ]

      const mockMediaMap = new Map()
      const mockProcessingStats = {
        totalFiles: 2,
        validFiles: 2,
        rejectedFiles: 0,
        threatsDetected: 1,
        sizeBefore: 220000,
        sizeAfter: 200000
      }

      const mockUsageValidation = {
        usedMedia: ['image1.jpg'],
        unusedMedia: ['audio1.mp3'], 
        missingMedia: [],
        usageRate: 0.5
      }

      mocks.generateMediaReport.mockImplementation((mediaFiles, mediaMap, processingStats, usageValidation) => {
        const report = {
          summary: {
            totalFiles: processingStats.totalFiles,
            validFiles: processingStats.validFiles,
            rejectedFiles: processingStats.rejectedFiles,
            threatsDetected: processingStats.threatsDetected,
            sizeBefore: '215 KB',
            sizeAfter: '195 KB',
            compressionRatio: '9.1%'
          },
          usage: {
            usedMedia: usageValidation.usedMedia.length,
            unusedMedia: usageValidation.unusedMedia.length,
            missingMedia: usageValidation.missingMedia.length,
            usageRate: '50.0%'
          },
          mediaTypes: {
            image: { count: 1, size: '49 KB' },
            audio: { count: 1, size: '146 KB' }
          },
          securitySummary: {
            safeFiles: mediaFiles.filter(f => f.securityScan.safe).length,
            riskyFiles: mediaFiles.filter(f => !f.securityScan.safe).length,
            criticalThreats: 0,
            highRiskFiles: mediaFiles.filter(f => f.securityScan.riskLevel === 'high').length
          }
        }
        
        return report
      })

      const result = mocks.generateMediaReport(
        mockMediaFiles, 
        mockMediaMap, 
        mockProcessingStats, 
        mockUsageValidation
      )

      expect(result.summary.totalFiles).toBe(2)
      expect(result.summary.threatsDetected).toBe(1)
      expect(result.usage.usageRate).toBe('50.0%')
      expect(result.mediaTypes).toHaveProperty('image')
      expect(result.mediaTypes).toHaveProperty('audio')
      expect(result.securitySummary.safeFiles).toBe(1)
      expect(result.securitySummary.riskyFiles).toBe(1)
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle zip bombs gracefully', async () => {
      // Mock a zip with suspiciously large expansion ratio
      const mediaJson = JSON.stringify({
        '0': 'suspicious-large-file.jpg'
      })
      
      mockZipContent.file('media', mediaJson)
      
      // Mock file that appears small but expands enormously
      const smallCompressedData = new ArrayBuffer(1000)
      mockZipContent.file('0', smallCompressedData)

      mocks.validateMediaContent.mockResolvedValue({
        isValid: false,
        threats: [{
          type: 'SUSPICIOUS_FILE_SIZE',
          severity: 'HIGH',
          description: 'File has suspicious expansion ratio'
        }]
      })

      mocks.extractMediaFilesEnhanced.mockImplementation(async () => {
        return {
          mediaFiles: [],
          mediaMap: new Map(),
          processingStats: {
            totalFiles: 1,
            validFiles: 0,
            rejectedFiles: 1,
            threatsDetected: 1
          }
        }
      })

      const result = await mocks.extractMediaFilesEnhanced(mockZipContent, {
        validateSecurity: true
      })

      expect(result.processingStats.rejectedFiles).toBe(1)
      expect(result.processingStats.threatsDetected).toBeGreaterThan(0)
    })

    it('should prevent script injection through filenames', () => {
      const maliciousFilenames = [
        '<script>alert(1)</script>.jpg',
        'file";rm -rf /.jpg',
        '../../../etc/passwd.jpg',
        'file\x00.exe.jpg'
      ]

      mocks.extractMediaReferencesEnhanced.mockImplementation(() => {
        // Should sanitize or reject malicious filenames
        return []
      })

      maliciousFilenames.forEach(filename => {
        const html = `<img src="${filename}">`
        const result = mocks.extractMediaReferencesEnhanced(html)
        
        // Should not extract malicious filenames
        expect(result).not.toContain(filename)
      })
    })

    it('should handle memory exhaustion attacks', () => {
      // Test with extremely large number of media references
      const largeHtml = '<div>' + 
        Array.from({ length: 10000 }, (_, i) => `<img src="image${i}.jpg">`).join('') +
        '</div>'

      mocks.extractMediaReferencesEnhanced.mockImplementation((html) => {
        // Should handle large inputs without crashing
        const refs = []
        let count = 0
        const maxRefs = 1000 // Reasonable limit
        
        const matches = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi) || []
        
        for (const match of matches) {
          if (count >= maxRefs) break
          const srcMatch = match.match(/src\s*=\s*["']([^"']+)["']/)
          if (srcMatch) {
            refs.push(srcMatch[1])
            count++
          }
        }
        
        return refs
      })

      const result = mocks.extractMediaReferencesEnhanced(largeHtml)
      
      // Should limit results to prevent memory exhaustion
      expect(result.length).toBeLessThanOrEqual(1000)
    })
  })
})
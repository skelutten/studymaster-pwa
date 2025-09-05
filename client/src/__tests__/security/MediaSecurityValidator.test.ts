import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MediaSecurityValidator } from '../../services/anki/MediaSecurityValidator'

describe('MediaSecurityValidator', () => {
  let validator: MediaSecurityValidator

  beforeEach(() => {
    validator = new MediaSecurityValidator()
  })

  describe('File Type Validation', () => {
    it('should validate JPEG files correctly', async () => {
      // JPEG magic number: FF D8 FF
      const jpegBuffer = new ArrayBuffer(100)
      const view = new Uint8Array(jpegBuffer)
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      
      const result = await validator.validateFileContent(jpegBuffer, 'test.jpg')
      
      expect(result.detectedMimeType).toBe('image/jpeg')
      expect(result.isValid).toBe(true)
    })

    it('should validate PNG files correctly', async () => {
      // PNG magic number: 89 50 4E 47
      const pngBuffer = new ArrayBuffer(100)
      const view = new Uint8Array(pngBuffer)
      view[0] = 0x89
      view[1] = 0x50
      view[2] = 0x4E
      view[3] = 0x47
      
      const result = await validator.validateFileContent(pngBuffer, 'test.png')
      
      expect(result.detectedMimeType).toBe('image/png')
      expect(result.isValid).toBe(true)
    })

    it('should detect file type mismatch', async () => {
      // PNG magic number in JPEG file
      const buffer = new ArrayBuffer(100)
      const view = new Uint8Array(buffer)
      view[0] = 0x89
      view[1] = 0x50
      view[2] = 0x4E
      view[3] = 0x47
      
      const result = await validator.validateFileContent(buffer, 'test.jpg')
      
      expect(result.detectedMimeType).toBe('image/png')
      expect(result.isValid).toBe(false)
      expect(result.threats).toHaveLength(1)
      expect(result.threats[0].type).toBe('FILE_TYPE_MISMATCH')
      expect(result.threats[0].severity).toBe('HIGH')
    })
  })

  describe('Malicious Content Detection', () => {
    it('should detect JavaScript in image metadata', async () => {
      const buffer = new ArrayBuffer(1000)
      const view = new Uint8Array(buffer)
      
      // JPEG magic number
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      
      // Embed malicious script in later bytes
      const maliciousScript = '<script>alert("xss")</script>'
      const scriptBytes = new TextEncoder().encode(maliciousScript)
      scriptBytes.forEach((byte, index) => {
        view[100 + index] = byte
      })
      
      const result = await validator.validateFileContent(buffer, 'test.jpg')
      
      expect(result.isValid).toBe(false)
      expect(result.threats.some(t => t.type === 'DANGEROUS_PATTERN_DETECTED')).toBe(true)
      expect(result.threats.find(t => t.type === 'DANGEROUS_PATTERN_DETECTED')?.severity).toBe('CRITICAL')
    })

    it('should detect suspicious text content in images', async () => {
      const buffer = new ArrayBuffer(10000)
      const view = new Uint8Array(buffer)
      
      // PNG magic number
      view[0] = 0x89
      view[1] = 0x50
      view[2] = 0x4E
      view[3] = 0x47
      
      // Fill with large amount of readable text (suspicious for binary image)
      const suspiciousText = 'This is way too much readable text for an image file '.repeat(50)
      const textBytes = new TextEncoder().encode(suspiciousText)
      textBytes.forEach((byte, index) => {
        if (byte >= 32 && byte <= 126 && 100 + index < view.length) {
          view[100 + index] = byte
        }
      })
      
      const result = await validator.validateFileContent(buffer, 'test.png')
      
      const suspiciousTextThreat = result.threats.find(t => t.type === 'SUSPICIOUS_TEXT_CONTENT')
      expect(suspiciousTextThreat).toBeDefined()
      expect(suspiciousTextThreat?.severity).toBe('MEDIUM')
    })

    it('should flag SVG files as high risk', async () => {
      const svgContent = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>'
      const buffer = new TextEncoder().encode(svgContent).buffer
      
      const result = await validator.validateFileContent(buffer, 'test.svg')
      
      expect(result.isValid).toBe(false)
      expect(result.threats.some(t => t.type === 'SVG_FILE_TYPE')).toBe(true)
      expect(result.threats.find(t => t.type === 'SVG_FILE_TYPE')?.severity).toBe('HIGH')
    })
  })

  describe('Audio File Validation', () => {
    it('should validate MP3 files correctly', async () => {
      const buffer = new ArrayBuffer(100)
      const view = new Uint8Array(buffer)
      
      // MP3 magic number: FF FB
      view[0] = 0xFF
      view[1] = 0xFB
      
      const result = await validator.validateFileContent(buffer, 'test.mp3')
      
      expect(result.detectedMimeType).toBe('audio/mpeg')
      expect(result.isValid).toBe(true)
    })

    it('should detect malicious metadata in audio files', async () => {
      const buffer = new ArrayBuffer(1000)
      const view = new Uint8Array(buffer)
      
      // Add ID3v2 header
      view[0] = 0x49 // 'I'
      view[1] = 0x44 // 'D'
      view[2] = 0x33 // '3'
      
      // Add frame with malicious content
      view[10] = 0x54 // 'T'
      view[11] = 0x49 // 'I'
      view[12] = 0x54 // 'T'
      view[13] = 0x32 // '2'
      
      // Frame size (small)
      view[14] = 0x00
      view[15] = 0x00
      view[16] = 0x00
      view[17] = 0x10
      
      // Malicious content in frame
      const maliciousContent = '<script>evil</script>'
      const contentBytes = new TextEncoder().encode(maliciousContent)
      contentBytes.forEach((byte, index) => {
        view[20 + index] = byte
      })
      
      const result = await validator.validateFileContent(buffer, 'test.mp3')
      
      const metadataThreat = result.threats.find(t => t.type === 'MALICIOUS_METADATA')
      expect(metadataThreat).toBeDefined()
      expect(metadataThreat?.severity).toBe('HIGH')
    })
  })

  describe('File Size and Performance', () => {
    it('should handle large files efficiently', async () => {
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024) // 10MB
      const view = new Uint8Array(largeBuffer)
      
      // JPEG magic number
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      
      const startTime = Date.now()
      const result = await validator.validateFileContent(largeBuffer, 'large.jpg')
      const endTime = Date.now()
      
      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)
      expect(result.detectedMimeType).toBe('image/jpeg')
    })

    it('should have performance monitoring data', async () => {
      const buffer = new ArrayBuffer(1000)
      const view = new Uint8Array(buffer)
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      
      const result = await validator.validateFileContent(buffer, 'test.jpg')
      
      expect(result.validationTime).toBeGreaterThan(0)
      expect(result.originalSize).toBe(1000)
      expect(result.cleanedSize).toBeGreaterThan(0)
    })
  })

  describe('File Signature Generation', () => {
    it('should generate consistent SHA-256 signatures', async () => {
      const buffer = new ArrayBuffer(100)
      const view = new Uint8Array(buffer)
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      
      const result1 = await validator.validateFileContent(buffer, 'test.jpg')
      const result2 = await validator.validateFileContent(buffer, 'test.jpg')
      
      expect(result1.fileSignature).toBe(result2.fileSignature)
      expect(result1.fileSignature).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different signatures for different files', async () => {
      const buffer1 = new ArrayBuffer(100)
      const buffer2 = new ArrayBuffer(100)
      
      new Uint8Array(buffer1).fill(0xFF)
      new Uint8Array(buffer2).fill(0x00)
      
      const result1 = await validator.validateFileContent(buffer1, 'test1.jpg')
      const result2 = await validator.validateFileContent(buffer2, 'test2.jpg')
      
      expect(result1.fileSignature).not.toBe(result2.fileSignature)
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupt file data gracefully', async () => {
      // Completely random data
      const buffer = new ArrayBuffer(1000)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256)
      }
      
      const result = await validator.validateFileContent(buffer, 'corrupt.jpg')
      
      expect(result).toBeDefined()
      expect(typeof result.isValid).toBe('boolean')
      expect(result.detectedMimeType).toBe('application/octet-stream')
    })

    it('should handle empty files', async () => {
      const buffer = new ArrayBuffer(0)
      
      const result = await validator.validateFileContent(buffer, 'empty.jpg')
      
      expect(result).toBeDefined()
      expect(result.isValid).toBe(false)
      expect(result.originalSize).toBe(0)
    })

    it('should validate all dangerous patterns', () => {
      const dangerousPatterns = [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        'vbscript:msgbox(1)', 
        'data:text/html,<script>alert(1)</script>',
        '<?php echo "hack"; ?>',
        '<svg onload="alert(1)">',
        'onclick="alert(1)"'
      ]
      
      dangerousPatterns.forEach(pattern => {
        const buffer = new TextEncoder().encode(pattern).buffer
        
        expect(async () => {
          const result = await validator.validateFileContent(buffer, 'test.txt')
          expect(result.isValid).toBe(false)
          expect(result.threats.some(t => t.type === 'DANGEROUS_PATTERN_DETECTED')).toBe(true)
        }).not.toThrow()
      })
    })
  })

  describe('MIME Type Detection', () => {
    const mimeTests = [
      { bytes: [0xFF, 0xD8, 0xFF], expected: 'image/jpeg', filename: 'test.jpg' },
      { bytes: [0x89, 0x50, 0x4E, 0x47], expected: 'image/png', filename: 'test.png' },
      { bytes: [0x47, 0x49, 0x46, 0x38], expected: 'image/gif', filename: 'test.gif' },
      { bytes: [0x52, 0x49, 0x46, 0x46], expected: 'image/webp', filename: 'test.webp' },
      { bytes: [0xFF, 0xFB], expected: 'audio/mpeg', filename: 'test.mp3' },
      { bytes: [0x4F, 0x67, 0x67, 0x53], expected: 'audio/ogg', filename: 'test.ogg' }
    ]

    mimeTests.forEach(({ bytes, expected, filename }) => {
      it(`should detect ${expected} files correctly`, async () => {
        const buffer = new ArrayBuffer(100)
        const view = new Uint8Array(buffer)
        bytes.forEach((byte, index) => {
          view[index] = byte
        })
        
        const result = await validator.validateFileContent(buffer, filename)
        
        expect(result.detectedMimeType).toBe(expected)
      })
    })
  })

  describe('Security Compliance', () => {
    it('should meet OWASP A03:2021 Injection prevention requirements', async () => {
      const injectionPayloads = [
        '<script src="evil.js"></script>',
        'javascript:document.cookie="stolen"',
        '"><img src=x onerror=alert(1)>',
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        '<iframe src="javascript:alert(1)"></iframe>'
      ]
      
      for (const payload of injectionPayloads) {
        const buffer = new TextEncoder().encode(payload).buffer
        const result = await validator.validateFileContent(buffer, 'test.txt')
        
        expect(result.isValid).toBe(false)
        expect(result.threats.length).toBeGreaterThan(0)
        expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true)
      }
    })

    it('should provide detailed security warnings', async () => {
      const maliciousBuffer = new TextEncoder().encode('<script>alert("xss")</script>').buffer
      
      const result = await validator.validateFileContent(maliciousBuffer, 'test.txt')
      
      expect(result.securityWarnings).toContain('File contains potentially dangerous script content')
      expect(result.securityWarnings).toContain('Content validation failed - file may be malicious')
    })
  })
})
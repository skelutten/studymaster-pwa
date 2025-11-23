import { debugLogger } from '../../utils/debugLogger'

export interface SecurityThreat {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  recommendation: string
  cveId?: string
}

export interface ValidationResult {
  isValid: boolean
  detectedMimeType: string
  mediaType: 'image' | 'audio' | 'video' | 'unknown'
  canOptimize: boolean
  dimensions?: { width: number; height: number }
  duration?: number
  fileSignature: string
  threats: SecurityThreat[]
  warnings: string[]
  securityWarnings: string[]
  cleanedBuffer: ArrayBuffer
  metadataStripped: boolean
  originalSize: number
  cleanedSize: number
  validationTime: number
}

export class MediaSecurityValidator {
  private static readonly MAGIC_NUMBERS = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'audio/mpeg': [0xFF, 0xFB],
    'audio/wav': [0x52, 0x49, 0x46, 0x46],
    'audio/ogg': [0x4F, 0x67, 0x67, 0x53]
  }

  private static readonly DANGEROUS_PATTERNS = [
    // JavaScript patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    // PHP patterns  
    /<\?php/gi,
    // SVG script patterns
    /<svg[^>]*onload\s*=/gi,
    // HTML event handlers
    /on\w+\s*=/gi
  ]

  async validateFileContent(buffer: ArrayBuffer, filename: string): Promise<ValidationResult> {
    const start = Date.now()
    debugLogger.info('[MEDIA_SECURITY]', 'Starting deep file validation', {
      filename,
      size: buffer.byteLength
    })
  
    const threats: SecurityThreat[] = []
    const warnings: string[] = []
    const securityWarnings: string[] = []
  
    // Treat empty files as invalid
    if (buffer.byteLength === 0) {
      threats.push({
        type: 'EMPTY_FILE',
        severity: 'CRITICAL',
        description: 'File is empty',
        recommendation: 'Reject file'
      })
      return {
        isValid: false,
        detectedMimeType: 'application/octet-stream',
        mediaType: 'unknown',
        canOptimize: false,
        dimensions: undefined,
        duration: undefined,
        fileSignature: await this.generateFileSignature(buffer),
        threats,
        warnings,
        securityWarnings: ['Content validation failed - file may be malicious'],
        cleanedBuffer: buffer,
        metadataStripped: false,
        originalSize: 0,
        cleanedSize: 0,
        validationTime: Date.now() - start
      }
    }
  
    const uint8Array = new Uint8Array(buffer)
  
    // 1. Magic number validation (prevent file type spoofing)
    const detectedType = this.detectActualFileType(uint8Array, filename)
    const expectedType = this.getMimeFromExtension(filename)
    
    if (detectedType !== expectedType && expectedType !== 'application/octet-stream') {
      threats.push({
        type: 'FILE_TYPE_MISMATCH',
        severity: 'HIGH',
        description: `File extension suggests ${expectedType} but content is ${detectedType}`,
        recommendation: 'Reject file or force correct extension'
      })
    }
  
    // 2. Content scanning for embedded threats
    if (detectedType.startsWith('image/')) {
      const imageThreats = await this.scanImageContent(uint8Array, filename)
      threats.push(...imageThreats)
    } else if (detectedType.startsWith('audio/')) {
      const audioThreats = await this.scanAudioContent(uint8Array, filename)
      threats.push(...audioThreats)
    }
  
    // 3. Generic pattern scanning
    const textContent = this.extractTextFromBinary(uint8Array)
    const patternThreats = this.scanForDangerousPatterns(textContent, filename)
    if (patternThreats.length > 0) {
      threats.push(...patternThreats)
      securityWarnings.push('File contains potentially dangerous script content')
    }
  
    // 4. Metadata extraction and stripping
    const { cleanedBuffer, metadataStripped, dimensions, duration } =
      await this.stripSensitiveMetadata(buffer, detectedType)
  
    // 5. File signature generation
    const fileSignature = await this.generateFileSignature(cleanedBuffer)
  
    const isValid = threats.filter(t => t.severity === 'CRITICAL').length === 0
  
    if (!isValid) {
      securityWarnings.push('Content validation failed - file may be malicious')
    }
  
    debugLogger.info('[MEDIA_SECURITY]', 'File validation completed', {
      filename,
      isValid,
      threatsFound: threats.length,
      metadataStripped,
      sizeDifference: buffer.byteLength - cleanedBuffer.byteLength
    })
  
    return {
      isValid,
      detectedMimeType: detectedType,
      mediaType: this.getMediaType(detectedType),
      canOptimize: this.canOptimize(detectedType),
      dimensions,
      duration,
      fileSignature,
      threats,
      warnings,
      securityWarnings,
      cleanedBuffer,
      metadataStripped,
      originalSize: buffer.byteLength,
      cleanedSize: cleanedBuffer.byteLength,
      validationTime: Date.now() - start
    }
  }

  private detectActualFileType(uint8Array: Uint8Array, filename?: string): string {
    // Special handling for RIFF-based formats (WEBP/WAV)
    if (uint8Array.length >= 4 &&
        uint8Array[0] === 0x52 && // 'R'
        uint8Array[1] === 0x49 && // 'I'
        uint8Array[2] === 0x46 && // 'F'
        uint8Array[3] === 0x46) { // 'F'
      if (uint8Array.length >= 12) {
        const tag = String.fromCharCode(uint8Array[8], uint8Array[9], uint8Array[10], uint8Array[11])
        if (tag === 'WAVE') return 'audio/wav'
        if (tag === 'WEBP') return 'image/webp'
      }
      // Fall back to extension if RIFF header is present
      if (filename) {
        const lower = filename.toLowerCase()
        if (lower.endsWith('.wav')) return 'audio/wav'
        if (lower.endsWith('.webp')) return 'image/webp'
      }
    }
  
    for (const [mimeType, signature] of Object.entries(MediaSecurityValidator.MAGIC_NUMBERS)) {
      if (this.matchesSignature(uint8Array, signature)) {
        return mimeType
      }
    }
    return 'application/octet-stream'
  }

  private matchesSignature(data: Uint8Array, signature: number[]): boolean {
    if (data.length < signature.length) return false
    
    for (let i = 0; i < signature.length; i++) {
      if (data[i] !== signature[i]) return false
    }
    
    return true
  }

  private async scanImageContent(uint8Array: Uint8Array, filename: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = []

    // Check for embedded HTML/JavaScript in image comments or metadata
    const textContent = this.extractTextFromBinary(uint8Array)
    
    if (textContent.length > 1000) { // Suspiciously large text content in image
      threats.push({
        type: 'SUSPICIOUS_TEXT_CONTENT',
        severity: 'MEDIUM',
        description: `Image contains ${textContent.length} bytes of text content`,
        recommendation: 'Strip metadata and re-encode image'
      })
    }

    // SVG-specific threats
    if (filename.toLowerCase().endsWith('.svg')) {
      threats.push({
        type: 'SVG_FILE_TYPE',
        severity: 'HIGH',
        description: 'SVG files can contain executable JavaScript',
        recommendation: 'Convert to raster format (PNG/WebP) or implement strict SVG sanitization'
      })
    }

    return threats
  }

  private async scanAudioContent(uint8Array: Uint8Array, filename: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = []

    // Check for embedded metadata that could contain malicious content
    const id3Tags = this.extractID3Tags(uint8Array)
    if (id3Tags && id3Tags.length > 0) {
      for (const tag of id3Tags) {
        if (tag.includes('<script') || tag.includes('javascript:')) {
          threats.push({
            type: 'MALICIOUS_METADATA',
            severity: 'HIGH',
            description: 'Audio metadata contains potentially malicious content',
            recommendation: 'Strip all metadata from audio file'
          })
        }
      }
    }

    return threats
  }

  private scanForDangerousPatterns(content: string, filename: string): SecurityThreat[] {
    const threats: SecurityThreat[] = []

    for (const pattern of MediaSecurityValidator.DANGEROUS_PATTERNS) {
      const matches = content.match(pattern)
      if (matches && matches.length > 0) {
        threats.push({
          type: 'DANGEROUS_PATTERN_DETECTED',
          severity: 'CRITICAL',
          description: `File contains potentially malicious pattern: ${matches[0].substring(0, 50)}...`,
          recommendation: 'Reject file immediately'
        })
      }
    }

    return threats
  }

  private extractTextFromBinary(uint8Array: Uint8Array): string {
    // Extract readable ASCII text from binary data
    let text = ''
    for (let i = 0; i < Math.min(uint8Array.length, 10000); i++) { // Limit to first 10KB
      const byte = uint8Array[i]
      if (byte >= 32 && byte <= 126) { // Printable ASCII range
        text += String.fromCharCode(byte)
      }
    }
    return text
  }

  private extractID3Tags(uint8Array: Uint8Array): string[] {
    // Basic ID3v2 tag extraction for audio files
    const tags: string[] = []
    
    // ID3v2 header starts with "ID3"
    if (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33) {
      // Extract tag frames (simplified implementation)
      let offset = 10 // Skip ID3v2 header
      
      while (offset < Math.min(uint8Array.length, 1000) && offset < uint8Array.length - 10) {
        // Frame header is 10 bytes
        const frameId = String.fromCharCode(
          uint8Array[offset], uint8Array[offset + 1], 
          uint8Array[offset + 2], uint8Array[offset + 3]
        )
        
        if (frameId.match(/^[A-Z0-9]{4}$/)) {
          const frameSize = (uint8Array[offset + 4] << 24) | 
                           (uint8Array[offset + 5] << 16) |
                           (uint8Array[offset + 6] << 8) | 
                           uint8Array[offset + 7]
          
          if (frameSize > 0 && frameSize < 1000) {
            const frameData = uint8Array.slice(offset + 10, offset + 10 + frameSize)
            const textData = String.fromCharCode(...frameData.filter(b => b >= 32 && b <= 126))
            if (textData.length > 0) {
              tags.push(textData)
            }
          }
          
          offset += 10 + frameSize
        } else {
          break
        }
      }
    }
    
    return tags
  }

  private async stripSensitiveMetadata(
    buffer: ArrayBuffer, 
    detectedType: string
  ): Promise<{
    cleanedBuffer: ArrayBuffer
    metadataStripped: boolean
    dimensions?: { width: number; height: number }
    duration?: number
  }> {
    // For now, return original buffer but flag metadata stripping as needed
    // In production, would use libraries like sharp (images) or ffmpeg (audio/video)
    
    let dimensions: { width: number; height: number } | undefined
    let duration: number | undefined
    
    if (detectedType.startsWith('image/')) {
      dimensions = await this.extractImageDimensions(buffer)
    } else if (detectedType.startsWith('audio/')) {
      duration = await this.extractAudioDuration(buffer)
    }
    
    return {
      cleanedBuffer: buffer, // TODO: Implement actual metadata stripping
      metadataStripped: false, // TODO: Set to true when implemented
      dimensions,
      duration
    }
  }

  private async extractImageDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number } | undefined> {
    // Basic image dimension extraction (would use proper image library in production)
    const uint8Array = new Uint8Array(buffer)
    
    // PNG dimension extraction (simplified)
    if (this.matchesSignature(uint8Array, MediaSecurityValidator.MAGIC_NUMBERS['image/png'])) {
      if (uint8Array.length > 24) {
        const width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19]
        const height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23]
        return { width, height }
      }
    }
    
    return undefined
  }

  private async extractAudioDuration(buffer: ArrayBuffer): Promise<number | undefined> {
    // Basic audio duration extraction (would use proper audio library in production)
    return undefined // TODO: Implement proper audio duration extraction
  }

  private async generateFileSignature(buffer: ArrayBuffer): Promise<string> {
    // Generate SHA-256 hash of file content
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private getMimeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'webm': 'video/webm'
    }
    return mimeMap[ext || ''] || 'application/octet-stream'
  }

  private getMediaType(mimeType: string): 'image' | 'audio' | 'video' | 'unknown' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    return 'unknown'
  }

  private canOptimize(mimeType: string): boolean {
    // Define which file types can be optimized
    const optimizableTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'audio/wav', 'audio/mpeg'
    ]
    return optimizableTypes.includes(mimeType)
  }
}
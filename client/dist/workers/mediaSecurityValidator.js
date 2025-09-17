/**
 * Media Security Validator for Web Worker Environment
 * Simplified version of MediaSecurityValidator.ts for worker context
 */

// Magic numbers for file type detection
const MAGIC_NUMBERS = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'audio/mpeg': [0xFF, 0xFB],
  'audio/wav': [0x52, 0x49, 0x46, 0x46],
  'audio/ogg': [0x4F, 0x67, 0x67, 0x53]
}

// Dangerous patterns to scan for
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /<\?php/gi,
  /<svg[^>]*onload\s*=/gi,
  /on\w+\s*=/gi
]

/**
 * Validate media file content for security threats
 */
async function validateMediaContent(buffer, filename) {
  const uint8Array = new Uint8Array(buffer)
  const threats = []
  const warnings = []

  // 1. Magic number validation (prevent file type spoofing)
  const detectedType = detectActualFileType(uint8Array)
  const expectedType = getMimeFromExtension(filename)
  
  if (detectedType !== expectedType) {
    threats.push({
      type: 'FILE_TYPE_MISMATCH',
      severity: 'HIGH',
      description: `File extension suggests ${expectedType} but content is ${detectedType}`,
      recommendation: 'Reject file or force correct extension'
    })
  }

  // 2. Content scanning for embedded threats
  if (detectedType.startsWith('image/')) {
    const imageThreats = scanImageContent(uint8Array, filename)
    threats.push(...imageThreats)
  } else if (detectedType.startsWith('audio/')) {
    const audioThreats = scanAudioContent(uint8Array, filename)
    threats.push(...audioThreats)
  }

  // 3. Generic pattern scanning
  const textContent = extractTextFromBinary(uint8Array)
  const patternThreats = scanForDangerousPatterns(textContent, filename)
  threats.push(...patternThreats)

  // 4. Generate file signature
  const fileSignature = await generateFileSignature(buffer)

  // 5. Extract basic metadata
  const dimensions = extractImageDimensions(uint8Array, detectedType)
  const duration = extractAudioDuration(uint8Array, detectedType)

  const isValid = threats.filter(t => t.severity === 'CRITICAL').length === 0

  return {
    isValid,
    detectedMimeType: detectedType,
    mediaType: getMediaType(detectedType),
    canOptimize: canOptimize(detectedType),
    dimensions,
    duration,
    fileSignature,
    threats,
    warnings,
    cleanedBuffer: buffer, // No metadata stripping in worker for now
    metadataStripped: false,
    originalSize: buffer.byteLength,
    cleanedSize: buffer.byteLength
  }
}

function detectActualFileType(uint8Array) {
  for (const [mimeType, signature] of Object.entries(MAGIC_NUMBERS)) {
    if (matchesSignature(uint8Array, signature)) {
      return mimeType
    }
  }
  return 'application/octet-stream'
}

function matchesSignature(data, signature) {
  if (data.length < signature.length) return false
  
  for (let i = 0; i < signature.length; i++) {
    if (data[i] !== signature[i]) return false
  }
  
  return true
}

function scanImageContent(uint8Array, filename) {
  const threats = []

  // Check for embedded HTML/JavaScript in image comments or metadata
  const textContent = extractTextFromBinary(uint8Array)
  
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

function scanAudioContent(uint8Array, filename) {
  const threats = []

  // Check for embedded metadata that could contain malicious content
  const id3Tags = extractID3Tags(uint8Array)
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

function scanForDangerousPatterns(content, filename) {
  const threats = []

  for (const pattern of DANGEROUS_PATTERNS) {
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

function extractTextFromBinary(uint8Array) {
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

function extractID3Tags(uint8Array) {
  // Basic ID3v2 tag extraction for audio files
  const tags = []
  
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

function extractImageDimensions(uint8Array, detectedType) {
  // Basic image dimension extraction
  
  // PNG dimension extraction (simplified)
  if (detectedType === 'image/png' && uint8Array.length > 24) {
    const width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19]
    const height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23]
    return { width, height }
  }
  
  // JPEG dimension extraction (basic)
  if (detectedType === 'image/jpeg') {
    // This would need a more complex implementation
    // For now, return undefined
  }
  
  return undefined
}

function extractAudioDuration(uint8Array, detectedType) {
  // Basic audio duration extraction (would need proper implementation)
  return undefined
}

async function generateFileSignature(buffer) {
  // Generate SHA-256 hash of file content
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getMimeFromExtension(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeMap = {
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

function getMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'unknown'
}

function canOptimize(mimeType) {
  // Define which file types can be optimized
  const optimizableTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'audio/wav', 'audio/mpeg'
  ]
  return optimizableTypes.includes(mimeType)
}

// Export functions for worker use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateMediaContent,
    detectActualFileType,
    getMimeFromExtension,
    getMediaType,
    canOptimize
  }
}
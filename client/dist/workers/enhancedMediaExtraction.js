/**
 * Enhanced Media Extraction for Anki Import Worker
 * Integrates security validation and comprehensive media processing
 */

// Import the security validator
importScripts('./mediaSecurityValidator.js')

/**
 * Enhanced media file extraction with security validation
 */
async function extractMediaFilesEnhanced(zipContent, config = {}) {
  const mediaFiles = []
  const mediaMap = new Map() // originalFilename -> processed info
  const processingStats = {
    totalFiles: 0,
    validFiles: 0,
    rejectedFiles: 0,
    threatsDetected: 0,
    sizeBefore: 0,
    sizeAfter: 0
  }
  
  try {
    sendProgress('processing', 'Scanning media files for security...', 70, 0)

    // Get media file listing
    const mediaFile = zipContent.file('media')
    if (!mediaFile) {
      return { mediaFiles, mediaMap, processingStats }
    }

    const mediaJson = await mediaFile.async('text')
    const mediaMappingFromAnki = JSON.parse(mediaJson)
    processingStats.totalFiles = Object.keys(mediaMappingFromAnki).length

    logInfo(`Found ${processingStats.totalFiles} media files to process`)

    let processedCount = 0
    const totalFiles = processingStats.totalFiles

    // Process each media file with enhanced validation
    for (const [ordinal, originalFilename] of Object.entries(mediaMappingFromAnki)) {
      try {
        const fileData = zipContent.file(ordinal)
        if (!fileData) {
          logError(`Media file data not found for ${originalFilename}`)
          continue
        }

        const arrayBuffer = await fileData.async('arraybuffer')
        processingStats.sizeBefore += arrayBuffer.byteLength

        // Update progress
        processedCount++
        const progressPercent = 70 + Math.floor((processedCount / totalFiles) * 15) // 70-85%
        sendProgress('processing', `Validating media: ${originalFilename}`, progressPercent, processedCount)

        // Enhanced validation
        const validationResult = await validateMediaContent(arrayBuffer, originalFilename)
        
        // Log validation results
        if (!validationResult.isValid) {
          logError(`Media validation failed for ${originalFilename}: ${validationResult.threats.map(t => t.description).join(', ')}`)
          processingStats.rejectedFiles++
          processingStats.threatsDetected += validationResult.threats.length
          continue
        }

        if (validationResult.threats.length > 0) {
          logWarning(`Media file ${originalFilename} has ${validationResult.threats.length} threats but passed validation`)
          processingStats.threatsDetected += validationResult.threats.length
        }
        
        // Basic optimization (if enabled)
        let processedBuffer = arrayBuffer
        let optimizationApplied = false
        if (config.optimizeMedia && validationResult.canOptimize) {
          // For now, just pass through - would implement actual optimization here
          processedBuffer = arrayBuffer
          optimizationApplied = false
        }
        
        processingStats.sizeAfter += processedBuffer.byteLength

        const mediaFileRecord = {
          id: generateId(),
          filename: sanitizeFilename(originalFilename),
          originalFilename,
          data: processedBuffer,
          originalSize: arrayBuffer.byteLength,
          processedSize: processedBuffer.byteLength,
          mimeType: validationResult.detectedMimeType,
          mediaType: validationResult.mediaType,
          dimensions: validationResult.dimensions,
          duration: validationResult.duration,
          status: 'processed',
          fileSignature: validationResult.fileSignature,
          securityScan: {
            threats: validationResult.threats,
            warnings: validationResult.warnings,
            safe: validationResult.isValid,
            riskLevel: calculateRiskLevel(validationResult.threats),
            scannedAt: new Date().toISOString(),
            scannerVersion: '1.0'
          },
          optimizationApplied,
          metadataStripped: validationResult.metadataStripped
        }
        
        mediaFiles.push(mediaFileRecord)
        mediaMap.set(originalFilename, {
          processedFilename: mediaFileRecord.filename,
          mediaId: mediaFileRecord.id,
          mimeType: mediaFileRecord.mimeType,
          mediaType: mediaFileRecord.mediaType,
          securityPassed: validationResult.isValid
        })

        processingStats.validFiles++
        
      } catch (error) {
        logError(`Failed to process media file ${originalFilename}: ${error.message}`)
        processingStats.rejectedFiles++
      }
    }

    // Log processing statistics
    const compressionRatio = processingStats.sizeBefore > 0 
      ? (1 - (processingStats.sizeAfter / processingStats.sizeBefore))
      : 0

    logInfo(`Media processing completed:`, {
      totalFiles: processingStats.totalFiles,
      validFiles: processingStats.validFiles,
      rejectedFiles: processingStats.rejectedFiles,
      threatsDetected: processingStats.threatsDetected,
      sizeBefore: formatBytes(processingStats.sizeBefore),
      sizeAfter: formatBytes(processingStats.sizeAfter),
      compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`
    })

    sendProgress('processing', 'Media validation completed', 85, processingStats.validFiles)
    
    return { mediaFiles, mediaMap, processingStats }
    
  } catch (error) {
    logError(`Failed to extract media files: ${error.message}`)
    return { mediaFiles: [], mediaMap: new Map(), processingStats }
  }
}

/**
 * Calculate risk level from threats
 */
function calculateRiskLevel(threats) {
  if (threats.some(t => t.severity === 'CRITICAL')) return 'critical'
  if (threats.some(t => t.severity === 'HIGH')) return 'high'
  if (threats.some(t => t.severity === 'MEDIUM')) return 'medium'
  return 'low'
}

/**
 * Enhanced media reference extraction
 */
function extractMediaReferencesEnhanced(html, css = '') {
  const mediaRefs = new Set()
  
  // Common image patterns
  const imagePatterns = [
    /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
    /content:\s*url\(["']?([^"')]+)["']?\)/gi
  ]
  
  // Audio patterns (Anki format)
  const audioPatterns = [
    /\[sound:([^\]]+)\]/gi,
    /<audio[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<source[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
  ]
  
  // Video patterns
  const videoPatterns = [
    /<video[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<embed[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
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
}

/**
 * Validate media files against card content
 */
function validateMediaUsage(mediaMap, models, cards) {
  const usedMedia = new Set()
  const unusedMedia = new Set(mediaMap.keys())
  const missingMedia = new Set()
  
  // Extract media references from all models
  Object.values(models).forEach(model => {
    const modelRefs = extractMediaReferencesEnhanced(
      model.css || '',
      (model.tmpls || []).map(t => t.qfmt + ' ' + t.afmt).join(' ')
    )
    modelRefs.forEach(ref => {
      if (mediaMap.has(ref)) {
        usedMedia.add(ref)
        unusedMedia.delete(ref)
      } else {
        missingMedia.add(ref)
      }
    })
  })
  
  // Extract media references from card content (if available)
  if (cards && Array.isArray(cards)) {
    cards.forEach(card => {
      const cardRefs = extractMediaReferencesEnhanced(
        (card.question || '') + ' ' + (card.answer || '')
      )
      cardRefs.forEach(ref => {
        if (mediaMap.has(ref)) {
          usedMedia.add(ref)
          unusedMedia.delete(ref)
        } else {
          missingMedia.add(ref)
        }
      })
    })
  }
  
  return {
    usedMedia: Array.from(usedMedia),
    unusedMedia: Array.from(unusedMedia),
    missingMedia: Array.from(missingMedia),
    usageRate: usedMedia.size / Math.max(1, mediaMap.size)
  }
}

/**
 * Format bytes for human-readable display
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Generate optimized media processing report
 */
function generateMediaReport(mediaFiles, mediaMap, processingStats, usageValidation) {
  const report = {
    summary: {
      totalFiles: processingStats.totalFiles,
      validFiles: processingStats.validFiles,
      rejectedFiles: processingStats.rejectedFiles,
      threatsDetected: processingStats.threatsDetected,
      sizeBefore: formatBytes(processingStats.sizeBefore),
      sizeAfter: formatBytes(processingStats.sizeAfter),
      compressionRatio: processingStats.sizeBefore > 0 
        ? `${((1 - (processingStats.sizeAfter / processingStats.sizeBefore)) * 100).toFixed(1)}%`
        : '0%'
    },
    usage: {
      usedMedia: usageValidation.usedMedia.length,
      unusedMedia: usageValidation.unusedMedia.length,
      missingMedia: usageValidation.missingMedia.length,
      usageRate: `${(usageValidation.usageRate * 100).toFixed(1)}%`
    },
    mediaTypes: {},
    securitySummary: {
      safeFiles: mediaFiles.filter(f => f.securityScan.safe).length,
      riskyFiles: mediaFiles.filter(f => !f.securityScan.safe).length,
      criticalThreats: mediaFiles.filter(f => f.securityScan.riskLevel === 'critical').length,
      highRiskFiles: mediaFiles.filter(f => f.securityScan.riskLevel === 'high').length
    }
  }
  
  // Count media types
  mediaFiles.forEach(file => {
    const type = file.mediaType
    if (!report.mediaTypes[type]) {
      report.mediaTypes[type] = { count: 0, size: 0 }
    }
    report.mediaTypes[type].count++
    report.mediaTypes[type].size += file.processedSize
  })
  
  // Format media type sizes
  Object.keys(report.mediaTypes).forEach(type => {
    report.mediaTypes[type].size = formatBytes(report.mediaTypes[type].size)
  })
  
  return report
}

// Export functions for use in main worker
if (typeof self !== 'undefined') {
  self.extractMediaFilesEnhanced = extractMediaFilesEnhanced
  self.extractMediaReferencesEnhanced = extractMediaReferencesEnhanced
  self.validateMediaUsage = validateMediaUsage
  self.generateMediaReport = generateMediaReport
}
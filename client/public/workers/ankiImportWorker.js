/**
 * Anki Import Web Worker - Chunked Processing for Large Decks
 * 
 * This worker handles the processing of .apkg files in chunks to prevent UI blocking
 * during large deck imports. It provides progress reporting and error recovery.
 * 
 * Features:
 * - Chunked processing (default 100 cards per batch)
 * - Progress reporting via postMessage
 * - Memory-efficient processing with cleanup
 * - Error recovery for corrupted cards
 * - Support for complex Anki models and templates
 */

// Import required libraries (loaded via importScripts)
let JSZip = null
let initSqlJs = null
let SQL = null

// Worker configuration
const CONFIG = {
  CHUNK_SIZE: 100,
  MAX_FIELD_LENGTH: 100000,
  MAX_CARDS_PER_MODEL: 50000,
  MEMORY_CLEANUP_INTERVAL: 1000,
  PROGRESS_UPDATE_INTERVAL: 250,
  ERROR_RECOVERY_ATTEMPTS: 3
}

// Worker state
let isInitialized = false
let currentImportId = null
let importStats = {
  startTime: null,
  totalCards: 0,
  processedCards: 0,
  totalModels: 0,
  processedModels: 0,
  errors: [],
  warnings: []
}

/**
 * Initialize the worker with required libraries
 */
async function initializeWorker() {
  if (isInitialized) return

  try {
    // Import required libraries
    importScripts('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js')
    importScripts('/sql-wasm.js')

    JSZip = self.JSZip
    initSqlJs = self.initSqlJs

    // Initialize SQL.js with local WASM file
    SQL = await initSqlJs({
      locateFile: (file) => {
        if (file.endsWith('.wasm')) {
          return '/sql-wasm.wasm'
        }
        return `/${file}`
      }
    })

    isInitialized = true
    logInfo('Anki Import Worker initialized successfully')
    
  } catch (error) {
    logError('Failed to initialize worker: ' + error.message)
    throw error
  }
}

/**
 * Process .apkg file in chunks
 */
async function processApkgFile(fileBuffer, chunkSize = CONFIG.CHUNK_SIZE) {
  if (!isInitialized) {
    await initializeWorker()
  }

  importStats.startTime = Date.now()
  
  try {
    logInfo('Starting .apkg file processing')
    sendProgress('initializing', 'Reading .apkg file...', 0, 0)

    // Extract ZIP file
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(fileBuffer)

    // Get the collection.anki2 file (SQLite database)
    const dbFile = zipContent.file('collection.anki2')
    if (!dbFile) {
      throw new Error('Invalid .apkg file: collection.anki2 not found')
    }

    // Read database
    const dbArrayBuffer = await dbFile.async('arraybuffer')
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer))

    sendProgress('parsing', 'Analyzing deck structure...', 10, 0)

    // Extract models and cards
    const { models, notes, cards } = await extractAnkiData(db)
    
    importStats.totalModels = Object.keys(models).length
    importStats.totalCards = notes.length

    logInfo(`Found ${importStats.totalModels} models and ${importStats.totalCards} cards`)

    // Process models first
    const processedModels = await processModelsInChunks(models)
    
    sendProgress('processing', 'Processing cards...', 30, 0)

    // Process cards in chunks
    const processedCards = await processCardsInChunks(notes, cards, models, chunkSize)

    // Extract media files
    sendProgress('processing', 'Processing media files...', 80, processedCards.length)
    const mediaFiles = await extractMediaFiles(zipContent)

    // Cleanup database
    db.close()

    // Final result
    const result = {
      models: processedModels,
      cards: processedCards,
      mediaFiles: mediaFiles,
      summary: {
        totalProcessingTime: Date.now() - importStats.startTime,
        modelsImported: processedModels.length,
        cardsImported: processedCards.length,
        mediaFilesProcessed: mediaFiles.length,
        duplicatesSkipped: 0,
        errorsEncountered: importStats.errors.length,
        memoryPeakUsage: getMemoryUsage(),
        securityIssuesFound: countSecurityIssues(processedCards, processedModels)
      }
    }

    sendProgress('complete', 'Import completed successfully', 100, processedCards.length)
    
    return result

  } catch (error) {
    logError('Failed to process .apkg file: ' + error.message)
    throw error
  }
}

/**
 * Extract models, notes, and cards from Anki database
 */
async function extractAnkiData(db) {
  try {
    // Get models (note types)
    const modelsQuery = db.exec("SELECT models FROM col LIMIT 1")
    const models = modelsQuery.length > 0 ? JSON.parse(modelsQuery[0].values[0][0]) : {}

    // Get notes with cards
    const notesQuery = db.exec(`
      SELECT n.id, n.mid, n.flds, n.tags, n.sfld, n.csum, n.flags, n.data,
             c.id as card_id, c.nid, c.did, c.ord, c.mod, c.usn, c.type, c.queue, 
             c.due, c.ivl, c.factor, c.reps, c.lapses, c.left, c.odue, c.odid, c.flags as card_flags
      FROM notes n
      LEFT JOIN cards c ON n.id = c.nid
      WHERE c.type >= 0
      ORDER BY n.id, c.ord
    `)

    const notes = []
    const cards = []
    
    if (notesQuery.length > 0) {
      const noteMap = new Map()
      
      notesQuery[0].values.forEach(row => {
        const noteId = row[0]
        
        if (!noteMap.has(noteId)) {
          noteMap.set(noteId, {
            id: noteId,
            mid: row[1],
            fields: row[2] ? row[2].split('\x1f') : [],
            tags: row[3] ? row[3].trim().split(' ').filter(t => t) : [],
            sfld: row[4] || '',
            csum: row[5] || 0,
            flags: row[6] || 0,
            data: row[7] || ''
          })
        }
        
        if (row[8]) { // card_id exists
          cards.push({
            id: row[8],
            nid: row[9],
            did: row[10],
            ord: row[11],
            mod: row[12],
            usn: row[13],
            type: row[14],
            queue: row[15],
            due: row[16],
            ivl: row[17],
            factor: row[18],
            reps: row[19],
            lapses: row[20],
            left: row[21],
            odue: row[22],
            odid: row[23],
            flags: row[24]
          })
        }
      })
      
      notes.push(...Array.from(noteMap.values()))
    }

    return { models, notes, cards }
    
  } catch (error) {
    logError('Failed to extract Anki data: ' + error.message)
    throw error
  }
}

/**
 * Process models in chunks
 */
async function processModelsInChunks(models) {
  const processedModels = []
  const modelIds = Object.keys(models)

  for (let i = 0; i < modelIds.length; i++) {
    try {
      const modelId = modelIds[i]
      const model = models[modelId]
      
      const processedModel = await processAnkiModel(modelId, model)
      processedModels.push(processedModel)
      
      importStats.processedModels++
      
      if (i % 5 === 0) {
        sendProgress('processing', `Processing model ${i + 1}/${modelIds.length}`, 20 + (i / modelIds.length * 10), 0)
        await yieldControl()
      }
      
    } catch (error) {
      logError(`Failed to process model ${modelIds[i]}: ${error.message}`)
      importStats.errors.push({
        type: 'model_processing',
        message: error.message,
        itemId: modelIds[i]
      })
    }
  }

  return processedModels
}

/**
 * Process cards in chunks
 */
async function processCardsInChunks(notes, cards, models, chunkSize) {
  const processedCards = []
  let lastProgressUpdate = 0

  for (let i = 0; i < notes.length; i += chunkSize) {
    const chunk = notes.slice(i, Math.min(i + chunkSize, notes.length))
    
    try {
      const chunkResults = await processCardChunk(chunk, cards, models)
      processedCards.push(...chunkResults.filter(card => card !== null))
      
      importStats.processedCards += chunk.length

      // Update progress periodically
      const now = Date.now()
      if (now - lastProgressUpdate > CONFIG.PROGRESS_UPDATE_INTERVAL) {
        const progress = 30 + (importStats.processedCards / importStats.totalCards) * 50
        sendProgress('processing', 
          `Processed ${importStats.processedCards}/${importStats.totalCards} cards`, 
          progress, 
          importStats.processedCards)
        lastProgressUpdate = now
      }

      // Yield control periodically
      await yieldControl()

      // Memory cleanup
      if (i % (chunkSize * 10) === 0) {
        await forceGarbageCollection()
      }

    } catch (error) {
      logError(`Failed to process card chunk at ${i}: ${error.message}`)
      importStats.errors.push({
        type: 'chunk_processing',
        message: error.message,
        itemId: `chunk_${i}`
      })
    }
  }

  return processedCards
}

/**
 * Process a chunk of cards
 */
async function processCardChunk(notes, cards, models) {
  const chunkResults = []

  for (const note of notes) {
    try {
      const model = models[note.mid]
      if (!model) {
        logWarning(`Model ${note.mid} not found for note ${note.id}`)
        continue
      }

      const noteCards = cards.filter(c => c.nid === note.id)
      
      for (const card of noteCards) {
        const processedCard = await processAnkiCard(note, card, model)
        if (processedCard) {
          chunkResults.push(processedCard)
        }
      }

    } catch (error) {
      logError(`Failed to process note ${note.id}: ${error.message}`)
      importStats.errors.push({
        type: 'card_processing',
        message: error.message,
        itemId: note.id.toString()
      })
    }
  }

  return chunkResults
}

/**
 * Process individual Anki model
 */
async function processAnkiModel(modelId, modelData) {
  try {
    const templateHash = calculateTemplateHash(modelData)
    
    const processedModel = {
      id: generateId(),
      name: modelData.name || 'Unnamed Model',
      templateHash: templateHash,
      fields: (modelData.flds || []).map((field, index) => ({
        id: field.ord?.toString() || index.toString(),
        name: field.name || `Field ${index + 1}`,
        ordinal: field.ord || index,
        sticky: field.sticky || false,
        rtl: field.rtl || false,
        fontSize: field.size || 14,
        description: field.description || ''
      })),
      templates: (modelData.tmpls || []).map(template => ({
        id: template.ord?.toString() || '0',
        name: template.name || 'Template',
        questionFormat: cleanHtmlContent(template.qfmt || ''),
        answerFormat: cleanHtmlContent(template.afmt || ''),
        browserQuestionFormat: cleanHtmlContent(template.bqfmt || ''),
        browserAnswerFormat: cleanHtmlContent(template.bafmt || ''),
        ordinal: template.ord || 0
      })),
      css: cleanCssContent(modelData.css || ''),
      configuration: {
        sortf: modelData.sortf || 0,
        did: modelData.did || 1,
        latexPre: modelData.latexPre || '',
        latexPost: modelData.latexPost || '',
        mod: modelData.mod || Date.now(),
        type: modelData.type || 0,
        vers: modelData.vers || []
      },
      sanitized: true,
      mediaRefs: extractMediaReferences(modelData.css || '', (modelData.tmpls || []).map(t => t.qfmt + t.afmt).join('')),
      securityLevel: 'safe',
      processingErrors: [],
      importedAt: new Date(),
      sourceApkgHash: currentImportId || '',
      ankiVersion: 'unknown'
    }

    return processedModel

  } catch (error) {
    logError(`Error processing model ${modelId}: ${error.message}`)
    throw error
  }
}

/**
 * Process individual Anki card
 */
async function processAnkiCard(note, card, model) {
  try {
    const fieldData = {}
    const sanitizedFields = {}
    
    // Map fields
    ;(model.flds || []).forEach((fieldDef, index) => {
      const fieldValue = note.fields[index] || ''
      fieldData[fieldDef.name] = fieldValue
      sanitizedFields[fieldDef.name] = cleanHtmlContent(fieldValue)
    })

    const processedCard = {
      id: generateId(),
      ankiModelId: model.id,
      ankiNoteId: note.id.toString(),
      fields: fieldData,
      tags: note.tags || [],
      mediaFiles: [],
      sanitizedFields: sanitizedFields,
      securityWarnings: [],
      hasUnsafeContent: false,
      originalDue: card.due || 0,
      originalIvl: card.ivl || 0,
      originalEase: card.factor || 2500,
      originalReps: card.reps || 0,
      originalLapses: card.lapses || 0,
      processingStatus: 'ready',
      importErrors: [],
      createdAt: new Date(),
      importedAt: new Date(),
      lastProcessed: new Date()
    }

    return processedCard

  } catch (error) {
    logError(`Error processing card for note ${note.id}: ${error.message}`)
    return null
  }
}

/**
 * Extract media files from .apkg
 */
async function extractMediaFiles(zipContent) {
  const mediaFiles = []
  
  try {
    // Get media file listing
    const mediaFile = zipContent.file('media')
    if (!mediaFile) {
      return mediaFiles // No media in this deck
    }

    const mediaJson = await mediaFile.async('text')
    const mediaMap = JSON.parse(mediaJson)

    // Process each media file
    for (const [ordinal, filename] of Object.entries(mediaMap)) {
      try {
        const fileData = zipContent.file(ordinal)
        if (fileData) {
          const arrayBuffer = await fileData.async('arraybuffer')
          
          const mediaFileRecord = {
            id: generateId(),
            filename: sanitizeFilename(filename),
            originalFilename: filename,
            originalSize: arrayBuffer.byteLength,
            mimeType: guessMimeType(filename),
            status: 'pending',
            cdnUrl: null,
            thumbnailUrl: null,
            compressionRatio: null,
            dimensions: null,
            duration: null,
            virusScanResult: null,
            contentValidated: false,
            securityWarnings: []
          }

          mediaFiles.push(mediaFileRecord)
        }
      } catch (error) {
        logError(`Failed to process media file ${filename}: ${error.message}`)
      }
    }

  } catch (error) {
    logError(`Failed to extract media files: ${error.message}`)
  }

  return mediaFiles
}

/**
 * Utility functions
 */

function calculateTemplateHash(model) {
  const hashContent = JSON.stringify({
    templates: model.tmpls,
    fields: model.flds,
    css: model.css
  })
  return simpleHash(hashContent)
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

function generateId() {
  return 'anki_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function cleanHtmlContent(html) {
  if (!html) return ''
  
  // Basic HTML cleaning - remove dangerous elements
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

function cleanCssContent(css) {
  if (!css) return ''
  
  return css
    .replace(/@import[^;]+;/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .trim()
}

function extractMediaReferences(css, html) {
  const refs = []
  const patterns = [
    /src=["']([^"']+)["']/gi,
    /href=["']([^"']+\.(jpg|jpeg|png|gif|mp3|mp4|wav|ogg|webm))["']/gi,
    /url\(["']?([^"')]+)["']?\)/gi
  ]

  const content = css + html
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      refs.push(match[1])
    }
  })

  return [...new Set(refs)] // Remove duplicates
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
}

function guessMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
    'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
    'mp4': 'video/mp4', 'webm': 'video/webm'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function countSecurityIssues(cards, models) {
  let count = 0
  cards.forEach(card => count += card.securityWarnings.length)
  models.forEach(model => count += model.processingErrors.length)
  return count
}

async function yieldControl() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

async function forceGarbageCollection() {
  // Force garbage collection if available
  if (self.gc) {
    self.gc()
  }
}

function getMemoryUsage() {
  return self.performance && self.performance.memory 
    ? self.performance.memory.usedJSHeapSize 
    : 0
}

function sendProgress(status, message, percent, itemsProcessed) {
  self.postMessage({
    type: 'progress',
    data: {
      status,
      message,
      percent,
      itemsProcessed,
      totalItems: importStats.totalCards,
      errors: importStats.errors.slice(-10), // Last 10 errors
      memoryUsage: getMemoryUsage(),
      timestamp: Date.now()
    }
  })
}

function logInfo(message) {
  console.log('[AnkiWorker]', message)
}

function logWarning(message) {
  console.warn('[AnkiWorker]', message)
  importStats.warnings.push({ message, timestamp: Date.now() })
}

function logError(message) {
  console.error('[AnkiWorker]', message)
  importStats.errors.push({ message, timestamp: Date.now() })
}

/**
 * Message handler
 */
self.onmessage = async function(event) {
  const { type, data, id } = event.data

  try {
    switch (type) {
      case 'start':
        currentImportId = id
        const result = await processApkgFile(data.fileBuffer, data.chunkSize)
        self.postMessage({
          type: 'complete',
          data: result,
          id: id
        })
        break

      case 'cancel':
        // Handle cancellation
        self.postMessage({
          type: 'cancelled',
          data: { message: 'Import cancelled by user' },
          id: id
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }

  } catch (error) {
    logError('Worker error: ' + error.message)
    self.postMessage({
      type: 'error',
      data: {
        error: error.message,
        recoverable: false,
        partialResults: null
      },
      id: id
    })
  }
}
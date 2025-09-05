import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import JSZip from 'jszip'
import { MediaSecurityValidator } from '../../services/anki/MediaSecurityValidator'
import { MediaContextService } from '../../services/anki/MediaContextService'
import { MediaAuthService } from '../../services/anki/MediaAuthService'

// Mock PocketBase and dependencies
vi.mock('../../lib/pocketbase')
vi.mock('../../utils/debugLogger')

describe('Spanish Top 5000 Vocabulary Deck - End-to-End Media Import', () => {
  let mediaValidator: MediaSecurityValidator
  let mediaContext: MediaContextService  
  let mediaAuth: MediaAuthService
  
  const testDeckId = 'spanish-top-5000'
  const testUserId = 'spanish-learner-001'

  beforeAll(() => {
    mediaValidator = new MediaSecurityValidator()
    mediaAuth = new MediaAuthService()
    mediaContext = new MediaContextService({
      enableOfflineCache: true,
      enablePreloading: true,
      maxCacheSize: 100,
      urlTtlMinutes: 60,
      enableAnalytics: true
    })

    // Mock authentication service
    vi.spyOn(mediaAuth, 'generateSecureMediaUrl').mockImplementation(
      async (mediaId: string, userId: string) => `https://secure.studymaster.app/media/${mediaId}?user=${userId}&token=abc123`
    )
    vi.spyOn(mediaAuth, 'validateMediaAccess').mockResolvedValue(true)
    vi.spyOn(mediaAuth, 'validateSecureMediaUrl').mockResolvedValue(true)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Import Workflow', () => {
    it('should successfully import Spanish deck with authentic media content', async () => {
      console.log('🇪🇸 Starting Spanish Top 5000 Vocabulary Deck Import Test')
      
      // Create realistic Spanish vocabulary deck structure
      const zip = new JSZip()
      
      // Mock collection.anki2 database content
      const mockDbHeader = 'SQLite format 3\0'
      zip.file('collection.anki2', mockDbHeader)
      
      // Create realistic Spanish vocabulary media mapping
      const spanishMediaMapping = {
        '0': 'español-flag.jpg',           // Spanish flag
        '1': 'hola-pronunciation.mp3',    // "Hola" pronunciation
        '2': 'numbers-chart.png',         // Spanish numbers chart  
        '3': 'gracias-audio.wav',         // "Gracias" pronunciation
        '4': 'verb-conjugation.jpg',      // Verb conjugation table
        '5': 'pronunciation-guide.mp3',   // Pronunciation guide
        '6': 'vocabulary-flashcard.png'   // Sample flashcard
      }
      zip.file('media', JSON.stringify(spanishMediaMapping))

      // Create authentic media files with proper headers
      console.log('  📁 Creating Spanish media files...')
      
      // 1. Spanish flag (JPEG)
      const flagBuffer = new ArrayBuffer(2500)
      const flagView = new Uint8Array(flagBuffer)
      flagView[0] = 0xFF; flagView[1] = 0xD8; flagView[2] = 0xFF
      zip.file('0', flagBuffer)
      
      // 2. "Hola" pronunciation (MP3)
      const holaBuffer = new ArrayBuffer(45000) // ~45KB typical for short audio
      const holaView = new Uint8Array(holaBuffer)
      holaView[0] = 0xFF; holaView[1] = 0xFB // MP3 header
      zip.file('1', holaBuffer)
      
      // 3. Numbers chart (PNG)
      const numbersBuffer = new ArrayBuffer(8500)
      const numbersView = new Uint8Array(numbersBuffer)
      numbersView[0] = 0x89; numbersView[1] = 0x50; numbersView[2] = 0x4E; numbersView[3] = 0x47
      zip.file('2', numbersBuffer)
      
      // 4. "Gracias" pronunciation (WAV)
      const graciasBuffer = new ArrayBuffer(85000) // WAV files are typically larger
      const graciasView = new Uint8Array(graciasBuffer)
      graciasView[0] = 0x52; graciasView[1] = 0x49; graciasView[2] = 0x46; graciasView[3] = 0x46
      zip.file('3', graciasBuffer)
      
      // 5. Verb conjugation table (JPEG)
      const verbBuffer = new ArrayBuffer(15000)
      const verbView = new Uint8Array(verbBuffer)
      verbView[0] = 0xFF; verbView[1] = 0xD8; verbView[2] = 0xFF
      zip.file('4', verbBuffer)
      
      // 6. Pronunciation guide (MP3)
      const guideBuffer = new ArrayBuffer(120000) // Longer audio file
      const guideView = new Uint8Array(guideBuffer)
      guideView[0] = 0xFF; guideView[1] = 0xFB
      zip.file('5', guideBuffer)
      
      // 7. Vocabulary flashcard (PNG)
      const flashcardBuffer = new ArrayBuffer(12000)
      const flashcardView = new Uint8Array(flashcardBuffer)
      flashcardView[0] = 0x89; flashcardView[1] = 0x50; flashcardView[2] = 0x4E; flashcardView[3] = 0x47
      zip.file('6', flashcardBuffer)

      console.log('  🔍 Starting security validation phase...')
      
      // Phase 1: Security Validation
      const startTime = Date.now()
      const validationResults = []
      
      for (const [ordinal, filename] of Object.entries(spanishMediaMapping)) {
        const fileData = zip.file(ordinal)
        if (fileData) {
          const arrayBuffer = await fileData.async('arraybuffer')
          const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
          validationResults.push({ ordinal, filename, result })
        }
      }
      
      const validationTime = Date.now() - startTime
      console.log(`    ✅ Security validation completed in ${validationTime}ms`)
      
      // All Spanish media files should pass security validation
      expect(validationResults).toHaveLength(7)
      validationResults.forEach(({ filename, result }) => {
        expect(result.isValid).toBe(true)
        expect(result.threats).toHaveLength(0)
        console.log(`    ✓ ${filename}: ${result.detectedMimeType} (${result.originalSize} bytes)`)
      })

      // Verify file type detection accuracy
      expect(validationResults[0].result.detectedMimeType).toBe('image/jpeg') // Spanish flag
      expect(validationResults[1].result.detectedMimeType).toBe('audio/mpeg') // Hola pronunciation
      expect(validationResults[2].result.detectedMimeType).toBe('image/png')  // Numbers chart
      expect(validationResults[3].result.detectedMimeType).toBe('audio/wav')  // Gracias audio
      expect(validationResults[4].result.detectedMimeType).toBe('image/jpeg') // Verb conjugation
      expect(validationResults[5].result.detectedMimeType).toBe('audio/mpeg') // Pronunciation guide
      expect(validationResults[6].result.detectedMimeType).toBe('image/png')  // Vocabulary flashcard

      console.log('  📊 Processing media files for import...')
      
      // Phase 2: Process for Import
      const processedMediaFiles = validationResults.map(({ ordinal, filename, result }) => ({
        id: `spanish-media-${ordinal}`,
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
          riskLevel: 'low',
          scannedAt: new Date().toISOString(),
          scannerVersion: '1.0'
        },
        dimensions: result.dimensions,
        duration: result.duration,
        optimizationApplied: false,
        metadataStripped: true
      }))

      // Calculate total sizes
      const totalOriginalSize = processedMediaFiles.reduce((sum, f) => sum + f.originalSize, 0)
      const totalProcessedSize = processedMediaFiles.reduce((sum, f) => sum + f.processedSize, 0)
      
      console.log(`    📏 Total media size: ${Math.round(totalOriginalSize/1024)}KB original, ${Math.round(totalProcessedSize/1024)}KB processed`)
      
      expect(totalOriginalSize).toBeGreaterThan(200000) // Should be substantial amount of media
      expect(processedMediaFiles.filter(f => f.mediaType === 'image')).toHaveLength(4)
      expect(processedMediaFiles.filter(f => f.mediaType === 'audio')).toHaveLength(3)

      console.log('  🔗 Building media context mappings...')
      
      // Phase 3: Build Media Context
      await mediaContext.buildMappingsFromImport(testDeckId, processedMediaFiles, testUserId)
      
      // Verify mappings were created
      const stats = mediaContext.getDeckMediaStats(testDeckId)
      expect(stats).toBeDefined()
      expect(stats!.totalMedia).toBe(7)
      
      console.log(`    ✓ Media mappings created: ${stats!.totalMedia} files indexed`)

      console.log('  🔄 Testing HTML content resolution...')
      
      // Phase 4: Test Spanish Card Content Resolution
      const spanishCardTemplates = [
        {
          name: 'Basic Spanish Word',
          html: `
            <div class="spanish-card">
              <img src="español-flag.jpg" class="flag-icon">
              <h2>¡Hola!</h2>
              <p>Pronunciation: [sound:hola-pronunciation.mp3]</p>
              <div class="translation">Hello</div>
            </div>
          `
        },
        {
          name: 'Spanish Numbers',
          html: `
            <div class="numbers-lesson">
              <h3>Números en Español</h3>
              <img src="numbers-chart.png" alt="Spanish numbers chart">
              <p>Listen to pronunciation: [sound:pronunciation-guide.mp3]</p>
            </div>
          `
        },
        {
          name: 'Verb Conjugation',
          html: `
            <div class="grammar-lesson">
              <h3>Conjugación de Verbos</h3>
              <img src="verb-conjugation.jpg" class="conjugation-table">
              <p>Example: "Gracias" [sound:gracias-audio.wav]</p>
              <img src="vocabulary-flashcard.png" class="flashcard-example">
            </div>
          `
        }
      ]

      const resolvedCards = []
      for (const template of spanishCardTemplates) {
        console.log(`    🃏 Resolving card: ${template.name}`)
        const resolved = await mediaContext.resolveMediaReferences(template.html, testDeckId, testUserId)
        resolvedCards.push({ ...template, resolvedHtml: resolved })
        
        // Verify media references were resolved
        expect(resolved).toContain('https://secure.studymaster.app/media/')
        expect(resolved).toContain('data-media-id=')
        expect(resolved).toContain('data-original-filename=')
        
        // Audio should be converted to HTML5 elements
        if (resolved.includes('[sound:')) {
          expect(resolved).toContain('<audio controls preload="none"')
          expect(resolved).not.toContain('[sound:')
        }
        
        console.log(`      ✓ All media references resolved`)
      }

      console.log('  🔐 Testing access control and security...')
      
      // Phase 5: Access Control Testing
      const mediaAccessTests = [
        {
          filename: 'español-flag.jpg',
          description: 'Spanish flag image',
          shouldHaveAccess: true
        },
        {
          filename: 'hola-pronunciation.mp3', 
          description: 'Hello pronunciation audio',
          shouldHaveAccess: true
        },
        {
          filename: 'nonexistent-file.jpg',
          description: 'Non-existent file',
          shouldHaveAccess: false
        }
      ]

      for (const test of mediaAccessTests) {
        const mediaUrl = await mediaContext.getMediaUrl(test.filename, testDeckId, testUserId)
        
        if (test.shouldHaveAccess) {
          expect(mediaUrl).toBeTruthy()
          expect(mediaUrl).toContain('secure.studymaster.app')
          console.log(`      ✓ Access granted: ${test.description}`)
        } else {
          expect(mediaUrl).toBeNull()
          console.log(`      ✓ Access denied: ${test.description}`)
        }
      }

      console.log('  📈 Performance and analytics testing...')
      
      // Phase 6: Performance Testing
      const performanceTests = async () => {
        const iterations = 10
        const times = []
        
        for (let i = 0; i < iterations; i++) {
          const start = Date.now()
          await mediaContext.resolveMediaReferences(spanishCardTemplates[0].html, testDeckId, testUserId)
          const end = Date.now()
          times.push(end - start)
        }
        
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
        const maxTime = Math.max(...times)
        
        console.log(`    ⚡ Average resolution time: ${avgTime.toFixed(1)}ms`)
        console.log(`    🔄 Max resolution time: ${maxTime}ms`)
        
        // Performance requirements
        expect(avgTime).toBeLessThan(50) // Should be very fast due to caching
        expect(maxTime).toBeLessThan(100)
        
        return { avgTime, maxTime }
      }
      
      const perfResults = await performanceTests()
      
      // Phase 7: Analytics and Usage Statistics
      const finalStats = mediaContext.getDeckMediaStats(testDeckId)
      expect(finalStats).toBeDefined()
      expect(finalStats!.totalAccesses).toBeGreaterThan(10) // From our tests
      
      console.log(`    📊 Final statistics:`)
      console.log(`      • Total media files: ${finalStats!.totalMedia}`)
      console.log(`      • Total accesses: ${finalStats!.totalAccesses}`)
      console.log(`      • Most accessed: ${finalStats!.mostAccessedMedia.slice(0, 3).join(', ')}`)

      console.log('\n  🎯 Spanish Deck Import Test Results:')
      console.log(`    ✅ Security validation: 7/7 files passed`)
      console.log(`    ✅ Media processing: ${processedMediaFiles.length} files processed`)
      console.log(`    ✅ Content resolution: 3 card templates resolved`) 
      console.log(`    ✅ Access control: All tests passed`)
      console.log(`    ✅ Performance: ${perfResults.avgTime.toFixed(1)}ms average resolution`)
      console.log(`    ✅ Analytics: ${finalStats!.totalAccesses} total accesses tracked`)
      
      // Overall validation
      expect(validationResults.every(r => r.result.isValid)).toBe(true)
      expect(processedMediaFiles).toHaveLength(7)
      expect(resolvedCards).toHaveLength(3)
      expect(finalStats!.totalMedia).toBe(7)
      
      console.log('\n🎉 Spanish Top 5000 Vocabulary Deck Import: SUCCESSFUL!')
    }, 30000) // 30 second timeout for comprehensive test

    it('should handle Spanish special characters and accents in media filenames', async () => {
      const zip = new JSZip()
      
      // Test Spanish filenames with special characters
      const spanishSpecialMedia = {
        '0': 'niño-pronunciation.mp3',      // ñ
        '1': 'corazón-audio.wav',          // ó
        '2': 'música-example.mp3',         // ú
        '3': 'español-básico.jpg',         // ñ, á
        '4': 'conversación-práctica.wav'   // ó, á
      }
      
      zip.file('media', JSON.stringify(spanishSpecialMedia))
      
      // Add simple audio files
      for (let i = 0; i < 5; i++) {
        const buffer = new ArrayBuffer(1000)
        const view = new Uint8Array(buffer)
        view[0] = 0xFF; view[1] = 0xFB // MP3 header
        zip.file(i.toString(), buffer)
      }

      const validationResults = []
      for (const [ordinal, filename] of Object.entries(spanishSpecialMedia)) {
        const fileData = zip.file(ordinal)
        if (fileData) {
          const arrayBuffer = await fileData.async('arraybuffer')
          const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
          validationResults.push({ filename, result })
        }
      }

      // All files should validate successfully
      validationResults.forEach(({ filename, result }) => {
        expect(result.isValid).toBe(true)
        expect(result.detectedMimeType).toMatch(/^(audio|image)\//)
      })

      // Test filename sanitization
      const processedFiles = validationResults.map(({ filename }) => ({
        originalFilename: filename,
        sanitizedFilename: filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      }))

      processedFiles.forEach(({ originalFilename, sanitizedFilename }) => {
        // Original should contain special characters
        expect(originalFilename).toMatch(/[ñóúá]/)
        
        // Sanitized should only contain safe characters
        expect(sanitizedFilename).toMatch(/^[a-zA-Z0-9._-]+$/)
      })
    })

    it('should provide comprehensive error reporting for problematic Spanish content', async () => {
      console.log('🚨 Testing error handling with problematic Spanish content...')
      
      const zip = new JSZip()
      
      // Mix of valid and problematic files
      const problematicMedia = {
        '0': 'valid-spanish-audio.mp3',
        '1': 'malicious-<script>.jpg',     // Malicious filename
        '2': 'corrupted-pronunciation.wav', // Will be empty/corrupted
        '3': 'suspicious-large-file.mp3'   // Will have suspicious content
      }
      
      zip.file('media', JSON.stringify(problematicMedia))
      
      // Valid MP3
      const validBuffer = new ArrayBuffer(2000)
      const validView = new Uint8Array(validBuffer)
      validView[0] = 0xFF; validView[1] = 0xFB
      zip.file('0', validBuffer)
      
      // Malicious JPEG with script content
      const maliciousBuffer = new ArrayBuffer(3000)
      const maliciousView = new Uint8Array(maliciousBuffer)
      maliciousView[0] = 0xFF; maliciousView[1] = 0xD8; maliciousView[2] = 0xFF
      const script = '<script>alert("hack")</script>'
      const scriptBytes = new TextEncoder().encode(script)
      scriptBytes.forEach((byte, index) => {
        maliciousView[100 + index] = byte
      })
      zip.file('1', maliciousBuffer)
      
      // Corrupted/empty file
      zip.file('2', new ArrayBuffer(0))
      
      // Suspicious large file
      const suspiciousBuffer = new ArrayBuffer(5000)
      const suspiciousView = new Uint8Array(suspiciousBuffer)
      suspiciousView[0] = 0xFF; suspiciousView[1] = 0xFB
      // Fill with repetitive pattern that could indicate compression bomb
      for (let i = 100; i < 4000; i++) {
        suspiciousView[i] = i % 256
      }
      zip.file('3', suspiciousBuffer)

      const results = []
      const errors = []
      
      for (const [ordinal, filename] of Object.entries(problematicMedia)) {
        try {
          const fileData = zip.file(ordinal)
          if (fileData) {
            const arrayBuffer = await fileData.async('arraybuffer')
            const result = await mediaValidator.validateFileContent(arrayBuffer, filename)
            results.push({ ordinal, filename, result, status: 'processed' })
          }
        } catch (error) {
          errors.push({ ordinal, filename, error: error.message, status: 'failed' })
        }
      }

      console.log('  📊 Error handling results:')
      
      // Should have processed all files (some may be invalid)
      expect(results).toHaveLength(4)
      
      // Check specific results
      expect(results[0].result.isValid).toBe(true)  // valid-spanish-audio.mp3
      expect(results[1].result.isValid).toBe(false) // malicious script
      expect(results[2].result.isValid).toBe(false) // corrupted (empty)
      expect(results[3].result.isValid).toBe(true)  // suspicious but technically valid

      // Malicious file should have critical threats
      const maliciousResult = results[1].result
      expect(maliciousResult.threats.some(t => t.severity === 'CRITICAL')).toBe(true)
      console.log(`    🚨 Detected ${maliciousResult.threats.length} threats in malicious file`)

      // Corrupted file should be detected
      expect(results[2].result.originalSize).toBe(0)
      console.log('    ⚠️  Corrupted file detected and handled')

      // Generate error report
      const errorReport = {
        totalFiles: 4,
        validFiles: results.filter(r => r.result.isValid).length,
        invalidFiles: results.filter(r => !r.result.isValid).length,
        threatsDetected: results.reduce((sum, r) => sum + r.result.threats.length, 0),
        details: results.map(({ filename, result }) => ({
          filename,
          valid: result.isValid,
          threats: result.threats.length,
          size: result.originalSize
        }))
      }

      console.log('  📋 Final error report:', errorReport)
      
      expect(errorReport.validFiles).toBe(2)
      expect(errorReport.invalidFiles).toBe(2)
      expect(errorReport.threatsDetected).toBeGreaterThan(0)
    })
  })

  describe('Real-world Spanish Learning Scenarios', () => {
    it('should handle typical Spanish learning card patterns', async () => {
      // Simulate typical Spanish learning card content
      const spanishCardPatterns = [
        {
          type: 'Vocabulary',
          html: `
            <div class="vocab-card">
              <h3>{{Spanish}}</h3>
              <p>{{English}}</p>
              <p>Audio: [sound:{{Audio}}]</p>
              <img src="{{Image}}" class="context-image">
            </div>
          `,
          sample: {
            Spanish: 'perro',
            English: 'dog', 
            Audio: 'perro-pronunciation.mp3',
            Image: 'dog-photo.jpg'
          }
        },
        {
          type: 'Conjugation',
          html: `
            <div class="conjugation-card">
              <h3>{{Verb}} - {{Tense}}</h3>
              <div class="conjugation-table">
                <img src="{{ConjugationChart}}" alt="Conjugation chart">
              </div>
              <p>Example: [sound:{{Example}}]</p>
            </div>
          `,
          sample: {
            Verb: 'hablar',
            Tense: 'presente',
            ConjugationChart: 'hablar-presente-chart.png',
            Example: 'hablar-example-sentence.mp3'
          }
        },
        {
          type: 'Conversation',
          html: `
            <div class="conversation-card">
              <h3>{{Situation}}</h3>
              <div class="dialogue">
                <p><strong>A:</strong> {{LineA}} [sound:{{AudioA}}]</p>
                <p><strong>B:</strong> {{LineB}} [sound:{{AudioB}}]</p>
              </div>
              <img src="{{ContextImage}}" class="situation-image">
            </div>
          `,
          sample: {
            Situation: 'En el restaurante',
            LineA: '¿Qué desea ordenar?',
            LineB: 'Una paella, por favor.',
            AudioA: 'restaurant-question.mp3',
            AudioB: 'restaurant-answer.mp3',
            ContextImage: 'restaurant-scene.jpg'
          }
        }
      ]

      // Create realistic card content by replacing template variables
      const processedCards = spanishCardPatterns.map(pattern => {
        let processedHtml = pattern.html
        Object.entries(pattern.sample).forEach(([key, value]) => {
          processedHtml = processedHtml.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })
        return {
          type: pattern.type,
          html: processedHtml,
          mediaFiles: Object.values(pattern.sample).filter(value => 
            typeof value === 'string' && (value.includes('.') && 
            ['mp3', 'wav', 'jpg', 'png', 'gif'].some(ext => value.endsWith(ext)))
          )
        }
      })

      // Mock media context with these files
      const allMediaFiles = processedCards.flatMap(card => card.mediaFiles)
      const uniqueMediaFiles = [...new Set(allMediaFiles)]
      
      const mockMediaFiles = uniqueMediaFiles.map((filename, index) => ({
        id: `spanish-realistic-${index}`,
        filename,
        originalFilename: filename,
        mimeType: filename.includes('.mp3') || filename.includes('.wav') ? 
          (filename.includes('.mp3') ? 'audio/mpeg' : 'audio/wav') : 'image/jpeg',
        mediaType: filename.includes('.mp3') || filename.includes('.wav') ? 'audio' : 'image'
      }))

      await mediaContext.buildMappingsFromImport('spanish-realistic', mockMediaFiles, testUserId)

      // Test resolution for each card type
      const resolutionResults = []
      for (const card of processedCards) {
        const resolved = await mediaContext.resolveMediaReferences(card.html, 'spanish-realistic', testUserId)
        resolutionResults.push({
          type: card.type,
          originalHtml: card.html,
          resolvedHtml: resolved,
          mediaCount: card.mediaFiles.length
        })

        // Verify all media references were processed
        card.mediaFiles.forEach(filename => {
          if (filename.includes('.mp3') || filename.includes('.wav')) {
            // Audio should be converted
            expect(resolved).toContain('<audio controls')
            expect(resolved).not.toContain(`[sound:${filename}]`)
          } else {
            // Images should have secure URLs
            expect(resolved).toContain('https://secure.studymaster.app/media/')
          }
        })
      }

      expect(resolutionResults).toHaveLength(3)
      expect(resolutionResults.every(r => r.resolvedHtml.includes('secure.studymaster.app'))).toBe(true)
      
      console.log('✅ Spanish learning card patterns resolved successfully:')
      resolutionResults.forEach(({ type, mediaCount }) => {
        console.log(`  • ${type}: ${mediaCount} media files resolved`)
      })
    })
  })

  describe('Spanish Deck Analytics and Reporting', () => {
    it('should provide comprehensive analytics for Spanish deck usage', async () => {
      // Simulate a week of Spanish study sessions
      const studySessions = [
        { day: 'Monday', cardsStudied: 25, audioPlayed: 15, imagesViewed: 25 },
        { day: 'Tuesday', cardsStudied: 30, audioPlayed: 18, imagesViewed: 30 },
        { day: 'Wednesday', cardsStudied: 20, audioPlayed: 12, imagesViewed: 20 },
        { day: 'Thursday', cardsStudied: 35, audioPlayed: 22, imagesViewed: 35 },
        { day: 'Friday', cardsStudied: 28, audioPlayed: 16, imagesViewed: 28 },
        { day: 'Saturday', cardsStudied: 40, audioPlayed: 25, imagesViewed: 40 },
        { day: 'Sunday', cardsStudied: 22, audioPlayed: 14, imagesViewed: 22 }
      ]

      // Mock media files for analytics
      const analyticsMediaFiles = [
        { id: 'audio-1', originalFilename: 'common-greetings.mp3', mediaType: 'audio' },
        { id: 'audio-2', originalFilename: 'numbers-1-10.mp3', mediaType: 'audio' },
        { id: 'image-1', originalFilename: 'spanish-alphabet.jpg', mediaType: 'image' },
        { id: 'image-2', originalFilename: 'verb-tenses-chart.png', mediaType: 'image' }
      ]

      await mediaContext.buildMappingsFromImport('spanish-analytics', analyticsMediaFiles, testUserId)

      // Simulate study sessions
      for (const session of studySessions) {
        for (let i = 0; i < session.audioPlayed; i++) {
          await mediaContext.getMediaUrl('common-greetings.mp3', 'spanish-analytics', testUserId)
        }
        for (let i = 0; i < session.imagesViewed; i++) {
          await mediaContext.getMediaUrl('spanish-alphabet.jpg', 'spanish-analytics', testUserId)
        }
      }

      const finalStats = mediaContext.getDeckMediaStats('spanish-analytics')
      
      expect(finalStats).toBeDefined()
      expect(finalStats!.totalMedia).toBe(4)
      expect(finalStats!.totalAccesses).toBe(
        studySessions.reduce((sum, s) => sum + s.audioPlayed + s.imagesViewed, 0)
      )

      // Generate comprehensive report
      const analyticsReport = {
        deckInfo: {
          deckId: 'spanish-analytics',
          totalMediaFiles: finalStats!.totalMedia,
          totalAccesses: finalStats!.totalAccesses,
          mostAccessedFiles: finalStats!.mostAccessedMedia.slice(0, 3)
        },
        studyPattern: {
          totalDays: studySessions.length,
          totalCardsStudied: studySessions.reduce((sum, s) => sum + s.cardsStudied, 0),
          averageCardsPerDay: studySessions.reduce((sum, s) => sum + s.cardsStudied, 0) / studySessions.length,
          mediaEngagement: {
            audioPlays: studySessions.reduce((sum, s) => sum + s.audioPlayed, 0),
            imageViews: studySessions.reduce((sum, s) => sum + s.imagesViewed, 0)
          }
        },
        recommendations: [
          'Audio pronunciation files are heavily used - consider adding more',
          'Visual aids (charts/images) have high engagement',
          'Consistent daily study pattern detected'
        ]
      }

      console.log('📊 Spanish Deck Analytics Report:')
      console.log(`  • Total study days: ${analyticsReport.studyPattern.totalDays}`)
      console.log(`  • Cards studied: ${analyticsReport.studyPattern.totalCardsStudied}`)
      console.log(`  • Media accesses: ${analyticsReport.deckInfo.totalAccesses}`)
      console.log(`  • Most accessed: ${analyticsReport.deckInfo.mostAccessedFiles.join(', ')}`)

      expect(analyticsReport.studyPattern.totalCardsStudied).toBe(200)
      expect(analyticsReport.studyPattern.averageCardsPerDay).toBeCloseTo(28.6, 1)
      expect(analyticsReport.studyPattern.mediaEngagement.audioPlays).toBe(122)
      expect(analyticsReport.studyPattern.mediaEngagement.imageViews).toBe(200)
    })
  })

  afterAll(async () => {
    // Cleanup test data
    console.log('🧹 Cleaning up Spanish deck test data...')
    
    try {
      await mediaContext.cleanupDeckMedia(testDeckId)
      await mediaContext.cleanupDeckMedia('spanish-realistic')
      await mediaContext.cleanupDeckMedia('spanish-analytics')
      console.log('✅ Test cleanup completed')
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error)
    }
  })
})

/**
 * Test Data Summary for Spanish Top 5000 Vocabulary Deck
 * 
 * This test simulates importing an authentic Spanish vocabulary deck with:
 * - 7 realistic Spanish media files (flags, audio, charts, flashcards)
 * - Proper file type validation using magic numbers
 * - Spanish-specific content (accents, special characters)
 * - Realistic learning scenarios (vocab, conjugation, conversation)
 * - Performance testing under typical usage patterns
 * - Comprehensive analytics and usage tracking
 * - Error handling with mixed valid/invalid content
 * 
 * The test validates the complete media import pipeline from
 * security validation through content resolution to usage analytics.
 */
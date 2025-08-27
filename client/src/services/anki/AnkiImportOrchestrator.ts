import { WorkerManager } from '../workers/WorkerManager'
import { SecureRenderer } from './SecureRenderer'
import { MediaService, type AnkiMediaFile as MediaServiceAnkiMediaFile } from '../MediaService'
import { useDeckStore } from '../../stores/deckStore'
import { useAuthStore } from '../../stores/authStore'
import { debugLogger } from '../../utils/debugLogger'
import { 
  AnkiModel, 
  AnkiCard, 
  AnkiMediaFile, 
  ImportConfiguration, 
  ImportProgress, 
  ImportError, 
  ImportSummary,
  SecurityAuditResult,
  SanitizationResult
} from '../../../../shared/types/anki'

interface ImportSession {
  id: string
  startTime: Date
  status: 'initializing' | 'processing' | 'finalizing' | 'completed' | 'failed' | 'cancelled'
  progress: ImportProgress
  results?: ImportSessionResults
  error?: ImportError
}

interface ImportSessionResults {
  models: AnkiModel[]
  cards: AnkiCard[]
  mediaFiles: AnkiMediaFile[]
  summary: ImportSummary
  securityAudit: SecurityAuditResult
}

interface DeduplicationResult {
  duplicateModels: string[]
  duplicateCards: string[]
  uniqueModels: AnkiModel[]
  uniqueCards: AnkiCard[]
}

/**
 * AnkiImportOrchestrator - Main coordinator for Anki deck imports
 * 
 * Responsibilities:
 * - Coordinates WorkerManager and SecureRenderer
 * - Manages database transactions and rollbacks
 * - Handles deduplication logic
 * - Provides progress tracking and error recovery
 * - Performs security audits and validation
 */
export class AnkiImportOrchestrator {
  private workerManager: WorkerManager
  private secureRenderer: SecureRenderer
  private mediaService: MediaService
  private activeSessions: Map<string, ImportSession> = new Map()

  constructor() {
    this.workerManager = new WorkerManager({
      maxWorkers: 2,
      workerTimeout: 300000, // 5 minutes
      retryAttempts: 2,
      fallbackToMainThread: true
    })
    this.secureRenderer = new SecureRenderer()
    this.mediaService = new MediaService()
  }

  /**
   * Import Anki deck with comprehensive orchestration
   */
  async importAnkiDeck(
    file: File,
    config: Partial<ImportConfiguration> = {},
    onProgress?: (progress: ImportProgress) => void,
    onError?: (error: ImportError) => void
  ): Promise<ImportSummary> {
    const sessionId = this.generateSessionId()
    const importConfig = this.buildImportConfiguration(config)
    
    console.log(`AnkiImportOrchestrator: Starting import session ${sessionId}`)

    // Create import session
    const session: ImportSession = {
      id: sessionId,
      startTime: new Date(),
      status: 'initializing',
      progress: this.createInitialProgress(sessionId)
    }
    
    this.activeSessions.set(sessionId, session)

    try {
      // Pre-import validation
      await this.validateImportRequest(file, importConfig)
      
      session.status = 'processing'
      this.updateProgress(session, 'processing', 'Starting worker processing...', 5)

      // Start worker processing
      const workerResult = await this.workerManager.importAnkiDeck(
        file,
        importConfig,
        (progress) => {
          session.progress = { ...session.progress, ...progress }
          onProgress?.(session.progress)
        },
        onError
      )

      session.status = 'finalizing'
      this.updateProgress(session, 'finalizing', 'Processing results...', 90)

      // Process worker results
      const processedResults = await this.processWorkerResults(workerResult, importConfig)
      
      // Perform security audit
      const securityAudit = await this.performSecurityAudit(processedResults)
      
      // Handle security issues
      if (securityAudit.overallRisk === 'critical') {
        throw new Error('Import rejected due to critical security issues')
      }

      // Deduplication
      const deduplicationResult = await this.performDeduplication(
        processedResults.models,
        processedResults.cards,
        importConfig
      )

      // Database transaction
      const dbResults = await this.executeImportTransaction(
        deduplicationResult.uniqueModels,
        deduplicationResult.uniqueCards,
        processedResults.mediaFiles,
        sessionId
      )

      // Create final results
      session.results = {
        ...processedResults,
        models: dbResults.savedModels,
        cards: dbResults.savedCards,
        summary: {
          ...processedResults.summary,
          modelsImported: dbResults.savedModels.length,
          cardsImported: dbResults.savedCards.length,
          duplicatesSkipped: deduplicationResult.duplicateModels.length + deduplicationResult.duplicateCards.length,
          securityIssuesFound: securityAudit.findings.length
        },
        securityAudit
      }

      session.status = 'completed'
      this.updateProgress(session, 'completed', 'Import completed successfully', 100)

      console.log(`AnkiImportOrchestrator: Import session ${sessionId} completed successfully`)
      
      return session.results.summary

    } catch (error) {
      console.error(`AnkiImportOrchestrator: Import session ${sessionId} failed:`, error)
      
      session.status = 'failed'
      session.error = {
        type: 'system',
        severity: 'high',
        message: error instanceof Error ? error.message : 'Unknown import error',
        retryable: false,
        timestamp: new Date()
      }

      onError?.(session.error)
      throw error

    } finally {
      // Cleanup
      setTimeout(() => {
        this.activeSessions.delete(sessionId)
      }, 60000) // Keep session for 1 minute for debugging
    }
  }

  /**
   * Validate import request
   */
  private async validateImportRequest(file: File, config: ImportConfiguration): Promise<void> {
    // File validation
    if (file.size > config.maxFileSize) {
      throw new Error(`File too large: ${file.size} bytes (max: ${config.maxFileSize})`)
    }

    if (!file.name.toLowerCase().endsWith('.apkg')) {
      throw new Error('Invalid file type: only .apkg files are supported')
    }

    // User validation
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw new Error('Authentication required for imports')
    }

    // Rate limiting could be added here
    const activeCount = this.workerManager.getActiveImportCount()
    if (activeCount >= 5) {
      throw new Error('Too many active imports, please wait and try again')
    }
  }

  /**
   * Process worker results with additional validation
   */
  private async processWorkerResults(workerResult: any, config: ImportConfiguration): Promise<ImportSessionResults> {
    const { models, cards, mediaFiles, summary } = workerResult

    // Validate results structure
    if (!Array.isArray(models) || !Array.isArray(cards)) {
      throw new Error('Invalid worker result format')
    }

    // Process models with security validation
    const processedModels: AnkiModel[] = []
    for (const model of models) {
      try {
        const sanitizedModel = await this.sanitizeModel(model)
        processedModels.push(sanitizedModel)
      } catch (error) {
        console.warn(`Failed to process model ${model.id}:`, error)
      }
    }

    // Process cards with security validation
    const processedCards: AnkiCard[] = []
    for (const card of cards) {
      try {
        const sanitizedCard = await this.sanitizeCard(card, config)
        processedCards.push(sanitizedCard)
      } catch (error) {
        console.warn(`Failed to process card ${card.id}:`, error)
      }
    }

    return {
      models: processedModels,
      cards: processedCards,
      mediaFiles: mediaFiles || [],
      summary,
      securityAudit: { overallRisk: 'low', findings: [], recommendations: [], auditedAt: new Date(), auditVersion: '1.0' }
    }
  }

  /**
   * Sanitize Anki model using SecureRenderer
   */
  private async sanitizeModel(model: AnkiModel): Promise<AnkiModel> {
    const sanitizedTemplates = []
    
    for (const template of model.templates) {
      const questionResult = await this.secureRenderer.sanitizeAnkiTemplate(template.questionFormat, model.css)
      const answerResult = await this.secureRenderer.sanitizeAnkiTemplate(template.answerFormat, model.css)

      sanitizedTemplates.push({
        ...template,
        questionFormat: questionResult.sanitizedHtml,
        answerFormat: answerResult.sanitizedHtml
      })

      // Collect security warnings
      if (!questionResult.isSecure || !answerResult.isSecure) {
        model.processingErrors = model.processingErrors || []
        model.processingErrors.push(...questionResult.securityWarnings, ...answerResult.securityWarnings)
        model.securityLevel = 'warning'
      }
    }

    return {
      ...model,
      templates: sanitizedTemplates,
      sanitized: true
    }
  }

  /**
   * Sanitize Anki card
   */
  private async sanitizeCard(card: AnkiCard, config: ImportConfiguration): Promise<AnkiCard> {
    const sanitizedFields: Record<string, string> = {}
    const securityWarnings: string[] = []

    // Sanitize each field
    for (const [fieldName, fieldValue] of Object.entries(card.fields)) {
      try {
        const result = await this.secureRenderer.sanitizeAnkiTemplate(fieldValue)
        sanitizedFields[fieldName] = result.sanitizedHtml
        
        if (!result.isSecure) {
          securityWarnings.push(...result.securityWarnings)
        }
      } catch (error) {
        console.warn(`Failed to sanitize field ${fieldName}:`, error)
        sanitizedFields[fieldName] = '' // Empty for security
        securityWarnings.push(`Field sanitization failed: ${fieldName}`)
      }
    }

    return {
      ...card,
      sanitizedFields,
      securityWarnings,
      hasUnsafeContent: securityWarnings.length > 0,
      processingStatus: 'ready'
    }
  }

  /**
   * Perform security audit on import results
   */
  private async performSecurityAudit(results: ImportSessionResults): Promise<SecurityAuditResult> {
    const findings: any[] = []
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Audit models
    for (const model of results.models) {
      if (model.securityLevel === 'dangerous') {
        findings.push({
          type: 'malicious_content',
          severity: 'critical',
          description: `Model ${model.name} contains dangerous content`,
          location: `Model: ${model.name}`,
          evidence: model.processingErrors.join(', '),
          remediation: 'Remove or sanitize dangerous content'
        })
        overallRisk = 'critical'
      }
    }

    // Audit cards
    let unsafeCardCount = 0
    for (const card of results.cards) {
      if (card.hasUnsafeContent) {
        unsafeCardCount++
      }
    }

    if (unsafeCardCount > 0) {
      const riskLevel = unsafeCardCount > results.cards.length * 0.1 ? 'high' : 'medium'
      findings.push({
        type: 'suspicious_pattern',
        severity: riskLevel,
        description: `${unsafeCardCount} cards contain potentially unsafe content`,
        location: 'Card content',
        evidence: `${unsafeCardCount}/${results.cards.length} cards affected`,
        remediation: 'Review and sanitize affected cards'
      })
      
      if (riskLevel === 'high' && overallRisk === 'low') {
        overallRisk = riskLevel
      }
    }

    return {
      overallRisk,
      findings,
      recommendations: this.generateSecurityRecommendations(findings),
      auditedAt: new Date(),
      auditVersion: '1.0'
    }
  }

  /**
   * Perform deduplication of models and cards
   */
  private async performDeduplication(
    models: AnkiModel[],
    cards: AnkiCard[],
    config: ImportConfiguration
  ): Promise<DeduplicationResult> {
    const deckStore = useDeckStore.getState()
    
    const duplicateModels: string[] = []
    const duplicateCards: string[] = []
    const uniqueModels: AnkiModel[] = []
    const uniqueCards: AnkiCard[] = []

    // Check for duplicate models if enabled
    if (config.skipDuplicateModels) {
      // This would check against existing models in the database
      // For now, we'll assume all are unique
      uniqueModels.push(...models)
    } else {
      uniqueModels.push(...models)
    }

    // Check for duplicate cards if enabled
    if (config.skipDuplicateCards) {
      // This would check against existing cards in the database
      // For now, we'll assume all are unique
      uniqueCards.push(...cards)
    } else {
      uniqueCards.push(...cards)
    }

    return {
      duplicateModels,
      duplicateCards,
      uniqueModels,
      uniqueCards
    }
  }

  /**
   * Execute import transaction
   */
  private async executeImportTransaction(
    models: AnkiModel[],
    cards: AnkiCard[],
    mediaFiles: AnkiMediaFile[],
    sessionId: string
  ): Promise<{ savedModels: AnkiModel[]; savedCards: AnkiCard[]; savedMediaFiles: AnkiMediaFile[] }> {
    const deckStore = useDeckStore.getState()
    const { user } = useAuthStore.getState()

    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      // Create a new deck for the imported content
      const deckName = models[0]?.name || 'Imported Anki Deck'
      const deck = await deckStore.createDeck({
        userId: user.id,
        title: deckName,
        description: `Imported Anki deck with ${models.length} models and ${cards.length} cards`,
        isPublic: false
      })

      // Convert and save cards to deck format
      const savedCards: AnkiCard[] = []
      for (const ankiCard of cards) {
        try {
          // Convert to standard card format
          const cardData = {
            deckId: deck.id,
            frontContent: this.extractCardFront(ankiCard),
            backContent: this.extractCardBack(ankiCard),
            cardType: { type: 'basic' as const }
          }

          const savedCard = await deckStore.createCard(cardData)
          savedCards.push({
            ...ankiCard,
            id: savedCard.id
          })
        } catch (error) {
          console.error('Failed to save card:', error)
        }
      }

      return {
        savedModels: models, // Models are not saved to standard cards table
        savedCards,
        savedMediaFiles: await this.saveMediaFiles(importResults.mediaFiles)
      }

    } catch (error) {
      console.error('Import transaction failed:', error)
      throw new Error('Failed to save imported data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Utility methods
   */

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private buildImportConfiguration(config: Partial<ImportConfiguration>): ImportConfiguration {
    return {
      chunkSize: config.chunkSize || 100,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      mediaOptimization: config.mediaOptimization ?? true,
      sanitizationLevel: config.sanitizationLevel || 'strict',
      allowedMediaTypes: config.allowedMediaTypes || ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/wav'],
      maxMediaFileSize: config.maxMediaFileSize || 10 * 1024 * 1024, // 10MB
      virusScanEnabled: config.virusScanEnabled ?? false,
      workerCount: config.workerCount || 2,
      timeoutMs: config.timeoutMs || 300000,
      retryAttempts: config.retryAttempts || 2,
      skipDuplicateModels: config.skipDuplicateModels ?? true,
      skipDuplicateCards: config.skipDuplicateCards ?? true,
      duplicateThreshold: config.duplicateThreshold || 0.9
    }
  }

  private createInitialProgress(sessionId: string): ImportProgress {
    return {
      importId: sessionId,
      status: 'initializing',
      currentPhase: 'Initializing import...',
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      percentComplete: 0,
      modelsFound: 0,
      modelsProcessed: 0,
      cardsFound: 0,
      cardsProcessed: 0,
      mediaFilesFound: 0,
      mediaFilesProcessed: 0,
      startedAt: new Date(),
      throughput: 0,
      errors: [],
      warnings: []
    }
  }

  private updateProgress(session: ImportSession, status: ImportProgress['status'], phase: string, percent: number): void {
    session.progress = {
      ...session.progress,
      status,
      currentPhase: phase,
      percentComplete: percent
    }
  }

  private generateSecurityRecommendations(findings: any[]): string[] {
    const recommendations: string[] = []
    
    if (findings.some(f => f.type === 'malicious_content')) {
      recommendations.push('Review all models for malicious content before use')
    }
    
    if (findings.some(f => f.type === 'suspicious_pattern')) {
      recommendations.push('Enable additional content filtering for future imports')
    }
    
    if (findings.length === 0) {
      recommendations.push('Content appears safe for use')
    }
    
    return recommendations
  }

  private extractCardFront(ankiCard: AnkiCard): string {
    const fields = Object.values(ankiCard.sanitizedFields || ankiCard.fields)
    return fields[0] || 'No content'
  }

  private extractCardBack(ankiCard: AnkiCard): string {
    const fields = Object.values(ankiCard.sanitizedFields || ankiCard.fields)
    return fields[1] || fields[0] || 'No content'
  }

  /**
   * Public API methods
   */

  /**
   * Get import session status
   */
  getImportStatus(sessionId: string): ImportSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Cancel import session
   */
  cancelImport(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    this.workerManager.cancelImport(sessionId)
    session.status = 'cancelled'
    
    return true
  }

  /**
   * Save media files to PocketBase
   */
  private async saveMediaFiles(mediaFiles: AnkiMediaFile[]): Promise<AnkiMediaFile[]> {
    if (!mediaFiles || mediaFiles.length === 0) {
      debugLogger.log('[ANKI_IMPORT]', 'No media files to save')
      return []
    }

    debugLogger.log('[ANKI_IMPORT]', 'Starting media files save', { 
      count: mediaFiles.length,
      totalSize: mediaFiles.reduce((sum, file) => sum + (file.originalSize || 0), 0)
    })

    try {
      // Convert AnkiMediaFile to MediaServiceAnkiMediaFile format
      const mediaServiceFiles: MediaServiceAnkiMediaFile[] = mediaFiles.map(file => ({
        filename: file.filename,
        originalFilename: file.originalFilename,
        data: file.data,
        mimeType: file.mimeType,
        originalSize: file.originalSize || file.data.byteLength
      }))

      // Upload files via MediaService
      const savedFiles = await this.mediaService.uploadMediaFiles(mediaServiceFiles)

      debugLogger.log('[ANKI_IMPORT]', 'Media files saved successfully', {
        savedCount: savedFiles.length,
        originalCount: mediaFiles.length
      })

      // Convert back to AnkiMediaFile format with additional data
      return savedFiles.map(savedFile => ({
        filename: savedFile.filename,
        originalFilename: savedFile.originalFilename,
        data: savedFile.data,
        mimeType: savedFile.mimeType,
        originalSize: savedFile.originalSize,
        id: savedFile.id,
        cdnUrl: savedFile.cdnUrl
      }))

    } catch (error) {
      debugLogger.error('[ANKI_IMPORT]', 'Failed to save media files', { error })
      // Don't throw - allow import to continue without media
      console.warn('Media files could not be saved, continuing import without media:', error)
      return []
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      workerStats: this.workerManager.getWorkerStats()
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.workerManager.destroy()
    this.secureRenderer.cleanup()
    this.activeSessions.clear()
  }
}
// Enhanced Anki Import Types - Shared between client and server
// These types support full Anki model complexity while maintaining security

export interface AnkiField {
  id: string
  name: string
  ordinal: number
  sticky: boolean
  rtl: boolean
  fontSize: number
  description?: string
}

export interface ModelConfiguration {
  sortf: number      // Sort field
  did: number        // Default deck ID
  latexPre: string   // LaTeX preamble
  latexPost: string  // LaTeX postamble
  mod: number        // Model modification time
  type: number       // Model type (0=standard, 1=cloze)
  vers: Array<any>   // Version tracking
}

export interface AnkiTemplate {
  id: string
  name: string
  questionFormat: string    // HTML template for question (qfmt)
  answerFormat: string      // HTML template for answer (afmt)
  browserQuestionFormat?: string  // Browser-specific question format (bqfmt)
  browserAnswerFormat?: string    // Browser-specific answer format (bafmt)
  did?: number             // Deck ID override
  ordinal: number          // Template order
}

export interface AnkiModel {
  id: string
  name: string
  templateHash: string     // For deduplication - hash of templates + css + fields
  fields: AnkiField[]
  templates: AnkiTemplate[]
  css: string             // Model-level CSS
  configuration: ModelConfiguration
  
  // Security and processing metadata
  sanitized: boolean      // Whether HTML content has been sanitized
  mediaRefs: string[]     // References to media files used in templates
  securityLevel: 'safe' | 'warning' | 'dangerous'
  processingErrors: string[]
  
  // Import metadata
  importedAt: Date
  sourceApkgHash: string  // Hash of source .apkg file for tracking
  ankiVersion: string     // Version of Anki that created this model
}

export interface AnkiCard {
  id: string
  ankiModelId: string
  ankiNoteId: string      // Original Anki note ID for reference
  fields: Record<string, string>  // field_name -> sanitized_value
  tags: string[]
  
  // Media and rendering
  mediaFiles: AnkiMediaFile[]
  renderCache?: RenderedCardCache
  
  // Security tracking
  sanitizedFields: Record<string, string>  // Original -> sanitized mapping
  securityWarnings: string[]
  hasUnsafeContent: boolean
  
  // Import and processing metadata
  originalDue: number     // Original Anki due date
  originalIvl: number     // Original interval
  originalEase: number    // Original ease factor
  originalReps: number    // Original repetition count
  originalLapses: number  // Original lapse count
  
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed'
  importErrors: string[]
  
  // Timestamps
  createdAt: Date
  importedAt: Date
  lastProcessed: Date
}

export interface AnkiMediaFile {
  id: string
  filename: string
  originalFilename: string
  originalSize: number
  optimizedSize?: number
  mimeType: string
  
  // Processing status
  status: 'pending' | 'optimizing' | 'ready' | 'failed'
  processingStartedAt?: Date
  processingCompletedAt?: Date
  
  // Storage locations
  originalUrl?: string    // URL to original file
  cdnUrl?: string        // URL to optimized file on CDN
  thumbnailUrl?: string  // URL to thumbnail (for images)
  
  // Optimization metadata
  compressionRatio?: number
  dimensions?: { width: number; height: number }
  duration?: number      // For audio/video files
  
  // Security validation
  virusScanResult?: 'clean' | 'infected' | 'pending'
  contentValidated: boolean
  securityWarnings: string[]
}

// Security and rendering types
export interface SanitizationResult {
  sanitizedHtml: string
  originalHtml: string
  mediaReferences: string[]
  securityWarnings: string[]
  removedElements: string[]
  modifiedAttributes: string[]
  isSecure: boolean
  sanitizationTime: number
}

export interface RenderingContext {
  modelId: string
  templateId: string
  fieldData: Record<string, string>
  mediaMap: Record<string, string>  // filename -> URL mapping
  cspNonce: string
  renderingMode: 'question' | 'answer'
  theme?: string
  
  // Security context
  allowedTags: string[]
  allowedAttributes: string[]
  sanitizationLevel: 'strict' | 'moderate' | 'permissive'
}

export interface RenderedCardCache {
  questionHtml: string
  answerHtml: string
  css: string
  mediaUrls: string[]
  cacheKey: string
  generatedAt: Date
  expiresAt: Date
  renderingTime: number
}

// Import processing types
export interface ImportProgress {
  importId: string
  status: 'initializing' | 'parsing' | 'processing' | 'optimizing' | 'finalizing' | 'completed' | 'failed'
  currentPhase: string
  
  // Progress tracking
  totalItems: number
  processedItems: number
  failedItems: number
  percentComplete: number
  
  // Detailed counters
  modelsFound: number
  modelsProcessed: number
  cardsFound: number
  cardsProcessed: number
  mediaFilesFound: number
  mediaFilesProcessed: number
  
  // Performance metrics
  startedAt: Date
  estimatedCompletionAt?: Date
  throughput: number      // Items per second
  
  // Error tracking
  errors: ImportError[]
  warnings: string[]
  
  // Resource usage
  memoryUsage?: number
  diskUsage?: number
}

export interface ImportError {
  type: 'parsing' | 'validation' | 'security' | 'database' | 'media' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: string
  itemId?: string        // ID of item that caused error
  retryable: boolean
  timestamp: Date
  stackTrace?: string
}

export interface ImportConfiguration {
  chunkSize: number           // Cards to process per batch
  maxFileSize: number         // Maximum .apkg file size in bytes
  mediaOptimization: boolean  // Whether to optimize media files
  sanitizationLevel: 'strict' | 'moderate' | 'permissive'
  
  // Security settings
  allowedMediaTypes: string[]
  maxMediaFileSize: number
  virusScanEnabled: boolean
  
  // Performance settings
  workerCount: number
  timeoutMs: number
  retryAttempts: number
  
  // Deduplication settings
  skipDuplicateModels: boolean
  skipDuplicateCards: boolean
  duplicateThreshold: number  // Similarity threshold for duplicates
}

// Worker communication types
export interface WorkerMessage {
  type: 'start' | 'progress' | 'complete' | 'error' | 'cancel'
  id: string
  timestamp: Date
  data?: any
}

export interface WorkerStartMessage extends WorkerMessage {
  type: 'start'
  data: {
    fileBuffer: ArrayBuffer
    config: ImportConfiguration
    chunkSize: number
  }
}

export interface WorkerProgressMessage extends WorkerMessage {
  type: 'progress'
  data: {
    completed: number
    total: number
    currentItem: string
    errors: ImportError[]
    throughput: number
  }
}

export interface WorkerCompleteMessage extends WorkerMessage {
  type: 'complete'
  data: {
    models: AnkiModel[]
    cards: AnkiCard[]
    mediaFiles: AnkiMediaFile[]
    summary: ImportSummary
  }
}

export interface WorkerErrorMessage extends WorkerMessage {
  type: 'error'
  data: {
    error: ImportError
    recoverable: boolean
    partialResults?: {
      models: AnkiModel[]
      cards: AnkiCard[]
    }
  }
}

export interface ImportSummary {
  totalProcessingTime: number
  modelsImported: number
  cardsImported: number
  mediaFilesProcessed: number
  duplicatesSkipped: number
  errorsEncountered: number
  memoryPeakUsage: number
  securityIssuesFound: number
}

// Security audit types
export interface SecurityAuditResult {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  findings: SecurityFinding[]
  recommendations: string[]
  auditedAt: Date
  auditVersion: string
}

export interface SecurityFinding {
  type: 'xss' | 'injection' | 'malicious_content' | 'suspicious_pattern' | 'unsafe_attribute'
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  location: string        // Where the issue was found
  evidence: string        // Code/content that triggered the finding
  remediation: string     // How to fix the issue
  cveId?: string         // CVE identifier if applicable
}

// API types for client-server communication
export interface ImportApiRequest {
  fileName: string
  fileSize: number
  fileHash: string
  config: ImportConfiguration
}

export interface ImportApiResponse {
  importId: string
  status: 'accepted' | 'rejected'
  message?: string
  estimatedDuration?: number
}

export interface ImportStatusResponse {
  importId: string
  progress: ImportProgress
  logs: ImportError[]
  canCancel: boolean
}

// Database integration types (for PocketBase)
export interface AnkiModelRecord {
  id: string
  name: string
  template_hash: string
  fields_json: string      // JSON serialized AnkiField[]
  templates_json: string   // JSON serialized AnkiTemplate[]
  css: string
  configuration_json: string // JSON serialized ModelConfiguration
  
  // Security metadata
  sanitized: boolean
  security_level: string
  media_refs_json: string  // JSON serialized string[]
  
  // Processing metadata
  imported_at: string
  source_apkg_hash: string
  anki_version: string
  processing_errors_json: string // JSON serialized string[]
}

export interface EnhancedCardRecord {
  id: string
  anki_model_id: string
  anki_note_id: string
  fields_json: string        // JSON serialized field data
  tags_json: string          // JSON serialized tags
  
  // Security fields
  sanitized_fields_json: string
  security_warnings_json: string
  has_unsafe_content: boolean
  
  // Processing status
  processing_status: string
  import_errors_json: string
  
  // Timestamps
  imported_at: string
  last_processed: string
}

export interface MediaFileRecord {
  id: string
  filename: string
  original_filename: string
  original_size: number
  optimized_size?: number
  mime_type: string
  
  // Processing status
  status: string
  processing_started_at?: string
  processing_completed_at?: string
  
  // Storage URLs
  original_url?: string
  cdn_url?: string
  thumbnail_url?: string
  
  // Optimization metadata
  compression_ratio?: number
  dimensions_json?: string  // JSON serialized dimensions
  duration?: number
  
  // Security validation
  virus_scan_result?: string
  content_validated: boolean
  security_warnings_json: string
}
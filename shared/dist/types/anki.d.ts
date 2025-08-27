export interface AnkiField {
    id: string;
    name: string;
    ordinal: number;
    sticky: boolean;
    rtl: boolean;
    fontSize: number;
    description?: string;
}
export interface ModelConfiguration {
    sortf: number;
    did: number;
    latexPre: string;
    latexPost: string;
    mod: number;
    type: number;
    vers: Array<any>;
}
export interface AnkiTemplate {
    id: string;
    name: string;
    questionFormat: string;
    answerFormat: string;
    browserQuestionFormat?: string;
    browserAnswerFormat?: string;
    did?: number;
    ordinal: number;
}
export interface AnkiModel {
    id: string;
    name: string;
    templateHash: string;
    fields: AnkiField[];
    templates: AnkiTemplate[];
    css: string;
    configuration: ModelConfiguration;
    sanitized: boolean;
    mediaRefs: string[];
    securityLevel: 'safe' | 'warning' | 'dangerous';
    processingErrors: string[];
    importedAt: Date;
    sourceApkgHash: string;
    ankiVersion: string;
}
export interface AnkiCard {
    id: string;
    ankiModelId: string;
    ankiNoteId: string;
    fields: Record<string, string>;
    tags: string[];
    mediaFiles: AnkiMediaFile[];
    renderCache?: RenderedCardCache;
    sanitizedFields: Record<string, string>;
    securityWarnings: string[];
    hasUnsafeContent: boolean;
    originalDue: number;
    originalIvl: number;
    originalEase: number;
    originalReps: number;
    originalLapses: number;
    processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
    importErrors: string[];
    createdAt: Date;
    importedAt: Date;
    lastProcessed: Date;
}
export interface AnkiMediaFile {
    id: string;
    filename: string;
    originalFilename: string;
    originalSize: number;
    optimizedSize?: number;
    mimeType: string;
    status: 'pending' | 'optimizing' | 'ready' | 'failed';
    processingStartedAt?: Date;
    processingCompletedAt?: Date;
    originalUrl?: string;
    cdnUrl?: string;
    thumbnailUrl?: string;
    compressionRatio?: number;
    dimensions?: {
        width: number;
        height: number;
    };
    duration?: number;
    virusScanResult?: 'clean' | 'infected' | 'pending';
    contentValidated: boolean;
    securityWarnings: string[];
}
export interface SanitizationResult {
    sanitizedHtml: string;
    originalHtml: string;
    mediaReferences: string[];
    securityWarnings: string[];
    removedElements: string[];
    modifiedAttributes: string[];
    isSecure: boolean;
    sanitizationTime: number;
}
export interface RenderingContext {
    modelId: string;
    templateId: string;
    fieldData: Record<string, string>;
    mediaMap: Record<string, string>;
    cspNonce: string;
    renderingMode: 'question' | 'answer';
    theme?: string;
    allowedTags: string[];
    allowedAttributes: string[];
    sanitizationLevel: 'strict' | 'moderate' | 'permissive';
}
export interface RenderedCardCache {
    questionHtml: string;
    answerHtml: string;
    css: string;
    mediaUrls: string[];
    cacheKey: string;
    generatedAt: Date;
    expiresAt: Date;
    renderingTime: number;
}
export interface ImportProgress {
    importId: string;
    status: 'initializing' | 'parsing' | 'processing' | 'optimizing' | 'finalizing' | 'completed' | 'failed';
    currentPhase: string;
    totalItems: number;
    processedItems: number;
    failedItems: number;
    percentComplete: number;
    modelsFound: number;
    modelsProcessed: number;
    cardsFound: number;
    cardsProcessed: number;
    mediaFilesFound: number;
    mediaFilesProcessed: number;
    startedAt: Date;
    estimatedCompletionAt?: Date;
    throughput: number;
    errors: ImportError[];
    warnings: string[];
    memoryUsage?: number;
    diskUsage?: number;
}
export interface ImportError {
    type: 'parsing' | 'validation' | 'security' | 'database' | 'media' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: string;
    itemId?: string;
    retryable: boolean;
    timestamp: Date;
    stackTrace?: string;
}
export interface ImportConfiguration {
    chunkSize: number;
    maxFileSize: number;
    mediaOptimization: boolean;
    sanitizationLevel: 'strict' | 'moderate' | 'permissive';
    allowedMediaTypes: string[];
    maxMediaFileSize: number;
    virusScanEnabled: boolean;
    workerCount: number;
    timeoutMs: number;
    retryAttempts: number;
    skipDuplicateModels: boolean;
    skipDuplicateCards: boolean;
    duplicateThreshold: number;
}
export interface WorkerMessage {
    type: 'start' | 'progress' | 'complete' | 'error' | 'cancel';
    id: string;
    timestamp: Date;
    data?: any;
}
export interface WorkerStartMessage extends WorkerMessage {
    type: 'start';
    data: {
        fileBuffer: ArrayBuffer;
        config: ImportConfiguration;
        chunkSize: number;
    };
}
export interface WorkerProgressMessage extends WorkerMessage {
    type: 'progress';
    data: {
        completed: number;
        total: number;
        currentItem: string;
        errors: ImportError[];
        throughput: number;
    };
}
export interface WorkerCompleteMessage extends WorkerMessage {
    type: 'complete';
    data: {
        models: AnkiModel[];
        cards: AnkiCard[];
        mediaFiles: AnkiMediaFile[];
        summary: ImportSummary;
    };
}
export interface WorkerErrorMessage extends WorkerMessage {
    type: 'error';
    data: {
        error: ImportError;
        recoverable: boolean;
        partialResults?: {
            models: AnkiModel[];
            cards: AnkiCard[];
        };
    };
}
export interface ImportSummary {
    totalProcessingTime: number;
    modelsImported: number;
    cardsImported: number;
    mediaFilesProcessed: number;
    duplicatesSkipped: number;
    errorsEncountered: number;
    memoryPeakUsage: number;
    securityIssuesFound: number;
}
export interface SecurityAuditResult {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    findings: SecurityFinding[];
    recommendations: string[];
    auditedAt: Date;
    auditVersion: string;
}
export interface SecurityFinding {
    type: 'xss' | 'injection' | 'malicious_content' | 'suspicious_pattern' | 'unsafe_attribute';
    severity: 'info' | 'warning' | 'error' | 'critical';
    description: string;
    location: string;
    evidence: string;
    remediation: string;
    cveId?: string;
}
export interface ImportApiRequest {
    fileName: string;
    fileSize: number;
    fileHash: string;
    config: ImportConfiguration;
}
export interface ImportApiResponse {
    importId: string;
    status: 'accepted' | 'rejected';
    message?: string;
    estimatedDuration?: number;
}
export interface ImportStatusResponse {
    importId: string;
    progress: ImportProgress;
    logs: ImportError[];
    canCancel: boolean;
}
export interface AnkiModelRecord {
    id: string;
    name: string;
    template_hash: string;
    fields_json: string;
    templates_json: string;
    css: string;
    configuration_json: string;
    sanitized: boolean;
    security_level: string;
    media_refs_json: string;
    imported_at: string;
    source_apkg_hash: string;
    anki_version: string;
    processing_errors_json: string;
}
export interface EnhancedCardRecord {
    id: string;
    anki_model_id: string;
    anki_note_id: string;
    fields_json: string;
    tags_json: string;
    sanitized_fields_json: string;
    security_warnings_json: string;
    has_unsafe_content: boolean;
    processing_status: string;
    import_errors_json: string;
    imported_at: string;
    last_processed: string;
}
export interface MediaFileRecord {
    id: string;
    filename: string;
    original_filename: string;
    original_size: number;
    optimized_size?: number;
    mime_type: string;
    status: string;
    processing_started_at?: string;
    processing_completed_at?: string;
    original_url?: string;
    cdn_url?: string;
    thumbnail_url?: string;
    compression_ratio?: number;
    dimensions_json?: string;
    duration?: number;
    virus_scan_result?: string;
    content_validated: boolean;
    security_warnings_json: string;
}
//# sourceMappingURL=anki.d.ts.map
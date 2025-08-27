export interface MediaOptimizationRequest {
    fileId: string;
    filename: string;
    buffer: ArrayBuffer;
    originalMimeType: string;
    targetFormats: MediaFormat[];
    qualitySettings: OptimizationSettings;
}
export interface MediaOptimizationResult {
    fileId: string;
    originalSize: number;
    optimizedFiles: OptimizedMediaFile[];
    compressionRatio: number;
    processingTime: number;
    errors: string[];
    warnings: string[];
}
export interface OptimizedMediaFile {
    format: MediaFormat;
    buffer: ArrayBuffer;
    mimeType: string;
    size: number;
    quality: number;
    dimensions?: MediaDimensions;
    duration?: number;
    url?: string;
}
export interface MediaFormat {
    type: 'image' | 'audio' | 'video';
    format: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    bitrate?: number;
}
export interface MediaDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}
export interface OptimizationSettings {
    imageMaxWidth: number;
    imageMaxHeight: number;
    imageQuality: number;
    generateThumbnails: boolean;
    thumbnailSize: number;
    audioQuality: number;
    audioBitrate: number;
    audioSampleRate: number;
    videoMaxWidth: number;
    videoMaxHeight: number;
    videoQuality: number;
    videoBitrate: number;
    stripMetadata: boolean;
    progressive: boolean;
    preserveTransparency: boolean;
}
export interface MediaUploadRequest {
    fileId: string;
    filename: string;
    buffer: ArrayBuffer;
    mimeType: string;
    metadata: MediaMetadata;
    uploadPath: string;
}
export interface MediaUploadResult {
    fileId: string;
    success: boolean;
    url?: string;
    cdnUrl?: string;
    error?: string;
    uploadTime: number;
    size: number;
}
export interface MediaMetadata {
    originalName: string;
    size: number;
    mimeType: string;
    dimensions?: MediaDimensions;
    duration?: number;
    checksum: string;
    uploadedBy: string;
    uploadedAt: Date;
    tags?: string[];
}
export interface MediaValidationResult {
    isValid: boolean;
    mimeType: string;
    actualFormat: string;
    size: number;
    dimensions?: MediaDimensions;
    duration?: number;
    errors: MediaValidationError[];
    warnings: string[];
    securityRisk: 'low' | 'medium' | 'high';
}
export interface MediaValidationError {
    type: 'format' | 'size' | 'corruption' | 'security' | 'encoding';
    message: string;
    severity: 'warning' | 'error' | 'critical';
}
export interface MediaProcessingPipeline {
    id: string;
    stages: MediaProcessingStage[];
    currentStage: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    totalFiles: number;
    processedFiles: number;
    errors: MediaProcessingError[];
}
export interface MediaProcessingStage {
    name: string;
    description: string;
    processor: string;
    config: any;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}
export interface MediaProcessingError {
    stage: string;
    fileId: string;
    filename: string;
    error: string;
    retryable: boolean;
    timestamp: Date;
}
export interface ClientMediaProcessor {
    processImage(buffer: ArrayBuffer, options: ImageProcessingOptions): Promise<ArrayBuffer>;
    processAudio(buffer: ArrayBuffer, options: AudioProcessingOptions): Promise<ArrayBuffer>;
    validateMedia(buffer: ArrayBuffer, expectedType: string): Promise<MediaValidationResult>;
}
export interface ImageProcessingOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    progressive?: boolean;
    stripMetadata?: boolean;
}
export interface AudioProcessingOptions {
    format: 'mp3' | 'ogg' | 'wav';
    bitrate: number;
    sampleRate: number;
    quality: number;
    normalize?: boolean;
}
export interface ServerMediaProcessor {
    optimizeImage(request: MediaOptimizationRequest): Promise<MediaOptimizationResult>;
    optimizeAudio(request: MediaOptimizationRequest): Promise<MediaOptimizationResult>;
    optimizeVideo(request: MediaOptimizationRequest): Promise<MediaOptimizationResult>;
    generateThumbnail(buffer: ArrayBuffer, size: number): Promise<ArrayBuffer>;
}
export interface MediaStorageProvider {
    upload(request: MediaUploadRequest): Promise<MediaUploadResult>;
    download(url: string): Promise<ArrayBuffer>;
    delete(url: string): Promise<boolean>;
    getMetadata(url: string): Promise<MediaMetadata>;
}
export interface MediaProcessingQueue {
    id: string;
    name: string;
    priority: number;
    maxConcurrency: number;
    retryAttempts: number;
    items: MediaQueueItem[];
    status: 'active' | 'paused' | 'stopped';
    createdAt: Date;
}
export interface MediaQueueItem {
    id: string;
    fileId: string;
    priority: number;
    attempts: number;
    maxAttempts: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    addedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    processingTime?: number;
}
export interface CDNConfiguration {
    provider: 'cloudflare' | 'aws' | 'gcp' | 'azure' | 'local';
    endpoint: string;
    bucketName: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    customDomain?: string;
    cacheTtl: number;
    compressionEnabled: boolean;
}
export interface StorageQuota {
    totalBytes: number;
    usedBytes: number;
    remainingBytes: number;
    fileCount: number;
    quotaType: 'user' | 'organization' | 'system';
    resetDate?: Date;
}
export interface MediaProcessingMetrics {
    totalProcessed: number;
    totalSize: number;
    averageProcessingTime: number;
    compressionRatio: number;
    errorRate: number;
    throughput: number;
    costPerFile: number;
    storageUsed: number;
    bandwidthUsed: number;
}
export interface MediaProcessingStats {
    period: 'hour' | 'day' | 'week' | 'month';
    startDate: Date;
    endDate: Date;
    metrics: MediaProcessingMetrics;
    breakdown: {
        byFormat: Record<string, MediaProcessingMetrics>;
        bySize: Record<string, MediaProcessingMetrics>;
        byStage: Record<string, MediaProcessingMetrics>;
    };
}
export interface MediaRecoveryAction {
    type: 'retry' | 'skip' | 'manual' | 'fallback';
    description: string;
    automated: boolean;
    retryDelay?: number;
    maxRetries?: number;
    fallbackProcessor?: string;
}
export interface MediaErrorHandler {
    canHandle(error: MediaProcessingError): boolean;
    getRecoveryAction(error: MediaProcessingError): MediaRecoveryAction;
    handleError(error: MediaProcessingError): Promise<boolean>;
}
export interface MediaSecurityScan {
    fileId: string;
    scanType: 'virus' | 'malware' | 'content' | 'metadata';
    result: 'clean' | 'suspicious' | 'malicious' | 'error';
    threats: MediaThreat[];
    scannedAt: Date;
    scannerVersion: string;
    scanDuration: number;
}
export interface MediaThreat {
    type: string;
    name: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
    cveId?: string;
}
export interface ComplianceCheck {
    standard: string;
    requirement: string;
    status: 'compliant' | 'non-compliant' | 'unknown';
    details: string;
    checkedAt: Date;
}
export interface MediaBatchOperation {
    id: string;
    type: 'optimize' | 'convert' | 'validate' | 'upload' | 'delete';
    fileIds: string[];
    config: any;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
        total: number;
        completed: number;
        failed: number;
        skipped: number;
    };
    startedAt: Date;
    completedAt?: Date;
    results: MediaBatchResult[];
}
export interface MediaBatchResult {
    fileId: string;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    processingTime: number;
}
//# sourceMappingURL=media.d.ts.map
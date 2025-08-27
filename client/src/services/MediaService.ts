import { pb } from '../lib/pocketbase'
import { debugLogger } from '../utils/debugLogger'

export interface MediaMetadata {
  original_filename: string
  original_size: number
  mime_type: string
  status: 'pending' | 'optimizing' | 'ready' | 'failed'
  card_id?: string
  anki_model_id?: string
}

export interface MediaRecord {
  id: string
  filename: string
  original_filename: string
  original_size: number
  optimized_size?: number
  mime_type: string
  status: string
  media_file: string
  card_id?: string
  anki_model_id?: string
  created: string
  updated: string
}

export interface AnkiMediaFile {
  filename: string
  originalFilename: string
  data: ArrayBuffer
  mimeType: string
  originalSize: number
  id?: string
  cdnUrl?: string
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 
  'video/mp4', 'video/webm'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BATCH_SIZE = 100 * 1024 * 1024 // 100MB total

export class MediaService {
  /**
   * Upload a single media file to PocketBase
   */
  async uploadMediaFile(file: File, metadata: MediaMetadata): Promise<MediaRecord> {
    debugLogger.log('[MEDIA_SERVICE]', 'Uploading media file', {
      filename: file.name,
      size: file.size,
      type: file.type
    })

    // Validate file before upload
    this.validateFile(file)

    try {
      const formData = new FormData()
      
      // Add the file with the correct field name
      formData.append('media_file', file)
      
      // Add metadata fields
      formData.append('filename', this.sanitizeFilename(file.name))
      formData.append('original_filename', metadata.original_filename)
      formData.append('original_size', metadata.original_size.toString())
      formData.append('mime_type', metadata.mime_type)
      formData.append('status', metadata.status)
      formData.append('content_validated', 'true')
      
      // Optional relation fields
      if (metadata.card_id) {
        formData.append('card_id', metadata.card_id)
      }
      if (metadata.anki_model_id) {
        formData.append('anki_model_id', metadata.anki_model_id)
      }

      const record = await pb.collection('media_files').create(formData)

      debugLogger.log('[MEDIA_SERVICE]', 'Media file uploaded successfully', {
        id: record.id,
        filename: record.filename
      })

      return record as MediaRecord
    } catch (error) {
      debugLogger.error('[MEDIA_SERVICE]', 'Failed to upload media file', { error, filename: file.name })
      throw new Error(`Failed to upload media file: ${error}`)
    }
  }

  /**
   * Get media file URL via PocketBase
   */
  getMediaUrl(record: MediaRecord, filename?: string): string {
    try {
      const url = pb.files.getUrl(record, filename || record.media_file)
      debugLogger.log('[MEDIA_SERVICE]', 'Generated media URL', { 
        recordId: record.id, 
        filename: filename || record.media_file,
        url 
      })
      return url
    } catch (error) {
      debugLogger.error('[MEDIA_SERVICE]', 'Failed to generate media URL', { error, recordId: record.id })
      throw new Error(`Failed to generate media URL: ${error}`)
    }
  }

  /**
   * Delete media file from PocketBase
   */
  async deleteMediaFile(id: string): Promise<void> {
    try {
      await pb.collection('media_files').delete(id)
      debugLogger.log('[MEDIA_SERVICE]', 'Media file deleted successfully', { id })
    } catch (error) {
      debugLogger.error('[MEDIA_SERVICE]', 'Failed to delete media file', { error, id })
      throw new Error(`Failed to delete media file: ${error}`)
    }
  }

  /**
   * Batch upload media files (for Anki import)
   */
  async uploadMediaFiles(mediaFiles: AnkiMediaFile[]): Promise<AnkiMediaFile[]> {
    debugLogger.log('[MEDIA_SERVICE]', 'Starting batch media upload', { 
      count: mediaFiles.length,
      totalSize: mediaFiles.reduce((sum, file) => sum + file.originalSize, 0)
    })

    // Validate batch size
    const totalSize = mediaFiles.reduce((sum, file) => sum + file.originalSize, 0)
    if (totalSize > MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${totalSize} exceeds maximum ${MAX_BATCH_SIZE}`)
    }

    const savedMediaFiles: AnkiMediaFile[] = []
    const errors: string[] = []

    for (const mediaFile of mediaFiles) {
      try {
        // Convert ArrayBuffer to File object for PocketBase
        const blob = new Blob([mediaFile.data], { type: mediaFile.mimeType })
        const file = new File([blob], mediaFile.filename, { type: mediaFile.mimeType })
        
        // Upload to PocketBase
        const record = await this.uploadMediaFile(file, {
          original_filename: mediaFile.originalFilename,
          original_size: mediaFile.originalSize,
          mime_type: mediaFile.mimeType,
          status: 'ready'
        })
        
        savedMediaFiles.push({
          ...mediaFile,
          id: record.id,
          cdnUrl: this.getMediaUrl(record)
        })

        debugLogger.log('[MEDIA_SERVICE]', 'Media file processed successfully', {
          filename: mediaFile.filename,
          id: record.id
        })
        
      } catch (error) {
        const errorMsg = `Failed to process ${mediaFile.filename}: ${error}`
        errors.push(errorMsg)
        debugLogger.error('[MEDIA_SERVICE]', 'Media file processing failed', {
          filename: mediaFile.filename,
          error
        })
      }
    }

    if (errors.length > 0) {
      debugLogger.warn('[MEDIA_SERVICE]', 'Some media files failed to upload', { 
        successCount: savedMediaFiles.length,
        errorCount: errors.length,
        errors
      })
    }

    debugLogger.log('[MEDIA_SERVICE]', 'Batch media upload completed', {
      successCount: savedMediaFiles.length,
      errorCount: errors.length
    })

    return savedMediaFiles
  }

  /**
   * Get media files by card ID
   */
  async getMediaFilesByCardId(cardId: string): Promise<MediaRecord[]> {
    try {
      const records = await pb.collection('media_files').getFullList({
        filter: `card_id = "${cardId}"`,
        sort: 'created'
      })
      
      debugLogger.log('[MEDIA_SERVICE]', 'Retrieved media files for card', {
        cardId,
        count: records.length
      })
      
      return records as MediaRecord[]
    } catch (error) {
      debugLogger.error('[MEDIA_SERVICE]', 'Failed to get media files by card ID', { error, cardId })
      throw new Error(`Failed to get media files: ${error}`)
    }
  }

  /**
   * Validate file before upload (OWASP compliant)
   */
  private validateFile(file: File): void {
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${file.size} exceeds maximum ${MAX_FILE_SIZE}`)
    }

    // MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`)
    }

    // Filename validation
    if (!file.name || file.name.length === 0) {
      throw new Error('File name is required')
    }

    debugLogger.log('[MEDIA_SERVICE]', 'File validation passed', {
      name: file.name,
      size: file.size,
      type: file.type
    })
  }

  /**
   * Sanitize filename for security
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[\/\\]/g, '_')
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"'|?*\x00-\x1f]/g, '_')
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'))
      sanitized = sanitized.substring(0, 255 - ext.length) + ext
    }
    
    // Ensure it's not empty
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'unnamed_file'
    }

    return sanitized
  }
}
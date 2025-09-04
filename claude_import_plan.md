# 📋 Comprehensive Anki Media Import Implementation Plan

**Project**: StudyMaster PWA - Complete Media Support for Anki Deck Imports  
**Date**: September 2, 2025  
**Version**: 1.0  

## 🎯 Executive Summary

The current Anki import functionality partially extracts media files from .apkg packages but fails to properly store, serve, and render them in cards. This plan provides a complete implementation to support images, audio, and video media from imported Anki decks with proper optimization, security, and performance.

## 🔍 Current State Analysis

### ✅ Already Implemented
- Media extraction from .apkg files via `extractMediaFiles()` in `ankiImportWorker.js`
- Media file structure parsing (reading `media` JSON mapping file)  
- Basic media file validation and type detection
- `MediaService` class with PocketBase upload/download capabilities
- Media storage infrastructure via PocketBase
- Security-focused file validation and sanitization
- Comprehensive media type definitions in `shared/types/media.ts`

### ❌ Missing/Incomplete
1. **Media Reference Resolution**: Cards reference original filenames, but rendered content doesn't resolve to stored media URLs
2. **Media Serving**: No mechanism to serve media files to card renderer
3. **Media URL Substitution**: HTML content doesn't get media references replaced with actual URLs
4. **Offline Media Access**: No offline caching of media files
5. **Media Optimization**: Images/audio not optimized for web delivery
6. **Media Cleanup**: Orphaned media files not cleaned up on deck deletion
7. **Media Validation**: Limited content validation for imported media
8. **Progress Reporting**: Media processing progress not properly reported

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANKI MEDIA IMPORT SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│  │   .apkg      │───▶│  Media         │───▶│   Enhanced      │  │
│  │  Extraction  │    │  Processing    │    │  Card Renderer  │  │
│  │              │    │  Pipeline      │    │                 │  │
│  └──────────────┘    └────────────────┘    └─────────────────┘  │
│           │                   │                        │        │
│           ▼                   ▼                        ▼        │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│  │   Media      │───▶│   PocketBase   │───▶│   Offline       │  │
│  │  Validation  │    │    Storage     │    │   Cache         │  │
│  │              │    │                │    │                 │  │
│  └──────────────┘    └────────────────┘    └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Extraction**: Worker extracts media files and mapping from .apkg
2. **Processing**: Media files undergo validation, optimization, and security scanning
3. **Storage**: Processed media saved to PocketBase with metadata
4. **Reference Mapping**: Create mapping between original filenames and stored URLs
5. **Card Rendering**: HTML content gets media references replaced with actual URLs
6. **Caching**: Media files cached locally for offline access

## 📋 User Stories

### Epic 1: Basic Media Support
- **US-1.1**: As a user, I can import Anki decks with images and see the images displayed correctly in cards
- **US-1.2**: As a user, I can import Anki decks with audio files and play audio directly from cards
- **US-1.3**: As a user, I can study cards with media content offline after initial download
- **US-1.4**: As a user, I receive clear feedback when media files fail to import

### Epic 2: Advanced Media Features  
- **US-2.1**: As a user, imported images are automatically optimized for faster loading
- **US-2.2**: As a user, I can preview media files before importing a deck
- **US-2.3**: As a user, I can selectively import/exclude media during deck import
- **US-2.4**: As a user, media files are automatically cleaned up when I delete a deck

### Epic 3: Performance & Security
- **US-3.1**: As a user, large media files don't block the UI during import
- **US-3.2**: As a user, malicious media files are detected and blocked during import
- **US-3.3**: As a user, I can see detailed import progress including media processing
- **US-3.4**: As a user, media files load quickly due to efficient caching

## 🔧 Technical Implementation Plan

### Phase 1: Core Media Pipeline (Week 1-2)

#### 1.1 Enhanced Media Extraction
**File**: `client/public/workers/ankiImportWorker.js`

```javascript
// Enhanced extractMediaFiles function
async function extractMediaFiles(zipContent, config = {}) {
  const mediaFiles = []
  const mediaMap = new Map() // original filename -> processed info
  
  try {
    const mediaFile = zipContent.file('media')
    if (!mediaFile) return { mediaFiles, mediaMap }

    const mediaJson = await mediaFile.async('text')
    const mediaMappingFromAnki = JSON.parse(mediaJson)

    // Process each media file with enhanced validation
    for (const [ordinal, originalFilename] of Object.entries(mediaMappingFromAnki)) {
      const fileData = zipContent.file(ordinal)
      if (fileData) {
        const arrayBuffer = await fileData.async('arraybuffer')
        
        // Enhanced validation
        const validationResult = await validateMediaContent(arrayBuffer, originalFilename)
        if (!validationResult.isValid) {
          logError(`Media validation failed for ${originalFilename}: ${validationResult.errors.join(', ')}`)
          continue
        }
        
        // Optimization (if enabled)
        let processedBuffer = arrayBuffer
        if (config.optimizeMedia && validationResult.canOptimize) {
          processedBuffer = await optimizeMediaFile(arrayBuffer, validationResult.mediaType)
        }
        
        const mediaFileRecord = {
          id: generateId(),
          filename: sanitizeFilename(originalFilename),
          originalFilename,
          data: processedBuffer,
          originalSize: arrayBuffer.byteLength,
          processedSize: processedBuffer.byteLength,
          mimeType: validationResult.detectedMimeType,
          mediaType: validationResult.mediaType, // 'image', 'audio', 'video'
          dimensions: validationResult.dimensions,
          duration: validationResult.duration,
          status: 'processed',
          securityScan: validationResult.securityScan,
          optimizationApplied: processedBuffer !== arrayBuffer
        }
        
        mediaFiles.push(mediaFileRecord)
        mediaMap.set(originalFilename, {
          processedFilename: mediaFileRecord.filename,
          mediaId: mediaFileRecord.id,
          mimeType: mediaFileRecord.mimeType
        })
      }
    }
    
    return { mediaFiles, mediaMap }
  } catch (error) {
    logError(`Failed to extract media files: ${error.message}`)
    return { mediaFiles: [], mediaMap: new Map() }
  }
}
```

#### 1.2 Media Content Validation
**New File**: `client/src/services/anki/MediaValidator.ts`

```typescript
export interface MediaValidationResult {
  isValid: boolean
  detectedMimeType: string
  mediaType: 'image' | 'audio' | 'video' | 'unknown'
  canOptimize: boolean
  dimensions?: { width: number; height: number }
  duration?: number
  errors: string[]
  warnings: string[]
  securityScan: {
    safe: boolean
    threats: string[]
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export class MediaValidator {
  // Validate media content by examining file headers and metadata
  async validateMediaContent(buffer: ArrayBuffer, filename: string): Promise<MediaValidationResult>
  
  // Check for malicious content patterns
  private async scanForThreats(buffer: ArrayBuffer, mediaType: string): Promise<SecurityScanResult>
  
  // Extract metadata from media files
  private async extractMetadata(buffer: ArrayBuffer, mediaType: string): Promise<MediaMetadata>
}
```

#### 1.3 Media URL Resolution Service  
**New File**: `client/src/services/anki/MediaUrlResolver.ts`

```typescript
export interface MediaUrlMapping {
  originalFilename: string
  storedUrl: string
  mediaId: string
  mimeType: string
  cached: boolean
  offlineAvailable: boolean
}

export class MediaUrlResolver {
  private urlMappings: Map<string, MediaUrlMapping> = new Map()
  
  // Build URL mappings after media files are stored
  async buildMappingsFromImport(mediaFiles: AnkiMediaFile[], savedMediaFiles: MediaRecord[]): Promise<void>
  
  // Replace media references in HTML content  
  async resolveMediaReferences(htmlContent: string, deckId: string): Promise<string>
  
  // Get specific media URL
  getMediaUrl(originalFilename: string, deckId: string): string | null
  
  // Cache media for offline access
  async cacheMediaForOffline(mediaFiles: MediaUrlMapping[]): Promise<void>
}
```

#### 1.4 Enhanced Card Renderer Integration
**Update File**: `client/src/components/study/SecureCardRenderer.tsx`

```typescript
// Add media resolution to the rendering pipeline
export const SecureCardRenderer: React.FC<SecureCardRendererProps> = ({
  model,
  template, 
  fieldData,
  renderMode,
  mediaMap = {}, // Original -> URL mapping
  deckId, // NEW: Required for media resolution
  // ... other props
}) => {
  
  // Process template and field data through media resolver
  const processedTemplate = useMemo(() => {
    return MediaUrlResolver.resolveMediaReferences(
      renderMode === 'question' ? template.questionFormat : template.answerFormat,
      deckId
    )
  }, [template, renderMode, deckId])
  
  const processedFieldData = useMemo(() => {
    const processed = { ...fieldData }
    Object.keys(processed).forEach(key => {
      processed[key] = MediaUrlResolver.resolveMediaReferences(processed[key], deckId)
    })
    return processed
  }, [fieldData, deckId])
  
  // ... rest of component logic
}
```

### Phase 2: Performance Optimization (Week 3)

#### 2.1 Media Optimization Pipeline
**New File**: `client/src/services/anki/MediaOptimizer.ts`

```typescript
export class MediaOptimizer {
  // Optimize images (WebP conversion, resizing, quality adjustment)
  async optimizeImage(buffer: ArrayBuffer, options: ImageOptimizationOptions): Promise<ArrayBuffer>
  
  // Optimize audio (format conversion, bitrate adjustment) 
  async optimizeAudio(buffer: ArrayBuffer, options: AudioOptimizationOptions): Promise<ArrayBuffer>
  
  // Generate thumbnails for images and video
  async generateThumbnail(buffer: ArrayBuffer, size: number): Promise<ArrayBuffer>
  
  // Calculate optimization potential
  getOptimizationRecommendations(mediaFiles: AnkiMediaFile[]): OptimizationRecommendation[]
}
```

#### 2.2 Progressive Media Loading
**New File**: `client/src/services/anki/MediaLoader.ts`

```typescript
export class MediaLoader {
  private loadingQueue: PriorityQueue<MediaLoadRequest>
  private cache: Map<string, ArrayBuffer>
  
  // Load media with priority (visible cards first)
  async loadMedia(mediaId: string, priority: 'high' | 'medium' | 'low'): Promise<string>
  
  // Preload media for upcoming cards
  async preloadMediaForDeck(deckId: string, cardIds: string[]): Promise<void>
  
  // Background sync for offline availability  
  async syncMediaForOffline(deckId: string): Promise<void>
}
```

### Phase 3: Advanced Features (Week 4)

#### 3.1 Media Management UI
**New File**: `client/src/components/anki/MediaManager.tsx`

```tsx
export const MediaManager: React.FC<{deckId: string}> = ({ deckId }) => {
  // Show media files associated with deck
  // Allow preview, deletion, re-optimization
  // Display storage usage and optimization savings
  // Manage offline sync settings
}
```

#### 3.2 Import Preview with Media
**Update File**: `client/src/components/anki/AnkiImportModal.tsx`

```tsx
// Add media preview capabilities
const [mediaPreview, setMediaPreview] = useState<MediaPreviewData[]>([])

// Show media files that will be imported
// Allow selective import/exclusion of media files
// Display storage requirements and optimization options
```

#### 3.3 Background Media Processing
**New File**: `client/src/services/anki/MediaProcessingQueue.ts`

```typescript
export class MediaProcessingQueue {
  // Queue media for background processing
  async queueMediaProcessing(mediaFiles: AnkiMediaFile[], options: ProcessingOptions): Promise<string>
  
  // Monitor processing progress
  getProcessingStatus(queueId: string): ProcessingStatus
  
  // Handle processing results
  onProcessingComplete(queueId: string, callback: (results: ProcessingResults) => void): void
}
```

## 🗄️ Database Schema Updates

### Enhanced Media Files Collection
```sql
-- PocketBase Collection: media_files (enhanced)
{
  "id": "string", 
  "filename": "string",
  "original_filename": "string", 
  "original_size": "number",
  "optimized_size": "number", 
  "mime_type": "string",
  "media_type": "string", // 'image', 'audio', 'video'
  "status": "string", // 'pending', 'processing', 'ready', 'failed'
  "media_file": "file", // Actual file data
  "thumbnail": "file", // Generated thumbnail (optional)
  "dimensions": "json", // {width, height} for images/video 
  "duration": "number", // Duration for audio/video
  "optimization_applied": "bool",
  "compression_ratio": "number",
  "security_scan_result": "json",
  "deck_id": "relation", // Link to deck
  "card_ids": "json", // Array of card IDs using this media
  "anki_model_id": "string",
  "offline_available": "bool",
  "last_accessed": "datetime",
  "access_count": "number",
  "created": "datetime",
  "updated": "datetime"
}
```

### Media URL Mappings Collection
```sql  
-- PocketBase Collection: media_url_mappings
{
  "id": "string",
  "deck_id": "relation",
  "original_filename": "string", 
  "media_file_id": "relation",
  "resolved_url": "string",
  "cdn_url": "string", // If using CDN
  "created": "datetime",
  "updated": "datetime"
}
```

## 🧪 Testing Strategy

### Unit Tests

#### Media Extraction Tests
**File**: `client/src/services/anki/__tests__/MediaExtraction.test.ts`
```typescript
describe('Media Extraction', () => {
  test('extracts media files from apkg', async () => {
    // Test with Spanish_Top_5000_Vocabulary.apkg
  })
  
  test('handles missing media gracefully', async () => {
    // Test with deck without media
  })
  
  test('validates media content properly', async () => {
    // Test with various file types and malicious content
  })
})
```

#### Media URL Resolution Tests  
**File**: `client/src/services/anki/__tests__/MediaUrlResolver.test.ts`
```typescript
describe('Media URL Resolution', () => {
  test('resolves image references in HTML', async () => {
    const html = '<img src="image.jpg">'
    const resolved = await resolver.resolveMediaReferences(html, 'deck123')
    expect(resolved).toContain('pocketbase-url')
  })
  
  test('resolves audio references', async () => {
    const html = '[sound:audio.mp3]'
    // Test Anki sound tag resolution
  })
})
```

### Integration Tests

#### End-to-End Import Tests
**File**: `client/src/services/anki/__tests__/MediaImportE2E.test.ts`
```typescript
describe('Media Import E2E', () => {
  test('imports deck with media and renders correctly', async () => {
    // Full workflow test with real apkg file
    const file = await loadTestApkg('Spanish_Top_5000_Vocabulary.apkg')
    const summary = await orchestrator.importAnkiDeck(file)
    
    // Verify media files were imported
    expect(summary.mediaFilesProcessed).toBeGreaterThan(0)
    
    // Verify cards render with media
    const deck = await getDeckById(summary.deckId)
    const cards = await getCardsForDeck(summary.deckId) 
    
    for (const card of cards.slice(0, 5)) { // Test first 5 cards
      const renderedHtml = await renderCard(card)
      // Verify no broken media references
      expect(renderedHtml).not.toMatch(/src=["'][^"']*\.(jpg|png|gif|mp3|wav)["']/)
      // Verify PocketBase URLs present
      expect(renderedHtml).toMatch(/pocketbase.*files/)
    }
  })
})
```

### Performance Tests
**File**: `client/src/services/anki/__tests__/MediaPerformance.test.ts`
```typescript
describe('Media Performance', () => {
  test('handles large media files efficiently', async () => {
    // Test with deck containing large images/audio
    const startTime = Date.now()
    const summary = await orchestrator.importAnkiDeck(largeDeckFile)
    const duration = Date.now() - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(60000) // 1 minute
    expect(summary.mediaFilesProcessed).toBeGreaterThan(100)
  })
  
  test('optimizes media file sizes', async () => {
    const summary = await orchestrator.importAnkiDeck(deckWithLargeMedia)
    
    // Check optimization was applied
    const mediaFiles = await getMediaFilesForDeck(summary.deckId)
    const totalOptimized = mediaFiles.filter(f => f.optimization_applied).length
    const avgCompressionRatio = mediaFiles.reduce((sum, f) => sum + (f.compression_ratio || 1), 0) / mediaFiles.length
    
    expect(totalOptimized).toBeGreaterThan(0)
    expect(avgCompressionRatio).toBeLessThan(1) // Files were compressed
  })
})
```

## 🚀 Deployment Plan

### Development Environment Setup

1. **Media Processing Dependencies**
   ```bash
   npm install sharp # Image processing
   npm install fluent-ffmpeg # Audio/video processing  
   npm install file-type # File type detection
   npm install image-size # Image dimensions
   ```

2. **Development Configuration**
   ```typescript
   // Add to environment configuration
   MEDIA_OPTIMIZATION_ENABLED=true
   MEDIA_CACHE_SIZE_MB=100
   MEDIA_OFFLINE_SYNC_ENABLED=true
   MEDIA_PROCESSING_CONCURRENCY=2
   ```

### Production Deployment

#### Phase 1: Core Functionality (Week 5)
- Deploy media extraction and basic rendering
- Enable media storage via PocketBase
- Basic validation and security scanning

#### Phase 2: Optimization & Performance (Week 6) 
- Deploy media optimization pipeline
- Enable progressive loading and caching
- Performance monitoring and alerts

#### Phase 3: Advanced Features (Week 7)
- Deploy media management UI  
- Enable selective import and preview
- Background processing and sync

### Monitoring & Alerts

1. **Media Processing Metrics**
   - Media files processed per hour
   - Average processing time per file  
   - Optimization savings ratio
   - Failed processing rate

2. **Storage Monitoring**
   - Total media storage usage
   - Storage growth rate
   - Orphaned media cleanup effectiveness

3. **Performance Monitoring** 
   - Media loading times
   - Cache hit rates
   - Offline sync success rates

## 🎯 Success Criteria

### Functional Requirements ✅
- [ ] Import Spanish_Top_5000_Vocabulary.apkg with full media support
- [ ] Images display correctly in card study interface
- [ ] Audio files play directly from cards  
- [ ] Media files available offline after import
- [ ] Malicious media files blocked during import
- [ ] Media references resolved to proper URLs in all contexts

### Performance Requirements ✅
- [ ] Large decks (>1000 cards, >100MB media) import in under 5 minutes
- [ ] Media optimization reduces file sizes by average 30%
- [ ] Media loading doesn't block card transitions (< 200ms)
- [ ] Offline media access works without network
- [ ] Background processing doesn't impact UI responsiveness

### Security Requirements ✅  
- [ ] All imported media files scanned for malicious content
- [ ] Media file validation prevents execution of embedded scripts
- [ ] Media URLs secured via PocketBase authentication  
- [ ] No sensitive data leaked through media metadata
- [ ] File upload limits enforced (10MB per file, 100MB per deck)

## 🚧 Risk Mitigation

### High Risk Issues
1. **Large File Performance**: Use streaming processing and web workers
2. **Storage Costs**: Implement media optimization and cleanup policies
3. **Security Vulnerabilities**: Comprehensive validation and sandboxing  
4. **Browser Compatibility**: Test across all target browsers
5. **Offline Storage Limits**: Implement selective caching with user controls

### Fallback Plans
1. **Media Processing Failures**: Continue import without media, log failures
2. **Storage Quota Exceeded**: Provide media cleanup tools, warn users
3. **Optimization Failures**: Store original files, disable optimization
4. **Network Issues**: Queue operations, retry with exponential backoff

## 📈 Future Enhancements  

### Phase 2 Features (Months 2-3)
- **Advanced Media Search**: Search cards by media content type
- **Media Compression Options**: User-configurable optimization settings
- **Batch Media Operations**: Bulk optimize, convert, or cleanup media
- **Media Analytics**: Usage statistics and storage optimization recommendations

### Phase 3 Features (Months 4-6)  
- **CDN Integration**: Serve media via CloudFlare/AWS CloudFront
- **Advanced Security**: AI-powered content moderation
- **Media Collaboration**: Share optimized media between users
- **Format Conversion**: Convert between different media formats

## 📝 Implementation Checklist

### Week 1: Foundation
- [ ] Enhance `extractMediaFiles()` with validation  
- [ ] Create `MediaValidator` class
- [ ] Create `MediaUrlResolver` class
- [ ] Update `SecureCardRenderer` for media resolution
- [ ] Write unit tests for core functions

### Week 2: Integration  
- [ ] Update `AnkiImportOrchestrator` for enhanced media handling
- [ ] Implement media storage workflow  
- [ ] Create media URL mapping system
- [ ] Test with Spanish_Top_5000_Vocabulary.apkg
- [ ] Write integration tests

### Week 3: Optimization
- [ ] Create `MediaOptimizer` class
- [ ] Implement image optimization pipeline
- [ ] Add audio processing capabilities
- [ ] Create `MediaLoader` with progressive loading
- [ ] Performance testing and optimization

### Week 4: Advanced Features
- [ ] Create `MediaManager` UI component
- [ ] Add media preview to import modal
- [ ] Implement background processing queue
- [ ] Add offline sync capabilities
- [ ] Comprehensive E2E testing

### Week 5-7: Deployment & Polish
- [ ] Production deployment with monitoring
- [ ] User acceptance testing  
- [ ] Performance tuning
- [ ] Documentation and training
- [ ] Security audit and penetration testing

---

**Plan Status**: Ready for Implementation  
**Estimated Effort**: 7 weeks (1 developer)  
**Priority**: High - Core functionality blocking user adoption  
**Dependencies**: None - leverages existing PocketBase and worker infrastructure
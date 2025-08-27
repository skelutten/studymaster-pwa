# StudyMaster PWA Media Display Fix - Implementation Blueprint v2.0

## Project Overview

**Problem**: Media files imported from Anki packages (.apkg) are not visible in the card management interface, despite being successfully stored in the database.

**Goal**: Fix the media display pipeline from import to UI with production-ready security and performance.

**Test Case**: Spanish_Top_5000_Vocabulary.apkg (79.5MB) imported by user 'gurka'

---

## Implementation Strategy

This plan follows a **security-first, foundation-first approach** with small, safe incremental steps. Each step is fully secured and integrated before moving to the next.

### Phase Distribution:
- **Phase 0**: Security & Environment Setup (Critical - 3 steps)
- **Phase 1**: Core data pipeline fixes (Critical Path - 5 steps)
- **Phase 2**: Secure UI integration (High Priority - 4 steps) 
- **Phase 3**: Enhanced media previews (Medium Priority - 5 steps)
- **Phase 4**: Validation & testing (Required - 3 steps)

---

## Phase 0: Security & Environment Setup (CRITICAL)

### Step 0.1: Environment & Schema Validation
**Complexity**: Low | **Risk**: High if not done | **Dependencies**: None

**Tasks**:
- Verify PocketBase media_files collection has card_id field
- Validate MediaReference interface exists and matches requirements
- Check CDN configuration and media serving endpoints
- Verify environment variables for media storage paths
- Test media access permissions in development/production

```typescript
// Schema validation script
async function validateEnvironment() {
  // Check PocketBase schema
  const collection = await pb.collection('media_files').getList(1, 1)
  const hasCardId = collection.items[0]?.card_id !== undefined
  
  // Check MediaReference interface
  const testRef: MediaReference = {
    id: 'test',
    type: 'image',
    url: 'test.jpg',
    filename: 'test.jpg', 
    size: 1000
  }
  
  console.log({ hasCardId, mediaRefValid: !!testRef })
}
```

**Validation**: Environment checklist passes before proceeding

### Step 0.2: Security Foundation Setup
**Complexity**: Medium | **Risk**: Critical | **Dependencies**: Step 0.1

**Tasks**:
- Add HTML sanitization utility using DOMPurify or similar
- Create media file validation service (MIME types, file sizes, magic bytes)
- Implement Content Security Policy updates for media embedding
- Add media access control validation
- Create security logging for media operations

```typescript
// Add to client/src/utils/securityUtils.ts
import DOMPurify from 'isomorphic-dompurify'

export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'div', 'span', 'p'],
    ALLOWED_ATTR: ['class', 'style']
  })
}

export const validateMediaFile = (file: AnkiMediaFile): boolean => {
  // MIME type validation
  const allowedTypes = ['image/', 'audio/', 'video/']
  if (!allowedTypes.some(type => file.mimeType.startsWith(type))) {
    throw new Error(`Invalid media type: ${file.mimeType}`)
  }
  
  // Size validation (max 50MB)
  if (file.originalSize > 50 * 1024 * 1024) {
    throw new Error(`File too large: ${file.originalSize} bytes`)
  }
  
  // Filename validation
  if (!/^[a-zA-Z0-9._-]+$/.test(file.originalFilename)) {
    throw new Error(`Invalid filename: ${file.originalFilename}`)
  }
  
  return true
}
```

**Validation**: Security tests pass, no XSS vulnerabilities detected

### Step 0.3: Media Access Control Setup
**Complexity**: Medium | **Risk**: High | **Dependencies**: Step 0.2

**Tasks**:
- Implement media URL access validation
- Add user authentication checks for media access
- Configure CDN security headers
- Set up media file cleanup for orphaned files
- Add audit logging for media access

```typescript
// Add to MediaService.ts
async validateMediaAccess(mediaId: string, userId: string): Promise<boolean> {
  try {
    const media = await pb.collection('media_files').getOne(mediaId)
    const card = await pb.collection('cards').getOne(media.card_id)
    const deck = await pb.collection('decks').getOne(card.deckId)
    
    // Check user owns the deck
    return deck.userId === userId
  } catch (error) {
    securityLogger.warn('[MEDIA_ACCESS]', 'Unauthorized access attempt', { mediaId, userId })
    return false
  }
}
```

**Validation**: Media access properly restricted to authorized users

---

## Phase 1: Fix Core Data Pipeline (Critical Path)

### Step 1.1: Add Secure Media Type Detection Utility
**Complexity**: Low | **Risk**: Low | **Dependencies**: Phase 0 complete

```typescript
// Add to AnkiImportOrchestrator.ts
private getMediaType(mimeType: string): 'image' | 'audio' | 'video' {
  // Strict MIME type validation
  const validTypes = {
    'image/jpeg': 'image',
    'image/png': 'image', 
    'image/gif': 'image',
    'image/webp': 'image',
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/ogg': 'audio',
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/ogg': 'video'
  } as const
  
  if (mimeType in validTypes) {
    return validTypes[mimeType as keyof typeof validTypes]
  }
  
  // Log suspicious MIME types
  securityLogger.warn('[MEDIA_TYPE]', 'Unknown MIME type', { mimeType })
  throw new Error(`Unsupported media type: ${mimeType}`)
}
```

**Validation**: Unit test with valid/invalid MIME types, security logging works

### Step 1.2: Add Secure MediaService Card Association Method
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Step 1.1

```typescript
// Add to MediaService.ts
async updateMediaFileCardId(mediaId: string, cardId: string, userId: string): Promise<MediaRecord> {
  try {
    // Validate media file exists and user has access
    const media = await pb.collection('media_files').getOne(mediaId)
    if (media.userId !== userId) {
      throw new Error('Unauthorized media access')
    }
    
    // Validate card exists and user owns it
    const card = await pb.collection('cards').getOne(cardId)
    const deck = await pb.collection('decks').getOne(card.deckId)
    if (deck.userId !== userId) {
      throw new Error('Unauthorized card access')
    }
    
    const record = await pb.collection('media_files').update(mediaId, {
      card_id: cardId,
      updated_at: new Date().toISOString()
    })
    
    auditLogger.info('[MEDIA_ASSOCIATION]', 'Media linked to card', { mediaId, cardId, userId })
    return record as MediaRecord
  } catch (error) {
    debugLogger.error('[MEDIA_SERVICE]', 'Failed to update media file card ID', { error, mediaId, cardId, userId })
    throw new Error(`Failed to update media file: ${error}`)
  }
}
```

**Validation**: Authorization tests pass, audit logging works

### Step 1.3: Add Secure Media Conversion Helper Method
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Steps 1.1, 1.2

```typescript
// Add to AnkiImportOrchestrator.ts
private async convertAnkiMediaToMediaRefs(
  mediaFiles: AnkiMediaFile[], 
  cardId: string,
  userId: string
): Promise<MediaReference[]> {
  const mediaRefs: MediaReference[] = []
  
  for (const mediaFile of mediaFiles) {
    if (!mediaFile.id) continue // Skip if not saved to PocketBase
    
    try {
      // Security validation
      validateMediaFile(mediaFile)
      
      // Update media record with card association
      await this.mediaService.updateMediaFileCardId(mediaFile.id, cardId, userId)
      
      // Validate CDN URL is safe
      if (!this.isValidMediaUrl(mediaFile.cdnUrl)) {
        throw new Error(`Invalid media URL: ${mediaFile.cdnUrl}`)
      }
      
      mediaRefs.push({
        id: mediaFile.id,
        type: this.getMediaType(mediaFile.mimeType),
        url: mediaFile.cdnUrl!,
        filename: sanitizeFilename(mediaFile.originalFilename),
        size: mediaFile.originalSize
      })
    } catch (error) {
      securityLogger.warn('[MEDIA_CONVERSION]', `Failed to process media file`, { 
        filename: mediaFile.filename, 
        error: error.message,
        userId 
      })
    }
  }
  
  return mediaRefs
}

private isValidMediaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'https:' && 
           (urlObj.hostname.includes(process.env.CDN_DOMAIN) || 
            urlObj.hostname.includes('pocketbase'))
  } catch {
    return false
  }
}
```

**Validation**: Security tests pass, malicious URLs rejected

### Step 1.4: Update Card Creation to Include Secure MediaRefs
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 1.3

```typescript
// Modify convertAnkiCardToCard method in AnkiImportOrchestrator.ts
private async convertAnkiCardToCard(
  ankiCard: AnkiCard, 
  deck: Deck,
  userId: string
): Promise<CardCreateData> {
  try {
    // First create the card without media
    const cardData = {
      deckId: deck.id,
      frontContent: sanitizeHTML(this.extractCardFront(ankiCard)),
      backContent: sanitizeHTML(this.extractCardBack(ankiCard)),
      cardType: { type: 'basic' as const }
    }
    
    // Create card to get ID
    const savedCard = await pb.collection('cards').create(cardData)
    
    // Then add media refs securely
    const mediaRefs = await this.convertAnkiMediaToMediaRefs(
      ankiCard.mediaFiles, 
      savedCard.id,
      userId
    )
    
    // Update card with media refs if any exist
    if (mediaRefs.length > 0) {
      await pb.collection('cards').update(savedCard.id, { 
        mediaRefs,
        hasMedia: true 
      })
    }
    
    return { ...savedCard, mediaRefs }
  } catch (error) {
    debugLogger.error('[CARD_CONVERSION]', 'Failed to convert Anki card', { error, userId })
    throw error
  }
}
```

**Validation**: Cards created securely with sanitized content and validated media

### Step 1.5: Verify Secure Database Integration
**Complexity**: Low | **Risk**: Medium | **Dependencies**: Step 1.4

**Tasks**:
- Test import flow end-to-end with security validation
- Verify media_files.card_id is populated correctly
- Confirm Card.mediaRefs contains validated data
- Test with malicious/invalid media files
- Verify audit logging is working

**Validation**: Security tests pass, malicious content rejected

---

## Phase 2: Secure UI Integration (High Priority)

### Step 2.1: Create Secure MediaIndicator Component
**Complexity**: Low | **Risk**: Low | **Dependencies**: Phase 1 complete

```typescript
// Create client/src/components/media/MediaIndicator.tsx
import { MediaReference } from '@/types'
import { validateMediaAccess } from '@/utils/securityUtils'

interface MediaIndicatorProps {
  mediaRefs: MediaReference[]
  userId: string
}

export const MediaIndicator: React.FC<MediaIndicatorProps> = ({ mediaRefs, userId }) => {
  // Filter out media files user doesn't have access to
  const [accessibleMedia, setAccessibleMedia] = useState<MediaReference[]>([])
  
  useEffect(() => {
    const validateAccess = async () => {
      const validated = []
      for (const media of mediaRefs) {
        try {
          const hasAccess = await validateMediaAccess(media.id, userId)
          if (hasAccess) validated.push(media)
        } catch (error) {
          console.warn(`Access denied for media ${media.id}`)
        }
      }
      setAccessibleMedia(validated)
    }
    
    validateAccess()
  }, [mediaRefs, userId])
  
  const imageCount = accessibleMedia.filter(m => m.type === 'image').length
  const audioCount = accessibleMedia.filter(m => m.type === 'audio').length
  const videoCount = accessibleMedia.filter(m => m.type === 'video').length

  if (accessibleMedia.length === 0) return null

  return (
    <div className="flex gap-2 mt-2" role="group" aria-label="Media indicators">
      {imageCount > 0 && (
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          aria-label={`${imageCount} image${imageCount > 1 ? 's' : ''}`}
        >
          📷 {imageCount}
        </span>
      )}
      {audioCount > 0 && (
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          aria-label={`${audioCount} audio file${audioCount > 1 ? 's' : ''}`}
        >
          🎵 {audioCount}
        </span>
      )}
      {videoCount > 0 && (
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
          aria-label={`${videoCount} video${videoCount > 1 ? 's' : ''}`}
        >
          🎬 {videoCount}
        </span>
      )}
    </div>
  )
}
```

**Validation**: Component respects access controls, accessible, secure

### Step 2.2: Update CardManager with Secure Rendering
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 2.1

```typescript
// Modify client/src/components/deck/CardManager.tsx
import { sanitizeHTML } from '@/utils/securityUtils'
import { MediaIndicator } from '@/components/media/MediaIndicator'

// In card display section
<div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px]">
  <div 
    dangerouslySetInnerHTML={{ __html: sanitizeHTML(card.frontContent) }} 
    className="prose prose-sm dark:prose-invert max-w-none"
  />
  {card.mediaRefs?.length > 0 && (
    <MediaIndicator 
      mediaRefs={card.mediaRefs} 
      userId={user.id}
    />
  )}
</div>

// Add CSP meta tag to document head
<meta httpEquiv="Content-Security-Policy" 
      content="default-src 'self'; img-src 'self' https://*.pocketbase.com https://*.cdn.domain.com; media-src 'self' https://*.pocketbase.com; style-src 'self' 'unsafe-inline'" />
```

**Validation**: HTML sanitization works, CSP prevents XSS, media indicators secure

### Step 2.3: Add Secure Media Summary Section
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 2.2

```typescript
// Add below card content in CardManager.tsx with security checks
{card.mediaRefs?.length > 0 && user && (
  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
      Media: {card.mediaRefs.length} files
      {card.mediaRefs.length !== accessibleMediaCount && (
        <span className="ml-2 text-amber-600">
          ({accessibleMediaCount} accessible)
        </span>
      )}
    </div>
    <Suspense fallback={<div>Loading media...</div>}>
      <SecureMediaList 
        mediaRefs={card.mediaRefs} 
        userId={user.id}
      />
    </Suspense>
  </div>
)}
```

**Validation**: Access controls respected, loading states handled

### Step 2.4: Test Secure End-to-End Basic Flow
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Steps 2.1-2.3

**Tasks**:
- Create gurka test user with proper permissions
- Import Spanish vocabulary deck with security validation
- Test with malicious HTML/media content
- Verify XSS protection works
- Check CSP compliance
- Test unauthorized access scenarios

**Validation**: Full security test suite passes

---

## Phase 3: Enhanced Secure Media Previews (Medium Priority)

### Step 3.1: Create Secure MediaPreview Component
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Phase 2 complete

```typescript
// Create client/src/components/media/MediaPreview.tsx
import { useState, useCallback } from 'react'
import { MediaReference } from '@/types'
import { validateMediaAccess } from '@/utils/securityUtils'

interface MediaPreviewProps {
  media: MediaReference
  userId: string
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ media, userId }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await validateMediaAccess(media.id, userId)
        setHasAccess(access)
      } catch {
        setHasAccess(false)
      }
    }
    checkAccess()
  }, [media.id, userId])
  
  const formatSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / (1024 * 1024)) + ' MB'
  }, [])
  
  if (hasAccess === null) {
    return <div className="animate-pulse bg-gray-200 rounded px-2 py-1">Loading...</div>
  }
  
  if (!hasAccess) {
    return (
      <div className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
        ⚠️ Access Denied
      </div>
    )
  }

  return (
    <button 
      className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsLoading(true)}
      disabled={isLoading}
      aria-label={`Preview ${media.type}: ${media.filename}`}
    >
      {media.type === 'image' && '🖼️'}
      {media.type === 'audio' && '🎵'}
      {media.type === 'video' && '🎬'}
      <span className="truncate max-w-[80px]">
        {DOMPurify.sanitize(media.filename, { ALLOWED_TAGS: [] })}
      </span>
      <span className="text-gray-500 dark:text-gray-400">
        ({formatSize(media.size)})
      </span>
      {isLoading && <div className="animate-spin w-3 h-3">⏳</div>}
    </button>
  )
}
```

**Validation**: Access controls work, filename sanitization secure

### Step 3.2: Add Secure MediaPreview to CardManager
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 3.1

```typescript
// Update media summary section in CardManager.tsx
<div className="flex gap-2 flex-wrap">
  {card.mediaRefs.map(media => (
    <ErrorBoundary key={media.id} fallback={<div>Media error</div>}>
      <MediaPreview 
        media={media} 
        userId={user.id}
      />
    </ErrorBoundary>
  ))}
</div>
```

**Validation**: Error boundaries prevent crashes, secure rendering

### Step 3.3: Create Secure MediaPreviewModal Component  
**Complexity**: High | **Risk**: High | **Dependencies**: Step 3.2

```typescript
// Create client/src/components/media/MediaPreviewModal.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MediaReference } from '@/types'
import { validateMediaAccess } from '@/utils/securityUtils'

interface MediaPreviewModalProps {
  media: MediaReference
  userId: string
  onClose: () => void
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ 
  media, 
  userId, 
  onClose 
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement>()
  
  // Validate access and URL security
  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        // Check user access
        const access = await validateMediaAccess(media.id, userId)
        if (!access) {
          setError('Access denied')
          return
        }
        
        // Validate URL is from trusted domain
        const url = new URL(media.url)
        const trustedDomains = [
          process.env.REACT_APP_CDN_DOMAIN,
          process.env.REACT_APP_POCKETBASE_URL
        ].filter(Boolean)
        
        const isTrusted = trustedDomains.some(domain => 
          url.hostname.includes(domain)
        )
        
        if (!isTrusted) {
          throw new Error('Untrusted media source')
        }
        
        setHasAccess(true)
      } catch (err) {
        setError(err.message)
        securityLogger.warn('[MEDIA_MODAL]', 'Media access denied', { 
          mediaId: media.id, 
          userId,
          error: err.message 
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    validateAndLoad()
  }, [media.id, media.url, userId])
  
  // Focus management for accessibility
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement
    modalRef.current?.focus()
    
    return () => {
      previousFocus.current?.focus()
    }
  }, [])
  
  // Keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [onClose])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  const renderSecureMedia = () => {
    if (!hasAccess || error) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-600 text-lg mb-2">⚠️</div>
          <div className="text-red-800 dark:text-red-200">
            {error || 'Access denied'}
          </div>
        </div>
      )
    }
    
    const secureUrl = `${media.url}?token=${encodeURIComponent(userId)}&t=${Date.now()}`
    
    switch (media.type) {
      case 'image':
        return (
          <img 
            src={secureUrl}
            alt={DOMPurify.sanitize(media.filename, { ALLOWED_TAGS: [] })}
            className="max-w-full h-auto max-h-[70vh] object-contain"
            onError={() => setError('Failed to load image')}
            onLoad={() => setIsLoading(false)}
            referrerPolicy="same-origin"
          />
        )
      case 'audio':
        return (
          <audio 
            controls 
            src={secureUrl}
            className="w-full max-w-md"
            onError={() => setError('Failed to load audio')}
            onLoadedData={() => setIsLoading(false)}
            controlsList="nodownload"
          />
        )
      case 'video':
        return (
          <video 
            controls 
            src={secureUrl}
            className="max-w-full h-auto max-h-[70vh]"
            onError={() => setError('Failed to load video')}
            onLoadedData={() => setIsLoading(false)}
            controlsList="nodownload"
          />
        )
      default:
        return <div>Unsupported media type</div>
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto focus:outline-none"
        tabIndex={-1}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <h3 
            id="media-modal-title"
            className="font-semibold text-gray-900 dark:text-gray-100 truncate"
          >
            {DOMPurify.sanitize(media.filename, { ALLOWED_TAGS: [] })}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin w-8 h-8">⏳</div>
            </div>
          )}
          {!isLoading && renderSecureMedia()}
        </div>
      </div>
    </div>,
    document.body
  )
}
```

**Validation**: Modal is secure, accessible, handles errors gracefully

### Step 3.4: Integrate Modal with Secure Preview System
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 3.3

```typescript
// Update MediaPreview.tsx to include secure modal state
const [showPreview, setShowPreview] = useState(false)
const [modalError, setModalError] = useState<string | null>(null)

const handlePreviewClick = useCallback(async () => {
  try {
    // Pre-validate access before opening modal
    const access = await validateMediaAccess(media.id, userId)
    if (!access) {
      setModalError('Access denied')
      return
    }
    setShowPreview(true)
  } catch (error) {
    setModalError('Failed to access media')
  }
}, [media.id, userId])

return (
  <>
    <button onClick={handlePreviewClick}>
      {/* existing preview button content */}
    </button>
    {showPreview && (
      <MediaPreviewModal 
        media={media}
        userId={userId} 
        onClose={() => setShowPreview(false)} 
      />
    )}
    {modalError && (
      <div className="text-red-600 text-xs mt-1">{modalError}</div>
    )}
  </>
)
```

**Validation**: Full click-to-preview workflow secure and accessible

### Step 3.5: Add Performance & Security Monitoring
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Step 3.4

```typescript
// Add performance monitoring for media operations
const useMediaPerformanceMonitor = (mediaId: string) => {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const loadTime = performance.now() - startTime
      if (loadTime > 5000) { // Log slow media loads
        performanceLogger.warn('[MEDIA_PERFORMANCE]', 'Slow media load', {
          mediaId,
          loadTime,
          userAgent: navigator.userAgent
        })
      }
    }
  }, [mediaId])
}

// Add security monitoring for suspicious activity
const useSecurityMonitor = (userId: string) => {
  const [suspiciousActivity, setSuspiciousActivity] = useState(0)
  
  const reportSuspiciousActivity = useCallback((activity: string) => {
    setSuspiciousActivity(prev => prev + 1)
    securityLogger.warn('[SECURITY_MONITOR]', activity, { userId })
    
    if (suspiciousActivity > 10) {
      // Rate limit or block user
      securityLogger.error('[SECURITY_ALERT]', 'High suspicious activity', { userId })
    }
  }, [userId, suspiciousActivity])
  
  return { reportSuspiciousActivity }
}
```

**Validation**: Performance and security monitoring operational

---

## Phase 4: Validation & Security Testing (Required)

### Step 4.1: Create Comprehensive Security Test Suite
**Complexity**: High | **Risk**: High | **Dependencies**: Phase 3 complete

**Security Test Categories**:
- XSS prevention tests with malicious HTML
- CSRF protection validation
- Media file upload security (magic bytes, file type validation)
- Access control tests (unauthorized media access)
- CSP compliance testing
- SQL injection tests for media queries
- Rate limiting tests for media endpoints

```typescript
// Security test examples
describe('Media Security Tests', () => {
  it('should prevent XSS in card content', async () => {
    const maliciousHTML = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>'
    const sanitized = sanitizeHTML(maliciousHTML)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('onerror')
  })
  
  it('should reject unauthorized media access', async () => {
    const unauthorizedAccess = await validateMediaAccess('media123', 'wronguser')
    expect(unauthorizedAccess).toBe(false)
  })
  
  it('should validate media file types', () => {
    expect(() => validateMediaFile({ 
      mimeType: 'application/exe',
      originalSize: 1000,
      originalFilename: 'malware.exe'
    })).toThrow('Invalid media type')
  })
})
```

**Validation**: All security tests pass, no vulnerabilities detected

### Step 4.2: Performance & Edge Case Security Testing
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 4.1

**Test Scenarios**:
- Large media files with size validation
- Malformed media files that could cause crashes  
- Media URLs pointing to malicious external sites
- Network errors during media loading with security implications
- High card counts with media (DoS prevention)
- Memory exhaustion attacks via large media files

**Validation**: App handles all edge cases securely

### Step 4.3: User Acceptance & Security Validation Testing
**Complexity**: Medium | **Risk**: High | **Dependencies**: Step 4.2

**Tasks**:
- Create gurka test user with proper security setup
- Import Spanish vocabulary with security validation enabled
- Test complete user workflow with security monitoring
- Verify all security controls work end-to-end
- Document security compliance checklist
- Create incident response procedures

**Validation**: All success criteria met with security compliance verified

---

## Implementation Prompts (Security Enhanced)

### Prompt 1: Security Foundation Setup
```
Set up the security foundation for media display functionality.

Tasks:
1. Install and configure DOMPurify for HTML sanitization
2. Create securityUtils.ts with sanitizeHTML and validateMediaFile functions
3. Add security logging infrastructure with different log levels
4. Verify PocketBase media_files schema includes required security fields (card_id, userId, created_at, updated_at)
5. Set up Content Security Policy headers for media embedding
6. Create media access validation service
7. Add unit tests for all security functions

CRITICAL: This is security-first development. Every function must be secure by default.

Files to create/modify:
- client/src/utils/securityUtils.ts (new)
- client/src/services/securityLogger.ts (new)
- client/src/services/MediaService.ts (enhance)
- Add comprehensive security test files

Expected outcome: Robust security foundation with no XSS vulnerabilities, validated file handling, and comprehensive logging.
```

### Prompt 2: Secure Media Type Detection
```
Implement secure media type detection with strict validation.

Tasks:
1. Add getMediaType() method to AnkiImportOrchestrator.ts with allowlist of safe MIME types
2. Implement magic byte validation for file type verification
3. Add file size validation and limits
4. Create filename sanitization to prevent path traversal
5. Add security logging for rejected file types
6. Implement rate limiting for media processing
7. Add comprehensive tests including malicious file scenarios

Build on security foundation. Reject anything not explicitly allowed.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts
- Add security test files for media type validation

Expected outcome: Only safe, validated media types are processed. All suspicious activity is logged.
```

### Prompt 3: Secure Media Database Association
```
Create secure media-card association with proper authorization.

Tasks:
1. Add updateMediaFileCardId() method to MediaService.ts with user authorization checks
2. Validate user owns both media file and target card before association
3. Add audit logging for all media associations
4. Implement database transaction for atomic updates
5. Add access control validation
6. Create rollback procedures for failed associations
7. Add integration tests with authorization scenarios

Focus on data integrity and authorization. Users can only associate media they own.

Files to modify:
- client/src/services/MediaService.ts
- Add authorization test files

Expected outcome: Secure media association with complete audit trail and authorization enforcement.
```

### Prompt 4: Secure Media Conversion Pipeline
```
Build the secure media conversion pipeline with comprehensive validation.

Tasks:
1. Add convertAnkiMediaToMediaRefs() method with security validation at each step
2. Implement URL validation to prevent malicious redirects
3. Add filename sanitization and path validation
4. Create error handling that doesn't leak sensitive information
5. Implement transaction rollback for partial failures
6. Add performance monitoring for large media processing
7. Create integration tests with edge cases and security scenarios

Every step must validate security. Fail securely with proper logging.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts
- Add comprehensive security integration tests

Expected outcome: Secure conversion pipeline that validates all inputs and fails safely.
```

### Prompt 5: Secure Card Creation Integration
```
Integrate secure media handling into card creation workflow.

Tasks:
1. Modify convertAnkiCardToCard method with HTML sanitization
2. Add user context to all media operations
3. Implement atomic card+media creation with rollback
4. Add validation for card content size and complexity
5. Create audit trail for card creation with media
6. Add error handling that preserves security
7. Test with malicious HTML content and large media sets

Card import must not fail security even with malicious content.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts
- Update type definitions if needed

Expected outcome: Secure card creation that sanitizes all content and validates all media associations.
```

### Prompt 6: Secure Media Indicator Component
```
Create MediaIndicator component with security and accessibility.

Tasks:
1. Create MediaIndicator.tsx with access control validation
2. Add real-time access checking for media files
3. Implement accessible ARIA labels and roles
4. Add error boundaries for security failures
5. Create loading states with security considerations
6. Add component-level security monitoring
7. Implement comprehensive accessibility and security tests

UI must respect security boundaries and provide accessible experience.

Files to create:
- client/src/components/media/MediaIndicator.tsx
- Security and accessibility test files

Expected outcome: Secure, accessible media indicator that respects authorization and handles errors gracefully.
```

### Prompt 7: Secure CardManager Integration
```
Integrate secure media display into CardManager with XSS prevention.

Tasks:
1. Add MediaIndicator to CardManager.tsx with HTML sanitization
2. Implement Content Security Policy compliance
3. Add error boundaries for media component failures
4. Create secure rendering pipeline for card content
5. Add user context validation throughout
6. Implement progressive loading for large media sets
7. Test with XSS payloads and malicious content

CardManager must be XSS-proof and handle security failures gracefully.

Files to modify:
- client/src/components/deck/CardManager.tsx
- Update CSP configuration

Expected outcome: Secure card management interface with XSS protection and error resilience.
```

### Prompt 8: Secure Media Preview Component
```
Create secure MediaPreview component with access control and validation.

Tasks:
1. Create MediaPreview.tsx with access validation
2. Add filename sanitization and display security
3. Implement secure URL handling and validation
4. Add loading states and error handling
5. Create rate limiting for preview requests
6. Add security monitoring for preview access
7. Test with malicious filenames and unauthorized access attempts

Preview component must validate access and handle security failures.

Files to create:
- client/src/components/media/MediaPreview.tsx
- Security test files for preview component

Expected outcome: Secure preview component that validates access and prevents security issues.
```

### Prompt 9: Secure Media Preview Modal
```
Create secure MediaPreviewModal with comprehensive security controls.

Tasks:
1. Create MediaPreviewModal.tsx with secure media loading
2. Implement URL validation and trusted domain checking
3. Add CSP-compliant media embedding
4. Create secure referrer policy and CORS handling
5. Add accessibility with focus management
6. Implement security monitoring for modal usage
7. Add comprehensive security testing including XSS and CSRF
8. Create error handling that doesn't leak information

Modal must be completely secure while maintaining usability.

Files to create:
- client/src/components/media/MediaPreviewModal.tsx
- Comprehensive security test suite

Expected outcome: Secure, accessible modal that safely displays media with complete security validation.
```

### Prompt 10: Security Testing & Validation
```
Implement comprehensive security testing and validation suite.

Tasks:
1. Create security test suite covering XSS, CSRF, injection attacks
2. Add penetration testing scripts for media endpoints
3. Implement automated security scanning for components
4. Create security compliance checklist validation
5. Add performance testing with security monitoring
6. Test with real-world malicious payloads
7. Document security procedures and incident response
8. Create security audit trail validation

This is the critical security validation phase. Must achieve 100% security coverage.

Expected outcome: Complete security validation with documented compliance and no vulnerabilities.
```

### Prompt 11: Production Security Deployment
```
Prepare secure production deployment with monitoring.

Tasks:
1. Configure production CSP headers and security policies
2. Set up security monitoring and alerting
3. Implement rate limiting and DDoS protection for media
4. Configure secure CDN settings and access controls
5. Add security logging aggregation and analysis
6. Create security incident response procedures
7. Document security architecture and threat model
8. Perform final security audit and penetration testing

Production deployment must be security-hardened and monitored.

Expected outcome: Production-ready secure media system with comprehensive monitoring and incident response.
```

---

## Security Compliance Checklist

### XSS Prevention
- [ ] All HTML content sanitized with DOMPurify
- [ ] CSP headers properly configured
- [ ] No unsafe innerHTML usage
- [ ] All user input validated and escaped

### Access Control  
- [ ] Media access validated per user
- [ ] Database queries use parameterized statements
- [ ] File access restricted to authorized users
- [ ] Admin functions properly protected

### Input Validation
- [ ] File types validated with allowlist and magic bytes
- [ ] File sizes enforced with hard limits
- [ ] Filenames sanitized for path traversal prevention
- [ ] URLs validated for trusted domains only

### Security Monitoring
- [ ] All security events logged with context
- [ ] Automated alerting for suspicious activity
- [ ] Rate limiting implemented for abuse prevention
- [ ] Security audit trail maintained

### Data Protection
- [ ] Sensitive data encrypted at rest and in transit
- [ ] No secrets in logs or error messages
- [ ] Secure session management
- [ ] GDPR compliance for user data

---

## Risk Assessment & Mitigation

### Critical Risks (Immediate Action Required)
1. **XSS Vulnerabilities**: Mitigated with DOMPurify sanitization and CSP
2. **Unauthorized Media Access**: Mitigated with access control validation
3. **Malicious File Uploads**: Mitigated with strict validation and sandboxing

### High Risks (Address in Phase 1)
1. **Data Injection**: Mitigated with parameterized queries and validation
2. **Information Disclosure**: Mitigated with error handling and logging controls
3. **DoS via Large Files**: Mitigated with file size limits and rate limiting

### Medium Risks (Address in Phase 2-3)
1. **Performance Degradation**: Mitigated with lazy loading and caching
2. **Browser Compatibility**: Mitigated with progressive enhancement
3. **CDN Security**: Mitigated with trusted domain validation

---

## Success Criteria (Security Enhanced)

### Phase 0 (Security Foundation)
- [ ] XSS prevention verified with automated testing
- [ ] Access control system operational and tested
- [ ] Security logging and monitoring functional
- [ ] CSP configured and XSS attacks blocked

### Phase 1 (Secure Data Pipeline)
- [ ] Media validation prevents malicious file processing
- [ ] Database access properly authorized and audited
- [ ] Import process secure against injection attacks
- [ ] Error handling doesn't leak sensitive information

### Phase 2 (Secure UI)  
- [ ] Media indicators respect access controls
- [ ] HTML sanitization prevents XSS in card content
- [ ] UI components fail securely with proper error handling
- [ ] Accessibility maintained alongside security

### Phase 3 (Secure Previews)
- [ ] Media previews validate access before display
- [ ] Modal system secure against clickjacking and XSS
- [ ] URL validation prevents malicious redirects
- [ ] Performance monitoring detects potential abuse

### Phase 4 (Security Validation)
- [ ] Penetration testing passes with no critical vulnerabilities
- [ ] Security audit demonstrates compliance
- [ ] Incident response procedures tested and documented
- [ ] Production monitoring operational and effective

---

*Implementation Blueprint v2.0 | Created: 2025-01-26 | Status: Security-Enhanced, Ready for Secure Development*
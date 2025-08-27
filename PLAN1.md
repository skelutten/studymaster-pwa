# Media Display Fix Plan

## Problem Analysis ❌

After implementing the media import functionality, cards imported from Anki packages with media (images, audio, video) are not showing media information in the "Manage Cards" interface. 

### Root Cause Identified
1. **AnkiCard to Card Conversion Loss**: During import, `AnkiCard.mediaFiles` data is lost when converting to standard `Card` format
2. **Missing MediaRef Population**: The standard `Card.mediaRefs` field exists but is not populated during import
3. **UI Missing Media Display**: CardManager component only shows front/back content, no media information
4. **No Media Preview**: No visual indication that cards contain media files

## Test Case 📦
- **File**: `C:\Users\MSI\Downloads\Spanish_Top_5000_Vocabulary.apkg` (79.5MB with media)
- **User**: `gurka` with password `gurka123`
- **Expected**: Cards should show media indicators/previews in "Manage Cards" view

---

## Phase 1: Fix AnkiCard to Card Conversion (CRITICAL)

### 1.1 Update Card Conversion Logic
**File**: `client/src/services/anki/AnkiImportOrchestrator.ts:444-449`

**Problem**: 
```typescript
const cardData = {
  deckId: deck.id,
  frontContent: this.extractCardFront(ankiCard),
  backContent: this.extractCardBack(ankiCard), 
  cardType: { type: 'basic' as const }
  // ❌ mediaRefs is missing!
}
```

**Solution**: Add media conversion
```typescript
const cardData = {
  deckId: deck.id,
  frontContent: this.extractCardFront(ankiCard),
  backContent: this.extractCardBack(ankiCard),
  cardType: { type: 'basic' as const },
  mediaRefs: await this.convertAnkiMediaToMediaRefs(ankiCard.mediaFiles, savedCard.id)
}
```

### 1.2 Add Media Conversion Method
**File**: `client/src/services/anki/AnkiImportOrchestrator.ts`

```typescript
private async convertAnkiMediaToMediaRefs(
  mediaFiles: AnkiMediaFile[], 
  cardId: string
): Promise<MediaReference[]> {
  const mediaRefs: MediaReference[] = []
  
  for (const mediaFile of mediaFiles) {
    if (!mediaFile.id) continue // Skip if not saved to PocketBase
    
    try {
      // Update media record with card association
      const mediaRecord = await this.mediaService.updateMediaFileCardId(mediaFile.id, cardId)
      
      mediaRefs.push({
        id: mediaFile.id,
        type: this.getMediaType(mediaFile.mimeType),
        url: mediaFile.cdnUrl!,
        filename: mediaFile.originalFilename,
        size: mediaFile.originalSize
      })
    } catch (error) {
      console.warn(`Failed to process media file ${mediaFile.filename}:`, error)
    }
  }
  
  return mediaRefs
}

private getMediaType(mimeType: string): 'image' | 'audio' | 'video' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'image' // fallback
}
```

### 1.3 Update MediaService
**File**: `client/src/services/MediaService.ts`

Add method to associate media with cards:
```typescript
async updateMediaFileCardId(mediaId: string, cardId: string): Promise<MediaRecord> {
  try {
    const record = await pb.collection('media_files').update(mediaId, {
      card_id: cardId
    })
    return record as MediaRecord
  } catch (error) {
    debugLogger.error('[MEDIA_SERVICE]', 'Failed to update media file card ID', { error, mediaId, cardId })
    throw new Error(`Failed to update media file: ${error}`)
  }
}
```

---

## Phase 2: Enhance CardManager UI (HIGH PRIORITY)

### 2.1 Add Media Display to Card List
**File**: `client/src/components/deck/CardManager.tsx:221-234`

**Current**: Only shows front/back content
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front</div>
    <div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px]">
      {card.frontContent}
    </div>
  </div>
  // ... back content
</div>
```

**Enhanced**: Add media indicators
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front</div>
    <div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px]">
      <div dangerouslySetInnerHTML={{ __html: card.frontContent }} />
      {card.mediaRefs?.length > 0 && (
        <MediaIndicator mediaRefs={card.mediaRefs} />
      )}
    </div>
  </div>
  // ... back content with media
</div>

// Add media summary
{card.mediaRefs?.length > 0 && (
  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
      Media: {card.mediaRefs.length} files
    </div>
    <div className="flex gap-2 flex-wrap">
      {card.mediaRefs.map(media => (
        <MediaPreview key={media.id} media={media} />
      ))}
    </div>
  </div>
)}
```

### 2.2 Create MediaIndicator Component
**File**: `client/src/components/media/MediaIndicator.tsx`

```typescript
interface MediaIndicatorProps {
  mediaRefs: MediaReference[]
}

export const MediaIndicator: React.FC<MediaIndicatorProps> = ({ mediaRefs }) => {
  const imageCount = mediaRefs.filter(m => m.type === 'image').length
  const audioCount = mediaRefs.filter(m => m.type === 'audio').length
  const videoCount = mediaRefs.filter(m => m.type === 'video').length

  return (
    <div className="flex gap-2 mt-2">
      {imageCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          📷 {imageCount}
        </span>
      )}
      {audioCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          🎵 {audioCount}
        </span>
      )}
      {videoCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          🎬 {videoCount}
        </span>
      )}
    </div>
  )
}
```

### 2.3 Create MediaPreview Component
**File**: `client/src/components/media/MediaPreview.tsx`

```typescript
interface MediaPreviewProps {
  media: MediaReference
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ media }) => {
  const [showPreview, setShowPreview] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / (1024 * 1024)) + ' MB'
  }

  return (
    <div className="relative group">
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
      >
        {media.type === 'image' && '🖼️'}
        {media.type === 'audio' && '🎵'}
        {media.type === 'video' && '🎬'}
        <span className="truncate max-w-[80px]">{media.filename}</span>
        <span className="text-gray-500">({formatSize(media.size)})</span>
      </button>

      {showPreview && (
        <MediaPreviewModal 
          media={media} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  )
}
```

### 2.4 Create MediaPreviewModal Component
**File**: `client/src/components/media/MediaPreviewModal.tsx`

Full modal with image preview, audio player, video player capabilities.

---

## Phase 3: Test User & Import Validation (REQUIRED)

### 3.1 Create Test User
```bash
# Via PocketBase admin or API
POST /api/collections/users/records
{
  "email": "gurka@test.com",
  "username": "gurka", 
  "password": "gurka123"
}
```

### 3.2 Test Import Flow
1. **Login as gurka**
2. **Import Spanish_Top_5000_Vocabulary.apkg**
3. **Verify media files stored in PocketBase**
4. **Check "Manage Cards" shows media indicators**
5. **Test media preview functionality**

### 3.3 Validation Checklist
- [ ] .apkg import succeeds without errors
- [ ] Media files appear in PocketBase media_files collection
- [ ] Cards have populated mediaRefs array
- [ ] CardManager shows media indicators
- [ ] Media preview modals work
- [ ] No broken media URLs
- [ ] Media files accessible via PocketBase URLs

---

## Phase 4: Study Interface Integration (NICE-TO-HAVE)

### 4.1 Update StudyPage
**File**: `client/src/pages/StudyPage.tsx`

Ensure media displays correctly during study sessions by passing mediaRefs to SecureCardRenderer.

### 4.2 Update SecureCardRenderer
**File**: `client/src/components/study/SecureCardRenderer.tsx`

The SecureCardRenderer already supports mediaMap, but may need updates to handle the new mediaRefs format.

---

## Implementation Priority

### Week 1 (CRITICAL PATH)
1. **Day 1**: Fix AnkiCard to Card conversion - add mediaRefs population
2. **Day 2**: Update MediaService with card association methods  
3. **Day 3**: Create basic MediaIndicator component and integrate to CardManager
4. **Day 4**: Test with Spanish vocabulary deck - create gurka user
5. **Day 5**: Debug and fix any issues, ensure media displays correctly

### Week 2 (ENHANCEMENTS)  
1. **Day 1-2**: Create MediaPreview and MediaPreviewModal components
2. **Day 3-4**: Enhance UI with thumbnails and better media management
3. **Day 5**: Study interface integration and testing

---

## Success Criteria

### Phase 1 Success (Must Have)
- [ ] Spanish vocabulary import shows media files in "Manage Cards"
- [ ] Cards display media count indicators (e.g., "📷 2", "🎵 1")
- [ ] No import errors or data loss during conversion
- [ ] Media files properly associated with cards in database

### Phase 2 Success (Should Have)
- [ ] Clicking media indicators shows preview modals
- [ ] Images display correctly in previews  
- [ ] Audio/video players work in modals
- [ ] Media file names and sizes displayed correctly

### Phase 3 Success (Could Have)
- [ ] Media displays correctly in study sessions
- [ ] Performance optimized for large media files
- [ ] Media management (delete, replace) functionality

---

## Risk Mitigation

### High Risk: Data Migration
- **Risk**: Existing imported decks lose media association
- **Mitigation**: Create migration script to populate mediaRefs from media_files table
- **Monitoring**: Check card counts and media file associations after changes

### Medium Risk: Performance Impact
- **Risk**: Large images slow down CardManager interface
- **Mitigation**: Use thumbnails, lazy loading, file size limits
- **Monitoring**: Interface responsiveness metrics

### Low Risk: UI Complexity
- **Risk**: Media preview adds too much complexity to card management
- **Mitigation**: Progressive enhancement - basic indicators first, enhanced previews later
- **Monitoring**: User feedback and usability testing

---

*Plan Created: 2025-01-26 | Version: 1.0 | Status: Ready for Implementation*
# StudyMaster PWA Media Display Fix - Implementation Blueprint

## Project Overview

**Problem**: Media files imported from Anki packages (.apkg) are not visible in the card management interface, despite being successfully stored in the database.

**Goal**: Fix the media display pipeline from import to UI, ensuring imported cards show media indicators and previews.

**Test Case**: Spanish_Top_5000_Vocabulary.apkg (79.5MB) imported by user 'gurka'

---

## Implementation Strategy

This plan follows a **foundation-first approach** with small, safe incremental steps that build upon each other. Each step is fully integrated before moving to the next.

### Phase Distribution:
- **Phase 1**: Core data pipeline fixes (Critical Path - 5 steps)
- **Phase 2**: Basic UI integration (High Priority - 4 steps) 
- **Phase 3**: Enhanced media previews (Medium Priority - 4 steps)
- **Phase 4**: Validation & testing (Required - 3 steps)

---

## Phase 1: Fix Core Data Pipeline (Critical Path)

### Step 1.1: Add Media Type Detection Utility
**Complexity**: Low | **Risk**: Minimal | **Dependencies**: None

```typescript
// Add to AnkiImportOrchestrator.ts
private getMediaType(mimeType: string): 'image' | 'audio' | 'video' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'  
  if (mimeType.startsWith('video/')) return 'video'
  return 'image' // fallback
}
```

**Validation**: Unit test with common MIME types

### Step 1.2: Add MediaService Card Association Method
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 1.1

```typescript
// Add to MediaService.ts
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

**Validation**: Direct API test with existing media file

### Step 1.3: Add Media Conversion Helper Method
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Steps 1.1, 1.2

```typescript
// Add to AnkiImportOrchestrator.ts
private async convertAnkiMediaToMediaRefs(
  mediaFiles: AnkiMediaFile[], 
  cardId: string
): Promise<MediaReference[]> {
  const mediaRefs: MediaReference[] = []
  
  for (const mediaFile of mediaFiles) {
    if (!mediaFile.id) continue // Skip if not saved to PocketBase
    
    try {
      // Update media record with card association
      await this.mediaService.updateMediaFileCardId(mediaFile.id, cardId)
      
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
```

**Validation**: Test with mock AnkiMediaFile array

### Step 1.4: Update Card Creation to Include MediaRefs
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 1.3

```typescript
// Modify convertAnkiCardToCard method in AnkiImportOrchestrator.ts
const cardData = {
  deckId: deck.id,
  frontContent: this.extractCardFront(ankiCard),
  backContent: this.extractCardBack(ankiCard),
  cardType: { type: 'basic' as const },
  mediaRefs: await this.convertAnkiMediaToMediaRefs(ankiCard.mediaFiles, savedCard.id)
}
```

**Validation**: Check that cards have mediaRefs populated after import

### Step 1.5: Verify Database Integration
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 1.4

**Tasks**:
- Test import flow end-to-end
- Verify media_files.card_id is populated
- Confirm Card.mediaRefs contains expected data

**Validation**: Database inspection + API queries

---

## Phase 2: Basic UI Integration (High Priority)

### Step 2.1: Create MediaIndicator Component
**Complexity**: Low | **Risk**: Minimal | **Dependencies**: Phase 1 complete

```typescript
// Create client/src/components/media/MediaIndicator.tsx
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          📷 {imageCount}
        </span>
      )}
      {audioCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          🎵 {audioCount}
        </span>
      )}
      {videoCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
          🎬 {videoCount}
        </span>
      )}
    </div>
  )
}
```

**Validation**: Storybook component test with mock data

### Step 2.2: Update CardManager to Show Media Indicators
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 2.1

```typescript
// Modify client/src/components/deck/CardManager.tsx card display
<div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px]">
  <div dangerouslySetInnerHTML={{ __html: card.frontContent }} />
  {card.mediaRefs?.length > 0 && (
    <MediaIndicator mediaRefs={card.mediaRefs} />
  )}
</div>
```

**Validation**: Import test deck and verify indicators appear

### Step 2.3: Add Media Summary Section
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 2.2

```typescript
// Add below card content in CardManager.tsx
{card.mediaRefs?.length > 0 && (
  <div className="mt-3 pt-3 border-t border-gray-200">
    <div className="text-xs text-gray-500 mb-2">
      Media: {card.mediaRefs.length} files
    </div>
  </div>
)}
```

**Validation**: Visual verification in card management interface

### Step 2.4: Test End-to-End Basic Flow
**Complexity**: Low | **Risk**: Low | **Dependencies**: Steps 2.1-2.3

**Tasks**:
- Create gurka test user
- Import Spanish vocabulary deck
- Verify media indicators appear in card manager
- Check indicator counts match imported media

**Validation**: Full user journey test

---

## Phase 3: Enhanced Media Previews (Medium Priority)

### Step 3.1: Create Basic MediaPreview Component
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Phase 2 complete

```typescript
// Create client/src/components/media/MediaPreview.tsx
interface MediaPreviewProps {
  media: MediaReference
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ media }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / (1024 * 1024)) + ' MB'
  }

  return (
    <button className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-xs">
      {media.type === 'image' && '🖼️'}
      {media.type === 'audio' && '🎵'}
      {media.type === 'video' && '🎬'}
      <span className="truncate max-w-[80px]">{media.filename}</span>
      <span className="text-gray-500">({formatSize(media.size)})</span>
    </button>
  )
}
```

**Validation**: Component renders with different media types

### Step 3.2: Add MediaPreview to CardManager
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 3.1

```typescript
// Update media summary section in CardManager.tsx
<div className="flex gap-2 flex-wrap">
  {card.mediaRefs.map(media => (
    <MediaPreview key={media.id} media={media} />
  ))}
</div>
```

**Validation**: Media files display as clickable previews

### Step 3.3: Create MediaPreviewModal Component
**Complexity**: High | **Risk**: Medium | **Dependencies**: Step 3.2

```typescript
// Create client/src/components/media/MediaPreviewModal.tsx
interface MediaPreviewModalProps {
  media: MediaReference
  onClose: () => void
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ media, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">{media.filename}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="p-4">
          {media.type === 'image' && (
            <img src={media.url} alt={media.filename} className="max-w-full h-auto" />
          )}
          {media.type === 'audio' && (
            <audio controls src={media.url} />
          )}
          {media.type === 'video' && (
            <video controls src={media.url} className="max-w-full h-auto" />
          )}
        </div>
      </div>
    </div>
  )
}
```

**Validation**: Modal opens and displays different media types correctly

### Step 3.4: Integrate Modal with Preview Buttons
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Step 3.3

```typescript
// Update MediaPreview.tsx to include modal state
const [showPreview, setShowPreview] = useState(false)

return (
  <>
    <button onClick={() => setShowPreview(true)}>
      {/* existing preview button content */}
    </button>
    {showPreview && (
      <MediaPreviewModal 
        media={media} 
        onClose={() => setShowPreview(false)} 
      />
    )}
  </>
)
```

**Validation**: Full click-to-preview workflow functions

---

## Phase 4: Validation & Testing (Required)

### Step 4.1: Create Comprehensive Test Suite
**Complexity**: Medium | **Risk**: Low | **Dependencies**: Phase 3 complete

**Test Categories**:
- Unit tests for media conversion functions
- Integration tests for import pipeline
- UI tests for media display components
- End-to-end tests for full user workflow

**Validation**: All tests pass consistently

### Step 4.2: Performance & Edge Case Testing  
**Complexity**: Medium | **Risk**: Medium | **Dependencies**: Step 4.1

**Test Scenarios**:
- Large media files (>10MB)
- Malformed/corrupted media files
- Missing media files during import
- Network errors during media display
- High card counts with media (1000+ cards)

**Validation**: App remains responsive and handles errors gracefully

### Step 4.3: User Acceptance Testing
**Complexity**: Low | **Risk**: Low | **Dependencies**: Step 4.2

**Tasks**:
- Create gurka test user with specified credentials
- Import Spanish_Top_5000_Vocabulary.apkg
- Document user workflow and pain points
- Verify against success criteria checklist

**Validation**: All success criteria met, user workflow smooth

---

## Implementation Prompts

### Prompt 1: Foundation Setup
```
Implement media type detection and database association for the AnkiImportOrchestrator. 

Tasks:
1. Add getMediaType() utility method to AnkiImportOrchestrator.ts that maps MIME types to 'image'|'audio'|'video'
2. Add updateMediaFileCardId() method to MediaService.ts that associates media files with cards in PocketBase
3. Add unit tests for both methods
4. Ensure error handling and logging

Focus on creating solid, testable foundation functions. Do not integrate with import pipeline yet.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts
- client/src/services/MediaService.ts
- Add appropriate test files

Expected outcome: Two utility methods that can be independently tested and verified.
```

### Prompt 2: Media Conversion Pipeline  
```
Create the media conversion pipeline that transforms AnkiMediaFile arrays into MediaReference arrays.

Tasks:
1. Add convertAnkiMediaToMediaRefs() method to AnkiImportOrchestrator.ts
2. Method should iterate through AnkiMediaFile[], call updateMediaFileCardId() for each, and build MediaReference array
3. Include proper error handling for individual media file failures
4. Add comprehensive logging for debugging
5. Write integration tests with mock data

Build on the foundation from Prompt 1. Focus on robust error handling - if one media file fails, others should still process.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts
- Add test file for integration testing

Expected outcome: Conversion method that safely transforms Anki media to app media references.
```

### Prompt 3: Import Integration
```
Integrate the media conversion pipeline into the card creation workflow.

Tasks:  
1. Modify the convertAnkiCardToCard method in AnkiImportOrchestrator.ts
2. Update cardData object to include mediaRefs field
3. Call convertAnkiMediaToMediaRefs() during card creation
4. Ensure the conversion happens after the card is saved (so cardId exists)
5. Add error handling - import should not fail if media conversion fails
6. Test with a small .apkg file that contains media

Build on Prompts 1-2. The critical requirement: card import must not fail even if media conversion has issues.

Files to modify:
- client/src/services/anki/AnkiImportOrchestrator.ts  
- Update relevant interfaces if needed

Expected outcome: Cards created during import have populated mediaRefs array. Import process remains stable.
```

### Prompt 4: Basic Media Indicators
```
Create the MediaIndicator component that shows media counts with icons.

Tasks:
1. Create MediaIndicator.tsx component that takes MediaReference[] as prop
2. Component should count and display icons for images (📷), audio (🎵), video (🎬) with counts
3. Use Tailwind classes for styling with light/dark theme support
4. Make component responsive and accessible
5. Create Storybook story or simple test to verify appearance
6. Ensure component handles empty arrays gracefully

Focus on clean, accessible UI component that clearly communicates media presence.

Files to create:
- client/src/components/media/MediaIndicator.tsx
- Test/story file for component

Expected outcome: Reusable component that displays media type indicators with proper styling.
```

### Prompt 5: CardManager UI Integration  
```
Integrate MediaIndicator into the CardManager interface to show media for each card.

Tasks:
1. Import and use MediaIndicator component in CardManager.tsx
2. Add media indicators below card front/back content  
3. Add media summary section showing total file count and individual file previews
4. Update card content rendering to use dangerouslySetInnerHTML for proper HTML display
5. Ensure indicators only show when mediaRefs exist and have length > 0
6. Test with cards that have media and cards without media

Build on Prompt 4. Focus on seamless integration that doesn't disrupt existing card management functionality.

Files to modify:
- client/src/components/deck/CardManager.tsx

Expected outcome: Card management interface shows media indicators for cards with media, maintains existing functionality for cards without.
```

### Prompt 6: Media Preview Component
```
Create MediaPreview component that displays individual media files as clickable elements.

Tasks:
1. Create MediaPreview.tsx component that takes single MediaReference as prop
2. Display filename, file size, and media type icon
3. Include formatSize utility function for human-readable file sizes
4. Style as clickable button with hover states
5. Truncate long filenames appropriately
6. Support light/dark themes
7. Add component to MediaIndicator or use separately in CardManager

Focus on creating clean, informative preview elements that hint at interactive functionality.

Files to create:
- client/src/components/media/MediaPreview.tsx

Expected outcome: Component that clearly displays media file information in an interactive format.
```

### Prompt 7: Media Preview Modal
```
Create MediaPreviewModal component that displays media files in a modal overlay.

Tasks:
1. Create MediaPreviewModal.tsx with media preview functionality
2. Support image display with proper sizing and aspect ratio
3. Support audio playback with HTML5 audio controls
4. Support video playback with HTML5 video controls  
5. Include modal close functionality (X button, escape key, click outside)
6. Make modal responsive and accessible
7. Handle loading states and error states for media files
8. Style with Tailwind for consistency

Focus on creating a robust media viewing experience. Handle edge cases like large files, network errors, unsupported formats.

Files to create:
- client/src/components/media/MediaPreviewModal.tsx

Expected outcome: Full-featured modal that can display all supported media types safely and accessibly.
```

### Prompt 8: Modal Integration
```
Connect MediaPreview components to MediaPreviewModal for interactive media viewing.

Tasks:
1. Add state management to MediaPreview for modal open/close
2. Integrate MediaPreviewModal with click handlers
3. Update CardManager to use interactive MediaPreview components
4. Ensure proper cleanup and performance (avoid memory leaks)
5. Test modal interactions with different media types
6. Verify modal accessibility (focus management, keyboard navigation)

Build on Prompts 6-7. Focus on smooth user interactions and proper state management.

Files to modify:
- client/src/components/media/MediaPreview.tsx
- client/src/components/deck/CardManager.tsx

Expected outcome: Fully interactive media preview system where users can click media indicators to view full media files.
```

### Prompt 9: Test User and Import Validation
```
Set up test environment and validate the complete media display pipeline.

Tasks:
1. Create test user 'gurka' with password 'gurka123' via PocketBase admin or API
2. Implement import test script or manual procedure for Spanish_Top_5000_Vocabulary.apkg
3. Create validation checklist covering all success criteria
4. Test complete user workflow: login -> import -> view cards -> preview media
5. Document any issues found and verify database state
6. Create rollback procedure if needed

Focus on comprehensive validation of the entire feature. This is the critical acceptance test.

Expected outcome: Documented proof that media display works end-to-end with the specified test case.
```

### Prompt 10: Error Handling and Edge Cases
```
Implement comprehensive error handling and test edge case scenarios.

Tasks:
1. Add error boundaries for media components  
2. Handle missing media files gracefully
3. Add loading states for media previews
4. Test with corrupted or unsupported media files
5. Handle network errors during media loading
6. Add user feedback for media errors
7. Test performance with large media files and high card counts
8. Implement cleanup for unused media files

Focus on production-ready error handling. The system should degrade gracefully when media issues occur.

Expected outcome: Robust media system that handles errors gracefully and provides good user experience even when things go wrong.
```

### Prompt 11: Performance Optimization
```
Optimize media loading and display performance for production use.

Tasks:
1. Implement lazy loading for media previews
2. Add image thumbnail generation or caching strategies  
3. Optimize modal loading with skeleton states
4. Add media file size warnings for large files
5. Implement media cleanup for deleted cards
6. Test memory usage with many media files
7. Add performance monitoring for media operations
8. Document performance best practices

Focus on scalable performance for users with large media collections.

Expected outcome: Media system performs well with large datasets and provides smooth user experience.
```

### Prompt 12: Final Integration and Testing
```
Complete the integration, run comprehensive tests, and prepare for production.

Tasks:
1. Run full test suite (unit, integration, e2e)
2. Test complete user workflows with multiple .apkg files
3. Verify all success criteria from original plan
4. Test cross-browser compatibility for media display
5. Document any remaining limitations or known issues
6. Create deployment checklist
7. Update user documentation with media features
8. Perform final code review and cleanup

This is the final integration step. Focus on production readiness and documentation.

Expected outcome: Complete, tested, documented media display feature ready for production deployment.
```

---

## Success Criteria Checklist

### Phase 1 (Critical)
- [ ] Cards created during import have populated mediaRefs arrays
- [ ] Media files in database have correct card_id associations
- [ ] Import process remains stable with media conversion
- [ ] Error handling prevents import failures due to media issues

### Phase 2 (High Priority)  
- [ ] CardManager displays media indicators for cards with media
- [ ] Media type counts (images, audio, video) display correctly
- [ ] Media indicators have proper styling and theme support
- [ ] Cards without media display normally without errors

### Phase 3 (Medium Priority)
- [ ] Media preview buttons show file information clearly
- [ ] Modal displays images, audio, and video correctly
- [ ] Modal interactions are smooth and accessible
- [ ] Media loading states and errors handled gracefully

### Phase 4 (Required)
- [ ] Spanish vocabulary .apkg imports successfully with media display
- [ ] Test user 'gurka' can complete full workflow
- [ ] Performance acceptable with large media files
- [ ] All edge cases handled appropriately

---

## Risk Mitigation

### Data Integrity (High Risk)
- **Backup database before major changes**
- **Implement rollback procedures for schema changes**
- **Test import pipeline thoroughly before production deployment**

### Performance (Medium Risk)  
- **Monitor memory usage during media operations**
- **Implement file size limits for media previews**
- **Use lazy loading and caching strategies**

### User Experience (Low Risk)
- **Provide clear loading states and error messages**
- **Ensure accessibility for media components**
- **Test across different devices and browsers**

---

*Implementation Blueprint v1.0 | Created: 2025-01-26 | Status: Ready for Development*
/**
 * Integration test for .apkg media import
 * Tests that media files are extracted, stored, and mapped correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'
import { useDeckStore } from '../../stores/deckStore'
import { getMediaContextService } from '../../services/anki/MediaContextService'

describe('APKG Media Import Integration', () => {
  beforeEach(() => {
    // Reset stores
    useDeckStore.setState({
      decks: [],
      cards: {},
      isLoading: false,
      error: null,
      importProgress: 0,
      importStatus: null,
      hydrated: true,
      currentUserId: 'test-user',
      currentStudySession: null
    })
  })

  it('should extract media files from .apkg with numeric filenames and media mapping', async () => {
    // Create a mock .apkg file structure
    const zip = new JSZip()

    // Add collection.anki2 (SQLite database)
    const mockDb = new Uint8Array(0) // Empty for now
    zip.file('collection.anki2', mockDb)

    // Add media mapping file (maps numeric IDs to original filenames)
    const mediaMapping = {
      '0': 'audio-hello.mp3',
      '1': 'image-cat.jpg',
      '2': 'image-dog.png'
    }
    zip.file('media', JSON.stringify(mediaMapping))

    // Add media files with numeric names
    const audioBlob = new Blob(['fake audio data'], { type: 'audio/mpeg' })
    const imageBlob1 = new Blob(['fake image 1'], { type: 'image/jpeg' })
    const imageBlob2 = new Blob(['fake image 2'], { type: 'image/png' })

    zip.file('0', audioBlob)
    zip.file('1', imageBlob1)
    zip.file('2', imageBlob2)

    // Generate .apkg blob
    const apkgBlob = await zip.generateAsync({ type: 'blob' })
    const apkgFile = {
      name: 'test.apkg',
      size: apkgBlob.size,
      type: 'application/zip',
      arrayBuffer: () => apkgBlob.arrayBuffer(),
      // Add text() method for compatibility if needed by other parts of the import process
      text: () => apkgBlob.text(),
    } as File;

    // Mock SQL.js to return test data
    vi.mock('sql.js', () => ({
      default: vi.fn(() => ({
        Database: vi.fn(() => ({
          exec: vi.fn((query: string) => {
            if (query.includes('SELECT decks')) {
              return [{
                values: [[JSON.stringify({ '2': { name: 'Test Deck' } })]]
              }]
            }
            if (query.includes('SELECT n.flds')) {
              return [{
                values: [
                  ['Hello\x1f<img src="image-cat.jpg"><audio>[sound:audio-hello.mp3]</audio>', '', 0]
                ]
              }]
            }
            return []
          }),
          close: vi.fn()
        }))
      }))
    }))

    // Import the deck
    const store = useDeckStore.getState()
    const deck = await store.importAnkiDeck(apkgFile)

    // Verify deck was created
    expect(deck).toBeDefined()
    expect(deck.title).toBe('Test Deck')

    // Get the imported deck's cards
    const cards = store.getCards(deck.id)
    expect(cards.length).toBeGreaterThan(0)

    // Verify media files were stored
    const mediaContext = getMediaContextService();
    // For this test, we'll cast to any to check the internal state
    const deckMappings = (mediaContext as any).urlMappings.get(deck.id);

    expect(deckMappings).toBeDefined()
    expect(deckMappings.size).toBeGreaterThan(0)

    // Check that specific media files are mapped
    const audioMapping = deckMappings.get('audio-hello.mp3')
    expect(audioMapping).toBeDefined()
    expect(audioMapping?.originalFilename).toBe('audio-hello.mp3')
    expect(audioMapping?.mimeType).toContain('audio')

    const imageMapping = deckMappings.get('image-cat.jpg')
    expect(imageMapping).toBeDefined()
    expect(imageMapping?.originalFilename).toBe('image-cat.jpg')
    expect(imageMapping?.mimeType).toContain('image')
  })

  it('should preserve HTML with media references in card content', async () => {
    const zip = new JSZip()

    // Create test data with HTML and media
    const mockDb = new Uint8Array(0)
    zip.file('collection.anki2', mockDb)

    const mediaMapping = { '0': 'test-image.jpg' }
    zip.file('media', JSON.stringify(mediaMapping))
    zip.file('0', new Blob(['fake image'], { type: 'image/jpeg' }))

    const apkgBlob = await zip.generateAsync({ type: 'blob' })
    const apkgFile = {
      name: 'test.apkg',
      size: apkgBlob.size,
      type: 'application/zip',
      arrayBuffer: () => apkgBlob.arrayBuffer(),
      // Add text() method for compatibility if needed by other parts of the import process
      text: () => apkgBlob.text(),
    } as File;

    vi.mock('sql.js', () => ({
      default: vi.fn(() => ({
        Database: vi.fn(() => ({
          exec: vi.fn((query: string) => {
            if (query.includes('SELECT n.flds')) {
              return [{
                values: [
                  ['Question with <img src="test-image.jpg">\x1fAnswer with <b>bold</b> text', '', 0]
                ]
              }]
            }
            return [{ values: [] }]
          }),
          close: vi.fn()
        }))
      }))
    }))

    const store = useDeckStore.getState()
    const deck = await store.importAnkiDeck(apkgFile)
    const cards = store.getCards(deck.id)

    // Verify HTML is preserved
    const card = cards[0]
    expect(card.frontContent).toContain('<img')
    expect(card.frontContent).toContain('test-image.jpg')
    expect(card.backContent).toContain('<b>')
  })

  it('should handle .apkg files with no media gracefully', async () => {
    const zip = new JSZip()
    const mockDb = new Uint8Array(0)
    zip.file('collection.anki2', mockDb)

    // No media files or mapping

    const apkgBlob = await zip.generateAsync({ type: 'blob' })
    const apkgFile = {
      name: 'no-media.apkg',
      size: apkgBlob.size,
      type: 'application/zip',
      arrayBuffer: () => apkgBlob.arrayBuffer(),
      text: () => apkgBlob.text(),
    } as File;

    vi.mock('sql.js', () => ({
      default: vi.fn(() => ({
        Database: vi.fn(() => ({
          exec: vi.fn(() => [{
            values: [['Plain text front\x1fPlain text back', '', 0]]
          }]),
          close: vi.fn()
        }))
      }))
    }))

    const store = useDeckStore.getState()
    const deck = await store.importAnkiDeck(apkgFile)

    // Should succeed without errors
    expect(deck).toBeDefined()

    // Media mappings should be empty but defined
    const mediaContext = getMediaContextService()
    // For this test, we'll cast to any to check the internal state
    const deckMappings = (mediaContext as any).urlMappings.get(deck.id)

    // For text-only decks, mappings might not be created at all
    expect(deckMappings === undefined || deckMappings.size === 0).toBe(true)
  })
})
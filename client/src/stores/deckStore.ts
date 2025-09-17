import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Deck, Card, DeckSettings } from '../../../shared/types'
import { createNewCard } from '../utils/cardDefaults'

import { repos } from '../data'
import { buildNewDeckFromDomain, buildNewCardFromDomain, mapDeckUpdatesToRepo } from '../data/mappers/domainMappers'
interface StudySession {
  deckId: string
  currentCardIndex: number
  studyCards: Card[] // For in-memory access during a session
  studyCardIds: string[] // For persistence
  sessionStats: {
    total: number
    correct: number
    incorrect: number
  }
  startedAt: string
}

interface DeckStore {
  decks: Deck[]
  cards: Record<string, Card[]> // deckId -> cards
  currentStudySession: StudySession | null
  isLoading: boolean
  error: string | null
  importProgress: number // 0-100
  importStatus: string | null
  
  // Deck operations
  createDeck: (deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deck>
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  getDeck: (id: string) => Deck | undefined
  
  // Card operations
  addCard: (deckId: string, card: Omit<Card, 'id' | 'deckId' | 'createdAt' | 'easeFactor' | 'intervalDays' | 'nextReview' | 'reviewCount' | 'lapseCount'>) => Promise<Card>
  addCardBulk: (deckId: string, card: Omit<Card, 'id' | 'deckId' | 'createdAt' | 'easeFactor' | 'intervalDays' | 'nextReview' | 'reviewCount' | 'lapseCount'>) => Promise<Card>
  addCardsBatch: (deckId: string, cards: Array<Omit<Card, 'id' | 'deckId' | 'createdAt' | 'easeFactor' | 'intervalDays' | 'nextReview' | 'reviewCount' | 'lapseCount'>>) => Promise<Card[]>
  createDeckBulk: (deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deck>
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  getCards: (deckId: string) => Card[]
  
  // Import operations
  importAnkiDeck: (file: File) => Promise<Deck>
  importFromText: (deckName: string, text: string, separator?: string) => Promise<Deck>
  
  // Example data
  loadExampleDecks: () => Promise<void>
  
  // Utility
  clearError: () => void
  setLoading: (loading: boolean) => void
  setImportProgress: (progress: number, status?: string) => void
  resetImportProgress: () => void
  removeDuplicateCards: (deckId: string) => Promise<number>
  
  // Study session functions
  startStudySession: (deckId: string, studyCards: Card[]) => void
  updateStudySession: (currentCardIndex: number, sessionStats: StudySession['sessionStats']) => void
  clearStudySession: () => void
  getStudySession: (deckId: string) => StudySession | null
  resetAllStudyData: () => void
}

const defaultDeckSettings: DeckSettings = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 100,
  easyBonus: 1.3,
  intervalModifier: 1.0,
  maximumInterval: 36500, // 100 years
  minimumInterval: 1
};

// Offline-first persistence helpers (IndexedDB via repositories)
async function persistCreateDeck(deckData: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    await repos.decks.create(buildNewDeckFromDomain(deckData));
  } catch (err) {
    // Non-blocking persistence; UI state remains responsive
    console.warn('[deckStore] repo createDeck failed', err);
  }
}

async function persistAddCard(deckId: string, card: Card) {
  try {
    await repos.cards.create(
      buildNewCardFromDomain({
        deckId,
        frontContent: card.frontContent,
        backContent: card.backContent,
        mediaRefs: card.mediaRefs,
        state: card.state,
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
      })
    );
  } catch (err) {
    console.warn('[deckStore] repo addCard failed', err);
  }
}

// Helper function to clean field content
const cleanFieldContent = (content: string): string => {
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\[sound:[^\]]*\]/g, '') // Remove sound references
    .trim()
}

// Helper function to detect the best field combination for front/back
const detectBestFieldCombination = (sampleFields: string[][]): { frontIndex: number; backIndex: number } => {
  if (sampleFields.length === 0) {
    return { frontIndex: 0, backIndex: 1 }
  }
  
  const fieldCount = sampleFields[0].length
  const combinations: Array<{ frontIndex: number; backIndex: number; score: number }> = []
  
  // Try different field combinations
  for (let front = 0; front < fieldCount; front++) {
    for (let back = front + 1; back < fieldCount; back++) {
      let score = 0
      let validPairs = 0
      
      for (const fields of sampleFields) {
        const frontContent = cleanFieldContent(fields[front] || '')
        const backContent = cleanFieldContent(fields[back] || '')
        
        // Score based on content quality
        if (frontContent && backContent) {
          validPairs++
          
          // Prefer combinations where both fields have substantial content
          if (frontContent.length > 2 && backContent.length > 2) {
            score += 10
          }
          
          // Prefer combinations where fields are different
          if (frontContent !== backContent) {
            score += 5
          }
          
          // Avoid fields that look like audio references or numbers only
          if (!frontContent.match(/^\[sound:/) && !backContent.match(/^\[sound:/)) {
            score += 3
          }
          
          if (!frontContent.match(/^\d+$/) && !backContent.match(/^\d+$/)) {
            score += 2
          }
        }
      }
      
      // Normalize score by number of valid pairs
      const normalizedScore = validPairs > 0 ? score / validPairs : 0
      combinations.push({ frontIndex: front, backIndex: back, score: normalizedScore })
    }
  }
  
  // Sort by score and return the best combination
  combinations.sort((a, b) => b.score - a.score)
  
  if (combinations.length > 0 && combinations[0].score > 0) {
    console.log(`Best field combination: ${combinations[0].frontIndex} -> ${combinations[0].backIndex} (score: ${combinations[0].score})`)
    return { frontIndex: combinations[0].frontIndex, backIndex: combinations[0].backIndex }
  }
  
  // Fallback to 0->1 or 0->2 if available
  if (fieldCount >= 3) {
    return { frontIndex: 0, backIndex: 2 }
  }
  return { frontIndex: 0, backIndex: 1 }
}

// Helper function to parse .apkg files (with dynamic imports for bundle optimization)
const parseApkgFile = async (file: File): Promise<{ name: string; cards: Array<{ front: string; back: string }> }> => {
  try {
    // Dynamic imports to reduce initial bundle size
    const [{ default: JSZip }, { default: initSqlJs }] = await Promise.all([
      import('jszip'),
      import('sql.js')
    ])

    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file) => {
        if (file.endsWith('.wasm')) {
          return '/sql-wasm.wasm'
        }
        return `/${file}`
      }
    })

    // Read the .apkg file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Extract the ZIP file
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(arrayBuffer)
    
    // Get the collection.anki2 file (SQLite database)
    const dbFile = zipContent.file('collection.anki2')
    if (!dbFile) {
      throw new Error('Invalid .apkg file: collection.anki2 not found')
    }
    
    // Read the database file
    const dbArrayBuffer = await dbFile.async('arraybuffer')
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer))
    
    // Query to get deck name from the col table
    const deckQuery = db.exec("SELECT decks FROM col LIMIT 1")
    let deckName = file.name.replace(/\.apkg$/, '')
    if (deckQuery.length > 0 && deckQuery[0].values.length > 0) {
      try {
        const decksJson = deckQuery[0].values[0][0] as string
        const decks = JSON.parse(decksJson)
        // Find the first non-default deck (id != 1)
        const deckIds = Object.keys(decks).filter(id => id !== '1')
        if (deckIds.length > 0) {
          deckName = decks[deckIds[0]].name || deckName
        }
      } catch (e) {
        console.warn('Could not parse deck names from .apkg file, using filename')
      }
    }
    
    // Query to get notes and cards
    const notesQuery = db.exec(`
      SELECT n.flds, n.tags, c.type
      FROM notes n
      JOIN cards c ON n.id = c.nid
      WHERE c.type >= 0
      ORDER BY n.id
    `)
    
    const cards: Array<{ front: string; back: string }> = []
    
    if (notesQuery.length > 0) {
      // First, analyze a sample of fields to determine the best field combination
      const sampleSize = Math.min(10, notesQuery[0].values.length)
      const sampleFields: string[][] = []
      
      for (let i = 0; i < sampleSize; i++) {
        const fields = (notesQuery[0].values[i][0] as string).split('\x1f')
        sampleFields.push(fields)
      }
      
      // Detect the best field combination
      const { frontIndex, backIndex } = detectBestFieldCombination(sampleFields)
      console.log(`Using field combination: ${frontIndex} (front) -> ${backIndex} (back)`)
      
      // Process all cards using the detected field combination
      for (const row of notesQuery[0].values) {
        const fields = (row[0] as string).split('\x1f') // Anki uses \x1f as field separator
        
        if (fields.length > Math.max(frontIndex, backIndex)) {
          const front = cleanFieldContent(fields[frontIndex] || '')
          const back = cleanFieldContent(fields[backIndex] || '')
          
          if (front && back && front !== back) {
            cards.push({ front, back })
          }
        }
      }
    }
    
    db.close()
    
    if (cards.length === 0) {
      throw new Error('No valid cards found in the .apkg file')
    }
    
    console.log(`Successfully parsed ${cards.length} cards from .apkg file`)
    return { name: deckName, cards }
  } catch (error) {
    console.error('Error parsing .apkg file:', error)
    throw new Error(`Failed to parse .apkg file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      cards: {},
      currentStudySession: null,
      isLoading: false,
      error: null,
      importProgress: 0,
      importStatus: null,

      createDeck: async (deckData) => {
        set({ isLoading: true, error: null })
        try {
          const deck: Deck = {
            ...deckData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: { ...defaultDeckSettings, ...deckData.settings }
          }
          
          set(state => ({
            decks: [...state.decks, deck],
            cards: { ...state.cards, [deck.id]: [] },
            isLoading: false
          }))

          // Persist to IndexedDB (non-blocking)
          void persistCreateDeck(deckData);
          
          return deck
        } catch (error) {
          set({ error: 'Failed to create deck', isLoading: false })
          throw error
        }
      },

      updateDeck: async (id, updates) => {
        set({ isLoading: true, error: null })
        try {
          set(state => ({
            decks: state.decks.map(deck =>
              deck.id === id
                ? { ...deck, ...updates, updatedAt: new Date().toISOString() }
                : deck
            ),
            isLoading: false
          }))

          // Persist deck updates (non-blocking)
          try {
            void repos.decks.update(id, mapDeckUpdatesToRepo(updates));
          } catch (e) {
            console.warn('[deckStore] repo updateDeck failed', e);
          }
        } catch (error) {
          set({ error: 'Failed to update deck', isLoading: false })
          throw error
        }
      },

      deleteDeck: async (id) => {
        set({ isLoading: true, error: null })
        try {
          set(state => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [id]: _deletedCards, ...remainingCards } = state.cards
            return {
              decks: state.decks.filter(deck => deck.id !== id),
              cards: remainingCards,
              isLoading: false
            }
          })
          // Persist delete (non-blocking)
          try {
            void repos.decks.remove(id)
          } catch (e) {
            console.warn('[deckStore] repo deleteDeck failed', e)
          }
        } catch (error) {
          set({ error: 'Failed to delete deck', isLoading: false })
          throw error
        }
      },

      getDeck: (id) => {
        return get().decks.find(deck => deck.id === id)
      },

      addCard: async (deckId, cardData) => {
        set({ isLoading: true, error: null })
        try {
          const card: Card = {
            ...cardData,
            id: crypto.randomUUID(),
            deckId,
            createdAt: new Date().toISOString(),
            easeFactor: 2.5,
            intervalDays: 0,
            nextReview: new Date().toISOString(),
            reviewCount: 0,
            lapseCount: 0
          }
          
          set(state => {
            const deckCards = state.cards[deckId] || []
            const updatedCards = [...deckCards, card]
            
            return {
              cards: { ...state.cards, [deckId]: updatedCards },
              decks: state.decks.map(deck =>
                deck.id === deckId
                  ? { ...deck, cardCount: updatedCards.length, updatedAt: new Date().toISOString() }
                  : deck
              ),
              isLoading: false
            }
          })

          // Persist to IndexedDB (non-blocking)
          void persistAddCard(deckId, card);
          
          return card
        } catch (error) {
          set({ error: 'Failed to add card', isLoading: false })
          throw error
        }
      },

      addCardBulk: async (deckId, cardData) => {
        try {
          const state = get()
          const existingCards = state.cards[deckId] || []
          
          // Check if this card already exists
          const cardKey = `${cardData.frontContent.trim().toLowerCase()}|${cardData.backContent.trim().toLowerCase()}`
          const isDuplicate = existingCards.some(card =>
            `${card.frontContent.trim().toLowerCase()}|${card.backContent.trim().toLowerCase()}` === cardKey
          )
          
          if (isDuplicate) {
            console.log('Skipping duplicate card:', cardData.frontContent)
            // Return a dummy card to maintain the interface, but don't add it
            return {
              ...cardData,
              id: 'duplicate-skipped',
              deckId,
              createdAt: new Date().toISOString(),
              easeFactor: 2.5,
              intervalDays: 0,
              nextReview: new Date().toISOString(),
              reviewCount: 0,
              lapseCount: 0
            }
          }
          
          const card: Card = {
            ...cardData,
            id: crypto.randomUUID(),
            deckId,
            createdAt: new Date().toISOString(),
            easeFactor: 2.5,
            intervalDays: 0,
            nextReview: new Date().toISOString(),
            reviewCount: 0,
            lapseCount: 0
          }
          
          set(state => {
            const deckCards = state.cards[deckId] || []
            const updatedCards = [...deckCards, card]
            
            return {
              cards: { ...state.cards, [deckId]: updatedCards },
              decks: state.decks.map(deck =>
                deck.id === deckId
                  ? { ...deck, cardCount: updatedCards.length, updatedAt: new Date().toISOString() }
                  : deck
              )
            }
          })

          // Persist to IndexedDB (non-blocking) if not a skipped duplicate
          if (card.id !== 'duplicate-skipped') {
            void persistAddCard(deckId, card)
          }
          
          return card
        } catch (error) {
          console.error('Failed to add card during bulk import:', error)
          throw error
        }
      },

      createDeckBulk: async (deckData) => {
        try {
          const deck: Deck = {
            ...deckData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: { ...defaultDeckSettings, ...deckData.settings }
          }
          
          set(state => ({
            decks: [...state.decks, deck],
            cards: { ...state.cards, [deck.id]: [] }
          }))

          // Persist to IndexedDB (non-blocking)
          void persistCreateDeck(deckData);
          
          return deck
        } catch (error) {
          console.error('Failed to create deck during bulk import:', error)
          throw error
        }
      },

      addCardsBatch: async (deckId, cardsData) => {
        try {
          const state = get()
          const existingCards = state.cards[deckId] || []
          
          // Create a Set of existing card content for fast lookup
          const existingCardSet = new Set(
            existingCards.map(card => `${card.frontContent.trim().toLowerCase()}|${card.backContent.trim().toLowerCase()}`)
          )
          
          // Filter out duplicates and create new cards
          const uniqueCardsData = cardsData.filter(cardData => {
            const cardKey = `${cardData.frontContent.trim().toLowerCase()}|${cardData.backContent.trim().toLowerCase()}`
            return !existingCardSet.has(cardKey)
          })
          
          console.log(`Batch processing: ${cardsData.length} cards submitted, ${uniqueCardsData.length} unique cards to add`)
          
          if (uniqueCardsData.length === 0) {
            console.log('No new unique cards to add in this batch')
            return []
          }
          
          const cards: Card[] = uniqueCardsData.map(cardData => ({
            ...cardData,
            id: crypto.randomUUID(),
            deckId,
            createdAt: new Date().toISOString(),
            easeFactor: 2.5,
            intervalDays: 0,
            nextReview: new Date().toISOString(),
            reviewCount: 0,
            lapseCount: 0
          }))
          
          set(state => {
            const deckCards = state.cards[deckId] || []
            const updatedCards = [...deckCards, ...cards]
            
            return {
              cards: { ...state.cards, [deckId]: updatedCards },
              decks: state.decks.map(deck =>
                deck.id === deckId
                  ? { ...deck, cardCount: updatedCards.length, updatedAt: new Date().toISOString() }
                  : deck
              )
            }
          })
          
          // Persist each card (non-blocking)
          for (const c of cards) {
            void persistAddCard(deckId, c)
          }

          return cards
        } catch (error) {
          console.error('Failed to add cards during batch import:', error)
          throw error
        }
      },

      updateCard: async (cardId, updates) => {
        set({ isLoading: true, error: null })
        try {
          set(state => {
            const newCards = { ...state.cards }
            for (const deckId in newCards) {
              newCards[deckId] = newCards[deckId].map(card =>
                card.id === cardId ? { ...card, ...updates } : card
              )
            }
            return { cards: newCards, isLoading: false }
          })
        } catch (error) {
          set({ error: 'Failed to update card', isLoading: false })
          throw error
        }
      },

      deleteCard: async (cardId) => {
        set({ isLoading: true, error: null })
        try {
          let affectedDeckId = ''
          set(state => {
            const newCards = { ...state.cards }
            for (const deckId in newCards) {
              const cardIndex = newCards[deckId].findIndex(card => card.id === cardId)
              if (cardIndex !== -1) {
                newCards[deckId] = newCards[deckId].filter(card => card.id !== cardId)
                affectedDeckId = deckId
                break
              }
            }
            
            return {
              cards: newCards,
              decks: state.decks.map(deck =>
                deck.id === affectedDeckId
                  ? { ...deck, cardCount: newCards[affectedDeckId].length, updatedAt: new Date().toISOString() }
                  : deck
              ),
              isLoading: false
            }
          })
          // Persist delete (non-blocking)
          try {
            void repos.cards.remove(cardId)
          } catch (e) {
            console.warn('[deckStore] repo deleteCard failed', e)
          }
        } catch (error) {
          set({ error: 'Failed to delete card', isLoading: false })
          throw error
        }
      },

      getCards: (deckId) => {
        return get().cards[deckId] || []
      },

      importAnkiDeck: async (file) => {
        const { setImportProgress, resetImportProgress } = get()
        set({ isLoading: true, error: null })
        resetImportProgress()
        
        try {
          const fileName = file.name.toLowerCase()
          
          // Handle different file types
          if (fileName.endsWith('.apkg')) {
            setImportProgress(10, 'Reading file...')
            
            // Parse .apkg file using the new parser
            const { name, cards } = await parseApkgFile(file)

            // Check if deck with the same name already exists
            const existingDeck = get().decks.find(d => d.title === name);
            if (existingDeck) {
              throw new Error(`A deck named "${name}" already exists. Please rename the deck or the file before importing.`);
            }
            
            setImportProgress(30, 'Creating deck...')
            
            // Create deck
            const deck = await get().createDeckBulk({
              userId: 'current-user',
              title: name,
              description: `Imported Anki deck with ${cards.length} cards`,
              cardCount: 0,
              isPublic: false,
              settings: defaultDeckSettings,
              category: 'imported'
            })
            
            setImportProgress(40, `Importing ${cards.length} cards...`)
            
            // Remove duplicates from cards before batch processing
            const uniqueCards: typeof cards = []
            const seenCards = new Set<string>()
            
            for (const card of cards) {
              const cardKey = `${card.front.trim().toLowerCase()}|${card.back.trim().toLowerCase()}`
              if (!seenCards.has(cardKey)) {
                seenCards.add(cardKey)
                uniqueCards.push(card)
              }
            }
            
            console.log(`Removed ${cards.length - uniqueCards.length} duplicates from Anki cards. Processing ${uniqueCards.length} unique cards.`)
            
            // Process unique cards in smaller batches for better performance and reliability
            const batchSize = 100
            let successfulImports = 0
            const totalCards = uniqueCards.length
            
            console.log(`Starting batch import of ${totalCards} unique cards`)
            
            for (let i = 0; i < totalCards; i += batchSize) {
              const batch = uniqueCards.slice(i, i + batchSize)
              const batchCards = batch.map(cardData => createNewCard(
                cardData.front,
                cardData.back,
                { type: 'basic' as const },
                []
              ))
              
              try {
                console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalCards / batchSize)} (${batch.length} cards)`)
                await get().addCardsBatch(deck.id, batchCards)
                successfulImports += batch.length
                
                // Update progress (40% to 90% for card import)
                const cardProgress = 40 + (50 * Math.min(i + batchSize, totalCards) / totalCards)
                setImportProgress(cardProgress, `Imported ${successfulImports}/${totalCards} cards...`)
                
                console.log(`Batch completed. Progress: ${cardProgress.toFixed(1)}%`)
                
                // Add small delay to allow UI updates
                await new Promise(resolve => setTimeout(resolve, 50))
              } catch (cardError) {
                console.error('Failed to import batch:', cardError)
                // Try individual cards in this batch as fallback
                for (const originalCard of batch) {
                  try {
                    await get().addCardBulk(deck.id, createNewCard(
                      originalCard.front,
                      originalCard.back,
                      { type: 'basic' as const },
                      []
                    ))
                    successfulImports++
                  } catch (individualError) {
                    console.warn('Failed to import individual card:', originalCard, individualError)
                  }
                }
                
                // Update progress even after fallback
                const cardProgress = 40 + (50 * Math.min(i + batchSize, totalCards) / totalCards)
                setImportProgress(cardProgress, `Imported ${successfulImports}/${totalCards} cards...`)
              }
            }
            
            console.log(`Batch import completed. Total successful: ${successfulImports}`)
            
            setImportProgress(95, 'Finalizing import...')
            
            // Update deck description with final count
            await get().updateDeck(deck.id, {
              description: `Imported Anki deck with ${successfulImports} cards`
            })
            
            setImportProgress(100, 'Import completed!')
            
            // Clear progress after a short delay
            setTimeout(() => {
              resetImportProgress()
            }, 1000)
            
            set({ isLoading: false })
            return deck
          } else if (fileName.endsWith('.txt') || fileName.endsWith('.tsv') || fileName.endsWith('.csv')) {
            setImportProgress(10, 'Reading text file...')
            
            // Handle text-based imports
            const text = await file.text()
            
            // Detect separator
            let separator = '\t' // Corrected: 	 is a tab character
            if (fileName.endsWith('.csv')) {
              separator = ','
            }
            
            setImportProgress(20, 'Processing text content...')
            
            // Clean the text and handle encoding issues
            const cleanText = text
              .replace(/\r\n/g, '\n')  // Normalize line endings
              .replace(/\r/g, '\n')    // Handle old Mac line endings
              .trim()
            
            const deck = await get().importFromText(
              file.name.replace(/\.[^/.]+$/, ""),
              cleanText,
              separator
            )
            set({ isLoading: false })
            return deck
          } else {
            setImportProgress(10, 'Reading file as text...')
            
            // Try to parse as text anyway
            const text = await file.text()
            
            setImportProgress(20, 'Processing content...')
            
            const cleanText = text
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
              .trim()
            
            const deck = await get().importFromText(
              file.name.replace(/\.[^/.]+$/, ""),
              cleanText,
              '\t'
            )
            set({ isLoading: false })
            return deck
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import Anki deck'
          set({ error: errorMessage, isLoading: false })
          resetImportProgress()
          throw error
        }
      },

      importFromText: async (deckName, text, separator = '\t') => {
        const { setImportProgress, resetImportProgress } = get()
        set({ isLoading: true, error: null })
        
        try {
          setImportProgress(30, 'Processing text content...')
          
          // Clean and normalize the text
          const cleanText = text
            .replace(/\r\n/g, '\n')  // Normalize Windows line endings
            .replace(/\r/g, '\n')    // Handle old Mac line endings
            .replace(/\\u0000/g, '')  // Remove null characters
            .replace(/[\\u0001-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '') // Remove control characters
            .trim()
          
          const lines = cleanText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
          
          if (lines.length === 0) {
            throw new Error('No valid content found in the file')
          }
          
          setImportProgress(40, 'Creating deck...')
          
          const deck = await get().createDeckBulk({
            userId: 'current-user', // This would come from auth store
            title: deckName,
            description: `Imported deck with ${lines.length} cards`,
            cardCount: 0,
            isPublic: false,
            settings: defaultDeckSettings,
            category: 'imported'
          })
          
          setImportProgress(50, `Importing ${lines.length} cards...`)
          
          // Process lines and prepare cards for batch import
          const validCards: Array<Omit<Card, 'id' | 'createdAt' | 'deckId' | 'easeFactor' | 'intervalDays' | 'nextReview' | 'reviewCount' | 'lapseCount'>> = []
          let skippedLines = 0
          
          // First pass: parse and validate all lines
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            try {
              // Handle quoted fields (CSV style)
              let parts: string[]
              if (separator === ',' && line.includes('"')) {
                // Simple CSV parsing for quoted fields
                parts = line.split(',').map(part =>
                  part.replace(/^"(.*)"$/, '$1').trim()
                )
              } else {
                parts = line.split(separator)
              }
              
              if (parts.length >= 2) {
                const front = parts[0].trim()
                const back = parts[1].trim()
                
                // Skip empty cards
                if (front && back) {
                  validCards.push(createNewCard(
                    front,
                    back,
                    { type: 'basic' as const },
                    []
                  ))
                } else {
                  skippedLines++
                }
              } else {
                skippedLines++
              }
            } catch (cardError) {
              console.warn('Failed to parse line:', line, cardError)
              skippedLines++
            }
          }
          
          // Remove duplicates from validCards before batch processing
          const uniqueValidCards: typeof validCards = []
          const seenCards = new Set<string>()
          
          for (const card of validCards) {
            const cardKey = `${card.frontContent.trim().toLowerCase()}|${card.backContent.trim().toLowerCase()}`
            if (!seenCards.has(cardKey)) {
              seenCards.add(cardKey)
              uniqueValidCards.push(card)
            }
          }
          
          console.log(`Removed ${validCards.length - uniqueValidCards.length} duplicates from parsed cards. Processing ${uniqueValidCards.length} unique cards.`)
          
          // Second pass: batch import unique cards
          const batchSize = 100
          let successfulImports = 0
          
          console.log(`Starting text import batch processing of ${uniqueValidCards.length} unique cards`)
          
          for (let i = 0; i < uniqueValidCards.length; i += batchSize) {
            const batch = uniqueValidCards.slice(i, i + batchSize)
            
            try {
              console.log(`Processing text batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueValidCards.length / batchSize)} (${batch.length} cards)`)
              const addedCards = await get().addCardsBatch(deck.id, batch)
              successfulImports += addedCards.length
              
              // Update progress (50% to 90% for card import)
              const cardProgress = 50 + (40 * Math.min(i + batchSize, uniqueValidCards.length) / uniqueValidCards.length)
              setImportProgress(cardProgress, `Imported ${successfulImports}/${uniqueValidCards.length} cards...`)
              
              console.log(`Text batch completed. Progress: ${cardProgress.toFixed(1)}%, Added: ${addedCards.length} cards`)
              
              // Add small delay to allow UI updates
              await new Promise(resolve => setTimeout(resolve, 50))
            } catch (cardError) {
              console.error('Failed to import text batch:', cardError)
              // Try individual cards in this batch as fallback
              for (const cardData of batch) {
                try {
                  const addedCard = await get().addCardBulk(deck.id, cardData)
                  if (addedCard.id !== 'duplicate-skipped') {
                    successfulImports++
                  }
                } catch (individualError) {
                  console.warn('Failed to import individual text card:', cardData, individualError)
                }
              }
              
              // Update progress even after fallback
              const cardProgress = 50 + (40 * Math.min(i + batchSize, uniqueValidCards.length) / uniqueValidCards.length)
              setImportProgress(cardProgress, `Imported ${successfulImports}/${uniqueValidCards.length} cards...`)
            }
          }
          
          console.log(`Text import batch processing completed. Total successful: ${successfulImports}`)
          
          setImportProgress(95, 'Finalizing import...')
          
          // Update deck description with import results
          await get().updateDeck(deck.id, {
            description: `Imported deck with ${successfulImports} cards${skippedLines > 0 ? ` (${skippedLines} lines skipped)` : ''}`
          })
          
          if (successfulImports === 0) {
            throw new Error('No valid cards could be imported. Please check the file format.')
          }
          
          setImportProgress(100, 'Import completed!')
          
          // Clear progress after a short delay
          setTimeout(() => {
            resetImportProgress()
          }, 1000)
          
          set({ isLoading: false })
          return deck
        } catch (error) {
          set({ error: 'Failed to import from text', isLoading: false })
          resetImportProgress()
          throw error
        }
      },

      loadExampleDecks: async () => {
        set({ isLoading: true, error: null })
        try {
          const state = get()
          
          // Check if example decks already exist to prevent duplicates
          const existingTitles = new Set(state.decks.map(deck => deck.title))
          const exampleTitles = ['Spanish Vocabulary', 'JavaScript Concepts', 'World Capitals']
          
          // If any example deck already exists, don't load any
          if (exampleTitles.some(title => existingTitles.has(title))) {
            console.log('Example decks already exist, skipping load')
            set({ isLoading: false })
            return
          }

          const exampleDecks = [
            {
              title: 'Spanish Vocabulary',
              description: 'Essential Spanish words for beginners',
              category: 'language',
              cards: [
                { front: 'Hello', back: 'Hola' },
                { front: 'Goodbye', back: 'Adiós' },
                { front: 'Thank you', back: 'Gracias' },
                { front: 'Please', back: 'Por favor' },
                { front: 'Yes', back: 'Sí' },
                { front: 'No', back: 'No' },
                { front: 'Water', back: 'Agua' },
                { front: 'Food', back: 'Comida' },
                { front: 'House', back: 'Casa' },
                { front: 'Car', back: 'Coche' }
              ]
            },
            {
              title: 'JavaScript Concepts',
              description: 'Important JavaScript programming concepts',
              category: 'programming',
              cards: [
                { front: 'What is a closure?', back: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.' },
                { front: 'What is hoisting?', back: 'Hoisting is JavaScript\'s default behavior of moving declarations to the top of their scope.' },
                { front: 'What is the difference between let and var?', back: 'let has block scope and cannot be redeclared, while var has function scope and can be redeclared.' },
                { front: 'What is a Promise?', back: 'A Promise is an object representing the eventual completion or failure of an asynchronous operation.' },
                { front: 'What is async/await?', back: 'async/await is syntactic sugar for working with Promises, making asynchronous code look more like synchronous code.' }
              ]
            },
            {
              title: 'World Capitals',
              description: 'Capital cities of countries around the world',
              category: 'geography',
              cards: [
                { front: 'France', back: 'Paris' },
                { front: 'Germany', back: 'Berlin' },
                { front: 'Italy', back: 'Rome' },
                { front: 'Spain', back: 'Madrid' },
                { front: 'United Kingdom', back: 'London' },
                { front: 'Japan', back: 'Tokyo' },
                { front: 'China', back: 'Beijing' },
                { front: 'Australia', back: 'Canberra' },
                { front: 'Brazil', back: 'Brasília' },
                { front: 'Canada', back: 'Ottawa' }
              ]
            }
          ]

          console.log('Loading example decks...')
          for (const deckData of exampleDecks) {
            const deck = await get().createDeck({
              userId: 'current-user',
              title: deckData.title,
              description: deckData.description,
              cardCount: 0,
              isPublic: false,
              settings: defaultDeckSettings,
              category: deckData.category,
              tags: [deckData.category]
            })

            for (const cardData of deckData.cards) {
              await get().addCard(deck.id, createNewCard(
                cardData.front,
                cardData.back,
                { type: 'basic' },
                []
              ))
            }
          }

          console.log('Example decks loaded successfully')
          set({ isLoading: false })
        } catch (error) {
          set({ error: 'Failed to load example decks', isLoading: false })
          throw error
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      removeDuplicateCards: async (deckId) => {
        try {
          const state = get()
          const deckCards = state.cards[deckId] || []
          
          if (deckCards.length === 0) {
            return 0
          }
          
          // Create a Map to track unique cards (first occurrence wins)
          const uniqueCardsMap = new Map<string, Card>()
          let duplicatesRemoved = 0
          
          for (const card of deckCards) {
            const cardKey = `${card.frontContent.trim().toLowerCase()}|${card.backContent.trim().toLowerCase()}`
            
            if (!uniqueCardsMap.has(cardKey)) {
              uniqueCardsMap.set(cardKey, card)
            } else {
              duplicatesRemoved++
              console.log(`Removing duplicate card: ${card.frontContent}`)
            }
          }
          
          const uniqueCards = Array.from(uniqueCardsMap.values())
          
          if (duplicatesRemoved > 0) {
            set(state => ({
              cards: { ...state.cards, [deckId]: uniqueCards },
              decks: state.decks.map(deck =>
                deck.id === deckId
                  ? { ...deck, cardCount: uniqueCards.length, updatedAt: new Date().toISOString() }
                  : deck
              )
            }))
            
            console.log(`Removed ${duplicatesRemoved} duplicate cards from deck. ${uniqueCards.length} unique cards remaining.`)
          }
          
          return duplicatesRemoved
        } catch (error) {
          console.error('Failed to remove duplicate cards:', error)
          throw error
        }
      },

      setImportProgress: (progress, status) => set({ importProgress: progress, importStatus: status }),
      resetImportProgress: () => set({ importProgress: 0, importStatus: null }),

      // Study session functions
            startStudySession: (deckId, studyCards) => {
        const studyCardIds = studyCards.map(c => c.id);
        set({
          currentStudySession: {
            deckId,
            currentCardIndex: 0,
            studyCards, // Keep full cards for in-memory access
            studyCardIds, // Add the IDs for persistence
            sessionStats: {
              total: studyCards.length,
              correct: 0,
              incorrect: 0
            },
            startedAt: new Date().toISOString()
          }
        })
      },

      updateStudySession: (currentCardIndex, sessionStats) => {
        set(state => ({
          currentStudySession: state.currentStudySession ? {
            ...state.currentStudySession,
            currentCardIndex,
            sessionStats
          } : null
        }))
      },

      clearStudySession: () => {
        set({ currentStudySession: null })
      },

      getStudySession: (deckId) => {
        const state = get()
        return state.currentStudySession?.deckId === deckId ? state.currentStudySession : null
      },

      resetAllStudyData: () => {
        // Reset all study-related data but keep decks and cards
        set(state => {
          // Reset all card progress data
          const resetCards: Record<string, Card[]> = {}
          
          for (const [deckId, cards] of Object.entries(state.cards)) {
            resetCards[deckId] = cards.map(card => ({
              ...card,
              easeFactor: 2.5,
              intervalDays: 0,
              nextReview: new Date().toISOString(),
              reviewCount: 0,
              lapseCount: 0
            }))
          }
          
          return {
            cards: resetCards,
            currentStudySession: null
          }
        })
      }
    }),
    {
      name: 'deck-storage',
      // This function selects which parts of the state to save
      partialize: (state) => {
        // 1. Exclude the top-level 'cards' object entirely.
        // 2. From the 'currentStudySession', exclude the 'studyCards' array of full objects.
        const { cards, currentStudySession, ...restOfState } = state;

        const sessionToPersist = currentStudySession
          ? {
              deckId: currentStudySession.deckId,
              currentCardIndex: currentStudySession.currentCardIndex,
              studyCardIds: currentStudySession.studyCardIds, // Only persist the IDs
              sessionStats: currentStudySession.sessionStats,
              startedAt: currentStudySession.startedAt,
            }
          : null;

        // Return a new object containing only the data we want to persist.
        // Note: `decks` are preserved via `restOfState`.
        return { ...restOfState, currentStudySession: sessionToPersist };
      },
    }
  )
)

export const useCurrentCard = (): Card | null => {
  const store = useDeckStore();
  const session = store.currentStudySession;

  if (!session || !session.studyCardIds || session.studyCardIds.length === 0) {
    return null;
  }

  const currentCardId = session.studyCardIds[session.currentCardIndex];
  if (!currentCardId) {
    return null;
  }

  // The full, non-persisted `cards` object holds all cards for the current deck.
  const deckCards = store.cards[session.deckId] || [];
  return deckCards.find(card => card.id === currentCardId) || null;
};
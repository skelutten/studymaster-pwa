import { Card, CardType, MediaReference } from '../../../shared/types'

/**
 * Create a new card with all required Anki-style fields populated with defaults
 */
export function createNewCard(
  frontContent: string,
  backContent: string,
  cardType: CardType = { type: 'basic' },
  mediaRefs: MediaReference[] = []
): Omit<Card, 'id' | 'createdAt' | 'deckId' | 'easeFactor' | 'intervalDays' | 'nextReview' | 'reviewCount' | 'lapseCount'> {
  return {
    frontContent,
    backContent,
    cardType,
    mediaRefs,
    
    // Enhanced Anki-style fields with defaults
    state: 'new',
    queue: 0, // 0 = new
    due: 0, // New cards have no due date
    ivl: 0, // No interval yet
    factor: 2500, // Default ease factor (250%)
    reps: 0, // No repetitions yet
    lapses: 0, // No lapses yet
    left: 0, // No learning time left
    
    // Learning state defaults
    learningStep: 0,
    graduationInterval: 1, // Default 1 day
    easyInterval: 4, // Default 4 days
    
    // Timing and performance defaults
    totalStudyTime: 0,
    averageAnswerTime: 0,
    
    // Metadata defaults
    flags: 0,
    originalDue: 0,
    originalDeck: '', // Will be set when card is created
    
    // Gamification defaults
    xpAwarded: 0,
    difficultyRating: 3 // Default medium difficulty
  }
}

/**
 * Create a complete card object for SVG map cards
 */
export function createSvgMapCard(
  id: string,
  deckId: string,
  frontContent: string,
  backContent: string,
  cardType: CardType,
  mediaRefs: MediaReference[] = []
): Card {
  const baseCard = createNewCard(frontContent, backContent, cardType, mediaRefs)
  
  return {
    ...baseCard,
    id,
    deckId,
    createdAt: new Date().toISOString(),
    
    // Legacy fields for backward compatibility
    easeFactor: 2.5,
    intervalDays: 0,
    nextReview: new Date().toISOString(),
    reviewCount: 0,
    lapseCount: 0,
    
    // Set original deck
    originalDeck: deckId
  }
}
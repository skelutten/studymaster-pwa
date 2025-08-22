import { CardStateManager } from '../cardStateManager'
import { Card, CardState, AdvancedDeckSettings } from '../../../../shared/types'
import { LearningStepsManager } from '../learningStepsManager'

describe('CardStateManager', () => {
  let manager: CardStateManager
  let settings: AdvancedDeckSettings
  let validCard: Card

  beforeEach(() => {
    manager = new CardStateManager(false) // Disable debug logging for tests
    settings = LearningStepsManager.getDefaultSettings()
    
    validCard = createValidCard()
  })

  function createValidCard(): Card {
    return {
      id: 'test-card-1',
      deckId: 'test-deck-1',
      frontContent: 'Test Front',
      backContent: 'Test Back',
      cardType: { type: 'basic' },
      mediaRefs: [],
      
      // Legacy fields
      easeFactor: 2.5,
      intervalDays: 0,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lapseCount: 0,
      
      // Enhanced fields
      state: 'new' as CardState,
      queue: 0,
      due: 0,
      ivl: 0,
      factor: 2500,
      reps: 0,
      lapses: 0,
      left: 0,
      learningStep: 0,
      graduationInterval: 1,
      easyInterval: 4,
      totalStudyTime: 0,
      averageAnswerTime: 0,
      flags: 0,
      originalDue: 0,
      originalDeck: '',
      xpAwarded: 0,
      difficultyRating: 3
    }
  }

  describe('Card Validation', () => {
    test('should validate a correct card', () => {
      const result = manager.validateCard(validCard, settings)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test('should detect missing required fields', () => {
      const invalidCard = { ...validCard, id: '', frontContent: '' }
      const result = manager.validateCard(invalidCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Card ID is required and must be a string')
      expect(result.errors).toContain('Front content is required and must be a string')
    })

    test('should detect invalid card state', () => {
      const invalidCard = { ...validCard, state: 'invalid' as CardState }
      const result = manager.validateCard(invalidCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid card state'))).toBe(true)
    })

    test('should detect invalid queue value', () => {
      const invalidCard = { ...validCard, queue: 99 }
      const result = manager.validateCard(invalidCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid queue value'))).toBe(true)
    })

    test('should detect state-queue inconsistency', () => {
      const invalidCard = { ...validCard, state: 'review', queue: 0 }
      const result = manager.validateCard(invalidCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Inconsistent state-queue combination'))).toBe(true)
    })

    test('should detect negative numeric values', () => {
      const invalidCard = { ...validCard, ivl: -1, reps: -1, lapses: -1 }
      const result = manager.validateCard(invalidCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Interval (ivl) must be a non-negative number'))).toBe(true)
      expect(result.errors.some(e => e.includes('Repetitions (reps) must be a non-negative number'))).toBe(true)
      expect(result.errors.some(e => e.includes('Lapses must be a non-negative number'))).toBe(true)
    })

    test('should warn about unusual ease factor', () => {
      const unusualCard = { ...validCard, factor: 1000 } // Too low
      const result = manager.validateCard(unusualCard, settings)
      
      expect(result.isValid).toBe(true) // Still valid, just warning
      expect(result.warnings.some(w => w.includes('outside normal range'))).toBe(true)
    })

    test('should warn about potential leech', () => {
      const leechCard = { ...validCard, lapses: 10 } // Above threshold
      const result = manager.validateCard(leechCard, settings)
      
      expect(result.warnings.some(w => w.includes('may be a leech'))).toBe(true)
    })

    test('should warn about state inconsistencies', () => {
      const inconsistentCard = { ...validCard, state: 'new' as CardState, reps: 5 }
      const result = manager.validateCard(inconsistentCard, settings)
      
      expect(result.warnings.some(w => w.includes('New card has repetitions > 0'))).toBe(true)
    })

    test('should validate date formats', () => {
      const invalidDateCard = { ...validCard, createdAt: 'invalid-date' }
      const result = manager.validateCard(invalidDateCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid createdAt date format'))).toBe(true)
    })
  })

  describe('State Transitions', () => {
    test('should transition new card to learning', () => {
      const result = manager.transitionCardState(validCard, 'learning', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('learning')
      expect(result.card.queue).toBe(1)
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(1) // First learning step
      expect(result.previousState).toBe('new')
      expect(result.newState).toBe('learning')
    })

    test('should transition learning card to review', () => {
      const learningCard = { ...validCard, state: 'learning' as CardState, queue: 1 }
      const result = manager.transitionCardState(learningCard, 'review', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(0)
      expect(result.card.ivl).toBe(1) // Graduating interval
    })

    test('should transition review card to relearning', () => {
      const reviewCard = { 
        ...validCard, 
        state: 'review' as CardState, 
        queue: 2, 
        reps: 3, 
        ivl: 7 
      }
      const result = manager.transitionCardState(reviewCard, 'relearning', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('relearning')
      expect(result.card.queue).toBe(1)
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(10) // First relearning step
    })

    test('should suspend card correctly', () => {
      const reviewCard = { 
        ...validCard, 
        state: 'review' as CardState, 
        queue: 2, 
        due: 100 
      }
      const result = manager.transitionCardState(reviewCard, 'suspended', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('suspended')
      expect(result.card.queue).toBe(-1)
      expect(result.card.originalDue).toBe(100)
      expect(result.card.due).toBe(0)
    })

    test('should bury card correctly', () => {
      const reviewCard = { 
        ...validCard, 
        state: 'review' as CardState, 
        queue: 2, 
        due: 100 
      }
      const result = manager.transitionCardState(reviewCard, 'buried', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('buried')
      expect(result.card.queue).toBe(-2)
      expect(result.card.originalDue).toBe(100)
      expect(result.card.due).toBeGreaterThan(100) // Tomorrow
    })

    test('should fail transition with invalid card', () => {
      const invalidCard = { ...validCard, id: '' }
      const result = manager.transitionCardState(invalidCard, 'learning', settings)
      
      expect(result.success).toBe(false)
      expect(result.validationResult.errors.length).toBeGreaterThan(0)
    })

    test('should reset card to new state', () => {
      const reviewCard = { 
        ...validCard, 
        state: 'review' as CardState, 
        reps: 5, 
        lapses: 2, 
        ivl: 14 
      }
      const result = manager.transitionCardState(reviewCard, 'new', settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('new')
      expect(result.card.queue).toBe(0)
      expect(result.card.reps).toBe(0)
      expect(result.card.lapses).toBe(0)
      expect(result.card.ivl).toBe(0)
      expect(result.card.due).toBe(0)
    })
  })

  describe('Card Migration', () => {
    test('should migrate legacy new card', () => {
      const legacyCard = {
        id: 'legacy-1',
        deckId: 'test-deck',
        frontContent: 'Legacy Front',
        backContent: 'Legacy Back',
        cardType: { type: 'basic' },
        mediaRefs: [],
        easeFactor: 2.5,
        intervalDays: 0,
        nextReview: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lapseCount: 0
      }

      const result = manager.migrateCard(legacyCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('new')
      expect(result.card.queue).toBe(0)
      expect(result.card.reps).toBe(0)
      expect(result.card.factor).toBe(2500)
      expect(result.migrationData).toBeDefined()
      expect(result.migrationData!.migrationNotes).toContain('Migrated as new card')
    })

    test('should migrate legacy review card', () => {
      const legacyCard = {
        id: 'legacy-2',
        deckId: 'test-deck',
        frontContent: 'Legacy Front',
        backContent: 'Legacy Back',
        cardType: { type: 'basic' },
        mediaRefs: [],
        easeFactor: 2.3,
        intervalDays: 7,
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        reviewCount: 3,
        lapseCount: 1
      }

      const result = manager.migrateCard(legacyCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.reps).toBe(3)
      expect(result.card.lapses).toBe(1)
      expect(result.card.ivl).toBe(7)
      expect(result.card.factor).toBe(2300)
      expect(result.migrationData!.migrationNotes).toContain('Migrated as review card based on reviewCount > 0')
    })

    test('should handle migration with missing fields', () => {
      const incompleteCard = {
        id: 'incomplete-1',
        deckId: 'test-deck',
        frontContent: 'Front',
        backContent: 'Back'
      }

      const result = manager.migrateCard(incompleteCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('new')
      expect(result.card.easeFactor).toBe(2.5) // Default value
      expect(result.card.factor).toBe(2500) // Converted to new format
    })
  })

  describe('Batch Operations', () => {
    test('should validate multiple cards', () => {
      const cards = [
        validCard,
        { ...validCard, id: 'card-2' },
        { ...validCard, id: '', frontContent: '' } // Invalid card
      ]

      const result = manager.validateCards(cards, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Card : Card ID is required'))).toBe(true)
    })

    test('should validate all valid cards', () => {
      const cards = [
        validCard,
        { ...validCard, id: 'card-2' },
        { ...validCard, id: 'card-3' }
      ]

      const result = manager.validateCards(cards, settings)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Card Repair', () => {
    test('should repair state-queue inconsistency', () => {
      const brokenCard = { ...validCard, state: 'review' as CardState, queue: 0 }
      const result = manager.repairCard(brokenCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.queue).toBe(2) // Correct queue for review state
    })

    test('should repair ease factor range', () => {
      const brokenCard = { ...validCard, factor: 1000 } // Too low
      const result = manager.repairCard(brokenCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.factor).toBe(1300) // Minimum value
    })

    test('should repair negative values', () => {
      const brokenCard = { 
        ...validCard, 
        ivl: -5, 
        reps: -2, 
        lapses: -1, 
        left: -10 
      }
      const result = manager.repairCard(brokenCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.ivl).toBe(0)
      expect(result.card.reps).toBe(0)
      expect(result.card.lapses).toBe(0)
      expect(result.card.left).toBe(0)
    })

    test('should repair state based on repetitions', () => {
      const brokenCard = { ...validCard, state: 'new' as CardState, reps: 5 }
      const result = manager.repairCard(brokenCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
    })

    test('should repair review card with no repetitions', () => {
      const brokenCard = { 
        ...validCard, 
        state: 'review' as CardState, 
        queue: 2, 
        reps: 0 
      }
      const result = manager.repairCard(brokenCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card.state).toBe('new')
      expect(result.card.queue).toBe(0)
    })

    test('should handle card that needs no repair', () => {
      const result = manager.repairCard(validCard, settings)
      
      expect(result.success).toBe(true)
      expect(result.card).toEqual(validCard) // No changes needed
    })
  })

  describe('State Statistics', () => {
    test('should calculate state statistics correctly', () => {
      const cards = [
        { ...validCard, id: 'new-1', state: 'new' as CardState },
        { ...validCard, id: 'new-2', state: 'new' as CardState },
        { ...validCard, id: 'learning-1', state: 'learning' as CardState },
        { ...validCard, id: 'review-1', state: 'review' as CardState },
        { ...validCard, id: 'review-2', state: 'review' as CardState },
        { ...validCard, id: 'review-3', state: 'review' as CardState },
        { ...validCard, id: 'suspended-1', state: 'suspended' as CardState }
      ]

      const stats = manager.getStateStatistics(cards)
      
      expect(stats.new).toBe(2)
      expect(stats.learning).toBe(1)
      expect(stats.review).toBe(3)
      expect(stats.relearning).toBe(0)
      expect(stats.suspended).toBe(1)
      expect(stats.buried).toBe(0)
    })

    test('should handle empty card array', () => {
      const stats = manager.getStateStatistics([])
      
      expect(stats.new).toBe(0)
      expect(stats.learning).toBe(0)
      expect(stats.review).toBe(0)
      expect(stats.relearning).toBe(0)
      expect(stats.suspended).toBe(0)
      expect(stats.buried).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle card with undefined fields', () => {
      const undefinedCard = {
        ...validCard,
        factor: undefined as unknown as number,
        reps: undefined as unknown as number
      }

      const result = manager.validateCard(undefinedCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Ease factor'))).toBe(true)
      expect(result.errors.some(e => e.includes('Repetitions'))).toBe(true)
    })

    test('should handle card with null values', () => {
      const nullCard = {
        ...validCard,
        id: null as unknown as string,
        frontContent: null as unknown as string
      }

      const result = manager.validateCard(nullCard, settings)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Card ID is required'))).toBe(true)
      expect(result.errors.some(e => e.includes('Front content is required'))).toBe(true)
    })

    test('should handle very large numeric values', () => {
      const extremeCard = {
        ...validCard,
        factor: 999999,
        ivl: 999999,
        reps: 999999
      }

      const result = manager.validateCard(extremeCard, settings)
      
      expect(result.warnings.some(w => w.includes('outside normal range'))).toBe(true)
    })

    test('should handle transition to same state', () => {
      const result = manager.transitionCardState(validCard, 'new', settings)
      
      expect(result.success).toBe(true)
      expect(result.previousState).toBe('new')
      expect(result.newState).toBe('new')
    })
  })

  describe('Performance Tests', () => {
    test('should validate large number of cards efficiently', () => {
      const largeCardSet = Array.from({ length: 10000 }, (_, i) => ({
        ...validCard,
        id: `perf-card-${i}`
      }))

      const startTime = performance.now()
      const result = manager.validateCards(largeCardSet, settings)
      const endTime = performance.now()

      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second

      console.log(`Validated ${largeCardSet.length} cards in ${(endTime - startTime).toFixed(2)}ms`)
    })

    test('should perform state transitions quickly', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        const testCard = { ...validCard, id: `transition-card-${i}` }
        manager.transitionCardState(testCard, 'learning', settings)
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should complete 1000 transitions in under 100ms

      console.log(`Performed 1000 state transitions in ${(endTime - startTime).toFixed(2)}ms`)
    })

    test('should repair cards efficiently', () => {
      const brokenCards = Array.from({ length: 1000 }, (_, i) => ({
        ...validCard,
        id: `broken-card-${i}`,
        factor: 1000, // Needs repair
        queue: 99 // Needs repair
      }))

      const startTime = performance.now()
      
      for (const card of brokenCards) {
        manager.repairCard(card, settings)
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(200) // Should repair 1000 cards in under 200ms

      console.log(`Repaired ${brokenCards.length} cards in ${(endTime - startTime).toFixed(2)}ms`)
    })
  })
})

// Integration tests
describe('CardStateManager Integration', () => {
  let manager: CardStateManager
  let settings: AdvancedDeckSettings

  beforeEach(() => {
    manager = new CardStateManager(true) // Enable debug logging
    settings = LearningStepsManager.getDefaultSettings()
  })

  test('should handle complete card lifecycle', () => {
    console.log('Starting card lifecycle simulation...')

    // Start with a new card
    let card = createValidCard()
    console.log('1. Created new card:', card.state)

    // Validate initial state
    let validation = manager.validateCard(card, settings)
    expect(validation.isValid).toBe(true)

    // Transition to learning
    let result = manager.transitionCardState(card, 'learning', settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('2. Transitioned to learning:', card.state, 'queue:', card.queue)

    // Transition to review
    result = manager.transitionCardState(card, 'review', settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('3. Graduated to review:', card.state, 'interval:', card.ivl)

    // Simulate a lapse - transition to relearning
    result = manager.transitionCardState(card, 'relearning', settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('4. Lapsed to relearning:', card.state, 'left:', card.left)

    // Graduate back to review
    result = manager.transitionCardState(card, 'review', settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('5. Graduated back to review:', card.state)

    // Suspend the card
    result = manager.transitionCardState(card, 'suspended', settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('6. Suspended card:', card.state, 'originalDue:', card.originalDue)

    // Final validation
    validation = manager.validateCard(card, settings)
    expect(validation.isValid).toBe(true)

    console.log('Card lifecycle completed successfully!')
  })

  test('should handle migration and repair workflow', () => {
    console.log('Starting migration and repair workflow...')

    // Create a legacy card
    const legacyCard = {
      id: 'legacy-workflow',
      deckId: 'test-deck',
      frontContent: 'Legacy Question',
      backContent: 'Legacy Answer',
      cardType: { type: 'basic' },
      mediaRefs: [],
      easeFactor: 2.3,
      intervalDays: 5,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reviewCount: 2,
      lapseCount: 0
    }

    // Migrate the card
    let result = manager.migrateCard(legacyCard, settings)
    expect(result.success).toBe(true)
    let card = result.card
    console.log('1. Migrated legacy card:', card.state, 'reps:', card.reps)

    // Introduce some corruption
    card.factor = 1000 // Too low
    card.queue = 99 // Invalid
    card.reps = -1 // Negative
    console.log('2. Introduced corruption')

    // Repair the card
    result = manager.repairCard(card, settings)
    expect(result.success).toBe(true)
    card = result.card
    console.log('3. Repaired card:', {
      factor: card.factor,
      queue: card.queue,
      reps: card.reps
    })

    // Final validation
    const validation = manager.validateCard(card, settings)
    expect(validation.isValid).toBe(true)

    console.log('Migration and repair workflow completed successfully!')
  })

  function createValidCard(): Card {
    return {
      id: 'integration-card',
      deckId: 'integration-deck',
      frontContent: 'Integration Test Question',
      backContent: 'Integration Test Answer',
      cardType: { type: 'basic' },
      mediaRefs: [],
      easeFactor: 2.5,
      intervalDays: 0,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lapseCount: 0,
      state: 'new',
      queue: 0,
      due: 0,
      ivl: 0,
      factor: 2500,
      reps: 0,
      lapses: 0,
      left: 0,
      learningStep: 0,
      graduationInterval: 1,
      easyInterval: 4,
      totalStudyTime: 0,
      averageAnswerTime: 0,
      flags: 0,
      originalDue: 0,
      originalDeck: '',
      xpAwarded: 0,
      difficultyRating: 3
    }
  }
})
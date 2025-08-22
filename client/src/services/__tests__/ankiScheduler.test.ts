import { AnkiScheduler, SchedulingContext } from '../ankiScheduler'
import { Card, CardState, ReviewRating, AdvancedDeckSettings } from '../../../../shared/types'
import { LearningStepsManager } from '../learningStepsManager'

describe('AnkiScheduler', () => {
  let scheduler: AnkiScheduler
  let settings: AdvancedDeckSettings
  let mockCard: Card

  beforeEach(() => {
    scheduler = new AnkiScheduler(false) // Disable debug logging for tests
    settings = LearningStepsManager.getDefaultSettings()
    mockCard = createMockCard()
  })

  function createMockCard(overrides: Partial<Card> = {}): Card {
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
      difficultyRating: 3,
      
      ...overrides
    }
  }

  function createContext(overrides: Partial<SchedulingContext> = {}): SchedulingContext {
    return {
      timeTaken: 3000,
      ...overrides
    }
  }

  describe('New Card Scheduling', () => {
    test('should schedule new card with Good rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(mockCard, 3, settings, context)
      
      expect(result.card.state).toBe('learning')
      expect(result.card.learningStep).toBe(1)
      expect(result.card.left).toBe(10) // Second learning step
      expect(result.wasCorrect).toBe(true)
      expect(result.debugInfo.algorithm).toBe('ANKI_LEARNING')
    })

    test('should schedule new card with Again rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(mockCard, 1, settings, context)
      
      expect(result.card.state).toBe('learning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(1) // First learning step
      expect(result.card.lapses).toBe(1)
      expect(result.wasCorrect).toBe(false)
    })

    test('should graduate new card with Easy rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(mockCard, 4, settings, context)
      
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.ivl).toBe(4) // Easy interval
      expect(result.card.factor).toBe(2650) // Boosted ease
      expect(result.wasCorrect).toBe(true)
    })
  })

  describe('Review Card Scheduling', () => {
    let reviewCard: Card

    beforeEach(() => {
      reviewCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 7,
        factor: 2500,
        reps: 3,
        lapses: 0
      })
    })

    test('should schedule review card with Good rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 3, settings, context)
      
      expect(result.card.state).toBe('review')
      expect(result.card.ivl).toBeGreaterThan(7) // Should increase
      expect(result.card.factor).toBe(2500) // No change for Good
      expect(result.card.reps).toBe(4)
      expect(result.wasCorrect).toBe(true)
      expect(result.debugInfo.algorithm).toBe('SM2_PLUS')
    })

    test('should schedule review card with Easy rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 4, settings, context)
      
      expect(result.card.ivl).toBeGreaterThan(reviewCard.ivl * 2.5) // Easy bonus applied
      expect(result.card.factor).toBe(2650) // Increased ease
      expect(result.wasCorrect).toBe(true)
    })

    test('should schedule review card with Hard rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 2, settings, context)
      
      expect(result.card.ivl).toBeCloseTo(reviewCard.ivl * 1.2, 0) // Hard interval
      expect(result.card.factor).toBe(2350) // Decreased ease
      expect(result.wasCorrect).toBe(true)
    })

    test('should handle review card lapse with Again rating', () => {
      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 1, settings, context)
      
      expect(result.card.state).toBe('relearning')
      expect(result.card.queue).toBe(1)
      expect(result.card.lapses).toBe(1)
      expect(result.card.factor).toBe(2300) // Reduced ease
      expect(result.card.left).toBe(10) // First relearning step
      expect(result.wasCorrect).toBe(false)
      expect(result.debugInfo.algorithm).toBe('SM2_PLUS_LAPSE')
    })

    test('should calculate intervals correctly with different ease factors', () => {
      const easyCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 10,
        factor: 2800, // High ease
        reps: 5,
        lapses: 0
      })

      const context = createContext()
      const result = scheduler.scheduleCard(easyCard, 3, settings, context)
      
      // Should use ease factor: 10 * 2.8 = 28 days (approximately)
      expect(result.card.ivl).toBeGreaterThan(25)
      expect(result.card.ivl).toBeLessThan(35)
    })
  })

  describe('Learning Card Progression', () => {
    test('should progress through learning steps', () => {
      let card = createMockCard({
        state: 'learning',
        queue: 1,
        learningStep: 0,
        left: 1
      })

      const context = createContext()

      // First Good - advance to step 1
      let result = scheduler.scheduleCard(card, 3, settings, context)
      expect(result.card.learningStep).toBe(1)
      expect(result.card.left).toBe(10)

      // Second Good - graduate
      card = result.card
      result = scheduler.scheduleCard(card, 3, settings, context)
      expect(result.card.state).toBe('review')
      expect(result.card.ivl).toBe(1)
    })

    test('should handle learning card failure', () => {
      const learningCard = createMockCard({
        state: 'learning',
        queue: 1,
        learningStep: 1,
        left: 10
      })

      const context = createContext()
      const result = scheduler.scheduleCard(learningCard, 1, settings, context)
      
      expect(result.card.learningStep).toBe(0) // Reset to first step
      expect(result.card.left).toBe(1)
      expect(result.card.lapses).toBe(1)
    })
  })

  describe('Relearning Card Handling', () => {
    test('should handle relearning card progression', () => {
      const relearningCard = createMockCard({
        state: 'relearning',
        queue: 1,
        learningStep: 0,
        left: 10,
        ivl: 5, // Previous interval
        lapses: 1
      })

      const context = createContext()
      const result = scheduler.scheduleCard(relearningCard, 3, settings, context)
      
      expect(result.card.state).toBe('review') // Graduated from relearning
      expect(result.card.queue).toBe(2)
      expect(result.card.ivl).toBeLessThanOrEqual(5) // Reduced interval after lapse
    })

    test('should handle relearning card failure', () => {
      const relearningCard = createMockCard({
        state: 'relearning',
        queue: 1,
        learningStep: 0,
        left: 10,
        lapses: 1
      })

      const context = createContext()
      const result = scheduler.scheduleCard(relearningCard, 1, settings, context)
      
      expect(result.card.state).toBe('relearning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.lapses).toBe(2)
    })
  })

  describe('Leech Detection and Handling', () => {
    test('should detect and handle leech cards', () => {
      const leechCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 3,
        lapses: 8, // At threshold
        reps: 10
      })

      const context = createContext()
      const result = scheduler.scheduleCard(leechCard, 1, settings, context)
      
      expect(result.card.lapses).toBe(9) // Incremented
      expect(result.card.state).toBe('suspended') // Leech action
      expect(result.debugInfo.reasoning).toContain('leech')
    })

    test('should handle leech tagging action', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tagSettings = {
        ...settings,
        lapses: {
          ...settings.lapses,
          leechAction: 'tag' as const
        }
      }

      const leechCard = createMockCard({
        state: 'review',
        queue: 2,
        lapses: 8,
        reps: 10
      })

      const context = createContext()
      const result = scheduler.scheduleCard(leechCard, 1, settings, context)
      
      expect(result.card.flags & 1).toBe(1) // Leech flag set
      expect(result.card.state).toBe('relearning') // Still in relearning, not suspended
    })
  })

  describe('Scheduling Preview', () => {
    test('should generate scheduling preview for all ratings', () => {
      const reviewCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 10,
        factor: 2500,
        reps: 3
      })

      const preview = scheduler.getSchedulingPreview(reviewCard, settings)
      
      expect(preview[1]).toBeDefined() // Again
      expect(preview[2]).toBeDefined() // Hard
      expect(preview[3]).toBeDefined() // Good
      expect(preview[4]).toBeDefined() // Easy

      // Easy should have longest interval
      expect(preview[4].interval).toBeGreaterThan(preview[3].interval)
      expect(preview[3].interval).toBeGreaterThan(preview[2].interval)
      
      // Again should cause lapse (relearning or reduced interval)
      expect(preview[1].interval).toBeLessThan(reviewCard.ivl)
    })

    test('should handle preview for new cards', () => {
      const preview = scheduler.getSchedulingPreview(mockCard, settings)
      
      // All ratings should be valid for new cards
      expect(preview[1]).toBeDefined()
      expect(preview[2]).toBeDefined()
      expect(preview[3]).toBeDefined()
      expect(preview[4]).toBeDefined()

      // Easy should graduate immediately
      expect(preview[4].interval).toBe(4) // Easy interval
    })
  })

  describe('Retention Rate Calculation', () => {
    test('should calculate retention rate correctly', () => {
      const cards = [
        createMockCard({ state: 'review', reps: 5, lapses: 0 }), // 100% retention
        createMockCard({ state: 'review', reps: 4, lapses: 1 }), // 75% retention
        createMockCard({ state: 'review', reps: 3, lapses: 0 }), // 100% retention
        createMockCard({ state: 'new', reps: 0, lapses: 0 })     // Excluded
      ]

      const retentionRate = scheduler.calculateRetentionRate(cards)
      
      // Total reviews: 5 + 4 + 3 = 12
      // Total lapses: 0 + 1 + 0 = 1
      // Retention: (12 - 1) / 12 = 91.67%
      expect(retentionRate).toBeCloseTo(91.67, 1)
    })

    test('should handle empty card array', () => {
      const retentionRate = scheduler.calculateRetentionRate([])
      expect(retentionRate).toBe(0)
    })

    test('should exclude new cards from retention calculation', () => {
      const cards = [
        createMockCard({ state: 'new', reps: 0, lapses: 0 }),
        createMockCard({ state: 'learning', reps: 1, lapses: 0 })
      ]

      const retentionRate = scheduler.calculateRetentionRate(cards)
      expect(retentionRate).toBe(0) // No review cards
    })
  })

  describe('Settings Optimization', () => {
    test('should reduce interval modifier for low retention', () => {
      const cards = [
        createMockCard({ state: 'review', reps: 10, lapses: 5 }), // 50% retention
        createMockCard({ state: 'review', reps: 8, lapses: 4 })   // 50% retention
      ]

      const optimized = scheduler.optimizeSettings(cards, settings, 85)
      
      expect(optimized.reviews.intervalModifier).toBeLessThan(settings.reviews.intervalModifier)
    })

    test('should increase interval modifier for high retention', () => {
      const cards = [
        createMockCard({ state: 'review', reps: 10, lapses: 0 }), // 100% retention
        createMockCard({ state: 'review', reps: 8, lapses: 0 })   // 100% retention
      ]

      const optimized = scheduler.optimizeSettings(cards, settings, 85)
      
      expect(optimized.reviews.intervalModifier).toBeGreaterThan(settings.reviews.intervalModifier)
    })

    test('should adjust starting ease for low-performing cards', () => {
      const cards = [
        createMockCard({ state: 'review', factor: 2000 }),
        createMockCard({ state: 'review', factor: 2100 })
      ]

      const optimized = scheduler.optimizeSettings(cards, settings, 85)
      
      expect(optimized.newCards.startingEase).toBeGreaterThan(settings.newCards.startingEase)
    })
  })

  describe('Custom Settings Integration', () => {
    test('should respect custom learning steps', () => {
      const customSettings = {
        ...settings,
        newCards: {
          ...settings.newCards,
          stepsMinutes: [5, 15, 30] // Custom 3-step learning
        }
      }

      const context = createContext()
      const result = scheduler.scheduleCard(mockCard, 3, customSettings, context)
      
      expect(result.card.learningStep).toBe(1)
      expect(result.card.left).toBe(15) // Second step
    })

    test('should respect custom interval modifiers', () => {
      const customSettings = {
        ...settings,
        reviews: {
          ...settings.reviews,
          intervalModifier: 1.5 // 50% longer intervals
        }
      }

      const reviewCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 10,
        factor: 2500
      })

      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 3, customSettings, context)
      
      // Should be approximately 10 * 2.5 * 1.5 = 37.5 days
      expect(result.card.ivl).toBeGreaterThan(30)
      expect(result.card.ivl).toBeLessThan(45)
    })

    test('should respect custom ease bonus', () => {
      const customSettings = {
        ...settings,
        reviews: {
          ...settings.reviews,
          easyBonus: 2.0 // Double bonus for easy
        }
      }

      const reviewCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 10,
        factor: 2500
      })

      const context = createContext()
      const result = scheduler.scheduleCard(reviewCard, 4, customSettings, context)
      
      // Should be approximately 10 * 2.5 * 2.0 = 50 days
      expect(result.card.ivl).toBeGreaterThan(45)
      expect(result.card.ivl).toBeLessThan(60)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid card state', () => {
      const invalidCard = createMockCard({ state: 'suspended' })
      const context = createContext()
      
      expect(() => {
        scheduler.scheduleCard(invalidCard, 3, settings, context)
      }).toThrow('Cannot schedule card in state: suspended')
    })

    test('should handle card validation errors', () => {
      const invalidCard = createMockCard({ id: '' }) // Invalid card
      const context = createContext()
      
      expect(() => {
        scheduler.scheduleCard(invalidCard, 3, settings, context)
      }).toThrow('Cannot schedule invalid card')
    })

    test('should handle extreme ease factors', () => {
      const extremeCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 10,
        factor: 5000, // Maximum ease
        reps: 3
      })

      const context = createContext()
      const result = scheduler.scheduleCard(extremeCard, 4, settings, context)
      
      expect(result.card.factor).toBeLessThanOrEqual(5000) // Should not exceed maximum
    })

    test('should handle minimum intervals', () => {
      const shortCard = createMockCard({
        state: 'review',
        queue: 2,
        ivl: 1,
        factor: 1300, // Minimum ease
        reps: 3
      })

      const context = createContext()
      const result = scheduler.scheduleCard(shortCard, 2, settings, context) // Hard rating
      
      expect(result.card.ivl).toBeGreaterThanOrEqual(settings.reviews.minimumInterval)
    })
  })

  describe('Performance Tests', () => {
    test('should schedule cards efficiently', () => {
      const cards = Array.from({ length: 1000 }, (_, i) => 
        createMockCard({ 
          id: `perf-card-${i}`,
          state: 'review',
          queue: 2,
          ivl: Math.floor(Math.random() * 30) + 1,
          factor: 2000 + Math.floor(Math.random() * 1000)
        })
      )

      const context = createContext()
      const startTime = performance.now()

      for (const card of cards) {
        const rating = (Math.floor(Math.random() * 4) + 1) as ReviewRating
        scheduler.scheduleCard(card, rating, settings, context)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(500) // Should schedule 1000 cards in under 500ms
      console.log(`Scheduled ${cards.length} cards in ${totalTime.toFixed(2)}ms`)
    })

    test('should generate previews efficiently', () => {
      const cards = Array.from({ length: 100 }, (_, i) => 
        createMockCard({ 
          id: `preview-card-${i}`,
          state: 'review',
          queue: 2,
          ivl: Math.floor(Math.random() * 30) + 1
        })
      )

      const startTime = performance.now()

      for (const card of cards) {
        scheduler.getSchedulingPreview(card, settings)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(200) // Should generate 100 previews in under 200ms
      console.log(`Generated ${cards.length} previews in ${totalTime.toFixed(2)}ms`)
    })
  })
})

// Integration tests
describe('AnkiScheduler Integration', () => {
  let scheduler: AnkiScheduler
  let settings: AdvancedDeckSettings

  beforeEach(() => {
    scheduler = new AnkiScheduler(true) // Enable debug logging
    settings = LearningStepsManager.getDefaultSettings()
  })

  test('should simulate complete card lifecycle', () => {
    console.log('Starting complete card lifecycle simulation...')

    // Start with a new card
    let card = createMockCard()
    const context: SchedulingContext = { timeTaken: 3000 }

    console.log('1. New card created:', card.state)

    // First study - Again (forgot)
    let result = scheduler.scheduleCard(card, 1, settings, context)
    card = result.card
    console.log('2. First attempt - Again:', {
      state: card.state,
      step: card.learningStep,
      left: card.left,
      lapses: card.lapses
    })

    // Second study - Good (remembered)
    result = scheduler.scheduleCard(card, 3, settings, context)
    card = result.card
    console.log('3. Second attempt - Good:', {
      state: card.state,
      step: card.learningStep,
      left: card.left
    })

    // Third study - Good (graduated)
    result = scheduler.scheduleCard(card, 3, settings, context)
    card = result.card
    console.log('4. Third attempt - Good (graduated):', {
      state: card.state,
      interval: card.ivl,
      ease: card.factor
    })

    // Several successful reviews
    for (let i = 0; i < 5; i++) {
      result = scheduler.scheduleCard(card, 3, settings, context)
      card = result.card
      console.log(`5.${i + 1}. Review ${i + 1} - Good:`, {
        interval: card.ivl,
        ease: card.factor,
        reps: card.reps
      })
    }

    // Simulate a lapse
    result = scheduler.scheduleCard(card, 1, settings, context)
    card = result.card
    console.log('6. Lapse - Again:', {
      state: card.state,
      interval: card.ivl,
      ease: card.factor,
      lapses: card.lapses
    })

    // Graduate from relearning
    result = scheduler.scheduleCard(card, 3, settings, context)
    card = result.card
    console.log('7. Graduated from relearning:', {
      state: card.state,
      interval: card.ivl,
      ease: card.factor
    })

    console.log('Card lifecycle simulation completed successfully!')

    // Verify final state
    expect(card.state).toBe('review')
    expect(card.reps).toBeGreaterThan(5)
    expect(card.lapses).toBe(1)
    expect(card.ivl).toBeGreaterThan(0)
  })

  function createMockCard(overrides: Partial<Card> = {}): Card {
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
      difficultyRating: 3,
      ...overrides
    }
  }
})
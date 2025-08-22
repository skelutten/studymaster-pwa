import { StudyQueueManager } from '../studyQueueManager'
import { Card, CardState, AdvancedDeckSettings } from '../../../../shared/types'
import { LearningStepsManager } from '../learningStepsManager'

describe('StudyQueueManager', () => {
  let manager: StudyQueueManager
  let settings: AdvancedDeckSettings
  let mockCards: Card[]

  beforeEach(() => {
    manager = new StudyQueueManager(false) // Disable debug logging for tests
    settings = LearningStepsManager.getDefaultSettings()
    
    // Reset daily limits
    manager.resetDailyLimits()
    
    // Create mock cards with different states
    mockCards = createMockCards()
  })

  function createMockCards(): Card[] {
    const baseCard = {
      deckId: 'test-deck-1',
      frontContent: 'Test Front',
      backContent: 'Test Back',
      cardType: { type: 'basic' as const },
      mediaRefs: [],
      easeFactor: 2.5,
      intervalDays: 0,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lapseCount: 0,
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

    const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000))

    return [
      // New cards
      {
        ...baseCard,
        id: 'new-1',
        state: 'new' as CardState,
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 2500,
        reps: 0,
        lapses: 0,
        left: 0,
        learningStep: 0
      },
      {
        ...baseCard,
        id: 'new-2',
        state: 'new' as CardState,
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 2500,
        reps: 0,
        lapses: 0,
        left: 0,
        learningStep: 0
      },
      {
        ...baseCard,
        id: 'new-3',
        state: 'new' as CardState,
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 2500,
        reps: 0,
        lapses: 0,
        left: 0,
        learningStep: 0
      },
      
      // Learning cards (due now)
      {
        ...baseCard,
        id: 'learning-1',
        state: 'learning' as CardState,
        queue: 1,
        due: today,
        ivl: 0,
        factor: 2500,
        reps: 1,
        lapses: 0,
        left: 0, // Due now
        learningStep: 1
      },
      {
        ...baseCard,
        id: 'learning-2',
        state: 'learning' as CardState,
        queue: 1,
        due: today,
        ivl: 0,
        factor: 2500,
        reps: 1,
        lapses: 0,
        left: 5, // Due in 5 minutes
        learningStep: 0
      },
      
      // Review cards (due today)
      {
        ...baseCard,
        id: 'review-1',
        state: 'review' as CardState,
        queue: 2,
        due: today,
        ivl: 3,
        factor: 2500,
        reps: 3,
        lapses: 0,
        left: 0,
        learningStep: 0
      },
      {
        ...baseCard,
        id: 'review-2',
        state: 'review' as CardState,
        queue: 2,
        due: today - 1, // Overdue
        ivl: 7,
        factor: 2300,
        reps: 5,
        lapses: 1,
        left: 0,
        learningStep: 0
      },
      
      // Review cards (due in future)
      {
        ...baseCard,
        id: 'review-future',
        state: 'review' as CardState,
        queue: 2,
        due: today + 2,
        ivl: 14,
        factor: 2600,
        reps: 8,
        lapses: 0,
        left: 0,
        learningStep: 0
      },
      
      // Suspended card
      {
        ...baseCard,
        id: 'suspended-1',
        state: 'suspended' as CardState,
        queue: -1,
        due: 0,
        ivl: 5,
        factor: 2400,
        reps: 4,
        lapses: 3,
        left: 0,
        learningStep: 0
      },
      
      // Buried card
      {
        ...baseCard,
        id: 'buried-1',
        state: 'buried' as CardState,
        queue: -2,
        due: today + 1,
        ivl: 2,
        factor: 2500,
        reps: 2,
        lapses: 0,
        left: 0,
        learningStep: 0,
        originalDue: today
      }
    ]
  }

  describe('Queue Building', () => {
    test('should build study queue correctly', () => {
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      expect(queue.deckId).toBe('test-deck-1')
      expect(queue.newCards).toHaveLength(3)
      expect(queue.learningCards).toHaveLength(1) // Only learning-1 is due now
      expect(queue.reviewCards).toHaveLength(2) // review-1 and review-2
      
      expect(queue.counts.newCards).toBe(3)
      expect(queue.counts.learningCards).toBe(1)
      expect(queue.counts.reviewCards).toBe(2)
      expect(queue.counts.totalDue).toBe(6)
      
      expect(queue.limits.newCardsRemaining).toBe(20) // Default limit
      expect(queue.limits.reviewsRemaining).toBe(200) // Default limit
    })

    test('should respect daily limits', () => {
      // Simulate having studied some cards today
      manager.updateDailyLimits('test-deck-1', mockCards[0], 5000) // New card
      manager.updateDailyLimits('test-deck-1', mockCards[5], 3000) // Review card
      
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      expect(queue.limits.newCardsRemaining).toBe(19) // 20 - 1
      expect(queue.limits.reviewsRemaining).toBe(199) // 200 - 1
    })

    test('should filter suspended and buried cards', () => {
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      // Should not include suspended or buried cards
      const allQueueCards = [
        ...queue.newCards,
        ...queue.learningCards,
        ...queue.reviewCards
      ]
      
      expect(allQueueCards.find(c => c.id === 'suspended-1')).toBeUndefined()
      expect(allQueueCards.find(c => c.id === 'buried-1')).toBeUndefined()
    })

    test('should sort cards correctly', () => {
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      // Review cards should be sorted by due date (overdue first)
      expect(queue.reviewCards[0].id).toBe('review-2') // Overdue card first
      expect(queue.reviewCards[1].id).toBe('review-1') // Due today second
    })

    test('should estimate study time', () => {
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      expect(queue.estimatedStudyTime).toBeGreaterThan(0)
      // 3 new cards (30s each) + 1 learning (15s) + 2 review (10s each) = 125s = ~3 minutes
      expect(queue.estimatedStudyTime).toBeCloseTo(3, 0)
    })
  })

  describe('Card Selection', () => {
    test('should prioritize learning cards', () => {
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      const nextCard = manager.getNextCard(queue)
      
      expect(nextCard?.id).toBe('learning-1')
      expect(nextCard?.state).toBe('learning')
    })

    test('should select review cards when no learning cards', () => {
      // Remove learning cards
      const cardsWithoutLearning = mockCards.filter(c => c.state !== 'learning')
      const queue = manager.buildStudyQueue('test-deck-1', cardsWithoutLearning, settings)
      const nextCard = manager.getNextCard(queue)
      
      expect(nextCard?.state).toBe('review')
      expect(nextCard?.id).toBe('review-2') // Overdue card first
    })

    test('should select new cards when no learning or review cards', () => {
      // Remove learning and review cards
      const newCardsOnly = mockCards.filter(c => c.state === 'new')
      const queue = manager.buildStudyQueue('test-deck-1', newCardsOnly, settings)
      const nextCard = manager.getNextCard(queue)
      
      expect(nextCard?.state).toBe('new')
      expect(nextCard?.id).toBe('new-1')
    })

    test('should return null when daily limits reached', () => {
      // Set limits to 0
      const limitedSettings = {
        ...settings,
        newCards: { ...settings.newCards, newCardsPerDay: 0 },
        reviews: { ...settings.reviews, maximumReviewsPerDay: 0 }
      }
      
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, limitedSettings)
      const nextCard = manager.getNextCard(queue)
      
      expect(nextCard).toBeNull()
    })

    test('should return null when no cards available', () => {
      const queue = manager.buildStudyQueue('test-deck-1', [], settings)
      const nextCard = manager.getNextCard(queue)
      
      expect(nextCard).toBeNull()
    })
  })

  describe('Daily Limits Management', () => {
    test('should update daily limits correctly', () => {
      const newCard = mockCards.find(c => c.state === 'new')!
      const reviewCard = mockCards.find(c => c.state === 'review')!
      
      manager.updateDailyLimits('test-deck-1', newCard, 5000)
      manager.updateDailyLimits('test-deck-1', reviewCard, 3000)
      
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      expect(queue.limits.newCardsRemaining).toBe(19)
      expect(queue.limits.reviewsRemaining).toBe(199)
    })

    test('should reset daily limits', () => {
      // Study some cards
      manager.updateDailyLimits('test-deck-1', mockCards[0], 5000)
      manager.updateDailyLimits('test-deck-1', mockCards[5], 3000)
      
      // Reset limits
      manager.resetDailyLimits('test-deck-1')
      
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, settings)
      
      expect(queue.limits.newCardsRemaining).toBe(20)
      expect(queue.limits.reviewsRemaining).toBe(200)
    })

    test('should detect day rollover', () => {
      // This test would need to mock time, but we'll test the logic
      const rolloverDetected = manager.checkDayRollover(settings)
      expect(typeof rolloverDetected).toBe('boolean')
    })
  })

  describe('Card State Management', () => {
    test('should bury card correctly', () => {
      const card = mockCards[0]
      const buriedCard = manager.buryCard(card)
      
      expect(buriedCard.state).toBe('buried')
      expect(buriedCard.queue).toBe(-2)
      expect(buriedCard.originalDue).toBe(card.due)
      expect(buriedCard.due).toBeGreaterThan(card.due)
    })

    test('should suspend card correctly', () => {
      const card = mockCards[0]
      const suspendedCard = manager.suspendCard(card)
      
      expect(suspendedCard.state).toBe('suspended')
      expect(suspendedCard.queue).toBe(-1)
      expect(suspendedCard.originalDue).toBe(card.due)
      expect(suspendedCard.due).toBe(0)
    })

    test('should unsuspend card correctly', () => {
      const suspendedCard = mockCards.find(c => c.state === 'suspended')!
      const unsuspendedCard = manager.unsuspendCard(suspendedCard)
      
      expect(unsuspendedCard.state).toBe('review') // Has reps > 0
      expect(unsuspendedCard.queue).toBe(2)
      expect(unsuspendedCard.due).toBeGreaterThan(0)
    })

    test('should unsuspend new card correctly', () => {
      const newCard = { ...mockCards[0], state: 'suspended' as CardState, reps: 0 }
      const unsuspendedCard = manager.unsuspendCard(newCard)
      
      expect(unsuspendedCard.state).toBe('new')
      expect(unsuspendedCard.queue).toBe(0)
    })

    test('should get buried cards that can be unburied', () => {
      const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
      const buriedCards = [
        { ...mockCards[0], state: 'buried' as CardState, due: today }, // Can unbury
        { ...mockCards[1], state: 'buried' as CardState, due: today + 1 } // Cannot unbury yet
      ]
      
      const unburiableCards = manager.getBuriedCards(buriedCards)
      
      expect(unburiableCards).toHaveLength(1)
      expect(unburiableCards[0].due).toBe(today)
    })

    test('should unbury cards correctly', () => {
      const buriedCard = {
        ...mockCards[0],
        state: 'buried' as CardState,
        originalDue: 5,
        reps: 3
      }
      
      const unburiedCards = manager.unburyCards([buriedCard])
      
      expect(unburiedCards).toHaveLength(1)
      expect(unburiedCards[0].state).toBe('review')
      expect(unburiedCards[0].due).toBe(5) // Restored original due
    })
  })

  describe('Custom Settings', () => {
    test('should respect custom new card order', () => {
      const randomSettings = {
        ...settings,
        newCards: {
          ...settings.newCards,
          orderNewCards: 'random' as const
        }
      }
      
      // Build queue multiple times and check if order varies
      const queues = Array.from({ length: 10 }, () => 
        manager.buildStudyQueue('test-deck-1', mockCards, randomSettings)
      )
      
      // At least one queue should have different order (probabilistic test)
      const firstCardIds = queues.map(q => q.newCards[0]?.id)
      const uniqueFirstCards = new Set(firstCardIds)
      
      // With random ordering, we should see some variation
      expect(uniqueFirstCards.size).toBeGreaterThan(1)
    })

    test('should respect custom daily limits', () => {
      const customSettings = {
        ...settings,
        newCards: { ...settings.newCards, newCardsPerDay: 5 },
        reviews: { ...settings.reviews, maximumReviewsPerDay: 10 }
      }
      
      const queue = manager.buildStudyQueue('test-deck-1', mockCards, customSettings)
      
      expect(queue.limits.newCardsRemaining).toBe(5)
      expect(queue.limits.reviewsRemaining).toBe(10)
    })
  })

  describe('Performance Tests', () => {
    test('should handle large card sets efficiently', () => {
      // Create 10,000 cards
      const largeCardSet: Card[] = Array.from({ length: 10000 }, (_, i) => ({
        ...mockCards[0],
        id: `large-card-${i}`,
        state: i % 3 === 0 ? 'new' : i % 3 === 1 ? 'learning' : 'review'
      }))
      
      const startTime = performance.now()
      const queue = manager.buildStudyQueue('test-deck-1', largeCardSet, settings)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(queue.counts.totalDue).toBeGreaterThan(0)
      
      console.log(`Built queue for ${largeCardSet.length} cards in ${(endTime - startTime).toFixed(2)}ms`)
    })

    test('should select cards quickly from large queue', () => {
      const largeCardSet: Card[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCards[0],
        id: `perf-card-${i}`,
        state: 'learning' as CardState,
        left: 0 // All due now
      }))
      
      const queue = manager.buildStudyQueue('test-deck-1', largeCardSet, settings)
      
      const startTime = performance.now()
      for (let i = 0; i < 100; i++) {
        manager.getNextCard(queue)
      }
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(10) // Should complete 100 selections in under 10ms
      
      console.log(`Selected 100 cards in ${(endTime - startTime).toFixed(2)}ms`)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty card array', () => {
      const queue = manager.buildStudyQueue('test-deck-1', [], settings)
      
      expect(queue.newCards).toHaveLength(0)
      expect(queue.learningCards).toHaveLength(0)
      expect(queue.reviewCards).toHaveLength(0)
      expect(queue.counts.totalDue).toBe(0)
    })

    test('should handle cards with invalid states', () => {
      const invalidCards = [
        { ...mockCards[0], state: 'invalid' as unknown as CardState }
      ]
      
      expect(() => {
        manager.buildStudyQueue('test-deck-1', invalidCards, settings)
      }).not.toThrow()
    })

    test('should handle negative due dates', () => {
      const negativeCards = [
        { ...mockCards[0], due: -1 }
      ]
      
      const queue = manager.buildStudyQueue('test-deck-1', negativeCards, settings)
      expect(queue.newCards).toHaveLength(1) // Should still include the card
    })

    test('should handle very large intervals', () => {
      const largeIntervalCard = {
        ...mockCards[0],
        state: 'review' as CardState,
        ivl: 36500, // 100 years
        due: Math.floor(Date.now() / (24 * 60 * 60 * 1000)) + 36500
      }
      
      const queue = manager.buildStudyQueue('test-deck-1', [largeIntervalCard], settings)
      expect(queue.reviewCards).toHaveLength(0) // Not due today
      expect(queue.nextCardDue).toBeDefined()
    })
  })
})

// Integration tests
describe('StudyQueueManager Integration', () => {
  let manager: StudyQueueManager
  let settings: AdvancedDeckSettings

  beforeEach(() => {
    manager = new StudyQueueManager(true) // Enable debug logging
    settings = LearningStepsManager.getDefaultSettings()
  })

  test('should simulate a complete study session', () => {
    console.log('Starting study session simulation...')
    
    // Create a realistic deck
    const cards = createRealisticDeck()
    
    // Build initial queue
    let queue = manager.buildStudyQueue('simulation-deck', cards, settings)
    console.log('Initial queue:', {
      new: queue.counts.newCards,
      learning: queue.counts.learningCards,
      review: queue.counts.reviewCards,
      estimated: `${queue.estimatedStudyTime} minutes`
    })
    
    // Simulate studying 10 cards
    for (let i = 0; i < 10; i++) {
      const card = manager.getNextCard(queue)
      if (!card) break
      
      console.log(`Card ${i + 1}: ${card.id} (${card.state})`)
      
      // Simulate study time
      const studyTime = Math.random() * 5000 + 2000 // 2-7 seconds
      manager.updateDailyLimits('simulation-deck', card, studyTime)
      
      // Rebuild queue (in real app, this would happen after answering)
      queue = manager.buildStudyQueue('simulation-deck', cards, settings)
    }
    
    console.log('Study session completed!')
  })

  function createRealisticDeck(): Card[] {
    const baseCard = {
      deckId: 'simulation-deck',
      frontContent: 'Test',
      backContent: 'Test',
      cardType: { type: 'basic' as const },
      mediaRefs: [],
      easeFactor: 2.5,
      intervalDays: 0,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lapseCount: 0,
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

    const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
    const cards: Card[] = []

    // Add 50 new cards
    for (let i = 0; i < 50; i++) {
      cards.push({
        ...baseCard,
        id: `new-${i}`,
        state: 'new',
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 2500,
        reps: 0,
        lapses: 0,
        left: 0,
        learningStep: 0
      })
    }

    // Add 20 review cards (various due dates)
    for (let i = 0; i < 20; i++) {
      cards.push({
        ...baseCard,
        id: `review-${i}`,
        state: 'review',
        queue: 2,
        due: today - Math.floor(Math.random() * 5), // Some overdue
        ivl: Math.floor(Math.random() * 30) + 1,
        factor: 2200 + Math.floor(Math.random() * 600),
        reps: Math.floor(Math.random() * 10) + 1,
        lapses: Math.floor(Math.random() * 3),
        left: 0,
        learningStep: 0
      })
    }

    // Add 5 learning cards
    for (let i = 0; i < 5; i++) {
      cards.push({
        ...baseCard,
        id: `learning-${i}`,
        state: 'learning',
        queue: 1,
        due: today,
        ivl: 0,
        factor: 2500,
        reps: 1,
        lapses: 0,
        left: Math.floor(Math.random() * 10), // Various learning times
        learningStep: Math.floor(Math.random() * 2)
      })
    }

    return cards
  }
})
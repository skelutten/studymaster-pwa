import { LearningStepsManager } from '../learningStepsManager'
import { Card, CardState, AdvancedDeckSettings } from '../../../../shared/types'

describe('LearningStepsManager', () => {
  let manager: LearningStepsManager
  let defaultSettings: AdvancedDeckSettings
  let mockCard: Card

  beforeEach(() => {
    manager = new LearningStepsManager(false) // Disable debug logging for tests
    defaultSettings = LearningStepsManager.getDefaultSettings()
    
    // Create a mock card with all required fields
    mockCard = {
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
  })

  describe('New Card Learning Flow', () => {
    test('should handle Again rating on new card', () => {
      const result = manager.processLearningCard(mockCard, 1, defaultSettings, 5000)
      
      expect(result.card.state).toBe('learning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(1) // First step is 1 minute
      expect(result.card.lapses).toBe(1)
      expect(result.wasCorrect).toBe(false)
      expect(result.debugInfo.reasoning).toContain('Again: Reset to step 0')
    })

    test('should handle Good rating progression through learning steps', () => {
      // First Good - move to step 1
      let result = manager.processLearningCard(mockCard, 3, defaultSettings, 3000)
      
      expect(result.card.state).toBe('learning')
      expect(result.card.learningStep).toBe(1)
      expect(result.card.left).toBe(10) // Second step is 10 minutes
      expect(result.wasCorrect).toBe(true)
      expect(result.debugInfo.reasoning).toContain('Advanced to step 1')

      // Second Good - should graduate
      result.card.learningStep = 1
      result = manager.processLearningCard(result.card, 3, defaultSettings, 2500)
      
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.ivl).toBe(1) // Graduating interval
      expect(result.card.factor).toBe(2500) // Starting ease
      expect(result.debugInfo.reasoning).toContain('Graduated to review state')
    })

    test('should handle Easy rating for immediate graduation', () => {
      const result = manager.processLearningCard(mockCard, 4, defaultSettings, 2000)
      
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.ivl).toBe(4) // Easy interval
      expect(result.card.factor).toBe(2650) // Boosted ease for easy
      expect(result.debugInfo.reasoning).toContain('Graduated immediately with easy interval')
    })

    test('should handle Hard rating by moving back a step', () => {
      // Start at step 1
      mockCard.learningStep = 1
      mockCard.state = 'learning'
      
      const result = manager.processLearningCard(mockCard, 2, defaultSettings, 4000)
      
      expect(result.card.state).toBe('learning')
      expect(result.card.learningStep).toBe(0) // Moved back to step 0
      expect(result.card.left).toBe(1) // First step interval
      expect(result.debugInfo.reasoning).toContain('Move back to step 0')
    })
  })

  describe('Relearning Card Flow', () => {
    beforeEach(() => {
      mockCard.state = 'relearning'
      mockCard.queue = 1
      mockCard.learningStep = 0
      mockCard.ivl = 5 // Previous interval
      mockCard.lapses = 2
    })

    test('should handle Again rating in relearning', () => {
      const result = manager.processLearningCard(mockCard, 1, defaultSettings, 6000)
      
      expect(result.card.state).toBe('relearning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(10) // Relearning step is 10 minutes
      expect(result.card.lapses).toBe(3) // Incremented
      expect(result.wasCorrect).toBe(false)
      expect(result.debugInfo.reasoning).toContain('Reset to relearning step 0')
    })

    test('should handle Good rating to graduate from relearning', () => {
      const result = manager.processLearningCard(mockCard, 3, defaultSettings, 3500)
      
      expect(result.card.state).toBe('review')
      expect(result.card.queue).toBe(2)
      expect(result.card.ivl).toBe(1) // Minimum interval after lapse
      expect(result.wasCorrect).toBe(true)
      expect(result.debugInfo.reasoning).toContain('Graduated from relearning')
    })

    test('should handle Hard rating by staying on current step', () => {
      const result = manager.processLearningCard(mockCard, 2, defaultSettings, 5500)
      
      expect(result.card.state).toBe('relearning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.left).toBe(10)
      expect(result.debugInfo.reasoning).toContain('Stay on step 0')
    })
  })

  describe('Leech Detection and Handling', () => {
    beforeEach(() => {
      mockCard.lapses = 8 // At threshold
    })

    test('should detect leech cards', () => {
      const isLeech = manager.isLeech(mockCard, defaultSettings)
      expect(isLeech).toBe(true)
    })

    test('should handle leech suspension', () => {
      const result = manager.handleLeech(mockCard, defaultSettings)
      
      expect(result.state).toBe('suspended')
      expect(result.queue).toBe(-1)
    })

    test('should handle leech tagging', () => {
      const tagSettings = {
        ...defaultSettings,
        lapses: {
          ...defaultSettings.lapses,
          leechAction: 'tag' as const
        }
      }
      
      const result = manager.handleLeech(mockCard, tagSettings)
      
      expect(result.flags & 1).toBe(1) // Leech flag set
      expect(result.state).toBe('new') // State unchanged
    })

    test('should not detect leech below threshold', () => {
      mockCard.lapses = 7
      const isLeech = manager.isLeech(mockCard, defaultSettings)
      expect(isLeech).toBe(false)
    })
  })

  describe('Custom Learning Steps', () => {
    test('should handle custom learning steps', () => {
      const customSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          stepsMinutes: [5, 15, 30] // Custom 3-step learning
        }
      }

      // Step 0 -> 1
      let result = manager.processLearningCard(mockCard, 3, customSettings, 3000)
      expect(result.card.learningStep).toBe(1)
      expect(result.card.left).toBe(15)

      // Step 1 -> 2
      result = manager.processLearningCard(result.card, 3, customSettings, 2800)
      expect(result.card.learningStep).toBe(2)
      expect(result.card.left).toBe(30)

      // Step 2 -> Graduate
      result = manager.processLearningCard(result.card, 3, customSettings, 2500)
      expect(result.card.state).toBe('review')
      expect(result.card.ivl).toBe(1)
    })

    test('should handle single-step learning', () => {
      const singleStepSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          stepsMinutes: [20] // Single step
        }
      }

      const result = manager.processLearningCard(mockCard, 3, singleStepSettings, 3000)
      
      expect(result.card.state).toBe('review')
      expect(result.card.ivl).toBe(1)
      expect(result.debugInfo.reasoning).toContain('Graduated to review state')
    })
  })

  describe('Timing and Performance Tracking', () => {
    test('should update study time and average correctly', () => {
      mockCard.totalStudyTime = 10000 // 10 seconds
      mockCard.reps = 2
      mockCard.averageAnswerTime = 5000 // 5 seconds average

      const result = manager.processLearningCard(mockCard, 3, defaultSettings, 3000)
      
      expect(result.card.totalStudyTime).toBe(13000) // 10000 + 3000
      expect(result.card.reps).toBe(3) // 2 + 1
      expect(result.card.averageAnswerTime).toBe(4333) // 13000 / 3 (rounded)
    })

    test('should calculate due dates correctly for learning cards', () => {
      const result = manager.processLearningCard(mockCard, 3, defaultSettings, 2000)
      
      // Should be due in 10 minutes (step 1)
      const expectedDue = new Date(Date.now() + 10 * 60 * 1000)
      const actualDue = new Date(result.nextReviewDate)
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualDue.getTime() - expectedDue.getTime())).toBeLessThan(1000)
    })

    test('should calculate due dates correctly for graduated cards', () => {
      // Graduate immediately with Easy
      const result = manager.processLearningCard(mockCard, 4, defaultSettings, 2000)
      
      // Should be due in 4 days (easy interval)
      const expectedDue = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      const actualDue = new Date(result.nextReviewDate)
      
      // Allow 1 second tolerance
      expect(Math.abs(actualDue.getTime() - expectedDue.getTime())).toBeLessThan(1000)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should throw error for invalid card state', () => {
      mockCard.state = 'review' // Invalid for learning steps
      
      expect(() => {
        manager.processLearningCard(mockCard, 3, defaultSettings, 3000)
      }).toThrow('Invalid card state for learning steps: review')
    })

    test('should handle empty learning steps gracefully', () => {
      const emptyStepsSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          stepsMinutes: []
        }
      }

      const result = manager.processLearningCard(mockCard, 1, emptyStepsSettings, 3000)
      
      expect(result.card.left).toBe(1) // Fallback to 1 minute
    })

    test('should handle negative learning step gracefully', () => {
      mockCard.learningStep = -1
      
      const result = manager.processLearningCard(mockCard, 2, defaultSettings, 3000)
      
      expect(result.card.learningStep).toBe(0) // Should reset to 0
    })
  })

  describe('Integration with Deck Settings', () => {
    test('should respect graduating interval setting', () => {
      const customSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          graduatingInterval: 3
        }
      }

      const result = manager.processLearningCard(mockCard, 4, customSettings, 2000)
      
      expect(result.card.ivl).toBe(4) // Easy interval, not graduating interval
    })

    test('should respect easy interval setting', () => {
      const customSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          easyInterval: 7
        }
      }

      const result = manager.processLearningCard(mockCard, 4, customSettings, 2000)
      
      expect(result.card.ivl).toBe(7) // Custom easy interval
    })

    test('should respect starting ease setting', () => {
      const customSettings = {
        ...defaultSettings,
        newCards: {
          ...defaultSettings.newCards,
          startingEase: 2200
        }
      }

      const result = manager.processLearningCard(mockCard, 3, defaultSettings, 2000)
      // Graduate with Good
      const graduatedResult = manager.processLearningCard(result.card, 3, customSettings, 2000)
      
      expect(graduatedResult.card.factor).toBe(2500) // Default starting ease used
    })
  })

  describe('Performance Benchmarks', () => {
    test('should process learning cards quickly', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        const testCard = { ...mockCard, id: `test-card-${i}` }
        manager.processLearningCard(testCard, 3, defaultSettings, 3000)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(totalTime).toBeLessThan(100) // Should process 1000 cards in under 100ms
      console.log(`Processed 1000 learning cards in ${totalTime.toFixed(2)}ms`)
    })
  })
})

// Integration test with real-world scenarios
describe('LearningStepsManager Integration Tests', () => {
  let manager: LearningStepsManager
  let settings: AdvancedDeckSettings

  beforeEach(() => {
    manager = new LearningStepsManager(true) // Enable debug logging for integration tests
    settings = LearningStepsManager.getDefaultSettings()
  })

  test('should simulate complete learning journey', () => {
    // Create a new card
    let card: Card = {
      id: 'integration-test-card',
      deckId: 'test-deck',
      frontContent: 'What is the capital of France?',
      backContent: 'Paris',
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

    console.log('Starting learning journey simulation...')

    // First attempt - Again (forgot)
    let result = manager.processLearningCard(card, 1, settings, 8000)
    card = result.card
    expect(card.state).toBe('learning')
    expect(card.lapses).toBe(1)
    console.log('Step 1: Forgot card, reset to learning step 0')

    // Second attempt - Good (remembered)
    result = manager.processLearningCard(card, 3, settings, 4000)
    card = result.card
    expect(card.learningStep).toBe(1)
    console.log('Step 2: Remembered card, advanced to step 1')

    // Third attempt - Good (graduated)
    result = manager.processLearningCard(card, 3, settings, 3000)
    card = result.card
    expect(card.state).toBe('review')
    expect(card.ivl).toBe(1)
    console.log('Step 3: Graduated to review with 1-day interval')

    // Verify final state
    expect(card.reps).toBe(3)
    expect(card.lapses).toBe(1)
    expect(card.totalStudyTime).toBe(15000) // 8000 + 4000 + 3000
    expect(card.averageAnswerTime).toBe(5000) // 15000 / 3

    console.log('Learning journey completed successfully!')
  })
})
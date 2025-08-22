import { describe, it, expect } from 'vitest'
import {
  getReviewCardType,
  getCardStateDescription,
  getCardStateColor,
  isCardDue,
  getNextReviewDate,
  getDaysOverdue,
  getStudyPriority
} from '../cardStateUtils'
import { Card, CardState } from '../../../../shared/types'

describe('cardStateUtils', () => {
  // Helper function to create a mock card
  const createMockCard = (overrides: Partial<Card> = {}): Card => ({
    id: 'test-card-1',
    deckId: 'test-deck-1',
    frontContent: 'Test Front',
    backContent: 'Test Back',
    cardType: { type: 'basic' },
    mediaRefs: [],
    easeFactor: 2.5,
    intervalDays: 0,
    nextReview: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    lapseCount: 0,
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
  })

  describe('getReviewCardType', () => {
    it('should return "young" for review cards with interval < 21 days', () => {
      const card = createMockCard({ state: 'review', ivl: 10 })
      expect(getReviewCardType(card)).toBe('young')
    })

    it('should return "mature" for review cards with interval >= 21 days', () => {
      const card = createMockCard({ state: 'review', ivl: 21 })
      expect(getReviewCardType(card)).toBe('mature')
    })

    it('should return "mature" for review cards with interval > 21 days', () => {
      const card = createMockCard({ state: 'review', ivl: 50 })
      expect(getReviewCardType(card)).toBe('mature')
    })

    it('should throw error for non-review cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(() => getReviewCardType(card)).toThrow('Card must be in review state to determine maturity')
    })
  })

  describe('getCardStateDescription', () => {
    it('should return correct description for new cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(getCardStateDescription(card)).toBe('New - Never studied before')
    })

    it('should return correct description for learning cards', () => {
      const card = createMockCard({ state: 'learning' })
      expect(getCardStateDescription(card)).toBe('Learning - Recently seen, still being learned')
    })

    it('should return correct description for young review cards', () => {
      const card = createMockCard({ state: 'review', ivl: 10 })
      expect(getCardStateDescription(card)).toBe('Review (Young) - Finished learning, scheduled for review')
    })

    it('should return correct description for mature review cards', () => {
      const card = createMockCard({ state: 'review', ivl: 30 })
      expect(getCardStateDescription(card)).toBe('Review (Mature) - Finished learning, scheduled for review')
    })

    it('should return correct description for relearning cards', () => {
      const card = createMockCard({ state: 'relearning' })
      expect(getCardStateDescription(card)).toBe('Relearning - Failed in review, being relearned')
    })

    it('should return correct description for suspended cards', () => {
      const card = createMockCard({ state: 'suspended' })
      expect(getCardStateDescription(card)).toBe('Suspended - Manually suspended from study')
    })

    it('should return correct description for buried cards', () => {
      const card = createMockCard({ state: 'buried' })
      expect(getCardStateDescription(card)).toBe('Buried - Hidden until next day')
    })

    it('should return default description for unknown states', () => {
      const card = createMockCard({ state: 'unknown' as CardState })
      expect(getCardStateDescription(card)).toBe('Unknown state')
    })
  })

  describe('getCardStateColor', () => {
    it('should return blue for new cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(getCardStateColor(card)).toBe('#3b82f6')
    })

    it('should return amber for learning cards', () => {
      const card = createMockCard({ state: 'learning' })
      expect(getCardStateColor(card)).toBe('#f59e0b')
    })

    it('should return light green for young review cards', () => {
      const card = createMockCard({ state: 'review', ivl: 10 })
      expect(getCardStateColor(card)).toBe('#10b981')
    })

    it('should return dark green for mature review cards', () => {
      const card = createMockCard({ state: 'review', ivl: 30 })
      expect(getCardStateColor(card)).toBe('#059669')
    })

    it('should return red for relearning cards', () => {
      const card = createMockCard({ state: 'relearning' })
      expect(getCardStateColor(card)).toBe('#ef4444')
    })

    it('should return gray for suspended cards', () => {
      const card = createMockCard({ state: 'suspended' })
      expect(getCardStateColor(card)).toBe('#6b7280')
    })

    it('should return light gray for buried cards', () => {
      const card = createMockCard({ state: 'buried' })
      expect(getCardStateColor(card)).toBe('#9ca3af')
    })

    it('should return dark gray for unknown states', () => {
      const card = createMockCard({ state: 'unknown' as CardState })
      expect(getCardStateColor(card)).toBe('#374151')
    })
  })

  describe('isCardDue', () => {
    const currentDate = new Date('2024-01-15T10:00:00Z')
    const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))

    it('should return true for new cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(isCardDue(card, currentDate)).toBe(true)
    })

    it('should return true for learning cards with left = 0', () => {
      const card = createMockCard({ state: 'learning', left: 0 })
      expect(isCardDue(card, currentDate)).toBe(true)
    })

    it('should return false for learning cards with left > 0', () => {
      const card = createMockCard({ state: 'learning', left: 10 })
      expect(isCardDue(card, currentDate)).toBe(false)
    })

    it('should return true for relearning cards with left = 0', () => {
      const card = createMockCard({ state: 'relearning', left: 0 })
      expect(isCardDue(card, currentDate)).toBe(true)
    })

    it('should return false for relearning cards with left > 0', () => {
      const card = createMockCard({ state: 'relearning', left: 5 })
      expect(isCardDue(card, currentDate)).toBe(false)
    })

    it('should return true for review cards due today', () => {
      const card = createMockCard({ state: 'review', due: currentDay })
      expect(isCardDue(card, currentDate)).toBe(true)
    })

    it('should return true for overdue review cards', () => {
      const card = createMockCard({ state: 'review', due: currentDay - 1 })
      expect(isCardDue(card, currentDate)).toBe(true)
    })

    it('should return false for future review cards', () => {
      const card = createMockCard({ state: 'review', due: currentDay + 1 })
      expect(isCardDue(card, currentDate)).toBe(false)
    })

    it('should return false for suspended cards', () => {
      const card = createMockCard({ state: 'suspended' })
      expect(isCardDue(card, currentDate)).toBe(false)
    })

    it('should return false for buried cards', () => {
      const card = createMockCard({ state: 'buried' })
      expect(isCardDue(card, currentDate)).toBe(false)
    })

    it('should use current date when no date provided', () => {
      const card = createMockCard({ state: 'new' })
      expect(isCardDue(card)).toBe(true)
    })
  })

  describe('getNextReviewDate', () => {
    it('should return null for new cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(getNextReviewDate(card)).toBeNull()
    })

    it('should return correct date for learning cards', () => {
      const card = createMockCard({ state: 'learning', left: 10 })
      const result = getNextReviewDate(card)
      expect(result).toBeInstanceOf(Date)
      
      // Should be approximately 10 minutes from now
      const expectedTime = Date.now() + 10 * 60 * 1000
      const actualTime = result!.getTime()
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000) // Within 1 second
    })

    it('should return correct date for relearning cards', () => {
      const card = createMockCard({ state: 'relearning', left: 5 })
      const result = getNextReviewDate(card)
      expect(result).toBeInstanceOf(Date)
      
      // Should be approximately 5 minutes from now
      const expectedTime = Date.now() + 5 * 60 * 1000
      const actualTime = result!.getTime()
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000) // Within 1 second
    })

    it('should return correct date for review cards', () => {
      const dueDay = 19000 // Days since epoch
      const card = createMockCard({ state: 'review', due: dueDay })
      const result = getNextReviewDate(card)
      expect(result).toBeInstanceOf(Date)
      
      const expectedTime = dueDay * 24 * 60 * 60 * 1000
      expect(result!.getTime()).toBe(expectedTime)
    })

    it('should return null for suspended cards', () => {
      const card = createMockCard({ state: 'suspended' })
      expect(getNextReviewDate(card)).toBeNull()
    })

    it('should return null for buried cards', () => {
      const card = createMockCard({ state: 'buried' })
      expect(getNextReviewDate(card)).toBeNull()
    })
  })

  describe('getDaysOverdue', () => {
    const currentDate = new Date('2024-01-15T10:00:00Z')
    const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))

    it('should return 0 for non-review cards', () => {
      const card = createMockCard({ state: 'new' })
      expect(getDaysOverdue(card, currentDate)).toBe(0)
    })

    it('should return 0 for review cards due today', () => {
      const card = createMockCard({ state: 'review', due: currentDay })
      expect(getDaysOverdue(card, currentDate)).toBe(0)
    })

    it('should return 0 for future review cards', () => {
      const card = createMockCard({ state: 'review', due: currentDay + 5 })
      expect(getDaysOverdue(card, currentDate)).toBe(0)
    })

    it('should return correct days overdue for overdue cards', () => {
      const card = createMockCard({ state: 'review', due: currentDay - 3 })
      expect(getDaysOverdue(card, currentDate)).toBe(3)
    })

    it('should return correct days overdue for very overdue cards', () => {
      const card = createMockCard({ state: 'review', due: currentDay - 10 })
      expect(getDaysOverdue(card, currentDate)).toBe(10)
    })

    it('should use current date when no date provided', () => {
      const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
      const card = createMockCard({ state: 'review', due: today - 2 })
      expect(getDaysOverdue(card)).toBe(2)
    })
  })

  describe('getStudyPriority', () => {
    it('should return 1 for learning cards (highest priority)', () => {
      const card = createMockCard({ state: 'learning' })
      expect(getStudyPriority(card)).toBe(1)
    })

    it('should return 1 for relearning cards (highest priority)', () => {
      const card = createMockCard({ state: 'relearning' })
      expect(getStudyPriority(card)).toBe(1)
    })

    it('should return 2 for review cards (medium priority)', () => {
      const card = createMockCard({ state: 'review' })
      expect(getStudyPriority(card)).toBe(2)
    })

    it('should return 3 for new cards (lower priority)', () => {
      const card = createMockCard({ state: 'new' })
      expect(getStudyPriority(card)).toBe(3)
    })

    it('should return 999 for suspended cards (should not be studied)', () => {
      const card = createMockCard({ state: 'suspended' })
      expect(getStudyPriority(card)).toBe(999)
    })

    it('should return 999 for buried cards (should not be studied)', () => {
      const card = createMockCard({ state: 'buried' })
      expect(getStudyPriority(card)).toBe(999)
    })

    it('should return 999 for unknown states', () => {
      const card = createMockCard({ state: 'unknown' as CardState })
      expect(getStudyPriority(card)).toBe(999)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle cards with extreme interval values', () => {
      const card = createMockCard({ state: 'review', ivl: 999999 })
      expect(getReviewCardType(card)).toBe('mature')
      expect(getCardStateColor(card)).toBe('#059669')
    })

    it('should handle cards with zero interval', () => {
      const card = createMockCard({ state: 'review', ivl: 0 })
      expect(getReviewCardType(card)).toBe('young')
      expect(getCardStateColor(card)).toBe('#10b981')
    })

    it('should handle negative due dates', () => {
      const currentDate = new Date('2024-01-15T10:00:00Z')
      const card = createMockCard({ state: 'review', due: -1 })
      expect(isCardDue(card, currentDate)).toBe(true)
      expect(getDaysOverdue(card, currentDate)).toBeGreaterThan(0)
    })

    it('should handle very large left values for learning cards', () => {
      const card = createMockCard({ state: 'learning', left: 999999 })
      expect(isCardDue(card)).toBe(false)
      
      const nextReview = getNextReviewDate(card)
      expect(nextReview).toBeInstanceOf(Date)
      expect(nextReview!.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
import { Card, StudyQueue, AdvancedDeckSettings, DailyStudyLimits } from '../../../shared/types'

/**
 * Study Queue Manager
 * 
 * Manages the study queue for Anki-style spaced repetition.
 * Handles card selection, daily limits, and queue optimization.
 */
export class StudyQueueManager {
  private debugMode: boolean = true
  private dailyLimits: Map<string, DailyStudyLimits> = new Map()

  constructor(debugMode: boolean = true) {
    this.debugMode = debugMode
    this.log('StudyQueueManager initialized', { debugMode })
  }

  /**
   * Build study queue for a deck
   */
  buildStudyQueue(
    deckId: string,
    allCards: Card[],
    settings: AdvancedDeckSettings
  ): StudyQueue {
    const startTime = performance.now()
    
    this.log('Building study queue', {
      deckId,
      totalCards: allCards.length,
      settings: {
        newCardsPerDay: settings.newCards.newCardsPerDay,
        maxReviews: settings.reviews.maximumReviewsPerDay
      }
    })

    // Get current daily limits
    const limits = this.getDailyLimits(deckId)
    
    // Filter cards by state and due status
    const now = new Date()
    const currentDaysSinceEpoch = this.dateToDaysSinceEpoch(now)
    
    const newCards = this.getNewCards(allCards, settings, limits)
    const learningCards = this.getLearningCards(allCards, now)
    const reviewCards = this.getReviewCards(allCards, currentDaysSinceEpoch, settings, limits)
    const relearnCards = this.getRelearnCards(allCards, now)

    // Categorize review cards by maturity (Anki-style)
    const youngReviewCards = reviewCards.filter(card => card.ivl < 21)
    const matureReviewCards = reviewCards.filter(card => card.ivl >= 21)

    // Calculate counts
    const counts = {
      newCards: newCards.length,
      learningCards: learningCards.length,
      reviewCards: reviewCards.length,
      youngReviewCards: youngReviewCards.length,
      matureReviewCards: matureReviewCards.length,
      relearnCards: relearnCards.length,
      totalDue: newCards.length + learningCards.length + reviewCards.length + relearnCards.length
    }

    // Calculate remaining limits
    const remainingLimits = {
      newCardsRemaining: Math.max(0, settings.newCards.newCardsPerDay - limits.newCardsStudied),
      reviewsRemaining: Math.max(0, settings.reviews.maximumReviewsPerDay - limits.reviewsCompleted)
    }

    // Find next card due
    const nextCardDue = this.findNextCardDue(allCards)

    // Estimate study time
    const estimatedStudyTime = this.estimateStudyTime(counts, settings)

    const queue: StudyQueue = {
      deckId,
      newCards,
      learningCards,
      reviewCards,
      relearnCards,
      counts,
      limits: remainingLimits,
      nextCardDue,
      estimatedStudyTime
    }

    const buildTime = performance.now() - startTime

    this.log('Study queue built', {
      deckId,
      counts,
      limits: remainingLimits,
      buildTime: `${buildTime.toFixed(2)}ms`,
      nextCardDue: nextCardDue?.toISOString()
    })

    return queue
  }

  /**
   * Get next card to study from queue
   */
  getNextCard(queue: StudyQueue): Card | null {
    this.log('Getting next card', {
      deckId: queue.deckId,
      availableCounts: {
        learning: queue.learningCards.length,
        relearning: queue.relearnCards.length,
        review: queue.reviewCards.length,
        new: queue.newCards.length
      }
    })

    // Priority order: Learning -> Relearning -> Review -> New
    
    // 1. Learning cards (highest priority)
    if (queue.learningCards.length > 0) {
      const card = queue.learningCards[0]
      this.log('Selected learning card', {
        cardId: card.id,
        learningStep: card.learningStep,
        left: card.left
      })
      return card
    }

    // 2. Relearning cards (second highest priority)
    if (queue.relearnCards.length > 0) {
      const card = queue.relearnCards[0]
      this.log('Selected relearning card', {
        cardId: card.id,
        learningStep: card.learningStep,
        left: card.left,
        lapses: card.lapses
      })
      return card
    }

    // 3. Review cards (if within daily limit)
    if (queue.reviewCards.length > 0 && queue.limits.reviewsRemaining > 0) {
      const card = queue.reviewCards[0]
      this.log('Selected review card', {
        cardId: card.id,
        interval: card.ivl,
        ease: card.factor,
        maturity: card.ivl >= 21 ? 'mature' : 'young'
      })
      return card
    }

    // 4. New cards (if within daily limit)
    if (queue.newCards.length > 0 && queue.limits.newCardsRemaining > 0) {
      const card = queue.newCards[0]
      this.log('Selected new card', {
        cardId: card.id,
        state: card.state
      })
      return card
    }

    this.log('No cards available for study', {
      deckId: queue.deckId,
      reason: this.getNoCardsReason(queue)
    })

    return null
  }

  /**
   * Update daily limits after studying a card
   */
  updateDailyLimits(deckId: string, card: Card, studyTime: number): void {
    const limits = this.getDailyLimits(deckId)
    
    // Update based on card type studied
    if (card.state === 'new') {
      limits.newCardsStudied += 1
    } else if (card.state === 'review') {
      limits.reviewsCompleted += 1
    } else if (card.state === 'learning' || card.state === 'relearning') {
      limits.learningCardsCompleted += 1
    }

    limits.totalStudyTime += studyTime

    this.dailyLimits.set(deckId, limits)

    this.log('Daily limits updated', {
      deckId,
      limits: {
        newCardsStudied: limits.newCardsStudied,
        reviewsCompleted: limits.reviewsCompleted,
        learningCardsCompleted: limits.learningCardsCompleted,
        totalStudyTime: `${(limits.totalStudyTime / 1000).toFixed(1)}s`
      }
    })
  }

  /**
   * Reset daily limits (called at day rollover)
   */
  resetDailyLimits(deckId?: string): void {
    if (deckId) {
      const limits = this.createEmptyDailyLimits(deckId)
      this.dailyLimits.set(deckId, limits)
      this.log('Daily limits reset for deck', { deckId })
    } else {
      this.dailyLimits.clear()
      this.log('All daily limits reset')
    }
  }

  /**
   * Check if day rollover has occurred
   */
  checkDayRollover(settings: AdvancedDeckSettings): boolean {
    const now = new Date()
    const dayStartHour = settings.advanced.dayStartsAt
    
    // Calculate when the current "day" started
    const dayStart = new Date(now)
    dayStart.setHours(dayStartHour, 0, 0, 0)
    
    // If current time is before day start, the day started yesterday
    if (now.getHours() < dayStartHour) {
      dayStart.setDate(dayStart.getDate() - 1)
    }

    // Check if any limits were set before this day start
    for (const [deckId, limits] of this.dailyLimits) {
      const limitsDate = new Date(limits.resetAt)
      if (limitsDate < dayStart) {
        this.log('Day rollover detected', {
          deckId,
          dayStart: dayStart.toISOString(),
          lastReset: limits.resetAt
        })
        return true
      }
    }

    return false
  }

  /**
   * Bury a card until next day
   */
  buryCard(card: Card): Card {
    const buriedCard = { ...card }
    buriedCard.state = 'buried'
    buriedCard.queue = -2
    buriedCard.originalDue = buriedCard.due
    
    // Set due to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    buriedCard.due = this.dateToDaysSinceEpoch(tomorrow)

    this.log('Card buried', {
      cardId: card.id,
      originalDue: card.due,
      newDue: buriedCard.due
    })

    return buriedCard
  }

  /**
   * Suspend a card
   */
  suspendCard(card: Card): Card {
    const suspendedCard = { ...card }
    suspendedCard.state = 'suspended'
    suspendedCard.queue = -1
    suspendedCard.originalDue = suspendedCard.due
    suspendedCard.due = 0 // Suspended cards have no due date

    this.log('Card suspended', {
      cardId: card.id,
      originalState: card.state,
      originalDue: card.due
    })

    return suspendedCard
  }

  /**
   * Unsuspend a card
   */
  unsuspendCard(card: Card): Card {
    const unsuspendedCard = { ...card }
    
    // Restore original state or default to review
    if (unsuspendedCard.reps === 0) {
      unsuspendedCard.state = 'new'
      unsuspendedCard.queue = 0
    } else {
      unsuspendedCard.state = 'review'
      unsuspendedCard.queue = 2
    }

    // Restore due date or set to today
    unsuspendedCard.due = unsuspendedCard.originalDue || this.dateToDaysSinceEpoch(new Date())

    this.log('Card unsuspended', {
      cardId: card.id,
      newState: unsuspendedCard.state,
      newDue: unsuspendedCard.due
    })

    return unsuspendedCard
  }

  /**
   * Get cards that are buried and can be unburied
   */
  getBuriedCards(allCards: Card[]): Card[] {
    const today = this.dateToDaysSinceEpoch(new Date())
    
    return allCards.filter(card => 
      card.state === 'buried' && card.due <= today
    )
  }

  /**
   * Unbury cards that are due
   */
  unburyCards(buriedCards: Card[]): Card[] {
    return buriedCards.map(card => {
      const unburiedCard = { ...card }
      
      // Restore original state
      if (unburiedCard.reps === 0) {
        unburiedCard.state = 'new'
        unburiedCard.queue = 0
      } else {
        unburiedCard.state = 'review'
        unburiedCard.queue = 2
      }

      unburiedCard.due = unburiedCard.originalDue

      this.log('Card unburied', {
        cardId: card.id,
        restoredState: unburiedCard.state,
        restoredDue: unburiedCard.due
      })

      return unburiedCard
    })
  }

  // Private helper methods

  private getNewCards(
    allCards: Card[],
    settings: AdvancedDeckSettings,
    limits: DailyStudyLimits
  ): Card[] {
    const availableNewCards = allCards
      .filter(card => card.state === 'new')
      .slice(0, settings.newCards.newCardsPerDay - limits.newCardsStudied)

    // Sort by order setting
    if (settings.newCards.orderNewCards === 'random') {
      return this.shuffleArray([...availableNewCards])
    } else {
      // Sort by due date (creation order)
      return availableNewCards.sort((a, b) => a.due - b.due)
    }
  }

  private getLearningCards(allCards: Card[], now: Date): Card[] {
    const currentTime = now.getTime()
    
    return allCards
      .filter(card => {
        if (card.state !== 'learning' && card.state !== 'relearning') {
          return false
        }
        
        // Check if card is due (learning cards use minutes)
        const dueTime = currentTime + (card.left * 60 * 1000)
        return dueTime <= currentTime
      })
      .sort((a, b) => {
        // Sort by due time (earliest first)
        const aDueTime = currentTime + (a.left * 60 * 1000)
        const bDueTime = currentTime + (b.left * 60 * 1000)
        return aDueTime - bDueTime
      })
  }

  private getReviewCards(
    allCards: Card[],
    currentDay: number,
    settings: AdvancedDeckSettings,
    limits: DailyStudyLimits
  ): Card[] {
    const availableReviewCards = allCards
      .filter(card => card.state === 'review' && card.due <= currentDay)
      .slice(0, settings.reviews.maximumReviewsPerDay - limits.reviewsCompleted)

    // Sort by due date (overdue cards first)
    return availableReviewCards.sort((a, b) => a.due - b.due)
  }

  private getRelearnCards(allCards: Card[], now: Date): Card[] {
    const currentTime = now.getTime()
    
    return allCards
      .filter(card => {
        if (card.state !== 'relearning') {
          return false
        }
        
        // Check if card is due (relearning cards use minutes like learning cards)
        const dueTime = currentTime + (card.left * 60 * 1000)
        return dueTime <= currentTime
      })
      .sort((a, b) => {
        // Sort by due time (earliest first)
        const aDueTime = currentTime + (a.left * 60 * 1000)
        const bDueTime = currentTime + (b.left * 60 * 1000)
        return aDueTime - bDueTime
      })
  }

  private findNextCardDue(allCards: Card[]): Date | undefined {
    const now = new Date()
    const currentDay = this.dateToDaysSinceEpoch(now)
    
    let nextDue: number | undefined

    for (const card of allCards) {
      if (card.state === 'suspended' || card.state === 'buried') {
        continue
      }

      let cardDue: number

      if (card.state === 'learning' || card.state === 'relearning') {
        // Learning cards use minutes
        cardDue = Math.floor((now.getTime() + card.left * 60 * 1000) / (24 * 60 * 60 * 1000))
      } else {
        cardDue = card.due
      }

      if (cardDue > currentDay && (nextDue === undefined || cardDue < nextDue)) {
        nextDue = cardDue
      }
    }

    return nextDue ? this.daysSinceEpochToDate(nextDue) : undefined
  }

  private estimateStudyTime(counts: StudyQueue['counts'], _settings: AdvancedDeckSettings): number {
    // Rough estimates based on card types
    const newCardTime = 30 // seconds per new card
    const learningCardTime = 15 // seconds per learning card
    const relearnCardTime = 20 // seconds per relearning card (slightly longer due to difficulty)
    const reviewCardTime = 10 // seconds per review card

    const totalSeconds =
      (counts.newCards * newCardTime) +
      (counts.learningCards * learningCardTime) +
      (counts.relearnCards * relearnCardTime) +
      (counts.reviewCards * reviewCardTime)

    return Math.ceil(totalSeconds / 60) // Return minutes
  }

  private getDailyLimits(deckId: string): DailyStudyLimits {
    const existing = this.dailyLimits.get(deckId)
    if (existing) {
      return existing
    }

    const newLimits = this.createEmptyDailyLimits(deckId)
    this.dailyLimits.set(deckId, newLimits)
    return newLimits
  }

  private createEmptyDailyLimits(deckId: string): DailyStudyLimits {
    const today = new Date().toISOString().split('T')[0]
    return {
      deckId,
      date: today,
      newCardsStudied: 0,
      reviewsCompleted: 0,
      learningCardsCompleted: 0,
      totalStudyTime: 0,
      resetAt: new Date().toISOString()
    }
  }

  private getNoCardsReason(queue: StudyQueue): string {
    if (queue.counts.totalDue === 0) {
      return 'No cards due for study'
    }
    
    if (queue.limits.newCardsRemaining === 0 && queue.limits.reviewsRemaining === 0) {
      return 'Daily limits reached'
    }
    
    if (queue.newCards.length > 0 && queue.limits.newCardsRemaining === 0) {
      return 'New card daily limit reached'
    }
    
    if (queue.reviewCards.length > 0 && queue.limits.reviewsRemaining === 0) {
      return 'Review daily limit reached'
    }
    
    return 'Unknown reason'
  }

  private dateToDaysSinceEpoch(date: Date): number {
    const epoch = new Date('1970-01-01')
    return Math.floor((date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000))
  }

  private daysSinceEpochToDate(days: number): Date {
    return new Date(days * 24 * 60 * 60 * 1000)
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private log(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[StudyQueueManager] ${message}`, data || '')
    }
  }
}

// Export singleton instance
export const studyQueueManager = new StudyQueueManager()
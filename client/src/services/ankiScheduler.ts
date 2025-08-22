import { Card, ReviewRating, AdvancedDeckSettings, SchedulingResult } from '../../../shared/types'
import { LearningStepsManager } from './learningStepsManager'
import { CardStateManager } from './cardStateManager'

/**
 * Anki Scheduler
 * 
 * Implements the enhanced SM-2+ scheduling algorithm used by Anki.
 * Provides comprehensive debug logging and handles all card state transitions.
 */

export interface SchedulingContext {
  timeTaken: number // Time taken to answer in milliseconds
  daysSinceLastReview?: number
  isFirstReview?: boolean
  previousInterval?: number
  previousEase?: number
}

export class AnkiScheduler {
  private debugMode: boolean = true
  private learningManager: LearningStepsManager
  private stateManager: CardStateManager

  constructor(debugMode: boolean = true) {
    this.debugMode = debugMode
    this.learningManager = new LearningStepsManager(debugMode)
    this.stateManager = new CardStateManager(debugMode)
    this.log('AnkiScheduler initialized', { debugMode })
  }

  /**
   * Main scheduling function - handles all card types and states
   */
  scheduleCard(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    context: SchedulingContext
  ): SchedulingResult {
    const startTime = performance.now()
    
    this.log('Scheduling card', {
      cardId: card.id,
      state: card.state,
      rating,
      interval: card.ivl,
      ease: card.factor,
      reps: card.reps,
      lapses: card.lapses,
      timeTaken: context.timeTaken
    })

    // Validate card before scheduling
    const validation = this.stateManager.validateCard(card, settings)
    if (!validation.isValid) {
      throw new Error(`Cannot schedule invalid card: ${validation.errors.join(', ')}`)
    }

    let result: SchedulingResult

    // Route to appropriate scheduler based on card state
    switch (card.state) {
      case 'new':
      case 'learning':
      case 'relearning':
        result = this.learningManager.processLearningCard(card, rating, settings, context.timeTaken)
        break
      
      case 'review':
        result = this.scheduleReviewCard(card, rating, settings, context)
        break
      
      default:
        throw new Error(`Cannot schedule card in state: ${card.state}`)
    }

    // Check for leech status
    if (this.learningManager.isLeech(result.card, settings)) {
      result.card = this.learningManager.handleLeech(result.card, settings)
      result.debugInfo.reasoning += ' | Card identified and handled as leech'
    }

    const processingTime = performance.now() - startTime

    this.log('Card scheduling completed', {
      cardId: card.id,
      success: true,
      previousState: result.previousState,
      newState: result.newState,
      intervalChange: result.intervalChange,
      processingTime: `${processingTime.toFixed(2)}ms`,
      algorithm: result.debugInfo.algorithm
    })

    return result
  }

  /**
   * Schedule a review card using enhanced SM-2+ algorithm
   */
  private scheduleReviewCard(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    context: SchedulingContext
  ): SchedulingResult {
    this.log('Scheduling review card', {
      cardId: card.id,
      rating,
      currentInterval: card.ivl,
      currentEase: card.factor,
      lapses: card.lapses
    })

    const previousInterval = card.ivl
    const previousEase = card.factor
    const newCard = { ...card }
    const wasCorrect = rating >= 3 // Good or Easy
    let reasoning = ''

    // Handle lapse (Again or Hard with specific conditions)
    if (rating === 1 || (rating === 2 && this.shouldLapse(card))) {
      return this.handleReviewLapse(newCard, rating, settings, context)
    }

    // Calculate new ease factor
    const easeChange = this.calculateEaseChange(rating)
    newCard.factor = Math.max(1300, Math.min(5000, card.factor + easeChange))

    // Calculate new interval
    const baseInterval = this.calculateBaseInterval(card, rating, settings)
    const modifiedInterval = this.applyIntervalModifiers(baseInterval, settings, card)
    const fuzzedInterval = this.applyFuzz(modifiedInterval)
    const finalInterval = Math.min(fuzzedInterval, settings.reviews.maximumInterval)

    newCard.ivl = Math.max(settings.reviews.minimumInterval, Math.round(finalInterval))
    newCard.reps += 1
    newCard.totalStudyTime += context.timeTaken
    newCard.averageAnswerTime = newCard.totalStudyTime / newCard.reps

    // Update due date
    const nextReviewDate = this.calculateNextReviewDate(newCard)
    newCard.due = this.dateToDaysSinceEpoch(nextReviewDate)

    // Build reasoning
    reasoning = this.buildReviewReasoning(rating, previousInterval, newCard.ivl, previousEase, newCard.factor, settings)

    const result: SchedulingResult = {
      card: newCard,
      wasCorrect,
      previousState: card.state,
      newState: newCard.state,
      intervalChange: newCard.ivl - previousInterval,
      nextReviewDate,
      debugInfo: {
        algorithm: 'SM2_PLUS',
        calculatedInterval: baseInterval,
        appliedFuzz: fuzzedInterval - modifiedInterval,
        finalInterval: newCard.ivl,
        easeFactorChange: newCard.factor - previousEase,
        reasoning
      }
    }

    this.log('Review card scheduled', {
      cardId: card.id,
      rating,
      intervalChange: `${previousInterval}d -> ${newCard.ivl}d`,
      easeChange: `${previousEase} -> ${newCard.factor}`,
      nextDue: nextReviewDate.toISOString().split('T')[0]
    })

    return result
  }

  /**
   * Handle review card lapse
   */
  private handleReviewLapse(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    context: SchedulingContext
  ): SchedulingResult {
    this.log('Handling review lapse', {
      cardId: card.id,
      rating,
      currentInterval: card.ivl,
      lapses: card.lapses
    })

    const newCard = { ...card }
    newCard.lapses += 1

    // Reduce ease factor for lapses
    const easeReduction = rating === 1 ? 200 : 150 // More reduction for "Again"
    newCard.factor = Math.max(1300, card.factor - easeReduction)

    // Calculate new interval after lapse
    const newInterval = Math.max(
      settings.lapses.minimumInterval,
      Math.round(card.ivl * settings.lapses.newInterval)
    )

    // Transition to relearning if there are relearning steps
    if (settings.lapses.stepsMinutes.length > 0) {
      newCard.state = 'relearning'
      newCard.queue = 1
      newCard.learningStep = 0
      newCard.left = settings.lapses.stepsMinutes[0]
      newCard.ivl = newInterval // Store for after relearning
    } else {
      // No relearning steps, go directly to review with reduced interval
      newCard.ivl = newInterval
      newCard.due = this.dateToDaysSinceEpoch(this.calculateNextReviewDate(newCard))
    }

    newCard.reps += 1
    newCard.totalStudyTime += context.timeTaken
    newCard.averageAnswerTime = newCard.totalStudyTime / newCard.reps

    const reasoning = `Lapse: ${rating === 1 ? 'Again' : 'Hard'} rating, ease reduced by ${easeReduction}, ` +
      `interval: ${card.ivl}d -> ${newInterval}d, ` +
      `${newCard.state === 'relearning' ? 'entered relearning' : 'direct to review'}`

    const result: SchedulingResult = {
      card: newCard,
      wasCorrect: false,
      previousState: card.state,
      newState: newCard.state,
      intervalChange: newInterval - card.ivl,
      nextReviewDate: newCard.state === 'relearning' 
        ? new Date(Date.now() + newCard.left * 60 * 1000)
        : this.daysSinceEpochToDate(newCard.due),
      debugInfo: {
        algorithm: 'SM2_PLUS_LAPSE',
        calculatedInterval: newInterval,
        appliedFuzz: 0,
        finalInterval: newInterval,
        easeFactorChange: newCard.factor - card.factor,
        reasoning
      }
    }

    this.log('Review lapse handled', {
      cardId: card.id,
      newState: newCard.state,
      intervalChange: `${card.ivl}d -> ${newInterval}d`,
      easeChange: `${card.factor} -> ${newCard.factor}`,
      lapses: newCard.lapses
    })

    return result
  }

  /**
   * Determine if a Hard rating should cause a lapse
   */
  private shouldLapse(card: Card): boolean {
    // Hard causes lapse if interval is very short or card has many lapses
    return card.ivl <= 7 || card.lapses >= 3
  }

  /**
   * Calculate ease factor change based on rating
   */
  private calculateEaseChange(rating: ReviewRating): number {
    switch (rating) {
      case 1: return -200 // Again: -20%
      case 2: return -150 // Hard: -15%
      case 3: return 0    // Good: no change
      case 4: return 150  // Easy: +15%
      default: return 0
    }
  }

  /**
   * Calculate base interval using SM-2+ algorithm
   */
  private calculateBaseInterval(card: Card, rating: ReviewRating, settings: AdvancedDeckSettings): number {
    const ease = card.factor / 1000 // Convert to decimal (2.5, etc.)
    
    switch (rating) {
      case 2: // Hard
        return Math.max(1, card.ivl * settings.reviews.hardInterval)
      
      case 3: // Good
        return card.ivl * ease
      
      case 4: // Easy
        return card.ivl * ease * settings.reviews.easyBonus
      
      default:
        return card.ivl
    }
  }

  /**
   * Apply interval modifiers from deck settings
   */
  private applyIntervalModifiers(
    baseInterval: number,
    settings: AdvancedDeckSettings,
    card: Card
  ): number {
    let modifiedInterval = baseInterval

    // Apply global interval modifier
    modifiedInterval *= settings.reviews.intervalModifier

    // Apply additional modifiers based on card performance
    if (card.lapses > 0) {
      // Reduce intervals for cards that have lapsed
      const lapseModifier = Math.max(0.8, 1 - (card.lapses * 0.05))
      modifiedInterval *= lapseModifier
    }

    // Boost intervals for consistently easy cards
    if (card.reps >= 5 && card.lapses === 0) {
      modifiedInterval *= 1.1
    }

    return modifiedInterval
  }

  /**
   * Apply fuzz to interval to spread out reviews
   */
  private applyFuzz(interval: number): number {
    if (interval < 2) return interval

    // Anki's fuzz algorithm: ±25% for intervals > 7 days, ±5% for shorter
    const fuzzRange = interval >= 7 ? 0.25 : 0.05
    const fuzzFactor = 1 + (Math.random() - 0.5) * 2 * fuzzRange
    
    return interval * fuzzFactor
  }

  /**
   * Calculate next review date
   */
  private calculateNextReviewDate(card: Card): Date {
    const now = new Date()
    return new Date(now.getTime() + card.ivl * 24 * 60 * 60 * 1000)
  }

  /**
   * Build detailed reasoning for review scheduling
   */
  private buildReviewReasoning(
    rating: ReviewRating,
    oldInterval: number,
    newInterval: number,
    oldEase: number,
    newEase: number,
    settings: AdvancedDeckSettings
  ): string {
    const ratingNames = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }
    const ratingName = ratingNames[rating]
    
    let reasoning = `${ratingName} rating: `
    
    if (rating === 2) {
      reasoning += `Hard interval (${settings.reviews.hardInterval}x), `
    } else if (rating === 4) {
      reasoning += `Easy bonus (${settings.reviews.easyBonus}x), `
    }
    
    reasoning += `interval ${oldInterval}d -> ${newInterval}d, `
    reasoning += `ease ${oldEase} -> ${newEase}`
    
    if (settings.reviews.intervalModifier !== 1.0) {
      reasoning += `, interval modifier ${settings.reviews.intervalModifier}x applied`
    }
    
    return reasoning
  }

  /**
   * Get scheduling preview without applying changes
   */
  getSchedulingPreview(
    card: Card,
    settings: AdvancedDeckSettings
  ): Record<ReviewRating, { interval: number; ease: number; nextReview: Date }> {
    const preview: Record<ReviewRating, { interval: number; ease: number; nextReview: Date }> = {
      1: { interval: 0, ease: 0, nextReview: new Date() },
      2: { interval: 0, ease: 0, nextReview: new Date() },
      3: { interval: 0, ease: 0, nextReview: new Date() },
      4: { interval: 0, ease: 0, nextReview: new Date() }
    }

    for (let rating = 1; rating <= 4; rating++) {
      try {
        const context: SchedulingContext = { timeTaken: 5000 } // Default 5 seconds
        const result = this.scheduleCard(card, rating as ReviewRating, settings, context)
        
        preview[rating as ReviewRating] = {
          interval: result.card.ivl,
          ease: result.card.factor,
          nextReview: result.nextReviewDate
        }
      } catch (error) {
        // Handle cards that can't be scheduled with certain ratings
        preview[rating as ReviewRating] = {
          interval: card.ivl,
          ease: card.factor,
          nextReview: new Date()
        }
      }
    }

    this.log('Generated scheduling preview', {
      cardId: card.id,
      preview: Object.entries(preview).map(([rating, data]) => ({
        rating,
        interval: data.interval,
        ease: data.ease
      }))
    })

    return preview
  }

  /**
   * Calculate retention rate for a set of cards
   */
  calculateRetentionRate(cards: Card[]): number {
    const reviewCards = cards.filter(c => c.state === 'review' && c.reps > 0)
    if (reviewCards.length === 0) return 0

    const totalReviews = reviewCards.reduce((sum, card) => sum + card.reps, 0)
    const totalLapses = reviewCards.reduce((sum, card) => sum + card.lapses, 0)
    
    const retentionRate = totalReviews > 0 ? ((totalReviews - totalLapses) / totalReviews) * 100 : 0

    this.log('Calculated retention rate', {
      totalCards: reviewCards.length,
      totalReviews,
      totalLapses,
      retentionRate: `${retentionRate.toFixed(1)}%`
    })

    return retentionRate
  }

  /**
   * Optimize deck settings based on performance
   */
  optimizeSettings(
    cards: Card[],
    currentSettings: AdvancedDeckSettings,
    targetRetention: number = 85
  ): AdvancedDeckSettings {
    const retentionRate = this.calculateRetentionRate(cards)
    const optimizedSettings = { ...currentSettings }

    this.log('Optimizing settings', {
      currentRetention: `${retentionRate.toFixed(1)}%`,
      targetRetention: `${targetRetention}%`,
      cardCount: cards.length
    })

    // Adjust interval modifier based on retention
    if (retentionRate < targetRetention - 5) {
      // Retention too low, reduce intervals
      optimizedSettings.reviews.intervalModifier *= 0.9
      this.log('Reduced interval modifier', {
        from: currentSettings.reviews.intervalModifier,
        to: optimizedSettings.reviews.intervalModifier
      })
    } else if (retentionRate > targetRetention + 5) {
      // Retention too high, increase intervals
      optimizedSettings.reviews.intervalModifier *= 1.1
      this.log('Increased interval modifier', {
        from: currentSettings.reviews.intervalModifier,
        to: optimizedSettings.reviews.intervalModifier
      })
    }

    // Adjust starting ease based on average performance
    const avgEase = cards.reduce((sum, card) => sum + card.factor, 0) / cards.length
    if (avgEase < 2200) {
      optimizedSettings.newCards.startingEase = Math.max(2200, avgEase + 100)
      this.log('Adjusted starting ease', {
        avgEase,
        newStartingEase: optimizedSettings.newCards.startingEase
      })
    }

    return optimizedSettings
  }

  /**
   * Utility methods
   */
  private dateToDaysSinceEpoch(date: Date): number {
    const epoch = new Date('1970-01-01')
    return Math.floor((date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000))
  }

  private daysSinceEpochToDate(days: number): Date {
    return new Date(days * 24 * 60 * 60 * 1000)
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.debugMode) {
      console.log(`[AnkiScheduler] ${message}`, data || '')
    }
  }
}

// Export singleton instance
export const ankiScheduler = new AnkiScheduler()
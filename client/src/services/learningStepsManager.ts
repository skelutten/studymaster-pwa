import { Card, ReviewRating, LearningStep, AdvancedDeckSettings, SchedulingResult } from '../../../shared/types'

/**
 * Learning Steps Manager
 * 
 * Manages Anki-style learning steps for new cards and relearning cards.
 * Provides comprehensive debug logging and test cases for all functionality.
 */
export class LearningStepsManager {
  private debugMode: boolean = true

  constructor(debugMode: boolean = true) {
    this.debugMode = debugMode
    this.log('LearningStepsManager initialized', { debugMode })
  }

  /**
   * Process a learning card answer and determine next state
   */
  processLearningCard(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    timeTaken: number
  ): SchedulingResult {
    const startTime = performance.now()
    
    this.log('Processing learning card', {
      cardId: card.id,
      currentState: card.state,
      currentStep: card.learningStep,
      rating,
      timeTaken
    })

    const previousState = card.state
    const previousStep = card.learningStep
    
    let result: SchedulingResult

    if (card.state === 'new' || card.state === 'learning') {
      result = this.processNewOrLearningCard(card, rating, settings, timeTaken)
    } else if (card.state === 'relearning') {
      result = this.processRelearningCard(card, rating, settings, timeTaken)
    } else {
      throw new Error(`Invalid card state for learning steps: ${card.state}`)
    }

    const processingTime = performance.now() - startTime

    this.log('Learning card processed', {
      cardId: card.id,
      previousState,
      newState: result.newState,
      previousStep,
      newStep: result.card.learningStep,
      processingTime: `${processingTime.toFixed(2)}ms`,
      reasoning: result.debugInfo.reasoning
    })

    return result
  }

  /**
   * Process new or learning card
   */
  private processNewOrLearningCard(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    timeTaken: number
  ): SchedulingResult {
    const steps = this.getLearningSteps(settings)
    const currentStep = card.learningStep
    
    this.log('Processing new/learning card', {
      cardId: card.id,
      currentStep,
      totalSteps: steps.length,
      rating,
      steps: steps.map(s => `${s.intervalMinutes}m`)
    })

    let newCard = { ...card }
    let wasCorrect = false
    let reasoning = ''

    switch (rating) {
      case 1: // Again
        newCard.learningStep = 0
        newCard.state = 'learning'
        newCard.left = steps[0]?.intervalMinutes || 1
        newCard.lapses += 1
        reasoning = `Again: Reset to step 0, interval ${newCard.left}m`
        break

      case 2: // Hard
        // Stay on current step or move back one
        newCard.learningStep = Math.max(0, currentStep - 1)
        newCard.state = 'learning'
        newCard.left = steps[newCard.learningStep]?.intervalMinutes || 1
        reasoning = `Hard: Move back to step ${newCard.learningStep}, interval ${newCard.left}m`
        break

      case 3: // Good
        wasCorrect = true
        if (currentStep + 1 >= steps.length) {
          // Graduate the card
          newCard = this.graduateCard(newCard, settings)
          reasoning = `Good: Graduated to review state, interval ${newCard.ivl}d`
        } else {
          // Move to next step
          newCard.learningStep = currentStep + 1
          newCard.state = 'learning'
          newCard.left = steps[newCard.learningStep].intervalMinutes
          reasoning = `Good: Advanced to step ${newCard.learningStep}, interval ${newCard.left}m`
        }
        break

      case 4: // Easy
        wasCorrect = true
        // Graduate immediately with easy interval
        newCard = this.graduateCard(newCard, settings, true)
        reasoning = `Easy: Graduated immediately with easy interval ${newCard.ivl}d`
        break
    }

    // Update common fields
    newCard.reps += 1
    newCard.totalStudyTime += timeTaken
    newCard.averageAnswerTime = newCard.totalStudyTime / newCard.reps

    // Calculate due date
    const nextReviewDate = this.calculateNextReviewDate(newCard)
    newCard.due = this.dateToDaysSinceEpoch(nextReviewDate)

    return {
      card: newCard,
      wasCorrect,
      previousState: card.state,
      newState: newCard.state,
      intervalChange: newCard.ivl - card.ivl,
      nextReviewDate,
      debugInfo: {
        algorithm: 'ANKI_LEARNING',
        calculatedInterval: newCard.state === 'learning' ? newCard.left : newCard.ivl,
        appliedFuzz: 0, // No fuzz for learning cards
        finalInterval: newCard.state === 'learning' ? newCard.left : newCard.ivl,
        easeFactorChange: newCard.factor - card.factor,
        reasoning
      }
    }
  }

  /**
   * Process relearning card
   */
  private processRelearningCard(
    card: Card,
    rating: ReviewRating,
    settings: AdvancedDeckSettings,
    timeTaken: number
  ): SchedulingResult {
    const steps = this.getRelearningSteps(settings)
    const currentStep = card.learningStep
    
    this.log('Processing relearning card', {
      cardId: card.id,
      currentStep,
      totalSteps: steps.length,
      rating,
      steps: steps.map(s => `${s.intervalMinutes}m`)
    })

    let newCard = { ...card }
    let wasCorrect = false
    let reasoning = ''

    switch (rating) {
      case 1: // Again
        newCard.learningStep = 0
        newCard.state = 'relearning'
        newCard.left = steps[0]?.intervalMinutes || 10
        newCard.lapses += 1
        reasoning = `Again: Reset to relearning step 0, interval ${newCard.left}m`
        break

      case 2: // Hard
        // Stay on current step
        newCard.learningStep = currentStep
        newCard.state = 'relearning'
        newCard.left = steps[currentStep]?.intervalMinutes || 10
        reasoning = `Hard: Stay on step ${newCard.learningStep}, interval ${newCard.left}m`
        break

      case 3: // Good
      case 4: // Easy (treated same as Good for relearning)
        wasCorrect = true
        if (currentStep + 1 >= steps.length) {
          // Graduate back to review
          newCard = this.graduateFromRelearning(newCard, settings)
          reasoning = `Good: Graduated from relearning, interval ${newCard.ivl}d`
        } else {
          // Move to next relearning step
          newCard.learningStep = currentStep + 1
          newCard.state = 'relearning'
          newCard.left = steps[newCard.learningStep].intervalMinutes
          reasoning = `Good: Advanced to relearning step ${newCard.learningStep}, interval ${newCard.left}m`
        }
        break
    }

    // Update common fields
    newCard.reps += 1
    newCard.totalStudyTime += timeTaken
    newCard.averageAnswerTime = newCard.totalStudyTime / newCard.reps

    // Calculate due date
    const nextReviewDate = this.calculateNextReviewDate(newCard)
    newCard.due = this.dateToDaysSinceEpoch(nextReviewDate)

    return {
      card: newCard,
      wasCorrect,
      previousState: card.state,
      newState: newCard.state,
      intervalChange: newCard.ivl - card.ivl,
      nextReviewDate,
      debugInfo: {
        algorithm: 'ANKI_RELEARNING',
        calculatedInterval: newCard.state === 'relearning' ? newCard.left : newCard.ivl,
        appliedFuzz: 0,
        finalInterval: newCard.state === 'relearning' ? newCard.left : newCard.ivl,
        easeFactorChange: newCard.factor - card.factor,
        reasoning
      }
    }
  }

  /**
   * Graduate a card from learning to review
   */
  private graduateCard(card: Card, settings: AdvancedDeckSettings, isEasy: boolean = false): Card {
    const newCard = { ...card }
    
    newCard.state = 'review'
    newCard.queue = 2 // Review queue
    newCard.learningStep = 0
    newCard.left = 0
    
    if (isEasy) {
      newCard.ivl = settings.newCards.easyInterval
      newCard.factor = Math.max(1300, settings.newCards.startingEase + 150) // Boost ease for easy
    } else {
      newCard.ivl = settings.newCards.graduatingInterval
      newCard.factor = settings.newCards.startingEase
    }

    this.log('Card graduated', {
      cardId: card.id,
      isEasy,
      newInterval: newCard.ivl,
      newEase: newCard.factor
    })

    return newCard
  }

  /**
   * Graduate a card from relearning back to review
   */
  private graduateFromRelearning(card: Card, settings: AdvancedDeckSettings): Card {
    const newCard = { ...card }
    
    newCard.state = 'review'
    newCard.queue = 2
    newCard.learningStep = 0
    newCard.left = 0
    
    // Apply new interval percentage from lapse settings
    const newInterval = Math.max(
      settings.lapses.minimumInterval,
      Math.round(card.ivl * settings.lapses.newInterval)
    )
    
    newCard.ivl = newInterval

    this.log('Card graduated from relearning', {
      cardId: card.id,
      oldInterval: card.ivl,
      newInterval: newCard.ivl,
      newIntervalPercentage: settings.lapses.newInterval
    })

    return newCard
  }

  /**
   * Get learning steps from settings
   */
  private getLearningSteps(settings: AdvancedDeckSettings): LearningStep[] {
    return settings.newCards.stepsMinutes.map((minutes, index) => ({
      stepNumber: index,
      intervalMinutes: minutes,
      isGraduating: index === settings.newCards.stepsMinutes.length - 1
    }))
  }

  /**
   * Get relearning steps from settings
   */
  private getRelearningSteps(settings: AdvancedDeckSettings): LearningStep[] {
    return settings.lapses.stepsMinutes.map((minutes, index) => ({
      stepNumber: index,
      intervalMinutes: minutes,
      isGraduating: index === settings.lapses.stepsMinutes.length - 1
    }))
  }

  /**
   * Calculate next review date based on card state
   */
  private calculateNextReviewDate(card: Card): Date {
    const now = new Date()
    
    if (card.state === 'learning' || card.state === 'relearning') {
      // Learning cards use minutes
      return new Date(now.getTime() + card.left * 60 * 1000)
    } else {
      // Review cards use days
      return new Date(now.getTime() + card.ivl * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Convert date to days since epoch (Anki format)
   */
  private dateToDaysSinceEpoch(date: Date): number {
    const epoch = new Date('1970-01-01')
    return Math.floor((date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000))
  }

  /**
   * Convert days since epoch to date
   */

  /**
   * Check if a card should become a leech
   */
  isLeech(card: Card, settings: AdvancedDeckSettings): boolean {
    const threshold = card.state === 'relearning' 
      ? settings.lapses.leechThreshold 
      : settings.reviews.leechThreshold
    
    const isLeech = card.lapses >= threshold
    
    if (isLeech) {
      this.log('Card identified as leech', {
        cardId: card.id,
        lapses: card.lapses,
        threshold,
        action: settings.lapses.leechAction
      })
    }
    
    return isLeech
  }

  /**
   * Handle leech action
   */
  handleLeech(card: Card, settings: AdvancedDeckSettings): Card {
    const newCard = { ...card }
    
    if (settings.lapses.leechAction === 'suspend') {
      newCard.state = 'suspended'
      newCard.queue = -1
      this.log('Card suspended as leech', { cardId: card.id })
    } else {
      // Tag action - would need to be implemented in the UI
      newCard.flags |= 1 // Set leech flag
      this.log('Card tagged as leech', { cardId: card.id })
    }
    
    return newCard
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.debugMode) {
      console.log(`[LearningStepsManager] ${message}`, data || '')
    }
  }

  /**
   * Get default advanced deck settings for testing
   */
  static getDefaultSettings(): AdvancedDeckSettings {
    return {
      newCards: {
        stepsMinutes: [1, 10],
        orderNewCards: 'due',
        newCardsPerDay: 20,
        graduatingInterval: 1,
        easyInterval: 4,
        startingEase: 2500,
        buryRelated: false
      },
      reviews: {
        maximumReviewsPerDay: 200,
        easyBonus: 1.3,
        intervalModifier: 1.0,
        maximumInterval: 36500,
        hardInterval: 1.2,
        newInterval: 0.0,
        minimumInterval: 1,
        leechThreshold: 8,
        leechAction: 'suspend'
      },
      lapses: {
        stepsMinutes: [10],
        newInterval: 0.0,
        minimumInterval: 1,
        leechThreshold: 8,
        leechAction: 'suspend'
      },
      general: {
        ignoreAnswerTimesLongerThan: 60,
        showAnswerTimer: true,
        autoAdvance: false,
        buryRelated: false
      },
      advanced: {
        maximumAnswerSeconds: 60,
        showRemainingCardCount: true,
        showNextReviewTime: true,
        dayStartsAt: 4,
        learnAheadLimit: 20,
        timezoneOffset: 0
      }
    }
  }
}

// Export singleton instance
export const learningStepsManager = new LearningStepsManager()
import { Card, CardState, AdvancedDeckSettings, CardMigrationData, CardType } from '../../../shared/types'

/**
 * Card State Manager
 * 
 * Manages card state transitions, validation, and migration between different card formats.
 * Provides comprehensive validation and debug logging for all card state operations.
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface StateTransitionResult {
  success: boolean
  card: Card
  previousState: CardState
  newState: CardState
  validationResult: ValidationResult
  migrationData?: CardMigrationData
}

export class CardStateManager {
  private debugMode: boolean = true

  constructor(debugMode: boolean = true) {
    this.debugMode = debugMode
    this.log('CardStateManager initialized', { debugMode })
  }

  /**
   * Validate a card's data integrity
   */
  validateCard(card: Card, settings?: AdvancedDeckSettings): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    this.log('Validating card', { cardId: card.id, state: card.state })

    // Required field validation
    if (!card.id || typeof card.id !== 'string') {
      errors.push('Card ID is required and must be a string')
    }

    if (!card.deckId || typeof card.deckId !== 'string') {
      errors.push('Deck ID is required and must be a string')
    }

    if (!card.frontContent || typeof card.frontContent !== 'string') {
      errors.push('Front content is required and must be a string')
    }

    if (!card.backContent || typeof card.backContent !== 'string') {
      errors.push('Back content is required and must be a string')
    }

    // State validation
    const validStates: CardState[] = ['new', 'learning', 'review', 'relearning', 'suspended', 'buried']
    if (!validStates.includes(card.state)) {
      errors.push(`Invalid card state: ${card.state}. Must be one of: ${validStates.join(', ')}`)
    }

    // Queue validation
    const validQueues = [-2, -1, 0, 1, 2, 3] // buried, suspended, new, learning, review, day learning
    if (!validQueues.includes(card.queue)) {
      errors.push(`Invalid queue value: ${card.queue}. Must be one of: ${validQueues.join(', ')}`)
    }

    // State-queue consistency validation
    const stateQueueMap: Record<CardState, number[]> = {
      'new': [0],
      'learning': [1, 3],
      'review': [2],
      'relearning': [1],
      'suspended': [-1],
      'buried': [-2]
    }

    if (!stateQueueMap[card.state]?.includes(card.queue)) {
      errors.push(`Inconsistent state-queue combination: state=${card.state}, queue=${card.queue}`)
    }

    // Numeric field validation
    if (typeof card.ivl !== 'number' || card.ivl < 0) {
      errors.push('Interval (ivl) must be a non-negative number')
    }

    if (typeof card.factor !== 'number' || card.factor < 1300 || card.factor > 5000) {
      warnings.push(`Ease factor (${card.factor}) is outside normal range (1300-5000)`)
    }

    if (typeof card.reps !== 'number' || card.reps < 0) {
      errors.push('Repetitions (reps) must be a non-negative number')
    }

    if (typeof card.lapses !== 'number' || card.lapses < 0) {
      errors.push('Lapses must be a non-negative number')
    }

    if (typeof card.left !== 'number' || card.left < 0) {
      errors.push('Left (learning time) must be a non-negative number')
    }

    if (typeof card.learningStep !== 'number' || card.learningStep < 0) {
      errors.push('Learning step must be a non-negative number')
    }

    // Learning state specific validation
    if ((card.state === 'learning' || card.state === 'relearning') && card.left === 0) {
      warnings.push('Learning/relearning card has no time left - may be due immediately')
    }

    if (card.state === 'new' && card.reps > 0) {
      warnings.push('New card has repetitions > 0 - may need state update')
    }

    if (card.state === 'review' && card.reps === 0) {
      warnings.push('Review card has no repetitions - may need state update')
    }

    // Settings-based validation
    if (settings) {
      if (card.state === 'learning' && settings.newCards.stepsMinutes.length > 0) {
        if (card.learningStep >= settings.newCards.stepsMinutes.length) {
          warnings.push(`Learning step (${card.learningStep}) exceeds available steps (${settings.newCards.stepsMinutes.length})`)
        }
      }

      if (card.ivl > settings.reviews.maximumInterval) {
        warnings.push(`Interval (${card.ivl}) exceeds maximum allowed (${settings.reviews.maximumInterval})`)
      }

      if (card.lapses >= settings.reviews.leechThreshold) {
        warnings.push(`Card may be a leech (${card.lapses} lapses >= ${settings.reviews.leechThreshold} threshold)`)
      }
    }

    // Date validation
    try {
      new Date(card.createdAt)
    } catch {
      errors.push('Invalid createdAt date format')
    }

    try {
      new Date(card.nextReview)
    } catch {
      errors.push('Invalid nextReview date format')
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    }

    this.log('Card validation completed', {
      cardId: card.id,
      isValid: result.isValid,
      errorCount: errors.length,
      warningCount: warnings.length
    })

    if (errors.length > 0) {
      this.log('Validation errors', { cardId: card.id, errors })
    }

    if (warnings.length > 0) {
      this.log('Validation warnings', { cardId: card.id, warnings })
    }

    return result
  }

  /**
   * Transition a card to a new state with validation
   */
  transitionCardState(
    card: Card,
    newState: CardState,
    settings?: AdvancedDeckSettings
  ): StateTransitionResult {
    const previousState = card.state
    
    this.log('Transitioning card state', {
      cardId: card.id,
      from: previousState,
      to: newState
    })

    // Validate current card before transition
    const preValidation = this.validateCard(card, settings)
    if (!preValidation.isValid) {
      return {
        success: false,
        card,
        previousState,
        newState,
        validationResult: preValidation
      }
    }

    // Create new card with updated state
    const updatedCard = { ...card }
    updatedCard.state = newState

    // Update queue based on new state
    updatedCard.queue = this.getQueueForState(newState)

    // Apply state-specific updates
    switch (newState) {
      case 'new':
        updatedCard.reps = 0
        updatedCard.lapses = 0
        updatedCard.learningStep = 0
        updatedCard.left = 0
        updatedCard.ivl = 0
        updatedCard.due = 0
        break

      case 'learning':
        if (previousState === 'new') {
          updatedCard.learningStep = 0
          updatedCard.left = settings?.newCards.stepsMinutes[0] || 1
        }
        break

      case 'review':
        updatedCard.learningStep = 0
        updatedCard.left = 0
        if (updatedCard.ivl === 0) {
          updatedCard.ivl = settings?.newCards.graduatingInterval || 1
        }
        break

      case 'relearning':
        updatedCard.learningStep = 0
        updatedCard.left = settings?.lapses.stepsMinutes[0] || 10
        break

      case 'suspended':
        updatedCard.originalDue = updatedCard.due
        updatedCard.due = 0
        updatedCard.left = 0
        break

      case 'buried': {
        updatedCard.originalDue = updatedCard.due
        // Set due to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        updatedCard.due = this.dateToDaysSinceEpoch(tomorrow)
        updatedCard.left = 0
        break
      }
    }

    // Validate updated card
    const postValidation = this.validateCard(updatedCard, settings)

    const result: StateTransitionResult = {
      success: postValidation.isValid,
      card: updatedCard,
      previousState,
      newState,
      validationResult: postValidation
    }

    this.log('State transition completed', {
      cardId: card.id,
      success: result.success,
      previousState,
      newState,
      queue: updatedCard.queue
    })

    return result
  }

  /**
   * Migrate a card from legacy format to enhanced format
   */
  migrateCard(legacyCard: Partial<Card>, settings?: AdvancedDeckSettings): StateTransitionResult {
    this.log('Migrating legacy card', { cardId: legacyCard.id })

    const migrationData: CardMigrationData = {
      cardId: legacyCard.id || '',
      migratedAt: new Date().toISOString(),
      oldFormat: {
        easeFactor: legacyCard.easeFactor || 2.5,
        intervalDays: legacyCard.intervalDays || 0,
        nextReview: legacyCard.nextReview || new Date().toISOString(),
        reviewCount: legacyCard.reviewCount || 0,
        lapseCount: legacyCard.lapseCount || 0
      },
      newFormat: {
        state: 'new',
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 2500,
        reps: 0,
        lapses: 0
      },
      migrationNotes: []
    }

    // Determine new state based on legacy data
    let newState: CardState = 'new'
    let newQueue = 0
    let newIvl = 0
    let newFactor = 2500
    let newReps = 0
    let newLapses = 0
    let newDue = 0

    if ((legacyCard.reviewCount || 0) > 0) {
      newState = 'review'
      newQueue = 2
      newIvl = Math.max(1, legacyCard.intervalDays || 1)
      newFactor = Math.round((legacyCard.easeFactor || 2.5) * 1000)
      newReps = legacyCard.reviewCount || 0
      newLapses = legacyCard.lapseCount || 0
      
      // Calculate due date
      const nextReview = new Date(legacyCard.nextReview || new Date())
      newDue = this.dateToDaysSinceEpoch(nextReview)
      
      migrationData.migrationNotes.push('Migrated as review card based on reviewCount > 0')
    } else {
      migrationData.migrationNotes.push('Migrated as new card')
    }

    // Create enhanced card
    const enhancedCard: Card = {
      // Copy existing fields
      id: legacyCard.id || '',
      deckId: legacyCard.deckId || '',
      frontContent: legacyCard.frontContent || '',
      backContent: legacyCard.backContent || '',
      cardType: (legacyCard.cardType as CardType) || 'basic',
      mediaRefs: legacyCard.mediaRefs || [],
      
      // Legacy fields (for backward compatibility)
      easeFactor: legacyCard.easeFactor || 2.5,
      intervalDays: legacyCard.intervalDays || 0,
      nextReview: legacyCard.nextReview || new Date().toISOString(),
      createdAt: legacyCard.createdAt || new Date().toISOString(),
      reviewCount: legacyCard.reviewCount || 0,
      lapseCount: legacyCard.lapseCount || 0,
      
      // Enhanced fields
      state: newState,
      queue: newQueue,
      due: newDue,
      ivl: newIvl,
      factor: newFactor,
      reps: newReps,
      lapses: newLapses,
      left: 0,
      learningStep: 0,
      graduationInterval: settings?.newCards.graduatingInterval || 1,
      easyInterval: settings?.newCards.easyInterval || 4,
      totalStudyTime: 0,
      averageAnswerTime: 0,
      flags: 0,
      originalDue: 0,
      originalDeck: legacyCard.deckId || '',
      xpAwarded: 0,
      difficultyRating: 3
    }

    // Update migration data
    migrationData.newFormat = {
      state: newState,
      queue: newQueue,
      due: newDue,
      ivl: newIvl,
      factor: newFactor,
      reps: newReps,
      lapses: newLapses
    }

    // Validate migrated card
    const validation = this.validateCard(enhancedCard, settings)

    const result: StateTransitionResult = {
      success: validation.isValid,
      card: enhancedCard,
      previousState: 'new', // Legacy cards don't have explicit states
      newState,
      validationResult: validation,
      migrationData
    }

    this.log('Card migration completed', {
      cardId: legacyCard.id,
      success: result.success,
      newState,
      migrationNotes: migrationData.migrationNotes
    })

    return result
  }

  /**
   * Batch validate multiple cards
   */
  validateCards(cards: Card[], settings?: AdvancedDeckSettings): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    this.log('Batch validating cards', { count: cards.length })

    for (const card of cards) {
      const result = this.validateCard(card, settings)
      allErrors.push(...result.errors.map(error => `Card ${card.id}: ${error}`))
      allWarnings.push(...result.warnings.map(warning => `Card ${card.id}: ${warning}`))
    }

    const result: ValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }

    this.log('Batch validation completed', {
      cardCount: cards.length,
      isValid: result.isValid,
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length
    })

    return result
  }

  /**
   * Fix common card data issues
   */
  repairCard(card: Card, settings?: AdvancedDeckSettings): StateTransitionResult {
    this.log('Repairing card', { cardId: card.id })

    const repairedCard = { ...card }
    const repairNotes: string[] = []

    // Fix state-queue inconsistencies
    const expectedQueue = this.getQueueForState(card.state)
    if (card.queue !== expectedQueue) {
      repairedCard.queue = expectedQueue
      repairNotes.push(`Fixed queue: ${card.queue} -> ${expectedQueue}`)
    }

    // Fix ease factor range
    if (repairedCard.factor < 1300) {
      repairedCard.factor = 1300
      repairNotes.push('Fixed ease factor: set to minimum 1300')
    } else if (repairedCard.factor > 5000) {
      repairedCard.factor = 5000
      repairNotes.push('Fixed ease factor: set to maximum 5000')
    }

    // Fix negative values
    if (repairedCard.ivl < 0) {
      repairedCard.ivl = 0
      repairNotes.push('Fixed negative interval')
    }

    if (repairedCard.reps < 0) {
      repairedCard.reps = 0
      repairNotes.push('Fixed negative repetitions')
    }

    if (repairedCard.lapses < 0) {
      repairedCard.lapses = 0
      repairNotes.push('Fixed negative lapses')
    }

    if (repairedCard.left < 0) {
      repairedCard.left = 0
      repairNotes.push('Fixed negative left time')
    }

    if (repairedCard.learningStep < 0) {
      repairedCard.learningStep = 0
      repairNotes.push('Fixed negative learning step')
    }

    // Fix state-specific issues
    if (repairedCard.state === 'new' && repairedCard.reps > 0) {
      repairedCard.state = 'review'
      repairedCard.queue = 2
      repairNotes.push('Fixed state: new card with reps > 0 changed to review')
    }

    if (repairedCard.state === 'review' && repairedCard.reps === 0) {
      repairedCard.state = 'new'
      repairedCard.queue = 0
      repairNotes.push('Fixed state: review card with reps = 0 changed to new')
    }

    // Validate repaired card
    const validation = this.validateCard(repairedCard, settings)

    const result: StateTransitionResult = {
      success: validation.isValid,
      card: repairedCard,
      previousState: card.state,
      newState: repairedCard.state,
      validationResult: validation
    }

    this.log('Card repair completed', {
      cardId: card.id,
      success: result.success,
      repairCount: repairNotes.length,
      repairs: repairNotes
    })

    return result
  }

  /**
   * Get appropriate queue number for a card state
   */
  private getQueueForState(state: CardState): number {
    const queueMap: Record<CardState, number> = {
      'new': 0,
      'learning': 1,
      'review': 2,
      'relearning': 1,
      'suspended': -1,
      'buried': -2
    }
    return queueMap[state]
  }

  /**
   * Convert date to days since epoch
   */
  private dateToDaysSinceEpoch(date: Date): number {
    const epoch = new Date('1970-01-01')
    return Math.floor((date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000))
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.debugMode) {
      console.log(`[CardStateManager] ${message}`, data || '')
    }
  }

  /**
   * Get card state statistics
   */
  getStateStatistics(cards: Card[]): Record<CardState, number> {
    const stats: Record<CardState, number> = {
      'new': 0,
      'learning': 0,
      'review': 0,
      'relearning': 0,
      'suspended': 0,
      'buried': 0
    }

    for (const card of cards) {
      if (Object.prototype.hasOwnProperty.call(stats, card.state)) {
        stats[card.state]++
      }
    }

    this.log('State statistics calculated', { stats, totalCards: cards.length })

    return stats
  }
}

// Export singleton instance
export const cardStateManager = new CardStateManager()
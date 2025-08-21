// Test helper utilities for fixing common test failures

import { Card, CardState, AdvancedDeckSettings } from '../../../../shared/types'
import { LearningStepsManager } from '../learningStepsManager'

/**
 * Create a properly initialized mock card for testing
 */
export function createValidMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card-1',
    deckId: 'test-deck-1',
    frontContent: 'Test Front',
    backContent: 'Test Back',
    cardType: { type: 'basic' },
    mediaRefs: [],
    
    // Legacy fields - properly initialized
    easeFactor: 2.5,
    intervalDays: 0,
    nextReview: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    lapseCount: 0,
    
    // Enhanced fields - properly initialized with valid defaults
    state: 'new' as CardState,
    queue: 0,
    due: 0,
    ivl: 0,
    factor: 2500, // Anki default ease factor (250%)
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

/**
 * Create valid test settings that align with actual Anki behavior
 */
export function createValidTestSettings(overrides: Partial<AdvancedDeckSettings> = {}): AdvancedDeckSettings {
  const defaultSettings = LearningStepsManager.getDefaultSettings()
  
  return {
    ...defaultSettings,
    ...overrides
  }
}

/**
 * Validate that an ease factor is within acceptable bounds
 */
export function validateEaseFactor(factor: number): boolean {
  return factor >= 1300 && factor <= 5000
}

/**
 * Validate that an interval is within acceptable bounds
 */
export function validateInterval(interval: number, settings: AdvancedDeckSettings): boolean {
  return interval >= settings.reviews.minimumInterval && interval <= settings.reviews.maximumInterval
}

/**
 * Fix common card state inconsistencies that cause test failures
 */
export function fixCardState(card: Card): Card {
  const fixed = { ...card }
  
  // Ensure state and queue are consistent
  switch (fixed.state) {
    case 'new':
      fixed.queue = 0
      fixed.ivl = 0
      fixed.reps = 0
      break
    case 'learning':
    case 'relearning':
      fixed.queue = 1
      if (fixed.learningStep < 0) fixed.learningStep = 0
      break
    case 'review':
      fixed.queue = 2
      if (fixed.ivl <= 0) fixed.ivl = 1
      if (fixed.reps <= 0) fixed.reps = 1
      break
  }
  
  // Ensure ease factor is valid
  if (fixed.factor < 1300) fixed.factor = 1300
  if (fixed.factor > 5000) fixed.factor = 5000
  
  // Ensure interval is positive for review cards
  if (fixed.state === 'review' && fixed.ivl <= 0) {
    fixed.ivl = 1
  }
  
  // Ensure learning step is valid
  if (fixed.state === 'learning' || fixed.state === 'relearning') {
    if (fixed.learningStep < 0) fixed.learningStep = 0
    if (fixed.left <= 0) fixed.left = 1 // Should have remaining steps
  }
  
  return fixed
}

/**
 * Test scheduling expectation helpers to handle floating point precision
 */
export const expect = {
  intervalToBeCloseTo: (actual: number, expected: number, precision = 1) => {
    const diff = Math.abs(actual - expected)
    return diff <= precision
  },
  
  easeFactorToBeValid: (factor: number) => {
    return factor >= 1300 && factor <= 5000
  },
  
  stateToBeConsistent: (card: Card) => {
    switch (card.state) {
      case 'new':
        return card.queue === 0 && card.ivl === 0 && card.reps === 0
      case 'learning':
      case 'relearning':
        return card.queue === 1 && card.learningStep >= 0
      case 'review':
        return card.queue === 2 && card.ivl > 0 && card.reps > 0
      default:
        return false
    }
  }
}

/**
 * Debug helper to log card state for failing tests
 */
export function debugCard(card: Card, label = 'Card'): void {
  console.log(`${label}:`, {
    id: card.id,
    state: card.state,
    queue: card.queue,
    ivl: card.ivl,
    factor: card.factor,
    reps: card.reps,
    lapses: card.lapses,
    learningStep: card.learningStep,
    left: card.left
  })
}
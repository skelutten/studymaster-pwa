import { Card, ReviewCardType } from '../../../shared/types'

/**
 * Local utility functions for card state management
 * This avoids build issues with importing CardStateUtils from shared types
 */

/**
 * Determine if a review card is young (interval < 21 days) or mature (interval >= 21 days)
 */
export function getReviewCardType(card: Card): ReviewCardType {
  if (card.state !== 'review') {
    throw new Error('Card must be in review state to determine maturity')
  }
  return card.ivl < 21 ? 'young' : 'mature'
}

/**
 * Get human-readable card state description
 */
export function getCardStateDescription(card: Card): string {
  switch (card.state) {
    case 'new':
      return 'New - Never studied before'
    case 'learning':
      return 'Learning - Recently seen, still being learned'
    case 'review': {
      const maturity = card.ivl < 21 ? 'Young' : 'Mature'
      return `Review (${maturity}) - Finished learning, scheduled for review`
    }
    case 'relearning':
      return 'Relearning - Failed in review, being relearned'
    case 'suspended':
      return 'Suspended - Manually suspended from study'
    case 'buried':
      return 'Buried - Hidden until next day'
    default:
      return 'Unknown state'
  }
}

/**
 * Get card state color for UI display
 */
export function getCardStateColor(card: Card): string {
  switch (card.state) {
    case 'new':
      return '#3b82f6' // Blue
    case 'learning':
      return '#f59e0b' // Amber
    case 'review':
      return card.ivl < 21 ? '#10b981' : '#059669' // Green (lighter for young, darker for mature)
    case 'relearning':
      return '#ef4444' // Red
    case 'suspended':
      return '#6b7280' // Gray
    case 'buried':
      return '#9ca3af' // Light gray
    default:
      return '#374151' // Dark gray
  }
}

/**
 * Check if a card is due for study
 */
export function isCardDue(card: Card, currentDate: Date = new Date()): boolean {
  const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))
  
  switch (card.state) {
    case 'new':
      return true // New cards are always available (subject to daily limits)
    case 'learning':
    case 'relearning': {
      // Learning cards use minutes, check if due time has passed
      const dueTime = currentDate.getTime() + (card.left * 60 * 1000)
      return dueTime <= currentDate.getTime()
    }
    case 'review':
      return card.due <= currentDay
    case 'suspended':
    case 'buried':
      return false // These cards are not available for study
    default:
      return false
  }
}

/**
 * Get the next review date for a card
 */
export function getNextReviewDate(card: Card): Date | null {
  switch (card.state) {
    case 'new':
      return null // New cards don't have a scheduled review
    case 'learning':
    case 'relearning':
      // Learning cards are due in 'left' minutes
      return new Date(Date.now() + card.left * 60 * 1000)
    case 'review':
      // Review cards use days since epoch
      return new Date(card.due * 24 * 60 * 60 * 1000)
    case 'suspended':
    case 'buried':
      return null // These cards have no scheduled review
    default:
      return null
  }
}

/**
 * Calculate days overdue for a review card
 */
export function getDaysOverdue(card: Card, currentDate: Date = new Date()): number {
  if (card.state !== 'review') {
    return 0
  }
  
  const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))
  return Math.max(0, currentDay - card.due)
}

/**
 * Get study priority for card ordering
 */
export function getStudyPriority(card: Card): number {
  switch (card.state) {
    case 'learning':
    case 'relearning':
      return 1 // Highest priority
    case 'review':
      return 2 // Medium priority
    case 'new':
      return 3 // Lower priority
    case 'suspended':
    case 'buried':
      return 999 // Should not be studied
    default:
      return 999
  }
}
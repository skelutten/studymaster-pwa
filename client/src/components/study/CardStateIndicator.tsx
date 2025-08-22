import React from 'react'
import { Card } from '../../../../shared/types'
import {
  getCardStateDescription,
  getCardStateColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReviewCardType,
  getNextReviewDate,
  getDaysOverdue
} from '../../utils/cardStateUtils'

interface CardStateIndicatorProps {
  card: Card
  className?: string
  showDescription?: boolean
  compact?: boolean
}

export const CardStateIndicator: React.FC<CardStateIndicatorProps> = ({
  card,
  className = '',
  showDescription = false,
  compact = false
}) => {
  const stateColor = getCardStateColor(card)
  const description = getCardStateDescription(card)
  const nextReview = getNextReviewDate(card)
  const daysOverdue = getDaysOverdue(card)

  const getStateIcon = () => {
    switch (card.state) {
      case 'new':
        return '✨'
      case 'learning':
        return '📚'
      case 'review':
        return card.ivl < 21 ? '🌱' : '🌳'
      case 'relearning':
        return '🔄'
      case 'suspended':
        return '⏸️'
      case 'buried':
        return '📦'
      default:
        return '❓'
    }
  }

  const getStateLabel = () => {
    switch (card.state) {
      case 'new':
        return 'New'
      case 'learning':
        return 'Learning'
      case 'review':
        return card.ivl < 21 ? 'Young' : 'Mature'
      case 'relearning':
        return 'Relearning'
      case 'suspended':
        return 'Suspended'
      case 'buried':
        return 'Buried'
      default:
        return 'Unknown'
    }
  }

  const getAdditionalInfo = () => {
    switch (card.state) {
      case 'learning':
      case 'relearning':
        return `Step ${card.learningStep + 1}, ${card.left}min left`
      case 'review':
        if (daysOverdue > 0) {
          return `${daysOverdue} days overdue`
        }
        return `Interval: ${card.ivl} days`
      case 'new':
        return 'Never studied'
      default:
        return ''
    }
  }

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
        style={{ 
          backgroundColor: `${stateColor}20`,
          color: stateColor,
          border: `1px solid ${stateColor}40`
        }}
      >
        <span>{getStateIcon()}</span>
        <span>{getStateLabel()}</span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: stateColor }}
        />
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStateIcon()}</span>
          <span className="font-medium text-gray-900">{getStateLabel()}</span>
        </div>
      </div>

      {showDescription && (
        <p className="text-sm text-gray-600 mb-2">{description}</p>
      )}

      <div className="space-y-1 text-xs text-gray-500">
        {getAdditionalInfo() && (
          <div>{getAdditionalInfo()}</div>
        )}
        
        {card.state === 'review' && (
          <div className="flex justify-between">
            <span>Ease: {(card.factor / 10).toFixed(0)}%</span>
            <span>Reviews: {card.reps}</span>
          </div>
        )}
        
        {card.lapses > 0 && (
          <div className="text-red-500">Lapses: {card.lapses}</div>
        )}
        
        {nextReview && card.state !== 'learning' && card.state !== 'relearning' && (
          <div>Next: {nextReview.toLocaleDateString()}</div>
        )}
      </div>
    </div>
  )
}

export default CardStateIndicator
import React from 'react'
import { Card, SvgMapCardOptions } from '../../../../shared/types'
import { SvgMapCard } from '../SvgMapCard'

interface CardRendererProps {
  card: Card
  showAnswer: boolean
  onAnswerSubmit?: (answer: string) => void
}

const CardRenderer: React.FC<CardRendererProps> = ({ card, showAnswer, onAnswerSubmit }) => {
  if (!card) {
    return null // or a loading indicator
  }
  // Handle SVG map cards
  if (card.cardType.type === 'svg_map') {
    const options = card.cardType.options as SvgMapCardOptions
    return (
      <SvgMapCard
        options={options}
        showAnswer={showAnswer}
        isStudyMode={!showAnswer}
        onAnswer={(correct) => {
          if (onAnswerSubmit) {
            onAnswerSubmit(correct ? 'correct' : 'incorrect')
          }
        }}
      />
    )
  }

  // Handle basic cards (default behavior)
  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {showAnswer ? 'Answer' : 'Question'}
        </h2>
        <div className="text-2xl font-medium text-gray-900 dark:text-white">
          {showAnswer ? card.backContent : card.frontContent}
        </div>
      </div>
    </div>
  )
}

export default CardRenderer
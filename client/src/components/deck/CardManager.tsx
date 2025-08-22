import { useState } from 'react'
import { useDeckStore } from '../../stores/deckStore'
import { Card } from '../../../../shared/types'
import { createNewCard } from '../../utils/cardDefaults'

interface CardManagerProps {
  deckId: string
  onClose: () => void
}

const CardManager = ({ deckId, onClose }: CardManagerProps) => {
  const { getCards, addCard, updateCard, deleteCard, getDeck } = useDeckStore()
  const [showAddCard, setShowAddCard] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [frontContent, setFrontContent] = useState('')
  const [backContent, setBackContent] = useState('')

  const deck = getDeck(deckId)
  const cards = getCards(deckId)

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!frontContent.trim() || !backContent.trim()) return

    try {
      await addCard(deckId, createNewCard(
        frontContent.trim(),
        backContent.trim(),
        { type: 'basic' },
        []
      ))
      setFrontContent('')
      setBackContent('')
      setShowAddCard(false)
    } catch (error) {
      console.error('Failed to add card:', error)
    }
  }

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCard || !frontContent.trim() || !backContent.trim()) return

    try {
      await updateCard(editingCard.id, {
        frontContent: frontContent.trim(),
        backContent: backContent.trim()
      })
      setEditingCard(null)
      setFrontContent('')
      setBackContent('')
    } catch (error) {
      console.error('Failed to update card:', error)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(cardId)
      } catch (error) {
        console.error('Failed to delete card:', error)
      }
    }
  }

  const startEdit = (card: Card) => {
    setEditingCard(card)
    setFrontContent(card.frontContent)
    setBackContent(card.backContent)
    setShowAddCard(false)
  }

  const cancelEdit = () => {
    setEditingCard(null)
    setFrontContent('')
    setBackContent('')
    setShowAddCard(false)
  }

  if (!deck) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-red-600">Deck not found</p>
          <button onClick={onClose} className="btn btn-secondary mt-4">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{deck.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">{cards.length} cards</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCard(true)}
              className="btn btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Card
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>

        {/* Add/Edit Card Form */}
        {(showAddCard || editingCard) && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              {editingCard ? 'Edit Card' : 'Add New Card'}
            </h3>
            <form onSubmit={editingCard ? handleEditCard : handleAddCard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Front
                  </label>
                  <textarea
                    value={frontContent}
                    onChange={(e) => setFrontContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    rows={3}
                    placeholder="Enter the question or front side..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Back
                  </label>
                  <textarea
                    value={backContent}
                    onChange={(e) => setBackContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    rows={3}
                    placeholder="Enter the answer or back side..."
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingCard ? 'Update Card' : 'Add Card'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-6">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No cards yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add your first card to start studying
              </p>
              <button
                onClick={() => setShowAddCard(true)}
                className="btn btn-primary"
              >
                Add First Card
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Card #{index + 1}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(card)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit card"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete card"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front</div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px] text-gray-900 dark:text-white">
                        {card.frontContent}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Back</div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-600 rounded border min-h-[60px] text-gray-900 dark:text-white">
                        {card.backContent}
                      </div>
                    </div>
                  </div>

                  {/* Card Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Reviews: {card.reviewCount}</span>
                      <span>Ease: {card.easeFactor.toFixed(1)}</span>
                      <span>Interval: {card.intervalDays} days</span>
                      {card.reviewCount > 0 && (
                        <span>Next: {new Date(card.nextReview).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CardManager
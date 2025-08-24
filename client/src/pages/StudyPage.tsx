import { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useDeckStore, useCurrentCard } from '../stores/deckStore'
import { useGamificationStore } from '../stores/gamificationStore'
import { EnhancedCard, ResponseLog } from '../types/enhancedTypes'
import { FSRS } from '../services/fsrsEngine'
import CardRenderer from '../components/study/CardRenderer'
import { useStudyKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { StudyShortcutsHelp } from '../components/study/KeyboardShortcutsHelp'
import { CardStateIndicator } from '../components/study/CardStateIndicator'
import '../utils/testStatsLogic'

const StudyPage = () => {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const {
    getDeck,
    getCards,
    updateCard,
    decks,
    cards,
    startStudySession,
    updateStudySession,
    clearStudySession,
    currentStudySession,
    getStudySession
  } = useDeckStore()
  
  const { awardStudyXP } = useGamificationStore()
  
  // UI-specific state
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [stats, setStats] = useState({ total: 0, correct: 0, incorrect: 0 })

  // Get the cards for the current study session
  const studyCards = currentStudySession?.studyCards || []

  const deck = deckId ? getDeck(deckId) : null

  // Sync local stats with session stats from the store
  useEffect(() => {
    if (currentStudySession?.sessionStats) {
      setStats(currentStudySession.sessionStats)
    }
  }, [currentStudySession?.sessionStats])

  // Effect to initialize the study session
  useEffect(() => {
    if (deckId && !sessionInitialized) {
      // If there is no active session for this deck, start a new one.
      if (!currentStudySession || currentStudySession.deckId !== deckId) {
        const allCards = getCards(deckId)
        if (allCards.length > 0) {
          console.log('Starting a new study session...');
          const dueCards = allCards.filter(card => {
            if (card.reviewCount === 0) return true // New cards
            return new Date(card.nextReview) <= new Date() // Due cards
          })
          const MAX_CARDS_PER_SESSION = 20
          const cardsToStudy = (dueCards.length > 0 ? dueCards : allCards).slice(0, MAX_CARDS_PER_SESSION)
          startStudySession(deckId, cardsToStudy)
        }
      } else {
        console.log('Restoring existing study session...');
      }
      setSessionInitialized(true)
    }
  }, [deckId, getCards, startStudySession, currentStudySession, sessionInitialized])

  // Get the current card using the new on-demand selector
  const currentCard = useCurrentCard()

  // Memoize session stats to prevent re-renders
  const sessionStats = useMemo(() => currentStudySession?.sessionStats, [currentStudySession])

  // Keyboard shortcuts integration
  useStudyKeyboardShortcuts({
    onFlipCard: () => {
      if (!showAnswer && currentCard) {
        setShowAnswer(true)
        console.log('[Keyboard] Flipped card to show answer')
      }
    },
    onAnswerAgain: () => {
      if (showAnswer && currentCard) {
        console.log('[Keyboard] Answered: Again')
        handleAnswer('again')
      }
    },
    onAnswerHard: () => {
      if (showAnswer && currentCard) {
        console.log('[Keyboard] Answered: Hard')
        handleAnswer('hard')
      }
    },
    onAnswerGood: () => {
      if (showAnswer && currentCard) {
        console.log('[Keyboard] Answered: Good')
        handleAnswer('good')
      }
    },
    onAnswerEasy: () => {
      if (showAnswer && currentCard) {
        console.log('[Keyboard] Answered: Easy')
        handleAnswer('easy')
      }
    },
    onExitStudy: () => {
      console.log('[Keyboard] Exiting study session')
      goBackToDecks()
    },
    showAnswer,
    enabled: !sessionComplete && currentCard !== undefined,
    debugMode: true
  })

  const handleAnswer = async (difficulty: 'easy' | 'good' | 'hard' | 'again') => {
    if (!currentCard) return

    console.log(`\n=== CARD ${currentCardIndex + 1} ANSWER ===`)
    console.log(`Difficulty: ${difficulty}`)
    console.log(`Current stats BEFORE update:`, stats)

    // Calculate the new stats immediately
    // In spaced repetition: "again" = incorrect, "hard"/"good"/"easy" = correct
    const isIncorrect = difficulty === 'again'
    const newStats = isIncorrect
      ? { ...stats, incorrect: stats.incorrect + 1 }
      : { ...stats, correct: stats.correct + 1 }

    console.log(`Answer "${difficulty}" is ${isIncorrect ? 'INCORRECT' : 'CORRECT'}`)
    console.log(`Calculated new stats:`, newStats)
    console.log(`Expected: correct=${newStats.correct}, incorrect=${newStats.incorrect}`)

    // Force immediate state updates using flushSync to prevent batching issues
    flushSync(() => {
      // Update stats first to ensure they're displayed correctly
      setStats(newStats)
      console.log(`Stats updated to:`, newStats)
    })

    // Then handle card navigation for fast transitions
    const isLastCard = currentCardIndex >= studyCards.length - 1
    const nextCardIndex = currentCardIndex + 1
    
    if (!isLastCard) {
      flushSync(() => {
        // Fast UI updates - no blocking operations
        setCurrentCardIndex(nextCardIndex)
        setShowAnswer(false)
        console.log(`Card index: ${currentCardIndex} -> ${nextCardIndex}`)
      })
    }

    // Async operations that don't block UI
    const processCardUpdate = async () => {
      // Update card based on spaced repetition algorithm
      const now = new Date()
      let newInterval = currentCard.intervalDays
      let newEaseFactor = currentCard.easeFactor
      const newReviewCount = currentCard.reviewCount + 1

      // Simple SM-2 algorithm implementation
      switch (difficulty) {
        case 'again':
          newInterval = 1
          newEaseFactor = Math.max(1.3, currentCard.easeFactor - 0.2)
          break
        case 'hard':
          // For new cards (intervalDays = 0), start with 1 day
          if (currentCard.intervalDays === 0) {
            newInterval = 1
          } else {
            newInterval = Math.max(1, Math.round(currentCard.intervalDays * 1.2))
          }
          newEaseFactor = Math.max(1.3, currentCard.easeFactor - 0.15)
          break
        case 'good':
          // For new cards (intervalDays = 0), start with 1 day, then apply ease factor
          if (currentCard.intervalDays === 0) {
            newInterval = 1
          } else {
            newInterval = Math.round(currentCard.intervalDays * currentCard.easeFactor)
          }
          break
        case 'easy':
          // For new cards (intervalDays = 0), start with 4 days (easy boost)
          if (currentCard.intervalDays === 0) {
            newInterval = 4
          } else {
            newInterval = Math.round(currentCard.intervalDays * currentCard.easeFactor * 1.3)
          }
          newEaseFactor = currentCard.easeFactor + 0.15
          break
      }

      // Calculate next review date
      const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000)

      // Update the card (async, non-blocking)
      await updateCard(currentCard.id, {
        intervalDays: newInterval,
        easeFactor: newEaseFactor,
        reviewCount: newReviewCount,
        nextReview: nextReview.toISOString()
      })

      // Update session in store (async, non-blocking)
      if (deckId && !isLastCard) {
        console.log(`Store update - Stats being sent to store:`, newStats)
        console.log(`Store update - Card index being sent:`, nextCardIndex)
        updateStudySession(nextCardIndex, newStats)
      }
    }

    // Handle session completion
    if (isLastCard) {
      setSessionComplete(true)
      
      // Award XP for completing the study session
      const totalCardsStudied = stats.correct + stats.incorrect + 1 // +1 for current card
      const correctAnswers = newStats.correct
      
      // Calculate XP earned (same formula as in gamificationStore)
      const baseXP = totalCardsStudied // 1 XP per card studied
      const bonusXP = correctAnswers // 1 XP per correct answer
      const milestoneBonus = Math.floor(correctAnswers / 10) * 10 // 10 XP per 10 correct answers
      const totalXPEarned = baseXP + bonusXP + milestoneBonus
      
      console.log(`🎓 Study session completed! Awarding XP for ${totalCardsStudied} cards studied, ${correctAnswers} correct answers`)
      console.log(`🎉 XP Breakdown: ${baseXP} base + ${bonusXP} bonus + ${milestoneBonus} milestone = ${totalXPEarned} total`)
      
      setXpEarned(totalXPEarned)
      awardStudyXP(totalCardsStudied, correctAnswers)
    }

    // Process card update asynchronously without blocking UI
    processCardUpdate().catch(error => {
      console.error('Error processing card update:', error)
    })
  }

  const resetSession = () => {
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setSessionComplete(false)
    setStats({ total: studyCards.length, correct: 0, incorrect: 0 })
    setXpEarned(0)
    
    // Clear existing session and start fresh
    if (deckId) {
      clearStudySession()
      if (studyCards.length > 0) {
        startStudySession(deckId, studyCards)
      }
    }
  }

  const goBackToDecks = () => {
    // Don't clear session when exiting study - preserve it for resuming later
    navigate('/decks')
  }

  const clearSessionAndGoBack = () => {
    // Clear session when user explicitly wants to start fresh next time
    if (deckId) {
      clearStudySession()
    }
    navigate('/decks')
  }

  // If no deckId is provided, find the deck with the earliest review date
  useEffect(() => {
    if (!deckId && decks.length > 0) {
      // Find the deck with cards that have the earliest review date
      let earliestDeck = null
      let earliestDate = new Date('2099-12-31') // Far future date as default
      
      for (const deck of decks) {
        const deckCards = cards[deck.id] || []
        if (deckCards.length === 0) continue
        
        // Find cards that are due for review or new cards
        const dueCards = deckCards.filter(card => {
          if (card.reviewCount === 0) return true // New cards
          return new Date(card.nextReview) <= new Date() // Due cards
        })
        
        if (dueCards.length > 0) {
          // Find the earliest review date in this deck
          const deckEarliestDate = dueCards.reduce((earliest, card) => {
            const cardDate = card.reviewCount === 0 ? new Date(card.createdAt) : new Date(card.nextReview)
            return cardDate < earliest ? cardDate : earliest
          }, new Date('2099-12-31'))
          
          if (deckEarliestDate < earliestDate) {
            earliestDate = deckEarliestDate
            earliestDeck = deck
          }
        }
      }
      
      if (earliestDeck) {
        // Redirect to the deck with the earliest review date
        navigate(`/study/${earliestDeck.id}`, { replace: true })
        return
      }
    }
  }, [deckId, decks, cards, navigate])

  // If no deckId is provided and we're still here, show loading or no decks message
  if (!deckId) {
    if (decks.length === 0) {
      return (
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-4">No Decks Available</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have any decks to study yet. Create your first deck to get started!
          </p>
          <button onClick={goBackToDecks} className="btn btn-primary">
            Go to My Decks
          </button>
        </div>
      )
    }
    
    // Show loading while finding the best deck
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-4">Finding Your Next Study Session</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Looking for the deck with the most urgent cards to review...
        </p>
      </div>
    )
  }

  if (!deck || !studyCards) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Deck Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The deck you're trying to study doesn't exist.
        </p>
        <button onClick={goBackToDecks} className="btn btn-primary">
          Back to Decks
        </button>
      </div>
    )
  }

  if (studyCards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-bold mb-4">No Cards to Study</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This deck doesn't have any cards to study right now.
        </p>
        <button onClick={goBackToDecks} className="btn btn-primary">
          Back to Decks
        </button>
      </div>
    )
  }

  if (sessionComplete) {
    const totalAnswered = stats.correct + stats.incorrect
    const accuracy = totalAnswered > 0 ? Math.round((stats.correct / totalAnswered) * 100) : 0
    
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Session Complete!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Great job studying <strong>{deck.title}</strong>
        </p>
        
        <div className="card p-6 mb-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Session Stats</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cards Studied:</span>
              <span className="font-medium">{totalAnswered}</span>
            </div>
            <div className="flex justify-between">
              <span>Correct:</span>
              <span className="font-medium text-green-600">{stats.correct}</span>
            </div>
            <div className="flex justify-between">
              <span>Incorrect:</span>
              <span className="font-medium text-red-600">{stats.incorrect}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Accuracy:</span>
              <span className="font-medium">{accuracy}%</span>
            </div>
            {xpEarned > 0 && (
              <div className="flex justify-between border-t pt-2 bg-yellow-50 dark:bg-yellow-900/20 -mx-2 px-2 py-2 rounded">
                <span className="flex items-center gap-1">
                  <span>🎉</span>
                  <span className="font-medium">XP Earned:</span>
                </span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">+{xpEarned} XP</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-4 justify-center">
            <button onClick={resetSession} className="btn btn-primary">
              Study Again
            </button>
            <button onClick={goBackToDecks} className="btn btn-secondary">
              Back to Decks
            </button>
          </div>
          <button
            onClick={clearSessionAndGoBack}
            className="btn btn-outline btn-sm text-gray-500 hover:text-gray-700"
          >
            Clear Progress & Start Fresh Next Time
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{deck.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Card {currentCardIndex + 1} of {studyCards.length}
        </p>
        
        {/* Card State Indicator */}
        {currentCard && (
          <div className="flex justify-center mb-4">
            <CardStateIndicator
              card={currentCard}
              compact={true}
              className="shadow-sm"
            />
          </div>
        )}
        
        {deckId && getStudySession(deckId) && currentCardIndex > 0 && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4 flex items-center justify-center gap-2">
            <span>📍</span>
            Resumed from where you left off
          </p>
        )}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentCardIndex + 1) / studyCards.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="card p-8 mb-8 min-h-[300px] flex flex-col justify-center">
        {currentCard ? (
          <>
            <CardRenderer
              card={currentCard}
              showAnswer={showAnswer}
            />

            {!showAnswer ? (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAnswer(true)}
                  className="btn btn-primary btn-lg"
                >
                  Show Answer
                  <span className="ml-2 text-xs opacity-75">(Space/Enter)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleAnswer('again')}
                    className="btn bg-red-500 hover:bg-red-600 text-white py-3"
                  >
                    <div className="text-sm font-medium">Again</div>
                    <div className="text-xs opacity-80">&lt; 1 day</div>
                    <div className="text-xs opacity-60 mt-1">1 or A</div>
                  </button>
                  <button
                    onClick={() => handleAnswer('hard')}
                    className="btn bg-orange-500 hover:bg-orange-600 text-white py-3"
                  >
                    <div className="text-sm font-medium">Hard</div>
                    <div className="text-xs opacity-80">1-3 days</div>
                    <div className="text-xs opacity-60 mt-1">2 or H</div>
                  </button>
                  <button
                    onClick={() => handleAnswer('good')}
                    className="btn bg-green-500 hover:bg-green-600 text-white py-3"
                  >
                    <div className="text-sm font-medium">Good</div>
                    <div className="text-xs opacity-80">3-7 days</div>
                    <div className="text-xs opacity-60 mt-1">3 or G</div>
                  </button>
                  <button
                    onClick={() => handleAnswer('easy')}
                    className="btn bg-blue-500 hover:bg-blue-600 text-white py-3"
                  >
                    <div className="text-sm font-medium">Easy</div>
                    <div className="text-xs opacity-80">1+ weeks</div>
                    <div className="text-xs opacity-60 mt-1">4 or E</div>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-500">Loading card...</p>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <StudyShortcutsHelp
        showAnswer={showAnswer}
        compact={true}
        className="mb-4"
      />

      {/* Session Stats */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <div>
          Correct: <span className="text-green-600 font-medium">{stats.correct}</span> |
          Incorrect: <span className="text-red-600 font-medium">{stats.incorrect}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="btn btn-outline btn-sm"
            title="Toggle keyboard shortcuts help"
          >
            ⌨️
          </button>
          <button
            onClick={goBackToDecks}
            className="btn btn-secondary btn-sm"
          >
            Exit Study
          </button>
        </div>
      </div>

      {/* Detailed Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <StudyShortcutsHelp
              showAnswer={showAnswer}
              compact={false}
            />
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>💡 <strong>Tip:</strong> Use Space or Enter to flip cards, then 1-4 or A/H/G/E to answer!</p>
              <p>Press Esc or Q to exit the study session anytime.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyPage
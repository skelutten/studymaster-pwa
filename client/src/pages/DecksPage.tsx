import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeckStore } from '../stores/deckStore'
import { Deck, DeckSettings } from '../../../shared/types'
import CardManager from '../components/deck/CardManager'
import ProgressBar from '../components/ui/ProgressBar'
import { generateMapDeck, availableMaps } from '../utils/svgMapGenerator'

const DecksPage = () => {
  const navigate = useNavigate()
  const {
    decks,
    isLoading,
    error,
    importProgress,
    importStatus,
    createDeck,
    deleteDeck,
    loadExampleDecks,
    importAnkiDeck,
    importFromText,
    clearError,
    getCards,
    resetImportProgress,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addCard
  } = useDeckStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [managingDeckId, setManagingDeckId] = useState<string | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedMapType, setSelectedMapType] = useState<string>('')

  // Form states
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [newDeckDescription, setNewDeckDescription] = useState('')
  const [newDeckCategory, setNewDeckCategory] = useState('')
  const [importText, setImportText] = useState('')
  const [importSeparator, setImportSeparator] = useState('\t')

  const hasLoadedExampleDecks = useRef(false)

  useEffect(() => {
    // Load example decks if no decks exist and we haven't already loaded them
    // Add a small delay to allow Zustand to hydrate from localStorage first
    const timer = setTimeout(() => {
      if (decks.length === 0 && !hasLoadedExampleDecks.current) {
        hasLoadedExampleDecks.current = true
        loadExampleDecks()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [decks.length, loadExampleDecks])

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deck.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || deck.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(decks.map(deck => deck.category).filter(Boolean)))]

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDeck({
        userId: 'current-user',
        title: newDeckTitle,
        description: newDeckDescription,
        cardCount: 0,
        isPublic: false,
        settings: {
          newCardsPerDay: 20,
          maxReviewsPerDay: 100,
          easyBonus: 1.3,
          intervalModifier: 1.0,
          maximumInterval: 36500,
          minimumInterval: 1
        },
        category: newDeckCategory || 'general'
      })
      setShowCreateModal(false)
      setNewDeckTitle('')
      setNewDeckDescription('')
      setNewDeckCategory('')
    } catch (error) {
      console.error('Failed to create deck:', error)
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      try {
        await deleteDeck(deckId)
      } catch (error) {
        console.error('Failed to delete deck:', error)
      }
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (file.name.endsWith('.apkg') || file.name.endsWith('.txt')) {
        await importAnkiDeck(file)
      } else {
        // Try to import as text
        const text = await file.text()
        await importFromText(file.name.replace(/\.[^/.]+$/, ""), text, importSeparator)
      }
      setShowImportModal(false)
    } catch (error) {
      console.error('Failed to import file:', error)
      resetImportProgress()
    }
  }

  const handleTextImport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const deck = await importFromText('Imported Deck', importText, importSeparator)
      console.log('Successfully imported deck:', deck)
      setShowImportModal(false)
      setImportText('')
      // Clear any previous errors
      clearError()
    } catch (error) {
      console.error('Failed to import text:', error)
      // The error should already be set in the store by importFromText
    }
  }

  const getDeckStats = (deck: Deck) => {
    const cards = getCards(deck.id)
    const newCards = cards.filter(card => card.reviewCount === 0).length
    const reviewCards = cards.filter(card => card.reviewCount > 0 && new Date(card.nextReview) <= new Date()).length
    return { total: cards.length, new: newCards, review: reviewCards }
  }

  const handleStudyDeck = (deckId: string) => {
    navigate(`/study/${deckId}`)
  }

  const handleCreateMapDeck = async () => {
    if (!selectedMapType) return
    
    try {
      // Create wrapper function to match expected signature
      const createDeckWrapper = async (deckData: { userId: string; title: string; description: string; settings: DeckSettings; category?: string; isPublic: boolean; cardCount?: number }) => {
        // Convert DeckData to Deck format
        const deckInput = {
          userId: deckData.userId,
          title: deckData.title,
          description: deckData.description,
          settings: deckData.settings,
          category: deckData.category || 'geography',
          isPublic: deckData.isPublic,
          cardCount: deckData.cardCount || 0
        }
        const result = await createDeck(deckInput)
        // Convert back to DeckData format
        return {
          ...deckData,
          id: result.id
        }
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deck = await generateMapDeck(selectedMapType, createDeckWrapper as any)
      console.log(`Successfully created ${selectedMapType} map deck:`, deck)
      setShowMapModal(false)
      setSelectedMapType('')
    } catch (error) {
      console.error('Failed to create map deck:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Decks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your flashcard decks</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Deck
          </button>
          <button
            onClick={() => setShowMapModal(true)}
            className="btn btn-success"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map Deck
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={clearError}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : (category || '').charAt(0).toUpperCase() + (category || '').slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Decks Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map(deck => {
            const stats = getDeckStats(deck)
            return (
              <div key={deck.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {deck.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {deck.description}
                    </p>
                    {deck.category && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {deck.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete deck"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Cards</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">New</span>
                    <span className="font-medium text-blue-600">{stats.new}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Due for Review</span>
                    <span className="font-medium text-orange-600">{stats.review}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStudyDeck(deck.id)}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Study Now
                    </button>
                    <button
                      onClick={() => setManagingDeckId(deck.id)}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      Manage Cards
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDecks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || selectedCategory !== 'all' ? 'No decks found' : 'No decks yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first deck or import existing flashcards to get started'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Your First Deck
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn btn-secondary"
              >
                Import Existing Deck
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Deck</h2>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newDeckCategory}
                  onChange={(e) => setNewDeckCategory(e.target.value)}
                  placeholder="e.g., language, science, history"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Import Deck</h2>
            
            <div className="space-y-6">
              {/* File Import */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Import from File</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload an Anki deck (.apkg) or text file (.txt)
                </p>
                <input
                  type="file"
                  accept=".apkg,.txt,.csv"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isLoading}
                />
                
                {/* Progress Bar */}
                {(isLoading && importProgress > 0) && (
                  <div className="mt-4">
                    <ProgressBar
                      progress={importProgress}
                      label={importStatus || 'Importing...'}
                      className="mb-2"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Import from Text</h3>
                <form onSubmit={handleTextImport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Separator
                    </label>
                    <select
                      value={importSeparator}
                      onChange={(e) => setImportSeparator(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="\t">Tab</option>
                      <option value=",">Comma</option>
                      <option value=";">Semicolon</option>
                      <option value="|">Pipe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Text (Front{importSeparator}Back format)
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={`Example:\nHello${importSeparator}Hola\nGoodbye${importSeparator}Adiós`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!importText.trim() || isLoading}
                    className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Importing...' : 'Import Text'}
                  </button>
                  
                  {/* Progress Bar for Text Import */}
                  {(isLoading && importProgress > 0) && (
                    <div className="mt-4">
                      <ProgressBar
                        progress={importProgress}
                        label={importStatus || 'Importing...'}
                        className="mb-2"
                      />
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  resetImportProgress()
                }}
                disabled={isLoading}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Importing...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SVG Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Geography Deck</h2>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Interactive Geography Learning
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose a map type to create an interactive geography deck. Each card will show a highlighted region,
                  and you'll need to identify its name.
                </p>
              </div>

              {/* Map Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Map Type
                </label>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {availableMaps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMapType(map.id)}
                      className={`p-4 text-left border rounded-lg transition-colors ${
                        selectedMapType === map.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {map.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {map.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {map.regions.length} {map.regions.length === 1 ? 'region' : 'regions'}
                          </p>
                        </div>
                        <div className="text-2xl ml-4">
                          {map.emoji}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedMapType && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What you'll get:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• {availableMaps.find(m => m.id === selectedMapType)?.regions.length} interactive map cards</li>
                    <li>• Visual region highlighting</li>
                    <li>• Enhanced indicators for small regions</li>
                    <li>• Immediate feedback</li>
                    <li>• Spaced repetition learning</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMapModal(false)
                    setSelectedMapType('')
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMapDeck}
                  disabled={isLoading || !selectedMapType}
                  className="flex-1 btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : `Create ${selectedMapType ? availableMaps.find(m => m.id === selectedMapType)?.name : ''} Deck`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Manager Modal */}
      {managingDeckId && (
        <CardManager
          deckId={managingDeckId}
          onClose={() => setManagingDeckId(null)}
        />
      )}
    </div>
  )
}

export default DecksPage
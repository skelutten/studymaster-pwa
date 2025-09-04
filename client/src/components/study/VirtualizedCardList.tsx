/**
 * Virtualized Card List Component
 * Optimized for large collections of cards with media content
 */

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { SecureCardRenderer } from './SecureCardRenderer.optimized'
import { AnkiCard, AnkiModel, AnkiTemplate } from '../../../../shared/types/anki'
import { usePerformanceMonitoring, useMemoryMonitoring } from '../../utils/performanceMonitoring'

interface VirtualizedCardListProps {
  cards: AnkiCard[]
  models: Record<string, AnkiModel>
  templates: Record<string, AnkiTemplate>
  deckId: string
  itemHeight?: number
  overscanCount?: number
  className?: string
  enablePerformanceMonitoring?: boolean
  onCardClick?: (card: AnkiCard) => void
  loadMoreCards?: () => Promise<void>
  hasNextPage?: boolean
  isLoadingMore?: boolean
}

interface CardItemProps {
  index: number
  style: React.CSSProperties
  data: {
    cards: AnkiCard[]
    models: Record<string, AnkiModel>
    templates: Record<string, AnkiTemplate>
    deckId: string
    onCardClick?: (card: AnkiCard) => void
    enablePerformanceMonitoring: boolean
  }
}

// Memoized card item component to prevent unnecessary re-renders
const CardItem = memo<CardItemProps>(({ index, style, data }) => {
  const { cards, models, templates, deckId, onCardClick, enablePerformanceMonitoring } = data
  const card = cards[index]
  const { trackRender } = usePerformanceMonitoring('CardItem')

  // Handle missing card gracefully
  if (!card) {
    return (
      <div style={style} className="p-4 border-b border-gray-200">
        <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
      </div>
    )
  }

  const model = models[card.templateId] || models[Object.keys(models)[0]]
  const template = templates[card.templateId] || templates[Object.keys(templates)[0]]

  if (!model || !template) {
    return (
      <div style={style} className="p-4 border-b border-gray-200">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Missing model or template for card {card.id}
        </div>
      </div>
    )
  }

  const handleCardClick = useCallback(() => {
    if (onCardClick) {
      onCardClick(card)
    }
  }, [card, onCardClick])

  const handleRenderComplete = useCallback(() => {
    if (enablePerformanceMonitoring) {
      trackRender('update', performance.now(), ['renderComplete'])
    }
  }, [enablePerformanceMonitoring, trackRender])

  return (
    <div 
      style={style} 
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-2">
          Card {index + 1} • {model.name}
        </div>
        
        {/* Only render card preview, not full interactive card */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <SecureCardRenderer
            model={model}
            template={template}
            fieldData={card.fields}
            renderMode="question"
            deckId={deckId}
            maxHeight={150} // Limit height for list view
            timeout={2000} // Shorter timeout for list items
            enablePerformanceMonitoring={enablePerformanceMonitoring}
            onRenderComplete={handleRenderComplete}
            onRenderError={(error) => console.warn(`Card ${card.id} render error:`, error)}
            className="card-preview"
          />
        </div>
        
        {/* Card metadata */}
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>Tags: {card.tags.join(', ') || 'None'}</span>
          <span>Fields: {Object.keys(card.fields).length}</span>
        </div>
      </div>
    </div>
  )
})

CardItem.displayName = 'CardItem'

// Main virtualized list component
export const VirtualizedCardList: React.FC<VirtualizedCardListProps> = memo(({
  cards,
  models,
  templates,
  deckId,
  itemHeight = 220,
  overscanCount = 3,
  className = '',
  enablePerformanceMonitoring = false,
  onCardClick,
  loadMoreCards,
  hasNextPage = false,
  isLoadingMore = false
}) => {
  const listRef = useRef<List>(null)
  const { trackRender } = usePerformanceMonitoring('VirtualizedCardList')
  
  // Memory monitoring for large lists
  useMemoryMonitoring('VirtualizedCardList')

  // Memoized item data to prevent unnecessary child re-renders
  const itemData = useMemo(() => ({
    cards,
    models,
    templates,
    deckId,
    onCardClick,
    enablePerformanceMonitoring
  }), [cards, models, templates, deckId, onCardClick, enablePerformanceMonitoring])

  // Total item count including loading placeholder
  const itemCount = hasNextPage ? cards.length + 1 : cards.length

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return index < cards.length
  }, [cards.length])

  // Load more items when needed
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (!loadMoreCards || isLoadingMore) return
    
    const startTime = performance.now()
    
    try {
      await loadMoreCards()
      
      if (enablePerformanceMonitoring) {
        const loadTime = performance.now() - startTime
        trackRender('update', loadTime, ['loadMoreCards'])
      }
    } catch (error) {
      console.error('Failed to load more cards:', error)
    }
  }, [loadMoreCards, isLoadingMore, enablePerformanceMonitoring, trackRender])

  // Performance profiler callback
  const onRenderProfiler = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (!enablePerformanceMonitoring) return

    trackRender(phase, actualDuration, ['cardsCount', 'itemHeight', 'overscanCount'])

    if (actualDuration > 16) {
      console.warn('[VIRTUALIZED_LIST] Slow render detected', {
        phase,
        actualDuration: Math.round(actualDuration),
        cardsCount: cards.length,
        itemHeight,
        overscanCount
      })
    }
  }, [enablePerformanceMonitoring, trackRender, cards.length, itemHeight, overscanCount])

  // Scroll to top when deck changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start')
    }
  }, [deckId])

  // Memoized list height calculation
  const listHeight = useMemo(() => {
    return Math.min(600, window.innerHeight * 0.6)
  }, [])

  const content = (
    <div className={`virtualized-card-list ${className}`}>
      {cards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No cards available in this deck
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b">
            {cards.length} cards {isLoadingMore && '(loading more...)'}
          </div>
          
          {hasNextPage ? (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={itemCount}
              loadMoreItems={loadMoreItems}
              threshold={5} // Load more when 5 items from the end
            >
              {({ onItemsRendered, ref }) => (
                <List
                  ref={(list) => {
                    listRef.current = list
                    ref(list)
                  }}
                  height={listHeight}
                  itemCount={itemCount}
                  itemSize={itemHeight}
                  itemData={itemData}
                  onItemsRendered={onItemsRendered}
                  overscanCount={overscanCount}
                  className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  {CardItem}
                </List>
              )}
            </InfiniteLoader>
          ) : (
            <List
              ref={listRef}
              height={listHeight}
              itemCount={cards.length}
              itemSize={itemHeight}
              itemData={itemData}
              overscanCount={overscanCount}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {CardItem}
            </List>
          )}
        </div>
      )}
      
      {/* Performance metrics in development */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="font-semibold text-blue-800 mb-2">Virtualization Stats</div>
          <div className="text-blue-700 space-y-1">
            <div>Total Cards: {cards.length}</div>
            <div>Rendered Items: {Math.ceil(listHeight / itemHeight) + overscanCount * 2}</div>
            <div>Memory Efficiency: {Math.round((Math.ceil(listHeight / itemHeight) + overscanCount * 2) / cards.length * 100)}% DOM usage</div>
            <div>Item Height: {itemHeight}px</div>
            <div>Overscan: {overscanCount} items</div>
          </div>
        </div>
      )}
    </div>
  )

  // Wrap with performance profiler if monitoring is enabled
  if (enablePerformanceMonitoring) {
    return (
      <React.Profiler id="VirtualizedCardList" onRender={onRenderProfiler}>
        {content}
      </React.Profiler>
    )
  }

  return content
})

VirtualizedCardList.displayName = 'VirtualizedCardList'

// Export for use in study pages
export default VirtualizedCardList

// Hook for optimized card list management
export const useCardListOptimization = (cards: AnkiCard[]) => {
  const { trackRender } = usePerformanceMonitoring('CardListManager')
  
  // Group cards by template for better rendering performance
  const cardsByTemplate = useMemo(() => {
    const startTime = performance.now()
    
    const grouped = cards.reduce((acc, card) => {
      if (!acc[card.templateId]) {
        acc[card.templateId] = []
      }
      acc[card.templateId].push(card)
      return acc
    }, {} as Record<string, AnkiCard[]>)
    
    const processingTime = performance.now() - startTime
    trackRender('update', processingTime, ['cardGrouping'])
    
    return grouped
  }, [cards, trackRender])

  // Calculate optimal item height based on content
  const optimizedItemHeight = useMemo(() => {
    if (cards.length === 0) return 220

    // Sample first few cards to estimate average height
    const sampleSize = Math.min(5, cards.length)
    const avgFieldLength = cards.slice(0, sampleSize).reduce((acc, card) => {
      const totalChars = Object.values(card.fields).join('').length
      return acc + totalChars
    }, 0) / sampleSize

    // Estimate height based on content length
    if (avgFieldLength > 500) return 280      // Large content
    if (avgFieldLength > 200) return 240      // Medium content
    return 200                                 // Small content
  }, [cards])

  // Preload next batch of cards
  const preloadNextBatch = useCallback(async (startIndex: number, count: number) => {
    const cardsToPreload = cards.slice(startIndex, startIndex + count)
    
    // Preload media for visible cards
    const preloadPromises = cardsToPreload.map(async (card) => {
      // Check if card has media references
      const hasMedia = Object.values(card.fields).some(field => 
        typeof field === 'string' && (
          field.includes('.jpg') || 
          field.includes('.png') || 
          field.includes('[sound:')
        )
      )

      if (hasMedia) {
        // Trigger media preload (implementation depends on MediaContextService)
        console.debug('Preloading media for card:', card.id)
      }
    })

    await Promise.allSettled(preloadPromises)
  }, [cards])

  return {
    cardsByTemplate,
    optimizedItemHeight,
    preloadNextBatch
  }
}
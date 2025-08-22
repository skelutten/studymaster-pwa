import { describe, it, expect } from 'vitest'
import { createNewCard, createSvgMapCard } from '../cardDefaults'
import { Card, SvgMapCardOptions } from '../../../../shared/types'

describe('cardDefaults', () => {
  describe('createNewCard', () => {
    it('should create a new card with basic required fields', () => {
      const card = createNewCard('What is the capital of France?', 'Paris')

      expect(card.frontContent).toBe('What is the capital of France?')
      expect(card.backContent).toBe('Paris')
    })

    it('should set correct default card type', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.cardType).toEqual({ type: 'basic' })
    })

    it('should initialize empty media references', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.mediaRefs).toEqual([])
    })

    it('should set correct enhanced Anki-style field defaults', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.state).toBe('new')
      expect(card.queue).toBe(0)
      expect(card.due).toBe(0)
      expect(card.ivl).toBe(0)
      expect(card.factor).toBe(2500) // 250% as integer
      expect(card.reps).toBe(0)
      expect(card.lapses).toBe(0)
      expect(card.left).toBe(0)
    })

    it('should set correct learning state defaults', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.learningStep).toBe(0)
      expect(card.graduationInterval).toBe(1)
      expect(card.easyInterval).toBe(4)
    })

    it('should initialize timing and performance fields', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.totalStudyTime).toBe(0)
      expect(card.averageAnswerTime).toBe(0)
    })

    it('should initialize metadata fields', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.flags).toBe(0)
      expect(card.originalDue).toBe(0)
      expect(card.originalDeck).toBe('')
    })

    it('should initialize gamification fields', () => {
      const card = createNewCard('Front', 'Back')

      expect(card.xpAwarded).toBe(0)
      expect(card.difficultyRating).toBe(3)
    })

    it('should handle empty content gracefully', () => {
      const card = createNewCard('', '')

      expect(card.frontContent).toBe('')
      expect(card.backContent).toBe('')
    })

    it('should handle special characters in content', () => {
      const card = createNewCard(
        'What is 2 + 2? <b>Bold</b> & "quotes"',
        '4 → Four (四) ñ ü ß'
      )

      expect(card.frontContent).toBe('What is 2 + 2? <b>Bold</b> & "quotes"')
      expect(card.backContent).toBe('4 → Four (四) ñ ü ß')
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000)
      const card = createNewCard(longContent, longContent)

      expect(card.frontContent).toBe(longContent)
      expect(card.backContent).toBe(longContent)
      expect(card.frontContent.length).toBe(10000)
    })

    it('should accept custom card type', () => {
      const customCardType = { type: 'cloze' as const }
      const card = createNewCard('Front', 'Back', customCardType)

      expect(card.cardType).toEqual(customCardType)
    })

    it('should accept custom media references', () => {
      const mediaRefs = [
        {
          id: 'media-1',
          type: 'image' as const,
          url: '/images/test.jpg',
          filename: 'test.jpg',
          size: 1024
        }
      ]
      const card = createNewCard('Front', 'Back', { type: 'basic' }, mediaRefs)

      expect(card.mediaRefs).toEqual(mediaRefs)
    })
  })

  describe('createSvgMapCard', () => {
    const mockSvgOptions: SvgMapCardOptions = {
      mapId: 'europe',
      countryId: 'FR',
      countryName: 'France',
      svgPath: '/maps/europe.svg'
    }

    it('should create an SVG map card with correct card type', () => {
      const card = createSvgMapCard(
        'card-123',
        'geography-deck-456',
        'Where is France?',
        'France',
        { type: 'svg_map', options: mockSvgOptions }
      )

      expect(card.cardType).toEqual({
        type: 'svg_map',
        options: mockSvgOptions
      })
    })

    it('should inherit all basic card properties', () => {
      const card = createSvgMapCard(
        'card-123',
        'geography-deck-456',
        'Where is France?',
        'France',
        { type: 'svg_map', options: mockSvgOptions }
      )

      expect(card.id).toBe('card-123')
      expect(card.deckId).toBe('geography-deck-456')
      expect(card.frontContent).toBe('Where is France?')
      expect(card.backContent).toBe('France')
      expect(card.state).toBe('new')
      expect(card.queue).toBe(0)
    })

    it('should set legacy fields correctly', () => {
      const card = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        { type: 'svg_map', options: mockSvgOptions }
      )

      expect(card.easeFactor).toBe(2.5)
      expect(card.intervalDays).toBe(0)
      expect(card.reviewCount).toBe(0)
      expect(card.lapseCount).toBe(0)
      expect(card.nextReview).toBeDefined()
      expect(card.createdAt).toBeDefined()
    })

    it('should create valid ISO date strings', () => {
      const card = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        { type: 'svg_map', options: mockSvgOptions }
      )

      expect(() => new Date(card.nextReview)).not.toThrow()
      expect(() => new Date(card.createdAt)).not.toThrow()
      
      const nextReviewDate = new Date(card.nextReview)
      const createdAtDate = new Date(card.createdAt)
      
      expect(nextReviewDate.getTime()).not.toBeNaN()
      expect(createdAtDate.getTime()).not.toBeNaN()
    })

    it('should set originalDeck to deckId', () => {
      const card = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        { type: 'svg_map', options: mockSvgOptions }
      )

      expect(card.originalDeck).toBe('deck-456')
    })

    it('should handle different map configurations', () => {
      const asiaOptions: SvgMapCardOptions = {
        mapId: 'asia',
        countryId: 'JP',
        countryName: 'Japan',
        svgPath: '/maps/asia.svg'
      }

      const card = createSvgMapCard(
        'card-jp',
        'asia-deck',
        'Where is Japan?',
        'Japan',
        { type: 'svg_map', options: asiaOptions }
      )

      expect(card.cardType.type).toBe('svg_map')
      expect(card.cardType.options?.mapId).toBe('asia')
      expect(card.cardType.options?.countryId).toBe('JP')
      expect(card.cardType.options?.countryName).toBe('Japan')
      expect(card.cardType.options?.svgPath).toBe('/maps/asia.svg')
    })

    it('should handle special characters in country names', () => {
      const specialOptions: SvgMapCardOptions = {
        mapId: 'europe',
        countryId: 'DE',
        countryName: 'Deutschland (Allemagne)',
        svgPath: '/maps/europe.svg'
      }

      const card = createSvgMapCard(
        'card-de',
        'europe-deck',
        'Front',
        'Back',
        { type: 'svg_map', options: specialOptions }
      )

      expect(card.cardType.options?.countryName).toBe('Deutschland (Allemagne)')
    })

    it('should maintain all default card properties from createNewCard', () => {
      const card = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        { type: 'svg_map', options: mockSvgOptions }
      )

      // Check that all the default properties are still present
      expect(card.factor).toBe(2500)
      expect(card.reps).toBe(0)
      expect(card.lapses).toBe(0)
      expect(card.learningStep).toBe(0)
      expect(card.graduationInterval).toBe(1)
      expect(card.easyInterval).toBe(4)
      expect(card.totalStudyTime).toBe(0)
      expect(card.averageAnswerTime).toBe(0)
      expect(card.flags).toBe(0)
      expect(card.xpAwarded).toBe(0)
      expect(card.difficultyRating).toBe(3)
      expect(card.mediaRefs).toEqual([])
    })

    it('should handle custom media references', () => {
      const mediaRefs = [
        {
          id: 'media-1',
          type: 'image' as const,
          url: '/images/france.jpg',
          filename: 'france.jpg',
          size: 2048
        }
      ]

      const card = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        { type: 'svg_map', options: mockSvgOptions },
        mediaRefs
      )

      expect(card.mediaRefs).toEqual(mediaRefs)
    })
  })

  describe('integration and edge cases', () => {
    it('should create cards with consistent structure', () => {
      const basicCard = createNewCard('Front', 'Back')

      const svgCard = createSvgMapCard(
        'card-123',
        'deck-456',
        'Front',
        'Back',
        {
          type: 'svg_map',
          options: {
            mapId: 'test',
            countryId: 'TEST',
            countryName: 'Test Country',
            svgPath: '/test.svg'
          }
        }
      )

      // Both should have the same base structure from createNewCard
      expect(basicCard.state).toBe(svgCard.state)
      expect(basicCard.queue).toBe(svgCard.queue)
      expect(basicCard.factor).toBe(svgCard.factor)
      expect(basicCard.learningStep).toBe(svgCard.learningStep)
    })

    it('should handle edge case values gracefully', () => {
      // Test with minimal values
      expect(() => createNewCard('', '')).not.toThrow()
      
      expect(() => createSvgMapCard(
        '',
        '',
        '',
        '',
        { type: 'svg_map', options: { mapId: '', countryId: '', countryName: '', svgPath: '' } }
      )).not.toThrow()
    })

    it('should create cards that match the expected interface', () => {
      const card = createSvgMapCard(
        'test-id',
        'test-deck',
        'Test front',
        'Test back',
        { type: 'basic' }
      )

      // Verify all required Card interface properties are present
      const requiredProperties: (keyof Card)[] = [
        'id', 'deckId', 'frontContent', 'backContent', 'cardType', 'mediaRefs',
        'easeFactor', 'intervalDays', 'nextReview', 'createdAt', 'reviewCount', 'lapseCount',
        'state', 'queue', 'due', 'ivl', 'factor', 'reps', 'lapses', 'left',
        'learningStep', 'graduationInterval', 'easyInterval',
        'totalStudyTime', 'averageAnswerTime',
        'flags', 'originalDue', 'originalDeck',
        'xpAwarded', 'difficultyRating'
      ]

      requiredProperties.forEach(prop => {
        expect(card).toHaveProperty(prop)
        expect(card[prop]).toBeDefined()
      })
    })
  })
})
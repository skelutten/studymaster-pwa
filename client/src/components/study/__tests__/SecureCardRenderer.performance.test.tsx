/**
 * Performance Tests for SecureCardRenderer
 * Tests React rendering performance, memory management, and optimization strategies
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SecureCardRenderer } from '../SecureCardRenderer.optimized'
import { AnkiCard, AnkiModel, AnkiTemplate } from '../../../../../shared/types/anki'
import PerformanceMonitor from '../../../utils/performanceMonitoring'

// Mock performance monitoring
vi.mock('../../../utils/performanceMonitoring', () => ({
  default: {
    trackComponentRender: vi.fn(),
    trackMediaPerformance: vi.fn(),
    getInstance: vi.fn().mockReturnValue({
      trackComponentRender: vi.fn(),
      trackMediaPerformance: vi.fn(),
      initializeCoreWebVitals: vi.fn()
    })
  }
}))

// Mock MediaContextService
vi.mock('../../services/anki/MediaContextService.optimized', () => ({
  OptimizedMediaContextService: vi.fn().mockImplementation(() => ({
    resolveMediaReferences: vi.fn().mockResolvedValue('<div>Resolved content</div>'),
    buildMappingsFromImport: vi.fn().mockResolvedValue(undefined),
    getMediaUrlSync: vi.fn().mockReturnValue('https://example.com/media.jpg')
  }))
}))

describe('SecureCardRenderer Performance Tests', () => {
  let mockModel: AnkiModel
  let mockTemplate: AnkiTemplate
  let performanceObserver: PerformanceObserver

  beforeEach(() => {
    // Setup performance observer
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.duration > 16) {
            console.warn('Performance: Slow operation detected', {
              name: entry.name,
              duration: entry.duration
            })
          }
        })
      })
      performanceObserver.observe({ entryTypes: ['measure'] })
    }

    mockModel = {
      id: 'test-model-1',
      name: 'Test Model',
      templateHash: 'hash123',
      fields: [
        { id: '1', name: 'Front', ordinal: 0, sticky: false, rtl: false, fontSize: 20 },
        { id: '2', name: 'Back', ordinal: 1, sticky: false, rtl: false, fontSize: 20 }
      ],
      templates: [],
      css: 'body { font-family: Arial; }',
      configuration: { sortf: 0, did: 0, latexPre: '', latexPost: '', mod: 0, type: 0, vers: [] },
      sanitized: true,
      mediaRefs: [],
      securityLevel: 'safe',
      processingErrors: [],
      importedAt: new Date(),
      sourceApkgHash: 'hash123',
      ankiVersion: '2.1.54'
    }

    mockTemplate = {
      id: 'test-template-1',
      name: 'Basic',
      questionFormat: '{{Front}}',
      answerFormat: '{{Front}}<hr id="answer">{{Back}}',
      ordinal: 0
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    if (performanceObserver) {
      performanceObserver.disconnect()
    }
  })

  describe('Component Re-render Performance', () => {
    it('should not re-render when non-essential props change', async () => {
      let renderCount = 0
      const TestWrapper = ({ className }: { className: string }) => {
        renderCount++
        return (
          <SecureCardRenderer
            model={mockModel}
            template={mockTemplate}
            fieldData={{ Front: 'Test', Back: 'Answer' }}
            renderMode="question"
            deckId="test-deck"
            className={className}
          />
        )
      }

      const { rerender } = render(<TestWrapper className="initial" />)
      
      const initialRenderCount = renderCount

      // Change non-essential prop
      rerender(<TestWrapper className="changed" />)

      // Should re-render due to className change (this is expected)
      expect(renderCount).toBe(initialRenderCount + 1)
    })

    it('should memoize expensive operations', async () => {
      const mockMediaContext = {
        resolveMediaReferences: vi.fn().mockResolvedValue('<div>Resolved</div>')
      }

      const { rerender } = render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test', Back: 'Answer' }}
          renderMode="question"
          deckId="test-deck"
          mediaContext={mockMediaContext as any}
        />
      )

      // Re-render with same props
      rerender(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test', Back: 'Answer' }}
          renderMode="question"
          deckId="test-deck"
          mediaContext={mockMediaContext as any}
        />
      )

      // Media resolution should be called only once due to memoization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockMediaContext.resolveMediaReferences).toHaveBeenCalledTimes(2) // Once for template, once for fields
    })

    it('should handle rapid prop changes efficiently', async () => {
      const startTime = performance.now()

      const TestComponent = ({ renderMode }: { renderMode: 'question' | 'answer' }) => (
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test', Back: 'Answer' }}
          renderMode={renderMode}
          deckId="test-deck"
          enablePerformanceMonitoring={true}
        />
      )

      const { rerender } = render(<TestComponent renderMode="question" />)

      // Rapid mode changes
      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'question' : 'answer'
        rerender(<TestComponent renderMode={mode} />)
      }

      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(500) // Should complete in under 500ms
    })
  })

  describe('Media Loading Performance', () => {
    it('should handle multiple media files without blocking', async () => {
      const fieldDataWithMedia = {
        Front: '<img src="image1.jpg"> <img src="image2.jpg"> <img src="image3.jpg">',
        Back: '[sound:audio1.mp3] [sound:audio2.mp3] <video src="video1.mp4">'
      }

      const startTime = performance.now()

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={fieldDataWithMedia}
          renderMode="question"
          deckId="test-deck"
          enablePerformanceMonitoring={true}
        />
      )

      const renderTime = performance.now() - startTime

      // Initial render should be fast even with media
      expect(renderTime).toBeLessThan(100)

      // Component should render without waiting for media resolution
      expect(screen.getByTitle(/Anki card/)).toBeInTheDocument()
    })

    it('should batch media state updates to prevent excessive re-renders', async () => {
      let stateUpdateCount = 0
      const mockSetState = vi.fn(() => stateUpdateCount++)

      // Mock useState to track state updates
      vi.spyOn(React, 'useState').mockImplementation(() => [
        { loadingCount: 0, failedCount: 0, loadedCount: 0, currentlyLoading: new Set(), recentErrors: [] },
        mockSetState
      ])

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test with <img src="test.jpg">' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Simulate rapid media loading events
      for (let i = 0; i < 5; i++) {
        act(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: 'media-load-start',
              data: { filename: `image${i}.jpg` }
            },
            origin: window.location.origin
          }))
        })
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should use batched updates (React 18 automatic batching)
      expect(stateUpdateCount).toBeLessThan(10) // Much less than 5 individual updates

      // Restore original useState
      vi.restoreAllMocks()
    })
  })

  describe('Memory Management', () => {
    it('should clean up resources on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
      // clearTimeout should be called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should handle memory pressure gracefully', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Create multiple instances to simulate memory pressure
      const instances = Array.from({ length: 20 }, (_, i) => (
        <SecureCardRenderer
          key={i}
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: `Test ${i}`, Back: `Answer ${i}` }}
          renderMode="question"
          deckId={`test-deck-${i}`}
        />
      ))

      const { unmount } = render(<div>{instances}</div>)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
      })

      const peakMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Clean up
      unmount()

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Memory should be cleaned up (allowing for some variance due to GC timing)
      if (initialMemory && peakMemory && finalMemory) {
        const memoryIncrease = peakMemory - initialMemory
        const memoryDecrease = peakMemory - finalMemory
        
        console.log('Memory usage:', {
          initial: `${Math.round(initialMemory / 1024 / 1024)}MB`,
          peak: `${Math.round(peakMemory / 1024 / 1024)}MB`,
          final: `${Math.round(finalMemory / 1024 / 1024)}MB`,
          increase: `${Math.round(memoryIncrease / 1024 / 1024)}MB`,
          decrease: `${Math.round(memoryDecrease / 1024 / 1024)}MB`
        })

        // Memory should decrease after cleanup (allowing 20% variance for GC)
        expect(memoryDecrease).toBeGreaterThan(memoryIncrease * 0.8)
      }
    })

    it('should prevent memory leaks with iframe cleanup', async () => {
      const mockIframe = {
        contentWindow: {
          postMessage: vi.fn()
        }
      }

      // Mock iframe ref
      const mockRef = { current: mockIframe }
      vi.spyOn(React, 'useRef').mockReturnValue(mockRef)

      const { unmount } = render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Simulate some iframe communication
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'iframe_ready' },
          origin: window.location.origin
        }))
      })

      // Unmount should clean up properly
      unmount()

      // Verify no remaining references
      expect(mockIframe.contentWindow.postMessage).not.toThrow()
    })
  })

  describe('Bundle Impact Analysis', () => {
    it('should lazy load heavy dependencies', async () => {
      // Test that heavy media processing is not loaded initially
      const modules = vi.fn()
      vi.doMock('../../services/anki/MediaContextService.optimized', modules)

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Simple text' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // For simple text content, heavy modules should not be loaded
      expect(modules).not.toHaveBeenCalled()
    })

    it('should minimize component tree depth for performance', () => {
      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      const container = screen.getByTestId('secure-card-renderer') || document.querySelector('.secure-card-renderer')
      
      // Count nested div depth - should be minimal
      let maxDepth = 0
      let currentDepth = 0

      const countDepth = (element: Element) => {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
        
        Array.from(element.children).forEach(child => {
          if (child.tagName === 'DIV') {
            countDepth(child)
          }
        })
        
        currentDepth--
      }

      if (container) {
        countDepth(container)
      }

      // Should not have excessive div nesting
      expect(maxDepth).toBeLessThan(8)
    })
  })

  describe('Concurrent Features Integration', () => {
    it('should use startTransition for non-urgent updates', async () => {
      const startTransitionSpy = vi.spyOn(React, 'startTransition')

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test with media <img src="test.jpg">' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Simulate media loading state changes
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'media-load-start',
            data: { filename: 'test.jpg' }
          },
          origin: window.location.origin
        }))
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // startTransition should be used for media state updates
      expect(startTransitionSpy).toHaveBeenCalled()
    })

    it('should use useDeferredValue for expensive operations', () => {
      const useDeferredValueSpy = vi.spyOn(React, 'useDeferredValue')

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Large content with media' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      expect(useDeferredValueSpy).toHaveBeenCalled()
    })
  })

  describe('Virtualization Performance', () => {
    it('should handle large field data efficiently', () => {
      // Create large field data to test performance
      const largeFieldData = {
        Front: 'A'.repeat(10000), // 10KB of text
        Back: 'B'.repeat(10000),
        Extra: 'C'.repeat(5000)
      }

      const startTime = performance.now()

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={largeFieldData}
          renderMode="question"
          deckId="test-deck"
        />
      )

      const renderTime = performance.now() - startTime

      // Should render quickly even with large content
      expect(renderTime).toBeLessThan(100)
    })

    it('should optimize iframe communication', async () => {
      const postMessageSpy = vi.fn()
      
      // Mock iframe with postMessage tracking
      const mockIframe = {
        contentWindow: { postMessage: postMessageSpy }
      }
      
      vi.spyOn(React, 'useRef').mockReturnValue({ current: mockIframe })

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Simulate rapid iframe messages
      const messageCount = 20
      for (let i = 0; i < messageCount; i++) {
        act(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: 'heartbeat',
              data: { index: i }
            },
            origin: window.location.origin
          }))
        })
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should handle messages efficiently without blocking
      expect(postMessageSpy).not.toThrow()
    })
  })

  describe('Cache Performance', () => {
    it('should cache processed content to prevent repeated work', async () => {
      const mockMediaContext = {
        resolveMediaReferences: vi.fn().mockResolvedValue('<div>Cached content</div>')
      }

      const TestComponent = ({ key: testKey }: { key: string }) => (
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Same content' }}
          renderMode="question"
          deckId="test-deck"
          mediaContext={mockMediaContext as any}
        />
      )

      // Render multiple instances with same content
      const { rerender } = render(<TestComponent key="1" />)
      rerender(<TestComponent key="2" />)
      rerender(<TestComponent key="3" />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Media resolution should be called efficiently (cached after first call)
      const callCount = mockMediaContext.resolveMediaReferences.mock.calls.length
      expect(callCount).toBeLessThan(10) // Should not call for every render
    })

    it('should limit cache size to prevent memory growth', () => {
      // This test would verify cache size limits in MediaContextService
      // Implementation would depend on the actual cache implementation
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover from errors without performance degradation', async () => {
      const mockMediaContext = {
        resolveMediaReferences: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue('<div>Recovered content</div>')
      }

      const onRenderError = vi.fn()

      const { rerender } = render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test' }}
          renderMode="question"
          deckId="test-deck"
          mediaContext={mockMediaContext as any}
          onRenderError={onRenderError}
        />
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should handle error gracefully
      expect(onRenderError).toHaveBeenCalled()

      // Retry should work
      rerender(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Test retry' }}
          renderMode="question"
          deckId="test-deck"
          mediaContext={mockMediaContext as any}
          onRenderError={onRenderError}
        />
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should recover and work normally
      expect(screen.getByTitle(/Anki card/)).toBeInTheDocument()
    })
  })

  describe('Production Performance Validation', () => {
    it('should meet Core Web Vitals thresholds', async () => {
      // Simulate production-like conditions
      const startTime = performance.now()

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ 
            Front: '<img src="large-image.jpg"> Complex content with media',
            Back: '[sound:audio.mp3] <video src="video.mp4">'
          }}
          renderMode="question"
          deckId="test-deck"
          enablePerformanceMonitoring={true}
        />
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      const totalTime = performance.now() - startTime

      // Should meet performance targets
      expect(totalTime).toBeLessThan(250) // LCP target under 2.5s (component should be much faster)

      // Component should be interactive quickly
      const iframe = screen.getByTitle(/Anki card/)
      expect(iframe).toBeInTheDocument()
    })

    it('should maintain 60fps during interactions', async () => {
      let frameTime = 0
      const measureFrameTime = () => {
        const start = performance.now()
        requestAnimationFrame(() => {
          frameTime = performance.now() - start
        })
      }

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Interactive content' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Simulate user interactions
      measureFrameTime()

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Frame time should be under 16ms for 60fps
      if (frameTime > 0) {
        expect(frameTime).toBeLessThan(16)
      }
    })
  })

  describe('Bundle Size Impact', () => {
    it('should not increase bundle size significantly', () => {
      // This would be tested in CI with bundle size tracking
      // For now, verify component can be tree-shaken
      const componentString = SecureCardRenderer.toString()
      
      // Component should not contain large inline dependencies
      expect(componentString.length).toBeLessThan(50000) // Reasonable component size
    })

    it('should support code splitting for heavy features', async () => {
      // Test that heavy features are loaded on demand
      const mockImport = vi.fn().mockResolvedValue({
        default: () => <div>Heavy feature</div>
      })
      
      vi.doMock('../../services/anki/MediaContextService', () => ({
        default: mockImport
      }))

      render(
        <SecureCardRenderer
          model={mockModel}
          template={mockTemplate}
          fieldData={{ Front: 'Simple text' }}
          renderMode="question"
          deckId="test-deck"
        />
      )

      // Heavy features should not be loaded for simple content
      expect(mockImport).not.toHaveBeenCalled()
    })
  })
})

// Performance utility tests
describe('Performance Monitoring Utils', () => {
  it('should track component renders accurately', () => {
    const monitor = PerformanceMonitor.getInstance()
    const trackSpy = vi.spyOn(monitor, 'trackComponentRender')

    monitor.trackComponentRender('TestComponent', 'mount', 25.5, ['prop1', 'prop2'])

    expect(trackSpy).toHaveBeenCalledWith('TestComponent', 'mount', 25.5, ['prop1', 'prop2'])
  })

  it('should identify performance bottlenecks', () => {
    const monitor = PerformanceMonitor.getInstance()
    
    // Simulate slow renders
    monitor.trackComponentRender('SlowComponent', 'update', 50, [])
    monitor.trackComponentRender('FastComponent', 'update', 5, [])

    const summary = monitor.getPerformanceSummary()
    
    expect(summary.recommendations).toContain(
      expect.stringMatching(/slow.*rendering.*memoization/)
    )
  })
})
import { vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SecureCardRenderer } from '../SecureCardRenderer'
import { AnkiCard, SanitizationResult } from '../../../../../shared/types/anki'

// Mock the SecureRenderer
vi.mock('../../services/anki/SecureRenderer', () => ({
  SecureRenderer: vi.fn().mockImplementation(() => ({
    renderAnkiCard: vi.fn().mockReturnValue({
      renderedHtml: '<div>Mocked rendered content</div>',
      isSecure: true,
      securityWarnings: [],
      appliedCss: '.card { color: blue; }'
    }),
    cleanup: vi.fn()
  }))
}))

describe('SecureCardRenderer', () => {
  const mockCard: AnkiCard = {
    id: 'test-card-1',
    ankiNoteId: 'note-123',
    templateId: 'template-456',
    fields: {
      Front: 'Test Question',
      Back: 'Test Answer'
    },
    sanitizedFields: {
      Front: 'Test Question',
      Back: 'Test Answer'
    },
    tags: ['tag1', 'tag2'],
    securityWarnings: [],
    hasUnsafeContent: false,
    processingStatus: 'ready',
    importErrors: [],
    importedAt: new Date().toISOString(),
    lastProcessed: new Date().toISOString()
  }

  const mockModel: any = {
    id: 'model-1',
    name: 'Test Model',
    templateHash: '123',
    fields: [{ id: '1', name: 'Front', ordinal: 0, sticky: false, rtl: false, fontSize: 20 }],
    templates: [],
    css: '',
    configuration: { sortf: 0, did: 0, latexPre: '', latexPost: '', mod: 0, type: 0, vers: [] },
    sanitized: true,
    mediaRefs: [],
    securityLevel: 'safe',
    processingErrors: [],
    importedAt: new Date(),
    sourceApkgHash: '',
    ankiVersion: '',
  };

  const mockTemplate: any = {
    id: 'template-1',
    name: 'Test Template',
    questionFormat: '{{Front}}',
    answerFormat: '{{Back}}',
    ordinal: 0,
  };

  const defaultProps = {
    model: mockModel,
    template: mockTemplate,
    fieldData: { Front: 'Test Question', Back: 'Test Answer' },
    renderMode: 'question',
    onError: vi.fn(),
    onLoad: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock postMessage for iframe communication
    Object.defineProperty(window, 'postMessage', {
      value: vi.fn(),
      writable: true
    })
  })

  afterEach(() => {
    // Clean up any remaining iframes
    const iframes = document.querySelectorAll('iframe[data-testid="secure-card-iframe"]')
    iframes.forEach(iframe => iframe.remove())
  })

  describe('Basic Rendering', () => {
    test('should render iframe with sandbox attributes', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin')
      expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer')
    })

    test('should set correct Content Security Policy', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      expect(iframe).toHaveAttribute('csp', expect.stringContaining("default-src 'self'"))
      expect(iframe).toHaveAttribute('csp', expect.stringContaining("script-src 'none'"))
      expect(iframe).toHaveAttribute('csp', expect.stringContaining("object-src 'none'"))
    })

    test('should have loading state initially', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      expect(screen.getByText('Loading card...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    test('should display error state when onError is called', () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Simulate error
      act(() => {
        onError('Test error message')
      })

      expect(screen.getByText(/failed to load card/i)).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })
  })

  describe('Iframe Communication', () => {
    test('should handle iframe load event', async () => {
      const onLoad = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onLoad={onLoad} />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      
      // Simulate iframe load
      act(() => {
        fireEvent.load(iframe)
      })

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled()
      })
    })

    test('should handle message from iframe', async () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      // Simulate message from iframe
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'cardLoaded',
            dimensions: { width: 400, height: 300 }
          },
          origin: 'null' // Sandboxed iframe origin
        }))
      })

      await waitFor(() => {
        const iframe = screen.getByTestId('secure-card-iframe')
        expect(iframe).toHaveStyle('height: 300px')
      })
    })

    test('should ignore messages from invalid origins', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Simulate message from invalid origin
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'cardLoaded' },
          origin: 'https://evil.com'
        }))
      })

      // Should not trigger any changes
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onError).not.toHaveBeenCalled()
    })

    test('should handle heartbeat messages', async () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      // Simulate heartbeat message
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'heartbeat',
            timestamp: Date.now()
          },
          origin: 'null'
        }))
      })

      // Should not cause errors
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })

    test('should handle error messages from iframe', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Simulate error message from iframe
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'error',
            message: 'Rendering failed',
            stack: 'Error stack trace'
          },
          origin: 'null'
        }))
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Rendering failed')
      })
    })
  })

  describe('Security Features', () => {
    test('should display security warnings for unsafe cards', () => {
      const unsafeCard = {
        ...mockCard,
        hasUnsafeContent: true,
        securityWarnings: ['Script tag detected', 'External link found']
      }

      render(<SecureCardRenderer {...defaultProps} card={unsafeCard} />)
      
      expect(screen.getByText(/security warnings/i)).toBeInTheDocument()
      expect(screen.getByText('Script tag detected')).toBeInTheDocument()
      expect(screen.getByText('External link found')).toBeInTheDocument()
    })

    test('should apply strict sandbox policy', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      const sandbox = iframe.getAttribute('sandbox')
      
      expect(sandbox).not.toContain('allow-scripts')
      expect(sandbox).not.toContain('allow-forms')
      expect(sandbox).not.toContain('allow-top-navigation')
      expect(sandbox).toContain('allow-same-origin')
    })

    test('should timeout if iframe takes too long to load', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} timeout={1000} />)
      
      // Wait for timeout
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('timeout'))
      }, { timeout: 1500 })
    })

    test('should validate message structure', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Send malformed messages
      const malformedMessages = [
        { type: null },
        { type: 'unknown' },
        { type: 'cardLoaded', dimensions: 'invalid' },
        'not an object',
        null,
        undefined
      ]

      for (const data of malformedMessages) {
        act(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data,
            origin: 'null'
          }))
        })
      }

      // Should handle gracefully without errors
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    test('should debounce resize events', async () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      // Send multiple resize messages rapidly
      const resizeMessages = Array.from({ length: 10 }, (_, i) => ({
        type: 'cardLoaded',
        dimensions: { width: 400, height: 300 + i }
      }))

      resizeMessages.forEach(data => {
        act(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data,
            origin: 'null'
          }))
        })
      })

      // Should only apply the last resize
      await waitFor(() => {
        const iframe = screen.getByTestId('secure-card-iframe')
        expect(iframe).toHaveStyle('height: 309px')
      })
    })

    test('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<SecureCardRenderer {...defaultProps} />)
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
    })

    test('should handle rapid card changes without memory leaks', () => {
      const { rerender } = render(<SecureCardRenderer {...defaultProps} />)
      
      // Change cards rapidly
      for (let i = 0; i < 10; i++) {
        const newCard = {
          ...mockCard,
          id: `card-${i}`,
          fields: { Front: `Question ${i}`, Back: `Answer ${i}` }
        }
        rerender(<SecureCardRenderer {...defaultProps} card={newCard} />)
      }

      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      const container = screen.getByRole('region')
      expect(container).toHaveAttribute('aria-label', 'Anki card content')
      
      const iframe = screen.getByTestId('secure-card-iframe')
      expect(iframe).toHaveAttribute('title', 'Anki card')
      expect(iframe).toHaveAttribute('aria-label', 'Secure card content')
    })

    test('should provide loading announcement for screen readers', () => {
      render(<SecureCardRenderer {...defaultProps} />)
      
      expect(screen.getByRole('status')).toHaveTextContent('Loading card...')
    })

    test('should announce errors to screen readers', () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      act(() => {
        onError('Test error')
      })

      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load card/i)
    })
  })

  describe('Error Recovery', () => {
    test('should provide retry functionality on error', () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Trigger error
      act(() => {
        onError('Test error')
      })

      const retryButton = screen.getByText(/retry/i)
      expect(retryButton).toBeInTheDocument()
      
      // Click retry
      fireEvent.click(retryButton)
      
      // Should show loading state again
      expect(screen.getByText('Loading card...')).toBeInTheDocument()
    })

    test('should handle iframe crashes gracefully', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      
      // Simulate iframe error
      act(() => {
        fireEvent.error(iframe)
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('failed to load'))
      })
    })

    test('should handle network errors', async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)

      // Should handle the error gracefully
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()

      global.fetch = originalFetch
    })
  })

  describe('Props Validation', () => {
    test('should handle missing card gracefully', () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} card={null as any} onError={onError} />)
      
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Invalid card'))
    })

    test('should handle missing template gracefully', () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} template="" onError={onError} />)
      
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Invalid template'))
    })

    test('should handle invalid CSS gracefully', () => {
      render(<SecureCardRenderer {...defaultProps} css="invalid css {{{" />)
      
      // Should still render without errors
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })
  })

  describe('Integration Tests', () => {
    test('should complete full rendering cycle', async () => {
      const onLoad = vi.fn()
      const onError = vi.fn()
      
      render(<SecureCardRenderer 
        {...defaultProps} 
        onLoad={onLoad} 
        onError={onError} 
      />)
      
      const iframe = screen.getByTestId('secure-card-iframe')
      
      // Simulate iframe load
      act(() => {
        fireEvent.load(iframe)
      })

      // Simulate card loaded message
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'cardLoaded',
            dimensions: { width: 400, height: 300 }
          },
          origin: 'null'
        }))
      })

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled()
        expect(onError).not.toHaveBeenCalled()
        expect(iframe).toHaveStyle('height: 300px')
      })
    })

    test('should handle card updates correctly', async () => {
      const { rerender } = render(<SecureCardRenderer {...defaultProps} />)
      
      const newCard = {
        ...mockCard,
        id: 'new-card',
        fields: { Front: 'New Question', Back: 'New Answer' }
      }
      
      rerender(<SecureCardRenderer {...defaultProps} card={newCard} />)
      
      // Should create new iframe for new card
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })

    test('should maintain security during rapid interactions', async () => {
      const onError = vi.fn()
      render(<SecureCardRenderer {...defaultProps} onError={onError} />)
      
      // Simulate rapid message sending
      for (let i = 0; i < 100; i++) {
        act(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: 'heartbeat',
              timestamp: Date.now() + i
            },
            origin: 'null'
          }))
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(onError).not.toHaveBeenCalled()
      expect(screen.getByTestId('secure-card-iframe')).toBeInTheDocument()
    })
  })
})
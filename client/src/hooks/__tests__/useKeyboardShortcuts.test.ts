import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts, useStudyKeyboardShortcuts } from '../useKeyboardShortcuts'
import type { KeyboardShortcut } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockRemoveEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockAddEventListener = vi.fn()
    mockRemoveEventListener = vi.fn()
    
    // Mock document.addEventListener and removeEventListener
    Object.defineProperty(document, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    })
    Object.defineProperty(document, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    })

    // Mock console methods for debug mode tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should register event listeners when enabled', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: vi.fn()
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not register event listeners when disabled', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: vi.fn()
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }))

      expect(mockAddEventListener).not.toHaveBeenCalled()
    })

    it('should remove event listeners on unmount', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: vi.fn()
        }
      ]

      const { unmount } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should return shortcuts and enabled state', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: vi.fn()
        }
      ]

      const { result } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      expect(result.current.shortcuts).toEqual(shortcuts)
      expect(result.current.enabled).toBe(true)
    })
  })

  describe('keyboard event handling', () => {
    it('should execute action when matching key is pressed', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      // Get the registered event handler
      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Simulate keydown event
      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('should not execute action for non-matching keys', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'b', // Different key
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })

    it('should handle modifier keys correctly', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          description: 'Save',
          action: mockAction,
          ctrlKey: true
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test with Ctrl+S
      const mockEvent = {
        key: 's',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('should support Cmd key as Ctrl alternative', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          description: 'Save',
          action: mockAction,
          ctrlKey: true
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test with Cmd+S (metaKey instead of ctrlKey)
      const mockEvent = {
        key: 's',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: true,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('should not execute disabled shortcuts', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction,
          disabled: true
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })

    it('should ignore events from input fields', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test with input field
      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'INPUT', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })

    it('should ignore events from textarea fields', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'TEXTAREA', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })

    it('should ignore events from contentEditable elements', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: true },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })
  })

  describe('event handling options', () => {
    it('should call preventDefault when preventDefault option is true', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ 
        shortcuts, 
        enabled: true, 
        preventDefault: true 
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should not call preventDefault when preventDefault option is false', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ 
        shortcuts, 
        enabled: true, 
        preventDefault: false 
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should call stopPropagation when stopPropagation option is true', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ 
        shortcuts, 
        enabled: true, 
        stopPropagation: true 
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('debug mode', () => {
    it('should log debug information when debugMode is true', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ 
        shortcuts, 
        enabled: true, 
        debugMode: true 
      }))

      expect(console.log).toHaveBeenCalledWith(
        '[KeyboardShortcuts] Registered shortcuts:',
        expect.any(Array)
      )

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        code: 'KeyA'
      }

      act(() => {
        eventHandler(mockEvent)
      })

      expect(console.log).toHaveBeenCalledWith(
        '[KeyboardShortcuts] Key pressed:',
        expect.objectContaining({
          key: 'a',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          code: 'KeyA'
        })
      )

      expect(console.log).toHaveBeenCalledWith(
        '[KeyboardShortcuts] Executing shortcut:',
        expect.objectContaining({
          key: 'a',
          description: 'Test action'
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle errors in action execution gracefully', () => {
      const mockAction = vi.fn(() => {
        throw new Error('Test error')
      })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      expect(() => {
        act(() => {
          eventHandler(mockEvent)
        })
      }).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[KeyboardShortcuts] Error executing shortcut:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('dynamic updates', () => {
    it('should update shortcuts when props change', () => {
      const mockAction1 = vi.fn()
      const mockAction2 = vi.fn()
      
      const initialShortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Initial action',
          action: mockAction1
        }
      ]

      const updatedShortcuts: KeyboardShortcut[] = [
        {
          key: 'b',
          description: 'Updated action',
          action: mockAction2
        }
      ]

      const { rerender } = renderHook(
        ({ shortcuts }) => useKeyboardShortcuts({ shortcuts, enabled: true }),
        { initialProps: { shortcuts: initialShortcuts } }
      )

      // Test initial shortcut works
      const eventHandler = mockAddEventListener.mock.calls[0][1]
      act(() => {
        eventHandler({
          key: 'a',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })
      expect(mockAction1).toHaveBeenCalledTimes(1)

      // Update shortcuts
      rerender({ shortcuts: updatedShortcuts })

      // Test updated shortcut works
      act(() => {
        eventHandler({
          key: 'b',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })
      expect(mockAction2).toHaveBeenCalledTimes(1)

      // Test old shortcut no longer works
      act(() => {
        eventHandler({
          key: 'a',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })
      expect(mockAction1).toHaveBeenCalledTimes(1) // Should not increase
    })

    it('should update enabled state when props change', () => {
      const mockAction = vi.fn()
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Test action',
          action: mockAction
        }
      ]

      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts({ shortcuts, enabled }),
        { initialProps: { enabled: true } }
      )

      // Test shortcut works when enabled
      const eventHandler = mockAddEventListener.mock.calls[0][1]
      act(() => {
        eventHandler({
          key: 'a',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })
      expect(mockAction).toHaveBeenCalledTimes(1)

      // Disable shortcuts
      rerender({ enabled: false })

      // Test shortcut doesn't work when disabled
      act(() => {
        eventHandler({
          key: 'a',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })
      expect(mockAction).toHaveBeenCalledTimes(1) // Should not increase
    })
  })
})

describe('useStudyKeyboardShortcuts', () => {
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockRemoveEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockAddEventListener = vi.fn()
    mockRemoveEventListener = vi.fn()
    
    Object.defineProperty(document, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    })
    Object.defineProperty(document, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    })

    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('study session shortcuts', () => {
    const mockHandlers = {
      onFlipCard: vi.fn(),
      onAnswerAgain: vi.fn(),
      onAnswerHard: vi.fn(),
      onAnswerGood: vi.fn(),
      onAnswerEasy: vi.fn(),
      onExitStudy: vi.fn()
    }

    beforeEach(() => {
      Object.values(mockHandlers).forEach(mock => mock.mockClear())
    })

    it('should handle flip card shortcuts when answer is not shown', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: false,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test space key
      act(() => {
        eventHandler({
          key: ' ',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })

      expect(mockHandlers.onFlipCard).toHaveBeenCalledTimes(1)

      // Test enter key
      act(() => {
        eventHandler({
          key: 'enter',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })

      expect(mockHandlers.onFlipCard).toHaveBeenCalledTimes(2)
    })

    it('should handle answer shortcuts when answer is shown', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: true,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test number shortcuts
      const answerTests = [
        { key: '1', handler: 'onAnswerAgain' },
        { key: '2', handler: 'onAnswerHard' },
        { key: '3', handler: 'onAnswerGood' },
        { key: '4', handler: 'onAnswerEasy' }
      ]

      answerTests.forEach(({ key, handler }) => {
        act(() => {
          eventHandler({
            key,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            target: { tagName: 'DIV', isContentEditable: false },
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
          })
        })

        expect(mockHandlers[handler as keyof typeof mockHandlers]).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle letter answer shortcuts when answer is shown', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: true,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test letter shortcuts
      const letterTests = [
        { key: 'a', handler: 'onAnswerAgain' },
        { key: 'h', handler: 'onAnswerHard' },
        { key: 'g', handler: 'onAnswerGood' },
        { key: 'e', handler: 'onAnswerEasy' }
      ]

      letterTests.forEach(({ key, handler }) => {
        act(() => {
          eventHandler({
            key,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            target: { tagName: 'DIV', isContentEditable: false },
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
          })
        })

        expect(mockHandlers[handler as keyof typeof mockHandlers]).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle exit shortcuts', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: false,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test escape key
      act(() => {
        eventHandler({
          key: 'escape',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })

      expect(mockHandlers.onExitStudy).toHaveBeenCalledTimes(1)

      // Test q key
      act(() => {
        eventHandler({
          key: 'q',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          target: { tagName: 'DIV', isContentEditable: false },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        })
      })

      expect(mockHandlers.onExitStudy).toHaveBeenCalledTimes(2)
    })

    it('should not execute answer shortcuts when answer is not shown', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: false,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test that answer shortcuts are disabled
      const answerKeys = ['1', '2', '3', '4', 'a', 'h', 'g', 'e']

      answerKeys.forEach(key => {
        act(() => {
          eventHandler({
            key,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            target: { tagName: 'DIV', isContentEditable: false },
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
          })
        })
      })

      // None of the answer handlers should have been called
      expect(mockHandlers.onAnswerAgain).not.toHaveBeenCalled()
      expect(mockHandlers.onAnswerHard).not.toHaveBeenCalled()
      expect(mockHandlers.onAnswerGood).not.toHaveBeenCalled()
      expect(mockHandlers.onAnswerEasy).not.toHaveBeenCalled()
    })

    it('should not execute flip shortcuts when answer is shown', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: true,
        enabled: true
      }))

      const eventHandler = mockAddEventListener.mock.calls[0][1]

      // Test that flip shortcuts are disabled when answer is shown
      const flipKeys = [' ', 'enter']

      flipKeys.forEach(key => {
        act(() => {
          eventHandler({
            key,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            target: { tagName: 'DIV', isContentEditable: false },
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
          })
        })
      })

      expect(mockHandlers.onFlipCard).not.toHaveBeenCalled()
    })

    it('should work with debug mode', () => {
      renderHook(() => useStudyKeyboardShortcuts({
        ...mockHandlers,
        showAnswer: false,
        enabled: true,
        debugMode: true
      }))

      expect(console.log).toHaveBeenCalledWith(
        '[KeyboardShortcuts] Registered shortcuts:',
        expect.any(Array)
      )
    })
  })
})
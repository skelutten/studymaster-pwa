import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  disabled?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  debugMode?: boolean
}

/**
 * Custom hook for managing keyboard shortcuts
 * 
 * Provides comprehensive keyboard shortcut management with:
 * - Multiple modifier key support (Ctrl, Alt, Shift)
 * - Conditional enabling/disabling
 * - Debug logging
 * - Event handling options
 */
export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  preventDefault = true,
  stopPropagation = true,
  debugMode = false
}: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(shortcuts)
  const enabledRef = useRef(enabled)

  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    enabledRef.current = enabled
  }, [shortcuts, enabled])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const key = event.key.toLowerCase()
    const ctrlKey = event.ctrlKey || event.metaKey // Support both Ctrl and Cmd
    const altKey = event.altKey
    const shiftKey = event.shiftKey

    if (debugMode) {
      console.log('[KeyboardShortcuts] Key pressed:', {
        key,
        ctrlKey,
        altKey,
        shiftKey,
        code: event.code
      })
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false
      
      const keyMatches = shortcut.key.toLowerCase() === key
      const ctrlMatches = (shortcut.ctrlKey || false) === ctrlKey
      const altMatches = (shortcut.altKey || false) === altKey
      const shiftMatches = (shortcut.shiftKey || false) === shiftKey

      return keyMatches && ctrlMatches && altMatches && shiftMatches
    })

    if (matchingShortcut) {
      if (debugMode) {
        console.log('[KeyboardShortcuts] Executing shortcut:', {
          key: matchingShortcut.key,
          description: matchingShortcut.description
        })
      }

      if (preventDefault) {
        event.preventDefault()
      }
      
      if (stopPropagation) {
        event.stopPropagation()
      }

      try {
        matchingShortcut.action()
      } catch (error) {
        console.error('[KeyboardShortcuts] Error executing shortcut:', error)
      }
    }
  }, [preventDefault, stopPropagation, debugMode])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      
      if (debugMode) {
        console.log('[KeyboardShortcuts] Registered shortcuts:', shortcuts.map(s => ({
          key: s.key,
          description: s.description,
          modifiers: {
            ctrl: s.ctrlKey,
            alt: s.altKey,
            shift: s.shiftKey
          }
        })))
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      if (debugMode) {
        console.log('[KeyboardShortcuts] Unregistered shortcuts')
      }
    }
  }, [handleKeyDown, enabled, debugMode, shortcuts])

  return {
    shortcuts: shortcutsRef.current,
    enabled: enabledRef.current
  }
}

/**
 * Hook specifically for study session shortcuts
 */
export const useStudyKeyboardShortcuts = ({
  onFlipCard,
  onAnswerAgain,
  onAnswerHard,
  onAnswerGood,
  onAnswerEasy,
  onExitStudy,
  showAnswer,
  enabled = true,
  debugMode = false
}: {
  onFlipCard: () => void
  onAnswerAgain: () => void
  onAnswerHard: () => void
  onAnswerGood: () => void
  onAnswerEasy: () => void
  onExitStudy: () => void
  showAnswer: boolean
  enabled?: boolean
  debugMode?: boolean
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // Card flipping
    {
      key: ' ', // Space
      description: 'Flip card / Show answer',
      action: onFlipCard,
      disabled: showAnswer
    },
    {
      key: 'enter',
      description: 'Flip card / Show answer',
      action: onFlipCard,
      disabled: showAnswer
    },
    
    // Answer shortcuts (only when answer is shown)
    {
      key: '1',
      description: 'Answer: Again',
      action: onAnswerAgain,
      disabled: !showAnswer
    },
    {
      key: '2',
      description: 'Answer: Hard',
      action: onAnswerHard,
      disabled: !showAnswer
    },
    {
      key: '3',
      description: 'Answer: Good',
      action: onAnswerGood,
      disabled: !showAnswer
    },
    {
      key: '4',
      description: 'Answer: Easy',
      action: onAnswerEasy,
      disabled: !showAnswer
    },
    
    // Alternative answer shortcuts
    {
      key: 'a',
      description: 'Answer: Again',
      action: onAnswerAgain,
      disabled: !showAnswer
    },
    {
      key: 'h',
      description: 'Answer: Hard',
      action: onAnswerHard,
      disabled: !showAnswer
    },
    {
      key: 'g',
      description: 'Answer: Good',
      action: onAnswerGood,
      disabled: !showAnswer
    },
    {
      key: 'e',
      description: 'Answer: Easy',
      action: onAnswerEasy,
      disabled: !showAnswer
    },
    
    // Navigation shortcuts
    {
      key: 'escape',
      description: 'Exit study session',
      action: onExitStudy
    },
    {
      key: 'q',
      description: 'Exit study session',
      action: onExitStudy
    }
  ]

  return useKeyboardShortcuts({
    shortcuts,
    enabled,
    debugMode
  })
}
import React from 'react'
import { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
  className?: string
  title?: string
  compact?: boolean
}

/**
 * Component to display keyboard shortcuts help
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ 
  shortcuts, 
  className = '',
  title = 'Keyboard Shortcuts',
  compact = false
}) => {
  const formatKey = (shortcut: KeyboardShortcut) => {
    const parts = []
    
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.altKey) parts.push('Alt')
    if (shortcut.shiftKey) parts.push('Shift')
    
    let key = shortcut.key
    if (key === ' ') key = 'Space'
    if (key === 'enter') key = 'Enter'
    if (key === 'escape') key = 'Esc'
    
    parts.push(key.toUpperCase())
    
    return parts.join(' + ')
  }

  const enabledShortcuts = shortcuts.filter(s => !s.disabled)

  if (enabledShortcuts.length === 0) return null

  if (compact) {
    return (
      <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        {enabledShortcuts.slice(0, 4).map((shortcut, index) => (
          <span key={index} className="mr-4">
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              {shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase()}
            </kbd>
            {' '}
            {shortcut.description}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {enabledShortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              {shortcut.description}
            </span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono">
              {formatKey(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Study-specific shortcuts help component
 */
export const StudyShortcutsHelp: React.FC<{ 
  showAnswer: boolean
  className?: string
  compact?: boolean
}> = ({ 
  showAnswer, 
  className = '',
  compact = false
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // Always available
    {
      key: 'escape',
      description: 'Exit study',
      action: () => {},
      disabled: false
    },
    
    // Card flipping (when answer hidden)
    {
      key: ' ',
      description: 'Show answer',
      action: () => {},
      disabled: showAnswer
    },
    
    // Answer shortcuts (when answer shown)
    {
      key: '1',
      description: 'Again',
      action: () => {},
      disabled: !showAnswer
    },
    {
      key: '2',
      description: 'Hard',
      action: () => {},
      disabled: !showAnswer
    },
    {
      key: '3',
      description: 'Good',
      action: () => {},
      disabled: !showAnswer
    },
    {
      key: '4',
      description: 'Easy',
      action: () => {},
      disabled: !showAnswer
    }
  ]

  return (
    <KeyboardShortcutsHelp 
      shortcuts={shortcuts}
      className={className}
      title="Study Shortcuts"
      compact={compact}
    />
  )
}

export default KeyboardShortcutsHelp
// Basic error tracking service for StudyMaster PWA

import React from 'react'

export interface ErrorReport {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: Record<string, any>
}

export interface ErrorTrackingConfig {
  maxStoredErrors: number
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  apiEndpoint?: string
  apiKey?: string
  environment: 'development' | 'production' | 'staging'
}

class ErrorTrackingService {
  private config: ErrorTrackingConfig
  private errors: ErrorReport[] = []
  private sessionId: string
  private initialized = false

  constructor(config: Partial<ErrorTrackingConfig> = {}) {
    this.config = {
      maxStoredErrors: 100,
      enableConsoleLogging: true,
      enableLocalStorage: true,
      environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.loadStoredErrors()
    this.setupGlobalErrorHandlers()
    this.initialized = true
    
    this.logInfo('Error tracking initialized', { sessionId: this.sessionId })
  }

  /**
   * Log an error
   */
  logError(error: Error | string, context?: Record<string, unknown>): void {
    const errorReport = this.createErrorReport('error', error, context)
    this.recordError(errorReport)
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context?: Record<string, unknown>): void {
    const errorReport = this.createErrorReport('warning', message, context)
    this.recordError(errorReport)
  }

  /**
   * Log an info message
   */
  logInfo(message: string, context?: Record<string, unknown>): void {
    const errorReport = this.createErrorReport('info', message, context)
    this.recordError(errorReport)
  }

  /**
   * Get all stored errors
   */
  getErrors(): ErrorReport[] {
    return [...this.errors]
  }

  /**
   * Clear all stored errors
   */
  clearErrors(): void {
    this.errors = []
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('studymaster_errors')
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    byLevel: Record<string, number>
    recent: number // Errors in last hour
  } {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const stats = {
      total: this.errors.length,
      byLevel: { error: 0, warning: 0, info: 0 },
      recent: 0
    }

    this.errors.forEach(error => {
      stats.byLevel[error.level]++
      if (new Date(error.timestamp).getTime() > oneHourAgo) {
        stats.recent++
      }
    })

    return stats
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2)
  }

  private createErrorReport(
    level: ErrorReport['level'],
    error: Error | string,
    context?: Record<string, unknown>
  ): ErrorReport {
    const message = error instanceof Error ? error.message : error
    const stack = error instanceof Error ? error.stack : undefined
    
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      context: context || {}
    }
  }

  private recordError(error: ErrorReport): void {
    // Add to in-memory storage
    this.errors.unshift(error)
    
    // Limit stored errors
    if (this.errors.length > this.config.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.config.maxStoredErrors)
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      const logMethod = error.level === 'error' ? console.error : 
                       error.level === 'warning' ? console.warn : console.log
      logMethod(`[ErrorTracker] ${error.message}`, error)
    }

    // Local storage persistence
    if (this.config.enableLocalStorage) {
      try {
        localStorage.setItem('studymaster_errors', JSON.stringify(this.errors.slice(0, 50)))
      } catch (e) {
        // Storage quota exceeded, clear old errors
        this.errors = this.errors.slice(0, 25)
        try {
          localStorage.setItem('studymaster_errors', JSON.stringify(this.errors))
        } catch (e) {
          // If still failing, disable local storage
          console.warn('Error tracking: Local storage disabled due to quota issues')
        }
      }
    }

    // Send to remote endpoint if configured
    if (this.config.apiEndpoint && this.config.environment === 'production') {
      this.sendToRemote(error).catch(e => {
        console.warn('Failed to send error to remote endpoint:', e)
      })
    }
  }

  private loadStoredErrors(): void {
    if (!this.config.enableLocalStorage) return

    try {
      const stored = localStorage.getItem('studymaster_errors')
      if (stored) {
        const parsedErrors = JSON.parse(stored)
        if (Array.isArray(parsedErrors)) {
          this.errors = parsedErrors
        }
      }
    } catch (e) {
      console.warn('Failed to load stored errors:', e)
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'unhandled_error'
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(`Unhandled promise rejection: ${event.reason}`), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      })
    })

    // React error boundary integration
    if (window.React) {
      const originalErrorHandler = window.console.error
      window.console.error = (...args) => {
        const message = args[0]
        if (typeof message === 'string' && message.includes('React')) {
          this.logError(new Error(message), {
            type: 'react_error',
            args: args
          })
        }
        originalErrorHandler.apply(console, args)
      }
    }
  }

  private async sendToRemote(error: ErrorReport): Promise<void> {
    if (!this.config.apiEndpoint) return

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
        },
        body: JSON.stringify({
          ...error,
          environment: this.config.environment,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      })
    } catch (e) {
      // Silently fail for remote logging
      console.warn('Failed to send error to remote endpoint:', e)
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const errorTracker = new ErrorTrackingService({
  environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
  maxStoredErrors: 100,
  enableConsoleLogging: import.meta.env.DEV,
  enableLocalStorage: true
})

// Convenience functions
export const logError = (error: Error | string, context?: Record<string, unknown>) => 
  errorTracker.logError(error, context)

export const logWarning = (message: string, context?: Record<string, unknown>) => 
  errorTracker.logWarning(message, context)

export const logInfo = (message: string, context?: Record<string, unknown>) => 
  errorTracker.logInfo(message, context)

// React Error Boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, {
      type: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }

    return this.props.children
  }
}

// Default error fallback component
export const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="max-w-md mx-auto text-center p-6">
      <div className="mb-4">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
)

export default ErrorTrackingService
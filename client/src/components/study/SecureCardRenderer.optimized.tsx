import React, { 
  useEffect, 
  useRef, 
  useState, 
  useCallback, 
  useMemo,
  startTransition,
  useDeferredValue,
  memo,
  Profiler
} from 'react'
import { AnkiModel, AnkiTemplate, RenderingContext, SanitizationResult } from '../../../../shared/types/anki'
import { SecureRenderer } from '../../services/anki/SecureRenderer'
import { MediaContextService } from '../../services/anki/MediaContextService'
import { useAuthStore } from '../../stores/authStore'
import { debugLogger } from '../../utils/debugLogger'

interface SecureCardRendererProps {
  model: AnkiModel
  template: AnkiTemplate
  fieldData: Record<string, string>
  renderMode: 'question' | 'answer'
  deckId: string
  mediaContext?: MediaContextService
  onRenderComplete?: (result: SanitizationResult) => void
  onRenderError?: (error: string) => void
  onMediaLoadError?: (filename: string, error: string) => void
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void
  className?: string
  maxHeight?: number
  timeout?: number
  enablePerformanceMonitoring?: boolean
}

interface IframeMessage {
  type: string
  data?: any
  requestId?: string
  timestamp?: number
  source?: string
}

interface MediaLoadingState {
  loadingCount: number
  failedCount: number
  loadedCount: number
  currentlyLoading: Set<string>
  recentErrors: Array<{ filename: string; error: string; timestamp: number }>
}

// Stable reference objects to prevent re-renders
const EMPTY_MEDIA_MAP = Object.freeze({})
const EMPTY_FIELD_DATA = Object.freeze({})
const DEFAULT_IFRAME_STYLE = Object.freeze({
  width: '100%',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: 'white'
})

// Memoized secure iframe srcdoc generator 
const useSecureIframeSrcdoc = () => {
  return useMemo(() => {
    const nonce = generateCSPNonce()
    const cspPolicy = [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'self'"
    ].join('; ')

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="${cspPolicy}">
          <title>Anki Card</title>
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 16px;
              line-height: 1.5;
              color: #333;
              background: white;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 10px auto;
            }
            audio, video {
              max-width: 100%;
              display: block;
              margin: 10px auto;
            }
            .media-loading {
              background: #f3f4f6;
              padding: 8px;
              border-radius: 4px;
              text-align: center;
              color: #6b7280;
            }
            .media-error {
              background: #fef2f2;
              border: 1px solid #fecaca;
              color: #dc2626;
              padding: 8px;
              border-radius: 4px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div id="loading" style="text-align: center; padding: 20px; color: #6c757d;">
            Loading card content...
          </div>
          <script nonce="${nonce}">
            ${getBootstrapScript()}
          </script>
        </body>
      </html>
    `
  }, []) // No dependencies - stable across renders
}

// Generate CSP nonce - moved outside component for stability
const generateCSPNonce = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// Bootstrap script - extracted for reuse
const getBootstrapScript = (): string => {
  return `
    (function() {
      let mediaLoadingCount = 0;
      
      function sendMessage(type, data) {
        if (window.parent) {
          window.parent.postMessage({
            type: type,
            data: data || {},
            requestId: 'inline_' + Date.now(),
            timestamp: Date.now(),
            source: 'anki-iframe'
          }, window.location.origin);
        }
      }
      
      function trackMediaLoading() {
        const mediaElements = document.querySelectorAll('img, audio, video');
        let loadedCount = 0;
        let errorCount = 0;
        
        mediaElements.forEach((element, index) => {
          const filename = element.getAttribute('data-original-filename') || 'unknown';
          
          element.addEventListener('loadstart', () => {
            sendMessage('media-load-start', { filename, index });
          });
          
          element.addEventListener('loadedmetadata', () => {
            loadedCount++;
            sendMessage('media-load-success', { 
              filename, 
              index, 
              loadedCount,
              totalCount: mediaElements.length 
            });
          });
          
          element.addEventListener('error', (e) => {
            errorCount++;
            sendMessage('media-load-error', { 
              filename, 
              index, 
              error: 'Failed to load media',
              errorCount,
              totalCount: mediaElements.length
            });
          });
        });
        
        return { totalMedia: mediaElements.length, loadedCount, errorCount };
      }
      
      window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return;
        
        const { type, data, requestId } = event.data || {};
        
        switch (type) {
          case 'render_card':
            try {
              if (data.css) {
                const style = document.createElement('style');
                style.textContent = data.css;
                document.head.appendChild(style);
              }
              
              document.body.innerHTML = data.html || '';
              
              // Initialize media tracking
              const mediaStats = trackMediaLoading();
              
              const dimensions = {
                width: Math.max(document.body.scrollWidth, document.body.offsetWidth),
                height: Math.max(document.body.scrollHeight, document.body.offsetHeight)
              };
              
              sendMessage('card_ready', { 
                dimensions: dimensions,
                mediaStats: mediaStats
              });
            } catch (error) {
              sendMessage('error', { message: error.message });
            }
            break;
        }
      });
      
      sendMessage('iframe_ready', { timestamp: Date.now() });
    })();
  `
}

// Optimized SecureCardRenderer with performance monitoring
export const SecureCardRenderer: React.FC<SecureCardRendererProps> = memo(({
  model,
  template,
  fieldData = EMPTY_FIELD_DATA,
  renderMode,
  deckId,
  mediaContext,
  onRenderComplete,
  onRenderError,
  onMediaLoadError,
  onDimensionsChange,
  className = '',
  maxHeight = 600,
  timeout = 5000,
  enablePerformanceMonitoring = false
}) => {
  // Refs for stable references
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rendererRef = useRef<SecureRenderer>(new SecureRenderer())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageIdRef = useRef<number>(0)
  const pendingRequestsRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map())
  const mediaContextRef = useRef<MediaContextService>(
    mediaContext || new MediaContextService()
  )

  // Get current user
  const { user } = useAuthStore()

  // Optimized media loading state management
  const [mediaLoadingState, setMediaLoadingState] = useState<MediaLoadingState>(() => ({
    loadingCount: 0,
    failedCount: 0,
    loadedCount: 0,
    currentlyLoading: new Set(),
    recentErrors: []
  }))

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [renderResult, setRenderResult] = useState<SanitizationResult | null>(null)

  // Performance monitoring
  const [renderMetrics, setRenderMetrics] = useState({
    templateProcessingTime: 0,
    mediaResolutionTime: 0,
    totalRenderTime: 0
  })

  // Memoized iframe srcdoc
  const iframeSrcdoc = useSecureIframeSrcdoc()

  // Stable references for expensive operations
  const generateMessageId = useCallback((): string => {
    return `msg_${Date.now()}_${++messageIdRef.current}`
  }, [])

  // Debounced media state updates to prevent excessive re-renders
  const updateMediaState = useCallback((updateFn: (prev: MediaLoadingState) => MediaLoadingState) => {
    startTransition(() => {
      setMediaLoadingState(updateFn)
    })
  }, [])

  // Optimized media processing with React 18 concurrent features
  const processMediaContent = useCallback(async (
    content: string, 
    contentType: 'template' | 'field'
  ): Promise<string> => {
    if (!user || !deckId || !content) return content

    const startTime = performance.now()

    try {
      const resolvedContent = await mediaContextRef.current.resolveMediaReferences(
        content,
        deckId,
        user.id
      )
      
      const processingTime = performance.now() - startTime

      if (enablePerformanceMonitoring) {
        setRenderMetrics(prev => ({
          ...prev,
          [contentType === 'template' ? 'templateProcessingTime' : 'mediaResolutionTime']: processingTime
        }))
      }

      debugLogger.info('[CARD_RENDERER]', `${contentType} media resolution completed`, {
        deckId,
        processingTime: Math.round(processingTime),
        originalLength: content.length,
        resolvedLength: resolvedContent.length
      })
      
      return resolvedContent
    } catch (error) {
      debugLogger.error('[CARD_RENDERER]', `${contentType} media resolution failed`, { error })
      return content // Fallback to original content
    }
  }, [user, deckId, enablePerformanceMonitoring])

  // Deferred values for non-urgent updates
  const deferredFieldData = useDeferredValue(fieldData)
  const deferredTemplate = useDeferredValue(template)

  // Process template content with concurrent features
  const [processedTemplate, setProcessedTemplate] = useState<string>('')
  const [processedFieldData, setProcessedFieldData] = useState<Record<string, string>>(EMPTY_FIELD_DATA)

  // Template processing effect with concurrent updates
  useEffect(() => {
    let isCancelled = false

    const processTemplate = async () => {
      const templateContent = renderMode === 'question' 
        ? deferredTemplate.questionFormat 
        : deferredTemplate.answerFormat

      const processed = await processMediaContent(templateContent, 'template')
      
      if (!isCancelled) {
        startTransition(() => {
          setProcessedTemplate(processed)
        })
      }
    }

    processTemplate().catch(error => {
      if (!isCancelled && onRenderError) {
        onRenderError(`Template processing failed: ${error.message}`)
      }
    })

    return () => { isCancelled = true }
  }, [deferredTemplate, renderMode, processMediaContent, onRenderError])

  // Field data processing effect with concurrent updates
  useEffect(() => {
    let isCancelled = false

    const processFields = async () => {
      const processed = { ...deferredFieldData }
      
      // Process only fields containing potential media references
      const fieldsToProcess = Object.entries(processed).filter(([_, value]) => 
        typeof value === 'string' && 
        value.length > 0 && 
        (value.includes('.jpg') || value.includes('.png') || value.includes('[sound:') || value.includes('src='))
      )

      if (fieldsToProcess.length === 0) {
        if (!isCancelled) {
          setProcessedFieldData(processed)
        }
        return
      }

      for (const [key, value] of fieldsToProcess) {
        if (isCancelled) break
        
        const processedValue = await processMediaContent(value, 'field')
        processed[key] = processedValue
      }
      
      if (!isCancelled) {
        startTransition(() => {
          setProcessedFieldData(processed)
        })
      }
    }

    processFields().catch(error => {
      if (!isCancelled && onRenderError) {
        onRenderError(`Field processing failed: ${error.message}`)
      }
    })

    return () => { isCancelled = true }
  }, [deferredFieldData, processMediaContent, onRenderError])

  // Optimized iframe message handler with proper cleanup
  const handleIframeMessage = useCallback((event: MessageEvent<IframeMessage>) => {
    if (event.origin !== window.location.origin) return

    const { type, data, requestId } = event.data

    switch (type) {
      case 'render-complete':
        if (onRenderComplete && data) {
          onRenderComplete(data)
        }
        break

      case 'render-error':
        if (onRenderError && data?.error) {
          onRenderError(data.error)
        }
        break

      case 'media-load-start':
        if (data?.filename) {
          updateMediaState(prev => ({
            ...prev,
            loadingCount: prev.loadingCount + 1,
            currentlyLoading: new Set([...prev.currentlyLoading, data.filename])
          }))
        }
        break

      case 'media-load-success':
        if (data?.filename) {
          updateMediaState(prev => {
            const newCurrentlyLoading = new Set(prev.currentlyLoading)
            newCurrentlyLoading.delete(data.filename)
            
            return {
              ...prev,
              loadingCount: Math.max(0, prev.loadingCount - 1),
              loadedCount: prev.loadedCount + 1,
              currentlyLoading: newCurrentlyLoading
            }
          })
        }
        break

      case 'media-load-error':
        if (data?.filename && data?.error) {
          updateMediaState(prev => {
            const newCurrentlyLoading = new Set(prev.currentlyLoading)
            newCurrentlyLoading.delete(data.filename)
            
            const newError = {
              filename: data.filename,
              error: data.error,
              timestamp: Date.now()
            }
            
            // Keep only recent errors (last 10)
            const recentErrors = [newError, ...prev.recentErrors]
              .slice(0, 10)
            
            return {
              ...prev,
              loadingCount: Math.max(0, prev.loadingCount - 1),
              failedCount: prev.failedCount + 1,
              currentlyLoading: newCurrentlyLoading,
              recentErrors
            }
          })
          
          if (onMediaLoadError) {
            onMediaLoadError(data.filename, data.error)
          }
        }
        break

      case 'dimensions-changed':
        if (onDimensionsChange && data?.dimensions) {
          // Debounce dimension changes
          startTransition(() => {
            setDimensions(data.dimensions)
            onDimensionsChange(data.dimensions)
          })
        }
        break

      case 'iframe_ready':
        setIsLoading(false)
        break
    }

    // Handle pending async requests
    if (requestId && pendingRequestsRef.current.has(requestId)) {
      const { resolve } = pendingRequestsRef.current.get(requestId)!
      pendingRequestsRef.current.delete(requestId)
      resolve(data)
    }
  }, [onRenderComplete, onRenderError, onMediaLoadError, onDimensionsChange, updateMediaState])

  // Memoized send message function
  const sendMessageToIframe = useCallback((type: string, data: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) {
        reject(new Error('Iframe not available'))
        return
      }

      const messageId = generateMessageId()
      const message: IframeMessage = {
        type,
        data: { ...data, startTime: Date.now() },
        requestId: messageId,
        timestamp: Date.now(),
        source: 'anki-parent'
      }

      // Store promise handlers
      pendingRequestsRef.current.set(messageId, { resolve, reject })

      // Set timeout
      const timeoutId = setTimeout(() => {
        pendingRequestsRef.current.delete(messageId)
        reject(new Error(`Message timeout: ${type}`))
      }, timeout)

      // Send message with cleanup
      try {
        iframe.contentWindow.postMessage(message, window.location.origin)
        
        const originalResolve = resolve
        const originalReject = reject
        
        pendingRequestsRef.current.set(messageId, {
          resolve: (result: any) => {
            clearTimeout(timeoutId)
            originalResolve(result)
          },
          reject: (error: any) => {
            clearTimeout(timeoutId)
            originalReject(error)
          }
        })
      } catch (err) {
        clearTimeout(timeoutId)
        pendingRequestsRef.current.delete(messageId)
        reject(err)
      }
    })
  }, [timeout, generateMessageId])

  // Optimized render function with proper memoization
  const renderCard = useCallback(async () => {
    if (!iframeRef.current || !processedTemplate || !user) return

    const renderStartTime = performance.now()

    try {
      setError(null)
      
      // Clear previous media loading state
      updateMediaState(prev => ({
        loadingCount: 0,
        failedCount: 0,
        loadedCount: 0,
        currentlyLoading: new Set(),
        recentErrors: []
      }))

      // Sanitize content using SecureRenderer
      const result = await rendererRef.current.renderAnkiCard(
        model,
        { ...template, [renderMode === 'question' ? 'questionFormat' : 'answerFormat']: processedTemplate },
        processedFieldData,
        renderMode
      )

      setRenderResult(result)

      if (!result.isSecure) {
        console.warn('SecureCardRenderer: Security warnings detected:', result.securityWarnings)
      }

      // Create rendering context with media support
      const context: RenderingContext = {
        modelId: model.id,
        templateId: template.id,
        fieldData: processedFieldData,
        mediaMap: EMPTY_MEDIA_MAP, // Legacy support
        cspNonce: generateCSPNonce(),
        renderingMode: renderMode,
        allowedTags: [],
        allowedAttributes: [],
        sanitizationLevel: 'strict'
      }

      // Send render request to iframe
      await sendMessageToIframe('render_card', {
        html: result.sanitizedHtml,
        css: model.css,
        nonce: context.cspNonce,
        fieldData: context.fieldData,
        mediaMap: context.mediaMap,
        deckId,
        enableMediaTracking: true
      })

      const totalRenderTime = performance.now() - renderStartTime

      if (enablePerformanceMonitoring) {
        setRenderMetrics(prev => ({
          ...prev,
          totalRenderTime
        }))
        
        // Log performance metrics for analysis
        debugLogger.info('[CARD_RENDERER]', 'Render performance metrics', {
          deckId,
          renderMode,
          totalRenderTime: Math.round(totalRenderTime),
          templateProcessingTime: Math.round(renderMetrics.templateProcessingTime),
          mediaResolutionTime: Math.round(renderMetrics.mediaResolutionTime)
        })
      }

      if (onRenderComplete) {
        onRenderComplete(result)
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to render card'
      debugLogger.error('[CARD_RENDERER]', 'Card render failed', { error })
      setError(errorMsg)
      
      if (onRenderError) {
        onRenderError(errorMsg)
      }
    }
  }, [
    model.id, // Only use stable ID, not entire model object
    template.id, // Only use stable ID
    processedTemplate,
    processedFieldData,
    renderMode,
    deckId,
    user?.id, // Only user ID, not entire user object
    timeout,
    onRenderComplete,
    onRenderError,
    sendMessageToIframe,
    updateMediaState,
    enablePerformanceMonitoring,
    renderMetrics.templateProcessingTime,
    renderMetrics.mediaResolutionTime
  ])

  // Set up message listener once
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage)
    return () => {
      window.removeEventListener('message', handleIframeMessage)
    }
  }, [handleIframeMessage])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set timeout for initialization
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setError('Iframe initialization timeout')
        onRenderError?.('Iframe initialization timeout')
      }
    }, timeout)
  }, [isLoading, timeout, onRenderError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      pendingRequestsRef.current.clear()
      rendererRef.current.cleanup()
    }
  }, [])

  // Trigger render when dependencies change
  useEffect(() => {
    if (!isLoading && iframeRef.current && processedTemplate) {
      renderCard()
    }
  }, [isLoading, processedTemplate, processedFieldData, renderCard])

  // Memoized calculations
  const iframeHeight = useMemo(() => 
    Math.min(dimensions.height || 200, maxHeight), 
    [dimensions.height, maxHeight]
  )

  const showMediaLoading = mediaLoadingState.loadingCount > 0
  const showMediaErrors = mediaLoadingState.failedCount > 0

  // Performance monitoring callback
  const onRenderProfiler = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (!enablePerformanceMonitoring) return

    if (actualDuration > 16) {
      debugLogger.warn('[CARD_RENDERER]', 'Slow render detected', {
        component: id,
        phase,
        actualDuration: Math.round(actualDuration),
        baseDuration: Math.round(baseDuration),
        renderMode,
        deckId
      })
    }
  }, [enablePerformanceMonitoring, renderMode, deckId])

  const rendererContent = (
    <div className={`secure-card-renderer ${className}`}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Render Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {renderResult && renderResult.securityWarnings.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Security Warnings:</strong>
          <ul className="mt-2">
            {renderResult.securityWarnings.map((warning, index) => (
              <li key={index} className="text-sm">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Optimized media loading indicators */}
      {showMediaLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-2 text-sm">
          Loading media... ({mediaLoadingState.loadingCount} files)
        </div>
      )}
      
      {showMediaErrors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2 text-sm">
          Media errors: {mediaLoadingState.failedCount} files failed to load
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-gray-600">Loading secure renderer...</div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcdoc}
          sandbox="allow-scripts"
          onLoad={handleIframeLoad}
          style={{
            ...DEFAULT_IFRAME_STYLE,
            height: `${iframeHeight}px`
          }}
          title={`Anki card: ${model.name} - ${template.name}`}
          allowTransparency
        />
      </div>

      {/* Performance debug info */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold">Performance Debug Info</summary>
          <div className="mt-2 space-y-2">
            <div>
              <strong>Total Render Time:</strong> {Math.round(renderMetrics.totalRenderTime)}ms
            </div>
            <div>
              <strong>Template Processing:</strong> {Math.round(renderMetrics.templateProcessingTime)}ms
            </div>
            <div>
              <strong>Media Resolution:</strong> {Math.round(renderMetrics.mediaResolutionTime)}ms
            </div>
            <div>
              <strong>Media Loading:</strong> {mediaLoadingState.loadedCount} loaded, {mediaLoadingState.failedCount} failed
            </div>
          </div>
        </details>
      )}
    </div>
  )

  // Wrap with Profiler for performance monitoring
  if (enablePerformanceMonitoring) {
    return (
      <Profiler id="SecureCardRenderer" onRender={onRenderProfiler}>
        {rendererContent}
      </Profiler>
    )
  }

  return rendererContent
})

// Display name for React DevTools
SecureCardRenderer.displayName = 'SecureCardRenderer'

// Custom comparison function for React.memo optimization
const arePropsEqual = (
  prevProps: SecureCardRendererProps,
  nextProps: SecureCardRendererProps
): boolean => {
  // Only re-render if essential props change
  return (
    prevProps.model.id === nextProps.model.id &&
    prevProps.template.id === nextProps.template.id &&
    prevProps.renderMode === nextProps.renderMode &&
    prevProps.deckId === nextProps.deckId &&
    JSON.stringify(prevProps.fieldData) === JSON.stringify(nextProps.fieldData) &&
    prevProps.maxHeight === nextProps.maxHeight &&
    prevProps.timeout === nextProps.timeout
  )
}

// Export memoized component with custom comparison
export default memo(SecureCardRenderer, arePropsEqual)
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AnkiModel, AnkiTemplate, RenderingContext, SanitizationResult } from '../../../../shared/types/anki'
import { SecureRenderer } from '../../services/anki/SecureRenderer'

interface SecureCardRendererProps {
  model: AnkiModel
  template: AnkiTemplate
  fieldData: Record<string, string>
  renderMode: 'question' | 'answer'
  mediaMap?: Record<string, string>
  onRenderComplete?: (result: SanitizationResult) => void
  onRenderError?: (error: string) => void
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void
  className?: string
  maxHeight?: number
  timeout?: number
}

interface IframeMessage {
  type: string
  data?: any
  requestId?: string
  timestamp?: number
  source?: string
}

interface IframeDimensions {
  width: number
  height: number
}

export const SecureCardRenderer: React.FC<SecureCardRendererProps> = ({
  model,
  template,
  fieldData,
  renderMode,
  mediaMap = {},
  onRenderComplete,
  onRenderError,
  onDimensionsChange,
  className = '',
  maxHeight = 600,
  timeout = 5000
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rendererRef = useRef<SecureRenderer>(new SecureRenderer())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageIdRef = useRef<number>(0)
  const pendingRequestsRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map())

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<IframeDimensions>({ width: 0, height: 0 })
  const [renderResult, setRenderResult] = useState<SanitizationResult | null>(null)

  // Generate unique message ID
  const generateMessageId = useCallback((): string => {
    return `msg_${Date.now()}_${++messageIdRef.current}`
  }, [])

  // Send message to iframe with timeout handling
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

      // Send message
      try {
        iframe.contentWindow.postMessage(message, window.location.origin)
        
        // Clear timeout when resolved
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

  // Handle messages from iframe
  const handleIframeMessage = useCallback((event: MessageEvent) => {
    // Validate origin
    if (event.origin !== window.location.origin) {
      console.warn('SecureCardRenderer: Message from unexpected origin:', event.origin)
      return
    }

    const { type, data, requestId } = event.data as IframeMessage

    if (!type || !requestId) {
      console.warn('SecureCardRenderer: Invalid message format')
      return
    }

    // Handle response to pending request
    if (pendingRequestsRef.current.has(requestId)) {
      const { resolve } = pendingRequestsRef.current.get(requestId)!
      pendingRequestsRef.current.delete(requestId)
      resolve(data)
      return
    }

    // Handle unsolicited messages
    switch (type) {
      case 'iframe_ready':
        setIsLoading(false)
        renderCard()
        break

      case 'card_ready':
        if (data.dimensions) {
          setDimensions(data.dimensions)
          onDimensionsChange?.(data.dimensions)
        }
        break

      case 'dimensions_changed':
        if (data.dimensions) {
          setDimensions(data.dimensions)
          onDimensionsChange?.(data.dimensions)
        }
        break

      case 'error':
        const errorMsg = data.message || 'Unknown iframe error'
        console.error('SecureCardRenderer iframe error:', errorMsg)
        setError(errorMsg)
        onRenderError?.(errorMsg)
        break

      case 'heartbeat':
        // Handle heartbeat for monitoring
        console.debug('SecureCardRenderer heartbeat:', data)
        break

      default:
        console.debug('SecureCardRenderer: Unhandled message type:', type)
    }
  }, [onDimensionsChange, onRenderError])

  // Render card content in iframe
  const renderCard = useCallback(async () => {
    try {
      setError(null)
      
      // Sanitize content using SecureRenderer
      const result = await rendererRef.current.renderAnkiCard(
        model,
        template,
        fieldData,
        renderMode
      )

      setRenderResult(result)

      if (!result.isSecure) {
        console.warn('SecureCardRenderer: Security warnings detected:', result.securityWarnings)
      }

      // Create rendering context
      const context: RenderingContext = {
        modelId: model.id,
        templateId: template.id,
        fieldData,
        mediaMap,
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
        mediaMap: context.mediaMap
      })

      onRenderComplete?.(result)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to render card'
      console.error('SecureCardRenderer render error:', error)
      setError(errorMsg)
      onRenderError?.(errorMsg)
    }
  }, [model, template, fieldData, renderMode, mediaMap, onRenderComplete, onRenderError, sendMessageToIframe])

  // Generate CSP nonce
  const generateCSPNonce = useCallback((): string => {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }, [])

  // Create iframe srcdoc with strict CSP
  const createIframeSrcdoc = useCallback((): string => {
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
            .secure-fallback {
              padding: 20px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              color: #6c757d;
              font-style: italic;
              text-align: center;
            }
            .cloze-deletion {
              background-color: #007bff;
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-weight: bold;
            }
            .type-field {
              background-color: #e9ecef;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 14px;
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
  }, [generateCSPNonce])

  // Get bootstrap script content
  const getBootstrapScript = useCallback((): string => {
    // In production, this would load from the public file
    // For now, we'll inline a minimal version
    return `
      // Minimal inline bootstrap for security
      (function() {
        let isReady = false;
        
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
                
                const dimensions = {
                  width: Math.max(document.body.scrollWidth, document.body.offsetWidth),
                  height: Math.max(document.body.scrollHeight, document.body.offsetHeight)
                };
                
                sendMessage('card_ready', { 
                  dimensions: dimensions,
                  mediaCount: { total: document.querySelectorAll('img, audio, video').length }
                });
              } catch (error) {
                sendMessage('error', { message: error.message });
              }
              break;
          }
        });
        
        // Signal ready
        sendMessage('iframe_ready', { timestamp: Date.now() });
      })();
    `
  }, [])

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage)
    return () => {
      window.removeEventListener('message', handleIframeMessage)
    }
  }, [handleIframeMessage])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    // Iframe loaded, bootstrap script should initialize
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

  // Re-render when props change
  useEffect(() => {
    if (!isLoading && iframeRef.current) {
      renderCard()
    }
  }, [model.id, template.id, renderMode, fieldData, renderCard, isLoading])

  // Calculate iframe height
  const iframeHeight = Math.min(dimensions.height || 200, maxHeight)

  return (
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

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-gray-600">Loading secure renderer...</div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          srcDoc={createIframeSrcdoc()}
          sandbox="allow-scripts"
          onLoad={handleIframeLoad}
          style={{
            width: '100%',
            height: `${iframeHeight}px`,
            border: 'none',
            borderRadius: '8px',
            backgroundColor: 'white'
          }}
          title={`Anki card: ${model.name} - ${template.name}`}
          allowTransparency
        />
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && renderResult && (
        <details className="mt-4 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold">Render Debug Info</summary>
          <div className="mt-2 space-y-2">
            <div>
              <strong>Sanitization Time:</strong> {renderResult.sanitizationTime}ms
            </div>
            <div>
              <strong>Security Level:</strong> {renderResult.isSecure ? 'Secure' : 'Warning'}
            </div>
            <div>
              <strong>Media References:</strong> {renderResult.mediaReferences.length}
            </div>
            <div>
              <strong>Removed Elements:</strong> {renderResult.removedElements.join(', ') || 'None'}
            </div>
            <div>
              <strong>Iframe Dimensions:</strong> {dimensions.width} × {dimensions.height}
            </div>
          </div>
        </details>
      )}
    </div>
  )
}
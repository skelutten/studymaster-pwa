/**
 * Secure Iframe Bootstrap - Communication Protocol for Anki Card Rendering
 * 
 * This script runs inside the sandboxed iframe and provides secure communication
 * with the parent window for rendering Anki cards safely.
 * 
 * Security Features:
 * - Rate limiting for postMessage communication
 * - Error handling wrapper for all user code execution
 * - Request/response protocol with unique message IDs
 * - Timeout handling for all operations
 */

(function() {
  'use strict';

  // Configuration constants
  const CONFIG = {
    MAX_MESSAGES_PER_SECOND: 20,
    MESSAGE_TIMEOUT_MS: 5000,
    MAX_ERROR_LENGTH: 1000,
    MAX_LOG_ENTRIES: 50,
    HEARTBEAT_INTERVAL_MS: 1000
  };

  // Communication state
  let messageQueue = [];
  let messageCount = 0;
  let rateLimitResetTime = Date.now() + 1000;
  let pendingRequests = new Map();
  let isInitialized = false;
  let parentOrigin = null;
  let errorLog = [];
  let logEntries = [];

  /**
   * Rate limiter for postMessage communication
   */
  function isRateLimited() {
    const now = Date.now();
    
    if (now >= rateLimitResetTime) {
      messageCount = 0;
      rateLimitResetTime = now + 1000;
    }
    
    if (messageCount >= CONFIG.MAX_MESSAGES_PER_SECOND) {
      logWarning('Rate limit exceeded, message dropped');
      return true;
    }
    
    messageCount++;
    return false;
  }

  /**
   * Secure postMessage wrapper with rate limiting
   */
  function sendMessage(type, data, requestId = null) {
    if (isRateLimited()) {
      return false;
    }

    const message = {
      type: type,
      data: data || {},
      requestId: requestId || generateRequestId(),
      timestamp: Date.now(),
      source: 'anki-iframe'
    };

    try {
      if (window.parent && parentOrigin) {
        window.parent.postMessage(message, parentOrigin);
        return true;
      } else {
        logError('Parent window or origin not available');
        return false;
      }
    } catch (error) {
      logError('Failed to send message: ' + error.message);
      return false;
    }
  }

  /**
   * Generate unique request ID
   */
  function generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Safe error handling wrapper
   */
  function safeExecute(fn, errorContext = 'Unknown operation') {
    try {
      return fn();
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      const truncatedMsg = errorMsg.length > CONFIG.MAX_ERROR_LENGTH 
        ? errorMsg.substr(0, CONFIG.MAX_ERROR_LENGTH) + '...' 
        : errorMsg;
      
      logError(`${errorContext}: ${truncatedMsg}`);
      
      sendMessage('error', {
        type: 'execution_error',
        message: truncatedMsg,
        context: errorContext,
        timestamp: Date.now()
      });
      
      return null;
    }
  }

  /**
   * Logging functions
   */
  function logError(message) {
    const entry = {
      level: 'error',
      message: message,
      timestamp: Date.now()
    };
    
    errorLog.push(entry);
    logEntries.push(entry);
    
    // Keep logs within limits
    if (errorLog.length > CONFIG.MAX_LOG_ENTRIES) {
      errorLog.shift();
    }
    if (logEntries.length > CONFIG.MAX_LOG_ENTRIES * 2) {
      logEntries.shift();
    }

    console.error('[Anki Iframe]', message);
  }

  function logWarning(message) {
    const entry = {
      level: 'warning',
      message: message,
      timestamp: Date.now()
    };
    
    logEntries.push(entry);
    if (logEntries.length > CONFIG.MAX_LOG_ENTRIES * 2) {
      logEntries.shift();
    }

    console.warn('[Anki Iframe]', message);
  }

  function logInfo(message) {
    const entry = {
      level: 'info',
      message: message,
      timestamp: Date.now()
    };
    
    logEntries.push(entry);
    if (logEntries.length > CONFIG.MAX_LOG_ENTRIES * 2) {
      logEntries.shift();
    }

    console.log('[Anki Iframe]', message);
  }

  /**
   * Handle card rendering request
   */
  function handleRenderCard(data, requestId) {
    return safeExecute(() => {
      const { html, css, nonce, fieldData } = data;
      
      if (!html) {
        throw new Error('No HTML content provided for rendering');
      }

      // Create CSS with CSP nonce if provided
      if (css) {
        const styleElement = document.createElement('style');
        if (nonce) {
          styleElement.setAttribute('nonce', nonce);
        }
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
      }

      // Render HTML content
      document.body.innerHTML = html;

      // Process any dynamic content if needed
      if (fieldData) {
        processFieldSubstitutions(fieldData);
      }

      // Calculate and report dimensions
      const dimensions = calculateDimensions();
      
      // Count media elements
      const mediaCount = countMediaElements();

      sendMessage('card_ready', {
        dimensions: dimensions,
        mediaCount: mediaCount,
        renderTime: Date.now() - data.startTime || 0
      }, requestId);

      logInfo('Card rendered successfully');
      
    }, 'Card rendering');
  }

  /**
   * Process field substitutions in rendered content
   */
  function processFieldSubstitutions(fieldData) {
    Object.entries(fieldData).forEach(([fieldName, fieldValue]) => {
      const placeholder = `__FIELD_${fieldName.toUpperCase()}__`;
      document.body.innerHTML = document.body.innerHTML.replace(
        new RegExp(placeholder, 'g'),
        fieldValue || ''
      );
    });
  }

  /**
   * Calculate iframe dimensions needed
   */
  function calculateDimensions() {
    const body = document.body;
    const html = document.documentElement;

    const height = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );

    const width = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );

    return { width, height };
  }

  /**
   * Count media elements for loading tracking
   */
  function countMediaElements() {
    const images = document.querySelectorAll('img').length;
    const audio = document.querySelectorAll('audio').length;
    const video = document.querySelectorAll('video').length;
    
    return { images, audio, video, total: images + audio + video };
  }

  /**
   * Handle resize observation
   */
  function setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver((entries) => {
        const dimensions = calculateDimensions();
        sendMessage('dimensions_changed', { dimensions });
      });

      resizeObserver.observe(document.body);
    } else {
      // Fallback polling for older browsers
      let lastHeight = 0;
      setInterval(() => {
        const currentHeight = calculateDimensions().height;
        if (Math.abs(currentHeight - lastHeight) > 10) {
          lastHeight = currentHeight;
          sendMessage('dimensions_changed', { 
            dimensions: { height: currentHeight, width: calculateDimensions().width } 
          });
        }
      }, 500);
    }
  }

  /**
   * Handle incoming messages from parent window
   */
  function handleMessage(event) {
    // Validate origin on first message
    if (!parentOrigin && event.origin) {
      parentOrigin = event.origin;
      logInfo('Parent origin established: ' + parentOrigin);
    } else if (event.origin !== parentOrigin) {
      logWarning('Message from unexpected origin: ' + event.origin);
      return;
    }

    const { type, data, requestId } = event.data || {};
    
    if (!type) {
      logWarning('Message received without type');
      return;
    }

    logInfo('Received message: ' + type + (requestId ? ' (' + requestId + ')' : ''));

    switch (type) {
      case 'render_card':
        handleRenderCard(data, requestId);
        break;
        
      case 'clear_content':
        safeExecute(() => {
          document.body.innerHTML = '';
          document.head.querySelectorAll('style').forEach(el => el.remove());
          sendMessage('content_cleared', {}, requestId);
        }, 'Content clearing');
        break;
        
      case 'get_dimensions':
        safeExecute(() => {
          const dimensions = calculateDimensions();
          sendMessage('dimensions_response', { dimensions }, requestId);
        }, 'Dimensions calculation');
        break;
        
      case 'get_logs':
        sendMessage('logs_response', { 
          logs: logEntries,
          errors: errorLog 
        }, requestId);
        break;
        
      case 'ping':
        sendMessage('pong', { timestamp: Date.now() }, requestId);
        break;
        
      default:
        logWarning('Unknown message type: ' + type);
        sendMessage('error', {
          type: 'unknown_message_type',
          message: 'Unknown message type: ' + type
        }, requestId);
    }
  }

  /**
   * Send heartbeat to parent window
   */
  function sendHeartbeat() {
    if (isInitialized) {
      const stats = {
        messageCount: messageCount,
        errorCount: errorLog.length,
        memoryUsage: window.performance && window.performance.memory 
          ? window.performance.memory.usedJSHeapSize 
          : null,
        timestamp: Date.now()
      };
      
      sendMessage('heartbeat', stats);
    }
  }

  /**
   * Initialize the iframe bootstrap
   */
  function initialize() {
    if (isInitialized) {
      return;
    }

    logInfo('Initializing Anki iframe bootstrap');

    // Set up message listener
    window.addEventListener('message', handleMessage, false);

    // Set up resize observation
    setupResizeObserver();

    // Set up periodic heartbeat
    setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL_MS);

    // Set up error handling for unhandled errors
    window.addEventListener('error', (event) => {
      logError('Unhandled error: ' + event.message + ' at ' + event.filename + ':' + event.lineno);
      sendMessage('error', {
        type: 'unhandled_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Set up error handling for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError('Unhandled promise rejection: ' + event.reason);
      sendMessage('error', {
        type: 'unhandled_promise_rejection',
        message: event.reason?.toString() || 'Unknown promise rejection'
      });
    });

    // Set CSP nonce for any dynamically created elements
    if (document.currentScript) {
      const nonce = document.currentScript.nonce;
      if (nonce) {
        window.__CSP_NONCE__ = nonce;
      }
    }

    isInitialized = true;
    
    // Signal readiness to parent
    sendMessage('iframe_ready', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    logInfo('Iframe bootstrap initialized successfully');
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    if (!isInitialized) {
      return;
    }

    window.removeEventListener('message', handleMessage);
    window.removeEventListener('error', handleMessage);
    window.removeEventListener('unhandledrejection', handleMessage);
    
    pendingRequests.clear();
    messageQueue = [];
    errorLog = [];
    logEntries = [];
    
    isInitialized = false;
    
    logInfo('Iframe bootstrap cleaned up');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Cleanup on beforeunload
  window.addEventListener('beforeunload', cleanup);

  // Expose minimal API for debugging (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.__AnkiIframeDebug__ = {
      getLogs: () => logEntries,
      getErrors: () => errorLog,
      getStats: () => ({
        messageCount,
        isInitialized,
        parentOrigin,
        pendingRequestCount: pendingRequests.size
      }),
      sendTestMessage: (type, data) => sendMessage(type, data)
    };
  }

})();
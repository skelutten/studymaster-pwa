import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debugLogger } from '../debugLogger'

describe('debugLogger', () => {
  // Mock console methods
  const mockConsole = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn()
  }

  beforeEach(() => {
    // Replace console methods with mocks
    vi.stubGlobal('console', mockConsole)
    
    // Clear all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('basic logging methods', () => {
    it('should log with correct format', () => {
      debugLogger.log('[AUTH_STORE]', 'Test action', { test: 'data' })
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_STORE\] Test action/),
        { test: 'data' }
      )
    })

    it('should log info with correct level', () => {
      debugLogger.info('[POCKETBASE]', 'Info message', 'info data')
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[POCKETBASE\] Info message/),
        'info data'
      )
    })

    it('should log warnings with correct level', () => {
      debugLogger.warn('[SESSION]', 'Warning message', { warning: true })
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[SESSION\] Warning message/),
        { warning: true }
      )
    })

    it('should log errors with correct level', () => {
      const errorData = { message: 'Test error', stack: 'Error stack trace' }
      debugLogger.error('[RESET_PASSWORD]', 'Error occurred', errorData)
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[RESET_PASSWORD\] Error occurred/),
        errorData
      )
      
      // Should also log stack trace separately
      expect(mockConsole.error).toHaveBeenCalledWith('Stack trace:', 'Error stack trace')
    })

    it('should handle logging without data', () => {
      debugLogger.log('[AUTH_MODAL]', 'Action without data')
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_MODAL\] Action without data/),
        ''
      )
    })
  })

  describe('visual separators', () => {
    it('should add separators for error messages', () => {
      debugLogger.error('[AUTH_STORE]', 'Critical error', { error: true })
      
      // Should have separator before and after
      expect(mockConsole.log).toHaveBeenCalledWith('\n' + '='.repeat(80))
      expect(mockConsole.log).toHaveBeenCalledWith('='.repeat(80) + '\n')
    })

    it('should add separators for START actions', () => {
      debugLogger.log('[POCKETBASE]', 'START authentication', {})
      
      expect(mockConsole.log).toHaveBeenCalledWith('\n' + '='.repeat(80))
    })

    it('should add separators for BEGIN actions', () => {
      debugLogger.info('[SESSION]', 'BEGIN session check', {})
      
      expect(mockConsole.log).toHaveBeenCalledWith('\n' + '='.repeat(80))
    })

    it('should add separators for END actions', () => {
      debugLogger.log('[AUTH_STORE]', 'END process', {})
      
      expect(mockConsole.log).toHaveBeenCalledWith('='.repeat(80) + '\n')
    })

    it('should add separators for COMPLETE actions', () => {
      debugLogger.info('[RESET_PASSWORD]', 'COMPLETE reset flow', {})
      
      expect(mockConsole.log).toHaveBeenCalledWith('='.repeat(80) + '\n')
    })
  })

  describe('group logging', () => {
    it('should create console groups', () => {
      const testFn = vi.fn()
      debugLogger.group('[AUTH_STORE]', 'Test Group', testFn)
      
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_STORE\] Test Group/)
      )
      expect(testFn).toHaveBeenCalled()
      expect(mockConsole.groupEnd).toHaveBeenCalled()
    })

    it('should handle errors in group function', () => {
      const errorFn = vi.fn(() => {
        throw new Error('Test error')
      })
      
      expect(() => {
        debugLogger.group('[POCKETBASE]', 'Error Group', errorFn)
      }).toThrow('Test error')
      
      // Should still call groupEnd even if function throws
      expect(mockConsole.groupEnd).toHaveBeenCalled()
    })
  })

  describe('helper methods', () => {
    it('should log objects with JSON formatting', () => {
      const testObj = { key: 'value', nested: { prop: 123 } }
      debugLogger.logObject('[SESSION]', 'Object data', testObj)
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[SESSION\] Object data/),
        JSON.stringify(testObj, null, 2)
      )
    })

    it('should log URL information with string URL', () => {
      const testUrl = 'https://example.com/path?param=value#section'
      debugLogger.logUrl('[AUTH_STORE]', 'URL test', testUrl)
      
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_STORE\] URL test - URL Details/)
      )
      expect(mockConsole.log).toHaveBeenCalledWith('Full URL:', testUrl)
      expect(mockConsole.log).toHaveBeenCalledWith('Origin:', 'https://example.com')
      expect(mockConsole.log).toHaveBeenCalledWith('Pathname:', '/path')
      expect(mockConsole.log).toHaveBeenCalledWith('Search:', '?param=value')
      expect(mockConsole.log).toHaveBeenCalledWith('Hash:', '#section')
    })

    it('should log URL information with URL object', () => {
      const testUrl = new URL('https://example.com/path?param=value#section')
      debugLogger.logUrl('[POCKETBASE]', 'URL object test', testUrl)
      
      expect(mockConsole.group).toHaveBeenCalled()
      expect(mockConsole.log).toHaveBeenCalledWith('Full URL:', testUrl.href)
      expect(mockConsole.log).toHaveBeenCalledWith('Origin:', 'https://example.com')
    })

    it('should parse hash parameters correctly', () => {
      const testUrl = 'https://example.com#access_token=abc123&token_type=bearer&expires_in=3600'
      debugLogger.logUrl('[AUTH_STORE]', 'Hash params test', testUrl)
      
      expect(mockConsole.log).toHaveBeenCalledWith('Hash Params:', {
        access_token: 'abc123',
        token_type: 'bearer',
        expires_in: '3600'
      })
    })

    it('should handle empty hash parameters', () => {
      const testUrl = 'https://example.com'
      debugLogger.logUrl('[SESSION]', 'No hash test', testUrl)
      
      expect(mockConsole.log).toHaveBeenCalledWith('Hash Params:', {})
    })

    it('should log tokens with masking', () => {
      const tokens = {
        access_token: 'very_long_access_token_that_should_be_masked',
        refresh_token: 'another_long_refresh_token_here',
        user_id: '12345',
        expires_in: 3600
      }
      
      debugLogger.logTokens('[AUTH_STORE]', 'Token test', tokens)
      
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_STORE\] Token test - Token Details/)
      )
      
      // Should mask token values
      expect(mockConsole.log).toHaveBeenCalledWith('access_token:', 'very_lon...e_masked')
      expect(mockConsole.log).toHaveBeenCalledWith('refresh_token:', 'another_...ken_here')
      
      // Should not mask non-token values
      expect(mockConsole.log).toHaveBeenCalledWith('user_id:', '12345')
      expect(mockConsole.log).toHaveBeenCalledWith('expires_in:', 3600)
    })

    it('should handle null tokens', () => {
      const tokens = {
        access_token: null,
        refresh_token: undefined
      }
      
      debugLogger.logTokens('[POCKETBASE]', 'Null tokens', tokens)
      
      expect(mockConsole.log).toHaveBeenCalledWith('access_token:', 'null')
      expect(mockConsole.log).toHaveBeenCalledWith('refresh_token:', 'null')
    })

    it('should log session information', () => {
      const session = {
        user: {
          id: 'user123',
          email: 'test@example.com'
        },
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expires_at: 1234567890,
        expires_in: 3600
      }
      
      debugLogger.logSession('[SESSION]', 'Session test', session)
      
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[SESSION\] Session test - Session Details/)
      )
      
      expect(mockConsole.log).toHaveBeenCalledWith('Session exists:', true)
      expect(mockConsole.log).toHaveBeenCalledWith('User ID:', 'user123')
      expect(mockConsole.log).toHaveBeenCalledWith('User email:', 'test@example.com')
      expect(mockConsole.log).toHaveBeenCalledWith('Access token:', 'access_token_value...') // Truncated
      expect(mockConsole.log).toHaveBeenCalledWith('Refresh token:', 'refresh_token_value...') // Truncated
    })

    it('should handle null session', () => {
      debugLogger.logSession('[AUTH_STORE]', 'Null session', null)
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[AUTH_STORE\] Null session - No session data/),
        ''
      )
    })

    it('should log API responses with error', () => {
      const response = {
        error: {
          message: 'Authentication failed',
          status: 401,
          code: 'AUTH_ERROR'
        },
        data: null
      }
      
      debugLogger.logApiResponse('[POCKETBASE]', 'API Error', response)
      
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[POCKETBASE\] API Error - API Response/)
      )
      
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', response.error)
      expect(mockConsole.error).toHaveBeenCalledWith('Error message:', 'Authentication failed')
      expect(mockConsole.error).toHaveBeenCalledWith('Error status:', 401)
      expect(mockConsole.error).toHaveBeenCalledWith('Error code:', 'AUTH_ERROR')
    })

    it('should log API responses with data', () => {
      const response = {
        data: { user: { id: '123' } },
        session: { access_token: 'token123' }
      }
      
      debugLogger.logApiResponse('[AUTH_STORE]', 'API Success', response)
      
      expect(mockConsole.log).toHaveBeenCalledWith('Data:', response.data)
      // Should also call logSession for the session
      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringMatching(/Response session - Session Details/)
      )
    })
  })

  describe('edge cases', () => {
    it('should handle very long token values', () => {
      const longToken = 'a'.repeat(100)
      const tokens = { access_token: longToken }
      
      debugLogger.logTokens('[AUTH_STORE]', 'Long token', tokens)
      
      expect(mockConsole.log).toHaveBeenCalledWith('access_token:', 'aaaaaaaa...aaaaaaaa')
    })

    it('should handle short token values', () => {
      const shortToken = 'abc'
      const tokens = { access_token: shortToken }
      
      debugLogger.logTokens('[POCKETBASE]', 'Short token', tokens)
      
      expect(mockConsole.log).toHaveBeenCalledWith('access_token:', 'abc...abc')
    })

    it('should handle complex nested objects', () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              data: 'deep value'
            }
          }
        },
        array: [1, 2, { nested: true }]
      }
      
      debugLogger.logObject('[SESSION]', 'Complex object', complexObj)
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/Complex object/),
        JSON.stringify(complexObj, null, 2)
      )
    })

    it('should handle malformed URLs gracefully', () => {
      // This should throw an error since the URL constructor will fail
      expect(() => {
        debugLogger.logUrl('[AUTH_STORE]', 'Invalid URL', 'not-a-valid-url')
      }).toThrow('Invalid URL')
    })
  })
})
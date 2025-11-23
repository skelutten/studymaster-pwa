/**
 * Debug Logger Utility
 * Provides consistent logging format for debugging authentication issues
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

type LogLevel = 'log' | 'warn' | 'error' | 'info';
type LogPrefix =
  | '[RESET_PASSWORD]'
  | '[AUTH_STORE]'
  | '[POCKETBASE]'
  | '[AUTH_MODAL]'
  | '[SESSION]'
  | '[MEDIA_CONTEXT]'
  | '[MEDIA_CONTEXT_OPT]'
  | '[MEDIA_AUTH]'
  | '[MEDIA_SECURITY]'
  | '[USER_DATA_SERVICE]';

interface LogEntry {
  timestamp: string;
  prefix: LogPrefix;
  action: string;
  data?: any;
  level?: LogLevel;
}

class DebugLogger {
  private enabled = true;

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private formatMessage(entry: LogEntry): string {
    return `${entry.timestamp} ${entry.prefix} ${entry.action}`;
  }

  private logWithLevel(entry: LogEntry) {
    if (!this.enabled) return;

    const message = this.formatMessage(entry);
    const level = entry.level || 'log';

    // Create a visual separator for important operations
    if (level === 'error' || entry.action.includes('START') || entry.action.includes('BEGIN')) {
      console.log(`\n${'='.repeat(80)}`);
    }

    // Log the message with appropriate console method
    switch (level) {
      case 'error':
        console.error(message, entry.data || '');
        if (entry.data?.stack) {
          console.error('Stack trace:', entry.data.stack);
        }
        break;
      case 'warn':
        console.warn(message, entry.data || '');
        break;
      case 'info':
        console.info(message, entry.data || '');
        break;
      default:
        console.log(message, entry.data || '');
    }

    // Add separator after important operations
    if (level === 'error' || entry.action.includes('END') || entry.action.includes('COMPLETE')) {
      console.log(`${'='.repeat(80)}\n`);
    }
  }

  log(prefix: LogPrefix, action: string, data?: any) {
    this.logWithLevel({
      timestamp: this.formatTimestamp(),
      prefix,
      action,
      data,
      level: 'log'
    });
  }

  info(prefix: LogPrefix, action: string, data?: any) {
    this.logWithLevel({
      timestamp: this.formatTimestamp(),
      prefix,
      action,
      data,
      level: 'info'
    });
  }

  warn(prefix: LogPrefix, action: string, data?: any) {
    this.logWithLevel({
      timestamp: this.formatTimestamp(),
      prefix,
      action,
      data,
      level: 'warn'
    });
  }

  error(prefix: LogPrefix, action: string, data?: any) {
    this.logWithLevel({
      timestamp: this.formatTimestamp(),
      prefix,
      action,
      data,
      level: 'error'
    });
  }

  group(prefix: LogPrefix, groupName: string, fn: () => void) {
    if (!this.enabled) {
      fn();
      return;
    }

    console.group(`${this.formatTimestamp()} ${prefix} ${groupName}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  // Helper to log objects in a readable format
  logObject(prefix: LogPrefix, action: string, obj: any) {
    this.log(prefix, action, JSON.stringify(obj, null, 2));
  }

  // Helper to log URL information
  logUrl(prefix: LogPrefix, action: string, url: string | URL) {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const urlInfo = {
      href: urlObj.href,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      searchParams: Object.fromEntries(urlObj.searchParams),
      hashParams: this.parseHashParams(urlObj.hash)
    };
    this.group(prefix, `${action} - URL Details`, () => {
      console.log('Full URL:', urlInfo.href);
      console.log('Origin:', urlInfo.origin);
      console.log('Pathname:', urlInfo.pathname);
      console.log('Search:', urlInfo.search);
      console.log('Hash:', urlInfo.hash);
      console.log('Search Params:', urlInfo.searchParams);
      console.log('Hash Params:', urlInfo.hashParams);
    });
  }

  // Helper to parse hash parameters
  private parseHashParams(hash: string): Record<string, string> {
    if (!hash || hash === '#') return {};
    
    const params: Record<string, string> = {};
    const hashWithoutPound = hash.substring(1);
    
    // Split by & to get individual parameters
    const parts = hashWithoutPound.split('&');
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key) {
        params[key] = value || '';
      }
    }
    
    return params;
  }

  // Helper to log auth tokens
  logTokens(prefix: LogPrefix, action: string, tokens: Record<string, any>) {
    this.group(prefix, `${action} - Token Details`, () => {
      Object.entries(tokens).forEach(([key, value]) => {
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
          // Mask sensitive token values but show first/last few chars for debugging
          const masked = value ? `${String(value).slice(0, 8)}...${String(value).slice(-8)}` : 'null';
          console.log(`${key}:`, masked);
        } else {
          console.log(`${key}:`, value);
        }
      });
    });
  }

  // Helper to log session information
  logSession(prefix: LogPrefix, action: string, session: any) {
    if (!session) {
      this.warn(prefix, `${action} - No session data`);
      return;
    }

    this.group(prefix, `${action} - Session Details`, () => {
      console.log('Session exists:', !!session);
      console.log('User ID:', session.user?.id || 'No user');
      console.log('User email:', session.user?.email || 'No email');
      console.log('Access token:', session.access_token ? `${session.access_token.slice(0, 20)}...` : 'No token');
      console.log('Refresh token:', session.refresh_token ? `${session.refresh_token.slice(0, 20)}...` : 'No token');
      console.log('Expires at:', session.expires_at || 'No expiry');
      console.log('Expires in:', session.expires_in || 'No expiry info');
    });
  }

  // Helper to log API responses
  logApiResponse(prefix: LogPrefix, action: string, response: any) {
    this.group(prefix, `${action} - API Response`, () => {
      if (response.error) {
        console.error('Error:', response.error);
        if (response.error.message) console.error('Error message:', response.error.message);
        if (response.error.status) console.error('Error status:', response.error.status);
        if (response.error.code) console.error('Error code:', response.error.code);
      }
      if (response.data) {
        console.log('Data:', response.data);
      }
      if (response.session) {
        this.logSession(prefix, 'Response session', response.session);
      }
    });
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Export type for use in other files
export type { LogPrefix };
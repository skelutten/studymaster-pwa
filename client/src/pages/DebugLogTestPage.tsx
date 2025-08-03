import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { debugLogger } from '../utils/debugLogger';
import { useAuthStore } from '../stores/authStore';

function DebugLogTestPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    debugLogger.log('[RESET_PASSWORD]', 'Debug Log Test Page mounted');
    
    // Test simulating password reset URL
    const testPasswordResetUrl = () => {
      const baseUrl = window.location.origin;
      const mockTokens = {
        access_token: 'mock-access-token-12345',
        refresh_token: 'mock-refresh-token-67890',
        type: 'recovery'
      };
      
      const hashParams = new URLSearchParams(mockTokens).toString();
      const fullUrl = `${baseUrl}/reset-password#${hashParams}`;
      
      debugLogger.log('[RESET_PASSWORD]', 'Simulated password reset URL', {
        fullUrl,
        tokens: mockTokens
      });
      
      // Log current auth state
      debugLogger.log('[RESET_PASSWORD]', 'Current auth state', { isAuthenticated });
      
      // Test all logging methods
      debugLogger.info('[RESET_PASSWORD]', 'Testing info log level');
      debugLogger.warn('[RESET_PASSWORD]', 'Testing warn log level');
      debugLogger.error('[RESET_PASSWORD]', 'Testing error log level', {
        error: new Error('Test error'),
        code: 'TEST_ERROR'
      });
      
      // Test URL parsing
      debugLogger.logUrl('[RESET_PASSWORD]', 'Testing URL logging', fullUrl);
      
      // Test token logging
      debugLogger.logTokens('[RESET_PASSWORD]', 'Testing token logging', mockTokens);
      
      // Test grouped logging
      debugLogger.group('[RESET_PASSWORD]', 'Testing grouped logs', () => {
        console.log('Inside group 1');
        console.log('Inside group 2');
        console.log('Inside group 3');
      });
    };
    
    testPasswordResetUrl();
  }, [isAuthenticated]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Debug Log Test Page</h1>
      <p>Open your browser's console to see the debug logs.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Current Auth State:</h2>
        <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px' }}>
          {JSON.stringify({
            isAuthenticated,
            hasSession: !!session,
            userId: session?.user?.id,
            userEmail: session?.user?.email
          }, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h3>Instructions to test password reset flow:</h3>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Look for logs with prefixes: [RESET_PASSWORD], [AUTH_STORE], [SUPABASE]</li>
          <li>Navigate to the actual reset password page with a valid token</li>
          <li>Observe the detailed logging output</li>
        </ol>
      </div>
      
      <button 
        onClick={() => navigate('/reset-password')}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
      >
        Go to Reset Password Page
      </button>
    </div>
  );
}

export default DebugLogTestPage;
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { debugLogger } from '../utils/debugLogger';
import { supabase } from '../lib/supabase';

// Global state to prevent duplicate session establishment across component remounts
let globalSessionEstablishing = false;
let globalSessionPromise: Promise<{data: any, error: any}> | null = null;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword, signOut, session, isAuthenticated, isLoading, error: authError } = useSupabaseAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [urlTokens, setUrlTokens] = useState<Record<string, string>>({});
  const [sessionEstablishing, setSessionEstablishing] = useState(false);

  // Log component mount and URL details
  useEffect(() => {
    const mountId = Math.random().toString(36).substr(2, 9);
    debugLogger.log('[RESET_PASSWORD]', `START - Component mounted (ID: ${mountId})`, {
      globalSessionEstablishing,
      currentTime: new Date().toISOString()
    });
    
    // Log current URL details
    const currentUrl = window.location.href;
    debugLogger.logUrl('[RESET_PASSWORD]', 'Current URL analysis', currentUrl);
    
    // Extract and log tokens from URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    const tokens: Record<string, string> = {};
    
    // Extract from hash parameters
    debugLogger.group('[RESET_PASSWORD]', 'Extracting tokens from hash', () => {
      hashParams.forEach((value, key) => {
        debugLogger.log('[RESET_PASSWORD]', `Hash param found: ${key}`, value);
        tokens[`hash_${key}`] = value;
      });
    });
    
    // Extract from search parameters
    debugLogger.group('[RESET_PASSWORD]', 'Extracting tokens from search', () => {
      searchParams.forEach((value, key) => {
        debugLogger.log('[RESET_PASSWORD]', `Search param found: ${key}`, value);
        tokens[`search_${key}`] = value;
      });
    });
    
    // Look for specific auth-related tokens
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const type = hashParams.get('type') || searchParams.get('type');
    const error = hashParams.get('error') || searchParams.get('error');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    
    debugLogger.logTokens('[RESET_PASSWORD]', 'Auth tokens extracted', {
      accessToken,
      refreshToken,
      type,
      error,
      errorDescription,
      tokenCount: Object.keys(tokens).length
    });
    
    // Log the raw URL to see what we're actually getting
    debugLogger.log('[RESET_PASSWORD]', 'Raw URL breakdown', {
      fullUrl: currentUrl,
      hash: window.location.hash,
      search: window.location.search,
      hashLength: window.location.hash.length,
      searchLength: window.location.search.length
    });
    
    setUrlTokens(tokens);
    
    // Check for URL errors
    if (error) {
      debugLogger.error('[RESET_PASSWORD]', 'URL contains error', {
        error,
        description: errorDescription
      });
      setError(errorDescription || error);
      return;
    }
    
    // Handle password recovery tokens - use global Promise to prevent duplicates
    if (accessToken && refreshToken && type === 'recovery') {
      if (globalSessionPromise) {
        debugLogger.log('[RESET_PASSWORD]', 'Session establishment already in progress - reusing existing Promise');
        setSessionEstablishing(true);
        
        // Attach to existing promise
        globalSessionPromise
          .then(() => {
            debugLogger.log('[RESET_PASSWORD]', 'Existing session establishment completed');
            setSessionEstablishing(false);
          })
          .catch(() => {
            debugLogger.log('[RESET_PASSWORD]', 'Existing session establishment failed');
            setSessionEstablishing(false);
          });
      } else {
        debugLogger.log('[RESET_PASSWORD]', 'Recovery tokens found - starting new session establishment', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          accessTokenPreview: accessToken ? `${accessToken.slice(0, 20)}...` : 'null',
          refreshTokenPreview: refreshToken ? `${refreshToken.slice(0, 20)}...` : 'null'
        });
        
        // Set flags and create global promise
        globalSessionEstablishing = true;
        setSessionEstablishing(true);
        
        // Fallback timeout to clear sessionEstablishing flag
        setTimeout(() => {
          if (sessionEstablishing) {
            debugLogger.warn('[RESET_PASSWORD]', 'Fallback timeout - clearing sessionEstablishing flag after 20 seconds');
            setSessionEstablishing(false);
            globalSessionEstablishing = false;
            globalSessionPromise = null;
          }
        }, 20000);
        
        debugLogger.log('[RESET_PASSWORD]', 'Creating new setSession promise');
        
        // Create the global promise with timeout
        const setSessionPromise = supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        // Create timeout for session establishment
        const sessionTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            debugLogger.error('[RESET_PASSWORD]', 'Session establishment timed out after 15 seconds');
            reject(new Error('Session establishment timed out'));
          }, 15000);
        });
        
        // Race between setSession and timeout
        globalSessionPromise = Promise.race([setSessionPromise, sessionTimeoutPromise]);
        
        debugLogger.log('[RESET_PASSWORD]', 'setSession promise created with timeout - adding handlers');
        
        // Handle the promise
        globalSessionPromise
          .then(result => {
            debugLogger.log('[RESET_PASSWORD]', 'setSession RESOLVED successfully', {
              hasData: !!result.data,
              hasError: !!result.error,
              hasSession: !!result.data?.session,
              errorMessage: result.error?.message,
              sessionData: result.data?.session ? {
                userId: result.data.session.user?.id,
                email: result.data.session.user?.email,
                hasAccessToken: !!result.data.session.access_token
              } : null
            });
            
            if (result.error) {
              debugLogger.error('[RESET_PASSWORD]', 'Session establishment failed', result.error);
              setError('Invalid or expired reset link. Please request a new password reset.');
            } else {
              debugLogger.log('[RESET_PASSWORD]', 'Session established successfully - auth events should follow');
            }
            
            // Clear global state
            debugLogger.log('[RESET_PASSWORD]', 'Clearing global session state after Promise resolution');
            globalSessionEstablishing = false;
            globalSessionPromise = null;
            setSessionEstablishing(false);
          })
          .catch(err => {
            debugLogger.error('[RESET_PASSWORD]', 'setSession REJECTED with exception', {
              error: err,
              message: err?.message,
              stack: err?.stack
            });
            
            setError('Failed to process reset link. Please try again.');
            
            // Clear global state
            debugLogger.log('[RESET_PASSWORD]', 'Clearing global session state after Promise rejection');
            globalSessionEstablishing = false;
            globalSessionPromise = null;
            setSessionEstablishing(false);
          });
        
        debugLogger.log('[RESET_PASSWORD]', 'Global session promise created and handlers attached - waiting for resolution');
      }
      
    } else {
      debugLogger.warn('[RESET_PASSWORD]', 'No recovery tokens found in URL', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type: type || 'null',
        urlHasHash: window.location.hash.length > 0,
        urlHasSearch: window.location.search.length > 0
      });
    }
    
    // Log initial session state
    debugLogger.logSession('[RESET_PASSWORD]', 'Initial session state', session);
    debugLogger.log('[RESET_PASSWORD]', 'Initial auth state', {
      isAuthenticated,
      isLoading,
      hasSession: !!session
    });
    
    return () => {
      debugLogger.log('[RESET_PASSWORD]', `END - Component unmounting (ID: ${mountId})`, {
        globalSessionEstablishing,
        sessionEstablishing,
        hasGlobalPromise: !!globalSessionPromise,
        currentTime: new Date().toISOString()
      });
    };
  }, [session, isAuthenticated, isLoading, sessionEstablishing]);

  // Log session changes and clear session establishing flag when session is ready
  useEffect(() => {
    debugLogger.log('[RESET_PASSWORD]', 'Session effect triggered', {
      hasSession: !!session,
      sessionEstablishing,
      isAuthenticated,
      userId: session?.user?.id
    });
    
    if (session && isAuthenticated) {
      debugLogger.logSession('[RESET_PASSWORD]', 'New session detected', session);
      
      // Always clear session establishing flag when we have a valid session
      debugLogger.log('[RESET_PASSWORD]', 'Session is now available - clearing sessionEstablishing flag', {
        wasEstablishing: sessionEstablishing,
        globalFlag: globalSessionEstablishing
      });
      
      setSessionEstablishing(false);
      
      // Clear global flag too
      globalSessionEstablishing = false;
      globalSessionPromise = null;
    }
  }, [session, sessionEstablishing, isAuthenticated]);

  // Log auth errors
  useEffect(() => {
    if (authError) {
      debugLogger.error('[RESET_PASSWORD]', 'Auth error received', {
        error: authError,
        timestamp: new Date().toISOString()
      });
      setError(authError);
    }
  }, [authError]);

  // Remove excessive password field logging

  useEffect(() => {
    if (error) {
      debugLogger.warn('[RESET_PASSWORD]', 'Error state changed', {
        error,
        timestamp: new Date().toISOString()
      });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debugLogger.log('[RESET_PASSWORD]', 'START - Form submission', {
      passwordLength: password.length,
      passwordsMatch: password === confirmPassword,
      hasSession: !!session,
      isAuthenticated,
      sessionEstablishing,
      hasGlobalPromise: !!globalSessionPromise
    });
    
    // Prevent form submission if session is still being established
    if (sessionEstablishing || !session) {
      debugLogger.warn('[RESET_PASSWORD]', 'Form submission blocked - session not ready', {
        sessionEstablishing,
        hasSession: !!session,
        isAuthenticated
      });
      setError('Please wait for authentication to complete...');
      return;
    }
    
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      debugLogger.warn('[RESET_PASSWORD]', 'Validation failed', { error: errorMsg });
      setError(errorMsg);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      debugLogger.warn('[RESET_PASSWORD]', 'Validation failed', { error: errorMsg });
      setError(errorMsg);
      return;
    }

    try {
      debugLogger.log('[RESET_PASSWORD]', 'Calling updatePassword', {
        passwordLength: password.length,
        hasSession: !!session,
        isAuthenticated,
        timestamp: new Date().toISOString()
      });
      
      // Add UI timeout in case the updatePassword hangs
      const uiTimeoutId = setTimeout(() => {
        debugLogger.warn('[RESET_PASSWORD]', 'UI timeout - password update taking too long');
        setError('Password update is taking longer than expected. Please try refreshing the page.');
      }, 15000); // 15 second UI timeout
      
      try {
        const result = await updatePassword(password);
        clearTimeout(uiTimeoutId);
      } catch (updateError) {
        clearTimeout(uiTimeoutId);
        throw updateError;
      }
      
      debugLogger.log('[RESET_PASSWORD]', 'Password update successful', {
        result,
        timestamp: new Date().toISOString()
      });
      
      setSuccess(true);
      
      debugLogger.log('[RESET_PASSWORD]', 'Password updated successfully - signing out user to complete flow');
      
      // Sign out the user so they can sign in with their new password
      try {
        await signOut();
        debugLogger.log('[RESET_PASSWORD]', 'User signed out successfully after password update');
      } catch (signOutError) {
        debugLogger.warn('[RESET_PASSWORD]', 'Sign out failed, continuing with redirect', signOutError);
      }
      
      debugLogger.log('[RESET_PASSWORD]', 'Redirecting to home in 2 seconds');
      
      // Redirect to home page after successful password update
      const redirectDelay = 2000; // 2 seconds
      setTimeout(() => {
        debugLogger.log('[RESET_PASSWORD]', 'Executing redirect to home');
        navigate('/');
      }, redirectDelay);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      
      debugLogger.error('[RESET_PASSWORD]', 'Password update failed', {
        error: errorMessage,
        errorType: err?.constructor?.name,
        errorDetails: err,
        timestamp: new Date().toISOString()
      });
      
      setError(errorMessage);
    }
    
    debugLogger.log('[RESET_PASSWORD]', 'END - Form submission');
  };

  // Log loading state (only once)
  if (isLoading && !isAuthenticated) {
    return <div>Loading...</div>;
  }

  // Log success state
  if (success) {
    debugLogger.log('[RESET_PASSWORD]', 'Showing success state');
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1>✅ Password Updated Successfully!</h1>
        <p>Your password has been successfully updated and you have been signed out.</p>
        <p>Redirecting to home page where you can sign in with your new password...</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
          ⏳ Redirecting in 2 seconds...
        </p>
      </div>
    );
  }

  // Form renders without excessive logging

  return (
    <div>
      <h2>Reset Your Password</h2>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <div>
          <button 
            type="submit" 
            disabled={isLoading || sessionEstablishing || !session || !isAuthenticated}
          >
            {sessionEstablishing ? 'Establishing session...' : 
             isLoading ? 'Updating password...' : 
             !session ? 'Waiting for authentication...' :
             'Update Password'}
          </button>
          
          {sessionEstablishing && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>
                Taking longer than expected? 
                <button 
                  type="button" 
                  onClick={() => {
                    debugLogger.log('[RESET_PASSWORD]', 'Manual session clear triggered by user');
                    setSessionEstablishing(false);
                    globalSessionEstablishing = false;
                    globalSessionPromise = null;
                  }}
                  style={{ 
                    marginLeft: '0.5rem', 
                    padding: '0.25rem 0.5rem', 
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              </p>
            </div>
          )}
        </div>
      </form>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#666' }}>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({
            hasSession: !!session,
            isAuthenticated,
            isLoading,
            urlTokens: Object.keys(urlTokens),
            error
          }, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export default ResetPasswordPage;
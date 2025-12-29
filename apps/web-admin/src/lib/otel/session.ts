/**
 * Session Management for OTEL
 * Phase 6.1 - Admin Audit System (#415)
 */

const SESSION_STORAGE_KEY = 'otel_session_id';
const SESSION_EXPIRY_KEY = 'otel_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Get or create a session ID
 * Sessions expire after 30 minutes of inactivity
 */
export function getSessionId(): string {
  const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const expiryStr = sessionStorage.getItem(SESSION_EXPIRY_KEY);
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  const now = Date.now();

  // If session exists and not expired, refresh and return
  if (storedId && expiry > now) {
    refreshSession();
    return storedId;
  }

  // Create new session
  const newId = generateSessionId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
  sessionStorage.setItem(SESSION_EXPIRY_KEY, (now + SESSION_DURATION_MS).toString());

  return newId;
}

/**
 * Refresh session expiry
 */
export function refreshSession(): void {
  const now = Date.now();
  sessionStorage.setItem(SESSION_EXPIRY_KEY, (now + SESSION_DURATION_MS).toString());
}

/**
 * Clear session
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
}

/**
 * Get session metadata for spans
 */
export function getSessionMetadata(): Record<string, string> {
  return {
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: window.screen.width.toString(),
    screenHeight: window.screen.height.toString(),
  };
}

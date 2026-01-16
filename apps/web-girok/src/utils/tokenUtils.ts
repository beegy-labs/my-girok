/**
 * JWT Token Utility Functions
 */

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'ACCESS' | 'REFRESH';
  exp: number;
  iat: number;
}

/**
 * Decode JWT token without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Check if access token is expiring within threshold
 * Used for proactive access token refresh
 * @param token Access token
 * @param thresholdMinutes Minutes before expiry (default: 5)
 * @returns true if token expires within threshold
 */
export const isAccessTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expiryTime - currentTime;
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return timeUntilExpiry < thresholdMs && timeUntilExpiry > 0;
};

/**
 * Check if refresh token should be renewed
 * Renews when 7 days or less remaining (for 14-day tokens)
 * @param token Refresh token
 * @param thresholdDays Days before expiry (default: 7)
 * @returns true if token should be refreshed
 */
export const shouldRefreshToken = (token: string, thresholdDays: number = 7): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const daysUntilExpiry = (expiryTime - currentTime) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry <= thresholdDays && daysUntilExpiry > 0;
};

/**
 * Check if token is expired
 * @param token JWT token
 * @returns true if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const expiryTime = decoded.exp * 1000;
  return Date.now() >= expiryTime;
};

/**
 * Get time until token expiry
 * @param token JWT token
 * @returns milliseconds until expiry, or 0 if expired/invalid
 */
export const getTimeUntilExpiry = (token: string): number => {
  const decoded = decodeToken(token);
  if (!decoded) return 0;

  const expiryTime = decoded.exp * 1000;
  const timeUntilExpiry = expiryTime - Date.now();

  return Math.max(0, timeUntilExpiry);
};

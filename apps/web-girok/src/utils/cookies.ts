/**
 * Cookie management utilities
 * Used for client-side preference caching (theme, section order, etc.)
 */

export interface CookieOptions {
  expires?: number; // days
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Set a cookie
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const {
    expires = 365, // default 1 year
    path = '/',
    domain,
    secure = window.location.protocol === 'https:',
    sameSite = 'lax',
  } = options;

  const date = new Date();
  date.setTime(date.getTime() + expires * 24 * 60 * 60 * 1000);

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; expires=${date.toUTCString()}`;
  cookie += `; path=${path}`;

  if (domain) {
    cookie += `; domain=${domain}`;
  }

  if (secure) {
    cookie += '; secure';
  }

  cookie += `; samesite=${sameSite}`;

  document.cookie = cookie;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }

  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
}

/**
 * Get a cookie and parse it as JSON
 */
export function getCookieJSON<T>(name: string): T | null {
  const value = getCookie(name);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse cookie ${name} as JSON:`, error);
    return null;
  }
}

/**
 * Set a cookie with JSON stringified value
 */
export function setCookieJSON<T>(name: string, value: T, options: CookieOptions = {}): void {
  const jsonValue = JSON.stringify(value);
  setCookie(name, jsonValue, options);
}

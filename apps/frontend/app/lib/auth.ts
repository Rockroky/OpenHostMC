// Client-side authentication & session utility for OpenHostMC

export interface UserSession {
  id: string;
  email: string;
  username: string;
  role: string;
  planId?: string;
  plan_id?: string;
  plan?: {
    name: string;
    can_edit_shared_servers?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Parses JWT payload without external libraries to check expiration
 */
export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Saves authenticated session to both localStorage and cookie in perfect sync
 */
export function setSession(token: string, user: UserSession): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set localStorage session:', e);
  }

  // Set cookie with 7 days expiration, path=/, SameSite=Lax
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;

  // Notify all components in current window
  window.dispatchEvent(new Event('auth-change'));
}

/**
 * Clears authentication session from localStorage and removes the cookie
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (e) {
    console.error('Failed to clear localStorage session:', e);
  }

  // Expire cookie immediately
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';

  // Notify all components in current window
  window.dispatchEvent(new Event('auth-change'));
}

/**
 * Retrieves valid token if not expired, or automatically cleans up if expired
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (isJwtExpired(token)) {
    clearSession();
    return null;
  }

  return token;
}

/**
 * Retrieves cached user object from localStorage
 */
export function getUser(): UserSession | null {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Checks if user is currently authenticated with a non-expired token
 */
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

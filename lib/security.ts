/**
 * Security utilities for admin area.
 * - Input sanitization
 * - XSS prevention
 * - Rate limiting hooks
 * - Security headers
 */

/**
 * Sanitize a string to prevent XSS attacks.
 * Strips HTML tags and escapes special characters.
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Validate and sanitize a string input (for titles, descriptions, etc.)
 * Trims whitespace and removes control characters.
 */
export function sanitizeInput(input: string, maxLength = 5000): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Escape a string for safe use in HTML data attributes.
 */
export function escapeDataAttribute(value: string): string {
  return value.replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>');
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if the request appears to be from the same origin.
 */
export function isSameOrigin(url: string): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL to ensure it's safe for redirect.
 * Only allows relative paths and same-origin URLs.
 */
export function sanitizeRedirectUrl(url: string, fallback = '/'): string {
  if (!url) return fallback;
  // Only allow relative paths starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  // Allow same-origin absolute URLs
  if (isSameOrigin(url)) {
    return url;
  }
  return fallback;
}

/**
 * CSRF token generator (simple implementation for SPA).
 * In production, use server-side CSRF tokens with proper validation.
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Store and retrieve CSRF token in sessionStorage.
 */
const CSRF_KEY = '__awp_csrf';

export function getStoredCsrfToken(): string {
  if (typeof window === 'undefined') return '';
  let token = sessionStorage.getItem(CSRF_KEY);
  if (!token) {
    token = generateCsrfToken();
    sessionStorage.setItem(CSRF_KEY, token);
  }
  return token;
}

/**
 * Security headers that should be set by the server/CDN.
 * Documented here for reference; applied via next.config.mjs.
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

/**
 * Rate limiting configuration for admin actions.
 */
export const RATE_LIMITS = {
  /** Max Firestore write operations per 5 seconds */
  FIRESTORE_WRITES: { maxCalls: 5, windowMs: 5_000 },
  /** Max search/filter operations per second */
  SEARCH_OPS: { maxCalls: 3, windowMs: 1_000 },
  /** Max dialog opens per second */
  DIALOG_OPENS: { maxCalls: 2, windowMs: 1_000 },
} as const;

/**
 * Check if the current environment is secure (HTTPS or localhost).
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Log security events (can be extended to send to a monitoring service).
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Security] ${event}`, details || '');
  }
  // In production, send to a monitoring service
}
/**
 * Utility functions for fetching and handling favicons
 */

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get favicon URL for a given domain
 * Uses multiple fallback strategies to find the best favicon
 */
export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) {
    return '';
  }

  // Try Google's favicon service first (most reliable)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
}

/**
 * Get high-resolution favicon URL
 */
export function getHighResFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) {
    return '';
  }

  // Try Google's favicon service with higher resolution
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
} 
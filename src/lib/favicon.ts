export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) {
    return '';
  }

  // Try Google's favicon service first (most reliable)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
}

export function getHighResFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) {
    return '';
  }

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
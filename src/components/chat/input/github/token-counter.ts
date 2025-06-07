/**
 * Token counting utilities for estimating LLM token usage
 */

export const TOKEN_LIMIT = 32000; // Default token limit for GPT-4-32k

/**
 * Estimates the number of tokens for a given text
 * Uses the rough approximation of 1 token ≈ 4 characters
 * @param text - The text to count tokens for
 * @returns Estimated number of tokens
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Formats token count for display
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1.2K" for 1200)
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
}

/**
 * Calculates the percentage of token usage
 * @param usedTokens - Number of tokens used
 * @param totalTokens - Total token limit
 * @returns Percentage (0-100)
 */
export function getTokenUsagePercentage(
  usedTokens: number,
  totalTokens: number = TOKEN_LIMIT
): number {
  return Math.min((usedTokens / totalTokens) * 100, 100);
}

/**
 * Checks if adding more tokens would exceed the limit
 * @param currentTokens - Current token usage
 * @param additionalTokens - Tokens to add
 * @param limit - Token limit
 * @returns True if it would exceed the limit
 */
export function wouldExceedLimit(
  currentTokens: number,
  additionalTokens: number,
  limit: number = TOKEN_LIMIT
): boolean {
  return currentTokens + additionalTokens > limit;
}

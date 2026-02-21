/**
 * Indicator parsing and input utilities
 * @module lib/indicator
 */

/**
 * Parse raw indicator input into array of trimmed values
 * 
 * @param {string} raw - Raw input string with comma or newline separated indicators
 * @returns {string[]} Array of trimmed, non-empty indicator values
 * 
 * @example
 * parseIndicators('8.8.8.8, google.com\nexample.com')
 * // returns ['8.8.8.8', 'google.com', 'example.com']
 */
export const parseIndicators = (raw: string): string[] =>
  raw
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)

/**
 * Get placeholder text for indicator input field
 * 
 * @returns {string} Multi-line placeholder text with example indicators
 */
export const getInputPlaceholder = (): string => {
  return `8.8.8.8
google.com
https://example.com
user@example.com
192.168.1.1, amazon.com`
}

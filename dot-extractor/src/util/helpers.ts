/**
 * Helper utilities for data formatting and retries
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 429)
      if (error instanceof Error && error.message.includes('HTTP 4') && !error.message.includes('429')) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Format date for DOT API (MM/DD/YYYY to ISO)
 */
export function formatDateToISO(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toISOString();
}

/**
 * Format date for display (ISO to MM/DD/YYYY)
 */
export function formatDateForDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Clean and validate member ID
 */
export function cleanMemberId(memberId: string): string {
  return memberId.replace(/[^0-9A-Za-z]/g, '');
}

/**
 * Parse family member relationship
 */
export function parseRelationship(relationship: string): 'Subscriber' | 'Spouse' | 'Dependent' | 'Unknown' {
  const rel = relationship.toLowerCase();
  if (rel.includes('subscriber') || rel.includes('self')) return 'Subscriber';
  if (rel.includes('spouse') || rel.includes('wife') || rel.includes('husband')) return 'Spouse';
  if (rel.includes('child') || rel.includes('dependent') || rel.includes('son') || rel.includes('daughter')) return 'Dependent';
  return 'Unknown';
}
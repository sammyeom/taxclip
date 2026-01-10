/**
 * Email Text Parser
 * Extracts transaction data from order confirmation emails
 * Supports various formats: Amazon, eBay, PayPal, Shopify, etc.
 */

import { ParsedEmailData } from '@/types/evidence';

/**
 * Parse email confirmation text to extract transaction data
 * Works with both plain text and HTML (strips tags)
 */
export function parseEmailText(emailText: string): ParsedEmailData {
  // Strip HTML tags if present
  const text = stripHtmlTags(emailText).trim();

  // Normalize whitespace
  const normalizedText = text.replace(/\s+/g, ' ');

  const result: ParsedEmailData = {
    raw_text: text,
  };

  // Extract vendor/seller
  result.vendor = extractVendor(text, normalizedText);

  // Extract date
  result.date = extractDate(text, normalizedText);

  // Extract total amount
  result.total = extractTotal(text, normalizedText);

  // Extract order number
  result.order_number = extractOrderNumber(normalizedText);

  // Extract items
  result.items = extractItems(text);

  return result;
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract vendor/seller name from email
 */
function extractVendor(text: string, normalizedText: string): string | undefined {
  const patterns = [
    // Explicit seller mentions
    /(?:from|seller|sold\s*by|shipped\s*by|merchant|store|shop)[:\s]+([^\n\r,]+)/i,
    // Email "from" line
    /^from[:\s]+([^\n<]+)/im,
    // Common store patterns in subject/header
    /(?:order|confirmation|receipt)\s+(?:from|at)\s+([^\n\r,]+)/i,
    // Amazon specific
    /amazon\.com/i,
    // eBay specific
    /ebay/i,
    // PayPal specific
    /paypal/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern) || text.match(pattern);
    if (match) {
      // Handle special cases
      if (/amazon/i.test(match[0])) return 'Amazon';
      if (/ebay/i.test(match[0])) return 'eBay';
      if (/paypal/i.test(match[0])) return 'PayPal';

      const vendor = match[1]?.trim();
      if (vendor && vendor.length > 1 && vendor.length < 100) {
        // Clean up common suffixes
        return vendor
          .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?)$/i, '')
          .trim();
      }
    }
  }

  return undefined;
}

/**
 * Extract date from email
 */
function extractDate(text: string, normalizedText: string): string | undefined {
  const patterns = [
    // Explicit date labels
    /(?:order\s*date|date|placed\s*on|purchased|transaction\s*date|invoice\s*date)[:\s]*(\w+\s+\d{1,2},?\s*\d{4})/i,
    /(?:order\s*date|date|placed\s*on|purchased)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // ISO format
    /(\d{4}-\d{2}-\d{2})/,
    // Month Day, Year format
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4})/i,
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern) || text.match(pattern);
    if (match) {
      const normalized = normalizeDate(match[1]);
      if (normalized) return normalized;
    }
  }

  return undefined;
}

/**
 * Extract total amount from email
 */
function extractTotal(text: string, normalizedText: string): number | undefined {
  const patterns = [
    // Order total patterns
    /(?:order\s*total|grand\s*total|total\s*amount|total\s*charged|amount\s*charged|you\s*paid|total)[:\s]*\$?([\d,]+\.?\d*)/gi,
    // Transaction amount
    /(?:transaction|payment|charged)[:\s]*\$?([\d,]+\.\d{2})/gi,
    // Dollar amount with context
    /(?:total|amount|charged|paid)[:\s]*\$([\d,]+\.\d{2})/gi,
    // Standalone currency amounts (last resort)
    /\$([\d,]+\.\d{2})/g,
  ];

  let maxAmount = 0;
  let foundAmount = false;

  for (const pattern of patterns) {
    const matches = [...normalizedText.matchAll(pattern)];
    for (const match of matches) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        // Take the largest amount (usually the total)
        if (amount > maxAmount) {
          maxAmount = amount;
          foundAmount = true;
        }
      }
    }
    // If we found amounts with a specific pattern, don't fall through to generic patterns
    if (foundAmount && pattern.source.includes('total')) break;
  }

  return foundAmount ? maxAmount : undefined;
}

/**
 * Extract order/confirmation number from email
 */
function extractOrderNumber(normalizedText: string): string | undefined {
  const patterns = [
    /(?:order|confirmation|invoice|reference|tracking)[\s#:]*([A-Z0-9\-]{5,30})/i,
    /#\s*([A-Z0-9\-]{5,30})/i,
    /(?:order|confirmation)[\s#:]*(\d{3,}[\-\d]*)/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract line items from email
 */
function extractItems(text: string): string[] | undefined {
  const items: string[] = [];
  const seen = new Set<string>();

  const patterns = [
    // Quantity x Item format
    /(\d+)\s*[x×]\s*([^\n$]+?)(?:\s*\$[\d.]+)?(?:\n|$)/gi,
    // Item - $Price format
    /^\s*([A-Z][A-Za-z0-9\s,'-]+?)\s*[-–]\s*\$[\d.]+/gm,
    // Item name followed by price
    /^([A-Z][A-Za-z0-9\s,'-]{3,50})\s+\$?\d+\.\d{2}/gm,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const item = (match[2] || match[1])?.trim();
      if (item && item.length > 2 && item.length < 100) {
        const normalized = item.toLowerCase();
        if (!seen.has(normalized) && !isCommonWord(normalized)) {
          seen.add(normalized);
          items.push(item);
        }
      }
    }
    if (items.length >= 3) break; // Found enough items
  }

  return items.length > 0 ? items.slice(0, 20) : undefined;
}

/**
 * Check if text is a common word (not an item)
 */
function isCommonWord(text: string): boolean {
  const commonWords = [
    'subtotal', 'total', 'tax', 'shipping', 'discount', 'free',
    'order', 'confirmation', 'thank', 'you', 'your', 'the',
    'item', 'items', 'qty', 'quantity', 'price', 'amount',
  ];
  return commonWords.some((word) => text === word || text.startsWith(word + ' '));
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  try {
    // Try parsing with Date constructor
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
      return date.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY or MM-DD-YYYY format
    const mdyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1]);
      const day = parseInt(mdyMatch[2]);
      let year = parseInt(mdyMatch[3]);
      if (year < 100) year += 2000;

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
    }
  } catch {
    // Return undefined if parsing fails
  }

  return undefined;
}

/**
 * Validate parsed email data
 * Returns confidence score (0-100) based on how much data was extracted
 */
export function validateParsedEmail(data: ParsedEmailData): {
  isValid: boolean;
  confidence: number;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  let score = 0;

  if (data.vendor) score += 30;
  else missingFields.push('vendor');

  if (data.date) score += 25;
  else missingFields.push('date');

  if (data.total && data.total > 0) score += 30;
  else missingFields.push('total');

  if (data.order_number) score += 10;

  if (data.items && data.items.length > 0) score += 5;

  return {
    isValid: score >= 55, // At least vendor + date OR vendor + total
    confidence: score,
    missingFields,
  };
}

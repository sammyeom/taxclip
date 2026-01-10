/**
 * Email Text Parser
 * Extracts transaction data from order confirmation emails
 * Supports various formats: Amazon, eBay, PayPal, Shopify, etc.
 */

import { ParsedEmailData } from '@/types/evidence';

// Currency symbols and codes mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₩': 'KRW',
  '₹': 'INR',
  '₽': 'RUB',
  '฿': 'THB',
  '₫': 'VND',
  'C$': 'CAD',
  'A$': 'AUD',
  'HK$': 'HKD',
  'S$': 'SGD',
  'NT$': 'TWD',
  'R$': 'BRL',
  'MX$': 'MXN',
  'CHF': 'CHF',
};

export const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'INR', 'CAD', 'AUD',
  'HKD', 'SGD', 'TWD', 'THB', 'VND', 'RUB', 'BRL', 'MXN', 'CHF',
  'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'PHP', 'IDR', 'MYR',
];

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

  // Extract total amount and currency
  const { amount, currency } = extractTotalWithCurrency(text, normalizedText);
  result.total = amount;
  result.currency = currency;

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
 * Extract total amount and currency from email
 */
function extractTotalWithCurrency(_text: string, normalizedText: string): { amount?: number; currency?: string } {
  // Currency detection patterns
  const currencyPatterns = [
    // Multi-character currency symbols first
    { regex: /(?:HK|S|A|C|NT|R|MX)\$\s*([\d,]+\.?\d*)/gi, currency: (m: string) => {
      if (m.startsWith('HK')) return 'HKD';
      if (m.startsWith('S')) return 'SGD';
      if (m.startsWith('A')) return 'AUD';
      if (m.startsWith('C')) return 'CAD';
      if (m.startsWith('NT')) return 'TWD';
      if (m.startsWith('R')) return 'BRL';
      if (m.startsWith('MX')) return 'MXN';
      return 'USD';
    }},
    // Standard currency symbols
    { regex: /\$\s*([\d,]+\.?\d*)/gi, currency: 'USD' },
    { regex: /€\s*([\d,]+\.?\d*)/gi, currency: 'EUR' },
    { regex: /£\s*([\d,]+\.?\d*)/gi, currency: 'GBP' },
    { regex: /¥\s*([\d,]+\.?\d*)/gi, currency: 'JPY' },
    { regex: /₩\s*([\d,]+\.?\d*)/gi, currency: 'KRW' },
    { regex: /₹\s*([\d,]+\.?\d*)/gi, currency: 'INR' },
    { regex: /₽\s*([\d,]+\.?\d*)/gi, currency: 'RUB' },
    { regex: /฿\s*([\d,]+\.?\d*)/gi, currency: 'THB' },
    { regex: /₫\s*([\d,]+\.?\d*)/gi, currency: 'VND' },
    // Currency codes after amount
    { regex: /([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY|KRW|CNY|CAD|AUD|CHF|INR|SGD|HKD|TWD|THB)/gi, currency: 'CODE' },
    // Currency codes before amount
    { regex: /(USD|EUR|GBP|JPY|KRW|CNY|CAD|AUD|CHF|INR|SGD|HKD|TWD|THB)\s*([\d,]+\.?\d*)/gi, currency: 'CODE_BEFORE' },
  ];

  // Total-specific patterns with currency context
  const totalPatterns = [
    /(?:order\s*total|grand\s*total|total\s*amount|total\s*charged|amount\s*charged|you\s*paid|total)[:\s]*([€£¥₩₹₽฿₫]|(?:HK|S|A|C|NT|R|MX)?\$)?\s*([\d,]+\.?\d*)/gi,
    /(?:transaction|payment|charged)[:\s]*([€£¥₩₹₽฿₫]|(?:HK|S|A|C|NT|R|MX)?\$)?\s*([\d,]+\.?\d*)/gi,
  ];

  let maxAmount = 0;
  let detectedCurrency: string | undefined;
  let foundAmount = false;

  // First, try total-specific patterns
  for (const pattern of totalPatterns) {
    const matches = [...normalizedText.matchAll(pattern)];
    for (const match of matches) {
      const symbol = match[1] || '$';
      const amountStr = match[2];
      const amount = parseFloat(amountStr.replace(/,/g, ''));

      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        if (amount > maxAmount) {
          maxAmount = amount;
          foundAmount = true;
          // Detect currency from symbol
          if (symbol) {
            detectedCurrency = CURRENCY_SYMBOLS[symbol] || 'USD';
          }
        }
      }
    }
    if (foundAmount) break;
  }

  // If no total found, try general currency patterns
  if (!foundAmount) {
    for (const { regex, currency } of currencyPatterns) {
      const matches = [...normalizedText.matchAll(regex)];
      for (const match of matches) {
        let amountStr: string;
        let currencyCode: string;

        if (currency === 'CODE') {
          amountStr = match[1];
          currencyCode = match[2].toUpperCase();
        } else if (currency === 'CODE_BEFORE') {
          currencyCode = match[1].toUpperCase();
          amountStr = match[2];
        } else {
          amountStr = match[1];
          currencyCode = typeof currency === 'function' ? currency(match[0]) : currency;
        }

        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0 && amount < 1000000) {
          if (amount > maxAmount) {
            maxAmount = amount;
            detectedCurrency = currencyCode;
            foundAmount = true;
          }
        }
      }
    }
  }

  // Also scan for currency codes in the text if not detected
  if (foundAmount && !detectedCurrency) {
    for (const code of CURRENCY_CODES) {
      if (normalizedText.toUpperCase().includes(code)) {
        detectedCurrency = code;
        break;
      }
    }
    // Default to USD if amount found but no currency detected
    if (!detectedCurrency) {
      detectedCurrency = 'USD';
    }
  }

  return {
    amount: foundAmount ? maxAmount : undefined,
    currency: detectedCurrency,
  };
}

/**
 * Extract total amount from email (legacy - uses extractTotalWithCurrency)
 */
export function extractTotal(text: string, normalizedText: string): number | undefined {
  return extractTotalWithCurrency(text, normalizedText).amount;
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

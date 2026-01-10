/**
 * PDF Text Extraction Utility
 * NOTE: pdf-parse v2.x has compatibility issues with Next.js due to @napi-rs/canvas dependency
 * PDF text extraction is temporarily disabled - files are processed via OCR instead
 */

// Note: pdf-parse is a server-side only library
// This file should only be imported in API routes or server components

// Temporarily disabled due to pdf-parse v2.x compatibility issues
// import { PDFParse } from 'pdf-parse';

export interface PDFExtractResult {
  text: string;
  numPages: number;
  info: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
}

export interface ParsedReceiptData {
  vendor?: string;
  date?: string;
  total?: number;
  items?: string[];
  orderNumber?: string;
}

/**
 * Extract text from a text-based PDF file
 * Returns 100% accurate text for text-based PDFs (digital invoices)
 *
 * NOTE: Currently disabled due to pdf-parse v2.x compatibility issues with Next.js
 * PDF files are processed via OCR instead
 */
export async function extractTextFromPDF(_buffer: Buffer): Promise<PDFExtractResult> {
  // Temporarily disabled - return empty result
  // PDF text extraction will be handled by OCR
  console.log('PDF text extraction is temporarily disabled, using OCR instead');
  return {
    text: '',
    numPages: 0,
    info: {},
  };
}

/**
 * Check if PDF is text-based (not a scanned image)
 * Text-based PDFs will have extractable text content
 */
export async function isPDFTextBased(buffer: Buffer): Promise<boolean> {
  try {
    const result = await extractTextFromPDF(buffer);
    // If we can extract meaningful text (more than 50 chars), it's text-based
    return result.text.trim().length > 50;
  } catch {
    return false;
  }
}

/**
 * Parse extracted PDF text to find receipt/invoice data
 * Works for common invoice formats (Amazon, PayPal, etc.)
 */
export function parseReceiptFromText(text: string): ParsedReceiptData {
  const result: ParsedReceiptData = {};

  // Normalize text for parsing
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  // Pattern for total amount - look for various formats
  const totalPatterns = [
    /(?:grand\s*total|order\s*total|total\s*amount|total\s*charged|amount\s*due|total)[:\s]*\$?([\d,]+\.?\d*)/gi,
    /\$\s*([\d,]+\.\d{2})\s*(?:total|charged)/gi,
    /(?:charged|paid)[:\s]*\$?([\d,]+\.\d{2})/gi,
  ];

  for (const pattern of totalPatterns) {
    const matches = [...normalizedText.matchAll(pattern)];
    if (matches.length > 0) {
      // Take the last match (usually the final total)
      const lastMatch = matches[matches.length - 1];
      const amount = parseFloat(lastMatch[1].replace(',', ''));
      if (!isNaN(amount) && amount > 0) {
        result.total = amount;
        break;
      }
    }
  }

  // Pattern for date
  const datePatterns = [
    /(?:order\s*date|date|placed\s*on|invoice\s*date|transaction\s*date)[:\s]*(\w+\s+\d{1,2},?\s*\d{4})/i,
    /(?:order\s*date|date|placed\s*on|invoice\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  ];

  for (const pattern of datePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      result.date = normalizeDate(match[1]);
      if (result.date) break;
    }
  }

  // Pattern for vendor/seller
  const vendorPatterns = [
    /(?:from|seller|sold\s*by|shipped\s*by|merchant)[:\s]*([^\n\r,]+)/i,
    /^([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*(?:Invoice|Receipt|Order|Confirmation))/im,
  ];

  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) {
      const vendor = match[1].trim();
      if (vendor.length > 2 && vendor.length < 100) {
        result.vendor = vendor;
        break;
      }
    }
  }

  // Pattern for order number
  const orderPatterns = [
    /(?:order|confirmation|invoice|reference)[\s#:]*([A-Z0-9\-]{5,})/i,
    /#\s*([A-Z0-9\-]{5,})/i,
  ];

  for (const pattern of orderPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      result.orderNumber = match[1];
      break;
    }
  }

  // Extract line items (basic pattern)
  const itemPatterns = [
    /(\d+)\s*x\s*([^\n$]+?)(?:\s*\$[\d.]+)?/g,
    /([A-Z][A-Za-z0-9\s]+?)\s+\$?([\d.]+)\s*$/gm,
  ];

  const items: string[] = [];
  for (const pattern of itemPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const item = match[2]?.trim() || match[1]?.trim();
      if (item && item.length > 3 && item.length < 100 && !items.includes(item)) {
        items.push(item);
      }
    }
    if (items.length > 0) break;
  }

  if (items.length > 0) {
    result.items = items.slice(0, 20); // Limit to 20 items
  }

  return result;
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  try {
    // Try parsing with Date constructor
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY or MM-DD-YYYY format
    const mdyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1]);
      const day = parseInt(mdyMatch[2]);
      let year = parseInt(mdyMatch[3]);
      if (year < 100) year += 2000;

      const parsed = new Date(year, month - 1, day);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  } catch {
    // Return undefined if parsing fails
  }

  return undefined;
}

/**
 * Combined extraction: PDF text + parsing
 * Returns both raw text and structured data
 */
export async function extractAndParseReceipt(buffer: Buffer): Promise<{
  rawText: string;
  parsed: ParsedReceiptData;
  isTextBased: boolean;
}> {
  try {
    const extracted = await extractTextFromPDF(buffer);
    const isTextBased = extracted.text.trim().length > 50;
    const parsed = isTextBased ? parseReceiptFromText(extracted.text) : {};

    return {
      rawText: extracted.text,
      parsed,
      isTextBased,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      rawText: '',
      parsed: {},
      isTextBased: false,
    };
  }
}

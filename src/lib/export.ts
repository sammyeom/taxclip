/**
 * IRS-Ready Export Utilities
 * CSV and data preparation for Schedule C filing
 */

import { Receipt } from '@/types/database';
import {
  IRS_SCHEDULE_C_CATEGORIES,
  getCategoryLabel,
  getScheduleCLine,
  getDeductionRate,
  CATEGORY_KEYS,
} from '@/constants/irs-categories';

// Category summary for reports
export interface CategorySummary {
  category: string;
  label: string;
  line: string;
  amount: number;
  count: number;
  deductibleAmount: number;
}

// Export metadata
export interface ExportMetadata {
  taxYear: number;
  generatedAt: string;
  totalReceipts: number;
  totalAmount: number;
  totalDeductible: number;
}

/**
 * Calculate category summaries from receipts
 */
export function calculateCategorySummaries(receipts: Receipt[]): CategorySummary[] {
  const summaries: Record<string, CategorySummary> = {};

  // Initialize all categories with zero
  CATEGORY_KEYS.forEach((key) => {
    const cat = IRS_SCHEDULE_C_CATEGORIES[key];
    summaries[key] = {
      category: key,
      label: cat.label,
      line: cat.line,
      amount: 0,
      count: 0,
      deductibleAmount: 0,
    };
  });

  // Aggregate receipts by category
  receipts.forEach((receipt) => {
    const cat = receipt.category || 'other';
    if (summaries[cat]) {
      summaries[cat].amount += receipt.total || 0;
      summaries[cat].count += 1;
      summaries[cat].deductibleAmount += (receipt.total || 0) * getDeductionRate(cat);
    } else {
      // Unknown category goes to 'other'
      summaries['other'].amount += receipt.total || 0;
      summaries['other'].count += 1;
      summaries['other'].deductibleAmount += receipt.total || 0;
    }
  });

  // Return only categories with data, sorted by line number
  return Object.values(summaries)
    .filter((s) => s.count > 0)
    .sort((a, b) => {
      const lineA = parseInt(a.line) || 99;
      const lineB = parseInt(b.line) || 99;
      return lineA - lineB;
    });
}

/**
 * Generate export metadata
 */
export function generateExportMetadata(
  receipts: Receipt[],
  taxYear: number
): ExportMetadata {
  const totalAmount = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalDeductible = receipts.reduce((sum, r) => {
    const rate = getDeductionRate(r.category || 'other');
    return sum + (r.total || 0) * rate;
  }, 0);

  return {
    taxYear,
    generatedAt: new Date().toISOString(),
    totalReceipts: receipts.length,
    totalAmount,
    totalDeductible,
  };
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display (MM/DD/YYYY)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Export options for customization
 */
export interface ExportOptions {
  businessName?: string;
  ein?: string;
  cpaName?: string;
  taxYear: number;
}

/**
 * Generate IRS-Ready CSV Export
 * Format: Date, Vendor, Amount, Category (IRS), Schedule C Line, Business Purpose, Payment Method, Receipt URL
 * Includes UTF-8 BOM for Excel compatibility
 */
export function generateBusinessReceiptCSV(
  receipts: Receipt[],
  options: ExportOptions
): string {
  if (!receipts || receipts.length === 0) {
    return '';
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Sort by date ascending
  const sortedReceipts = [...receipts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Header section with business info
  const headerInfo: string[] = [];
  if (options.businessName) {
    headerInfo.push(`Business Name:,${escapeCSVField(options.businessName)}`);
  }
  if (options.ein) {
    headerInfo.push(`EIN:,${escapeCSVField(options.ein)}`);
  }
  if (options.cpaName) {
    headerInfo.push(`Prepared for:,${escapeCSVField(options.cpaName)}`);
  }
  headerInfo.push(`Tax Year:,FY${options.taxYear}`);
  headerInfo.push(`Generated:,${formatDate(new Date().toISOString())}`);
  headerInfo.push(''); // Empty line

  // CSV Headers
  const headers = [
    'Date',
    'Vendor',
    'Amount',
    'Category (IRS)',
    'Schedule C Line',
    'Business Purpose',
    'Payment Method',
    'Receipt URL',
  ].join(',');

  // CSV Rows
  const rows = sortedReceipts.map((receipt) => {
    const category = receipt.category || 'other';
    return [
      escapeCSVField(formatDate(receipt.date)),
      escapeCSVField(receipt.merchant),
      escapeCSVField(receipt.total?.toFixed(2)),
      escapeCSVField(getCategoryLabel(category)),
      escapeCSVField(`Line ${getScheduleCLine(category)}`),
      escapeCSVField(receipt.business_purpose),
      escapeCSVField(receipt.payment_method),
      escapeCSVField(receipt.image_url),
    ].join(',');
  });

  // Category Summary Section
  const summaries = calculateCategorySummaries(receipts);
  const summarySection = [
    '',
    '',
    '--- SCHEDULE C CATEGORY SUMMARY ---',
    'Category,Line,Total Amount,Receipt Count,Deductible Amount',
    ...summaries.map((s) =>
      [
        escapeCSVField(s.label),
        escapeCSVField(`Line ${s.line}`),
        escapeCSVField(s.amount.toFixed(2)),
        escapeCSVField(s.count),
        escapeCSVField(s.deductibleAmount.toFixed(2)),
      ].join(',')
    ),
    '',
    `TOTAL,,$${receipts.reduce((sum, r) => sum + (r.total || 0), 0).toFixed(2)},${receipts.length}`,
  ];

  return BOM + [...headerInfo, headers, ...rows, ...summarySection].join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(csvContent: string, taxYear: number): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TaxClip_Expenses_FY${taxYear}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert image URL to base64 data URL (for PDF embedding)
 */
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Compress image for PDF (resize and reduce quality)
 */
export async function compressImageForPDF(
  base64: string,
  maxWidth: number = 400,
  maxHeight: number = 300,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

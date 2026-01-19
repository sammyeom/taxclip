/**
 * Audit-Ready PDF Export for IRS Schedule C
 * Generates professional expense reports with receipt images
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Receipt } from '@/types/database';
import {
  calculateCategorySummaries,
  generateExportMetadata,
  formatCurrency,
  formatDate,
  imageUrlToBase64,
  compressImageForPDF,
  CategorySummary,
  ExportOptions,
} from './export';
import { getCategoryLabel, getScheduleCLine, getSubcategoryLabel } from '@/constants/irs-categories';
import {
  EvidenceItem,
  EvidenceType,
  EVIDENCE_TYPE_LABELS,
  groupEvidenceByType,
} from '@/types/evidence';

// PDF Configuration
const PDF_CONFIG = {
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  margin: 15,
  headerHeight: 50,
  footerHeight: 15,
  imageMaxWidth: 100, // mm (increased for better visibility)
  imageMaxHeight: 80, // mm (increased for better visibility)
  receiptsPerPage: 2, // Reduced from 3 to give more space for images
};

// shadcn/ui inspired colors (slate/zinc palette)
const COLORS = {
  // Primary colors
  primary: [15, 23, 42] as [number, number, number], // slate-900 (dark, sophisticated)
  primaryForeground: [248, 250, 252] as [number, number, number], // slate-50

  // Secondary/muted colors
  secondary: [100, 116, 139] as [number, number, number], // slate-500
  muted: [148, 163, 184] as [number, number, number], // slate-400
  mutedForeground: [71, 85, 105] as [number, number, number], // slate-600

  // Text colors
  text: [15, 23, 42] as [number, number, number], // slate-900
  textMuted: [100, 116, 139] as [number, number, number], // slate-500

  // Background colors
  background: [255, 255, 255] as [number, number, number], // white
  card: [248, 250, 252] as [number, number, number], // slate-50
  cardBorder: [226, 232, 240] as [number, number, number], // slate-200

  // Accent colors (subtle)
  accent: [34, 197, 94] as [number, number, number], // green-500 (for success/amounts)
  accentMuted: [220, 252, 231] as [number, number, number], // green-100

  // Table
  tableHeader: [241, 245, 249] as [number, number, number], // slate-100
  tableAlt: [248, 250, 252] as [number, number, number], // slate-50
  tableBorder: [226, 232, 240] as [number, number, number], // slate-200
};

/**
 * Progress callback type for UI updates
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Generate Audit-Ready PDF Report
 */
export async function generateAuditPDF(
  receipts: Receipt[],
  options: ExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const metadata = generateExportMetadata(receipts, options.taxYear);
  const summaries = calculateCategorySummaries(receipts);

  // Report progress
  const reportProgress = (progress: number, message: string) => {
    if (onProgress) onProgress(progress, message);
  };

  reportProgress(5, 'Generating summary page...');

  // Page 1: Summary
  await addSummaryPage(doc, metadata, summaries, options);

  // Page 2+: Receipt Details with Images
  if (receipts.length > 0) {
    reportProgress(10, 'Processing receipt images...');
    await addReceiptPages(doc, receipts, options.taxYear, reportProgress);
  }

  reportProgress(100, 'PDF generation complete!');

  return doc.output('blob');
}

/**
 * Add Summary Page (Page 1) - shadcn/ui inspired design
 */
async function addSummaryPage(
  doc: jsPDF,
  metadata: ReturnType<typeof generateExportMetadata>,
  summaries: CategorySummary[],
  options: ExportOptions
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  let yPos = margin;

  // Calculate header height based on business info (increased to cover date text)
  const hasBusinessInfo = options.businessName || options.ein || options.cpaName;
  const headerHeight = hasBusinessInfo ? 58 : 48;

  // Header Section - minimal shadcn style with subtle background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Title - clean, bold typography
  doc.setTextColor(...COLORS.primaryForeground);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Report', margin, yPos + 12);

  // Subtitle - muted, smaller
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Tax Year ${metadata.taxYear}`, margin, yPos + 20);
  doc.text(
    new Date(metadata.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    margin,
    yPos + 26
  );

  // Business Info - Right side, subtle
  if (hasBusinessInfo) {
    const rightX = pageWidth - margin;
    let infoY = yPos + 12;
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300

    if (options.businessName) {
      doc.setFont('helvetica', 'bold');
      doc.text(options.businessName, rightX, infoY, { align: 'right' });
      infoY += 5;
      doc.setFont('helvetica', 'normal');
    }
    if (options.ein) {
      doc.text(`EIN: ${options.ein}`, rightX, infoY, { align: 'right' });
      infoY += 5;
    }
    if (options.cpaName) {
      doc.text(`For: ${options.cpaName}`, rightX, infoY, { align: 'right' });
    }
  }

  yPos = headerHeight + 12;

  // Summary Section Label - uppercase, tracking
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin, yPos);

  yPos += 6;

  // Summary Cards - shadcn card style with border (5 cards in 2 rows)
  const cardWidth = (pageWidth - margin * 2 - 12) / 3; // 3 cards with gaps
  const cardHeight = 28;

  // First row: Total Receipts, Total Expenses, Total Sales Tax
  const firstRowItems = [
    { label: 'Total Receipts', value: metadata.totalReceipts.toString() },
    { label: 'Total Expenses', value: formatCurrency(metadata.totalAmount) },
    { label: 'Total Sales Tax', value: formatCurrency(metadata.totalTax) },
  ];

  firstRowItems.forEach((item, index) => {
    const cardX = margin + (cardWidth + 6) * index;

    // Card background
    doc.setFillColor(...COLORS.card);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'F');

    // Card border
    doc.setDrawColor(...COLORS.cardBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'S');

    // Label
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, cardX + cardWidth / 2, yPos + 9, { align: 'center' });

    // Value
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, cardX + cardWidth / 2, yPos + 20, { align: 'center' });
  });

  yPos += cardHeight + 5;

  // Second row: Total Tips, Deductible Amount (larger, emphasized)
  const secondRowCardWidth = (pageWidth - margin * 2 - 6) / 2;

  // Total Tips card
  const tipsCardX = margin;
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(tipsCardX, yPos, secondRowCardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(tipsCardX, yPos, secondRowCardWidth, cardHeight, 2, 2, 'S');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Tips', tipsCardX + secondRowCardWidth / 2, yPos + 9, { align: 'center' });
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metadata.totalTips), tipsCardX + secondRowCardWidth / 2, yPos + 20, { align: 'center' });

  // Deductible Amount card - EMPHASIZED (larger, bolder, accent background)
  const deductibleCardX = margin + secondRowCardWidth + 6;
  const deductibleCardHeight = cardHeight + 6; // Taller card

  // Accent background for emphasis
  doc.setFillColor(...COLORS.accentMuted);
  doc.roundedRect(deductibleCardX, yPos - 3, secondRowCardWidth, deductibleCardHeight, 3, 3, 'F');

  // Bold accent border
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1.5);
  doc.roundedRect(deductibleCardX, yPos - 3, secondRowCardWidth, deductibleCardHeight, 3, 3, 'S');

  // Label
  doc.setTextColor(...COLORS.mutedForeground);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DEDUCTIBLE AMOUNT', deductibleCardX + secondRowCardWidth / 2, yPos + 6, { align: 'center' });

  // Value - LARGER and BOLDER
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metadata.totalDeductible), deductibleCardX + secondRowCardWidth / 2, yPos + 22, { align: 'center' });

  yPos += deductibleCardHeight + 12;

  // Schedule C Category Breakdown Table
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHEDULE C BREAKDOWN', margin, yPos);

  yPos += 5;

  // Table using autoTable - shadcn style
  const tableData = summaries.map((s) => [
    `Line ${s.line}`,
    s.label,
    formatCurrency(s.amount),
    s.count.toString(),
    formatCurrency(s.deductibleAmount),
  ]);

  // Add total row
  tableData.push([
    '',
    'Total',
    formatCurrency(summaries.reduce((sum, s) => sum + s.amount, 0)),
    summaries.reduce((sum, s) => sum + s.count, 0).toString(),
    formatCurrency(summaries.reduce((sum, s) => sum + s.deductibleAmount, 0)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Line #', 'Category', 'Amount', 'Count', 'Deductible']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      cellPadding: 3,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: COLORS.tableAlt,
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'left' },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
    tableWidth: 180,
    margin: { left: margin, right: margin },
    tableLineColor: COLORS.tableBorder,
    tableLineWidth: 0.2,
    didParseCell: (data) => {
      // Apply alignment to header cells to match body
      if (data.section === 'head') {
        if (data.column.index === 2) data.cell.styles.halign = 'right';      // Amount
        if (data.column.index === 3) data.cell.styles.halign = 'center';     // Count
        if (data.column.index === 4) data.cell.styles.halign = 'right';      // Deductible
      }
      // Style total row
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = COLORS.tableHeader;
      }
    },
  });

  // Footer note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(
    '* Meals category is 50% deductible per IRS regulations',
    margin,
    finalY + 10
  );
  doc.text(
    'This report is generated for record-keeping purposes. Consult a tax professional for filing.',
    margin,
    finalY + 15
  );
  doc.text(
    'TaxClip is a bookkeeping assistance tool and does not provide official tax advice.',
    margin,
    finalY + 20
  );

  // Page number
  addPageNumber(doc, 1);
}

/**
 * Add Receipt Detail Pages - shadcn/ui inspired design
 */
async function addReceiptPages(
  doc: jsPDF,
  receipts: Receipt[],
  taxYear: number,
  reportProgress: (progress: number, message: string) => void
): Promise<void> {
  const { margin, pageWidth, pageHeight, receiptsPerPage } = PDF_CONFIG;
  const contentHeight = pageHeight - margin * 2 - PDF_CONFIG.footerHeight;
  const receiptBlockHeight = contentHeight / receiptsPerPage;

  // Sort receipts by date
  const sortedReceipts = [...receipts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentPage = 2;
  let receiptIndex = 0;

  while (receiptIndex < sortedReceipts.length) {
    doc.addPage();

    // Page Header - minimal shadcn style
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(...COLORS.primaryForeground);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt Details', margin, 12);

    // Year badge on right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`FY ${taxYear}`, pageWidth - margin, 12, { align: 'right' });

    let yPos = 26;

    // Add receipts to this page
    for (let i = 0; i < receiptsPerPage && receiptIndex < sortedReceipts.length; i++) {
      const receipt = sortedReceipts[receiptIndex];
      const progress = 10 + Math.floor((receiptIndex / sortedReceipts.length) * 85);
      reportProgress(progress, `Processing receipt ${receiptIndex + 1} of ${sortedReceipts.length}...`);

      await addReceiptBlock(doc, receipt, yPos, receiptBlockHeight, receiptIndex + 1);

      yPos += receiptBlockHeight;
      receiptIndex++;
    }

    addPageNumber(doc, currentPage);
    currentPage++;
  }
}

/**
 * Add single receipt block with image and details - shadcn/ui inspired
 * Layout: Image/Email on LEFT, Details on RIGHT
 */
async function addReceiptBlock(
  doc: jsPDF,
  receipt: Receipt,
  yPos: number,
  blockHeight: number,
  _index: number
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  const contentWidth = pageWidth - margin * 2;

  // Side-by-side layout: LEFT (image/email 50%) + RIGHT (details 47%)
  const leftColumnWidth = contentWidth * 0.50;
  const rightColumnWidth = contentWidth * 0.47;
  const columnGap = contentWidth * 0.03;

  const leftX = margin;
  const rightX = margin + leftColumnWidth + columnGap;

  // Card background - shadcn style
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(margin, yPos, contentWidth, blockHeight - 5, 3, 3, 'F');

  // Card border
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, blockHeight - 5, 3, 3, 'S');

  // LEFT COLUMN: Image or Email Text (no badge)
  const imageYPos = yPos + 5;
  const maxImgWidth = leftColumnWidth - 8;
  const maxImgHeight = blockHeight - 15;

  if (receipt.image_url) {
    try {
      const base64 = await imageUrlToBase64(receipt.image_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 800, 600, 0.85);

        // Image container with subtle border
        doc.setDrawColor(...COLORS.cardBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(leftX + 4, imageYPos, maxImgWidth, maxImgHeight, 2, 2, 'S');

        doc.addImage(
          compressed,
          'JPEG',
          leftX + 4,
          imageYPos,
          maxImgWidth,
          maxImgHeight,
          undefined,
          'SLOW'
        );
      } else {
        addNoImagePlaceholder(doc, leftX + 4, imageYPos, maxImgWidth, maxImgHeight);
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      addNoImagePlaceholder(doc, leftX + 4, imageYPos, maxImgWidth, maxImgHeight);
    }
  } else if (receipt.email_text) {
    addEmailTextBlock(doc, receipt.email_text, leftX + 4, imageYPos, maxImgWidth, maxImgHeight);
  } else {
    addNoImagePlaceholder(doc, leftX + 4, imageYPos, maxImgWidth, maxImgHeight);
  }

  // RIGHT COLUMN: Receipt Details
  let detailY = yPos + 10;

  // Vendor (Title) - bold, prominent
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');

  let vendorName = receipt.merchant || 'Unknown Vendor';
  const maxVendorWidth = rightColumnWidth - 10;
  while (doc.getTextWidth(vendorName) > maxVendorWidth && vendorName.length > 3) {
    vendorName = vendorName.slice(0, -4) + '...';
  }
  doc.text(vendorName, rightX, detailY);
  detailY += 8;

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(receipt.date), rightX, detailY);
  detailY += 6;

  // Display items list if available (prioritize clean data)
  const items = receipt.items || [];
  if (items.length > 0) {
    doc.setFontSize(7);
    const maxItemsToShow = Math.min(items.length, 5); // Limit to 5 items to save space

    for (let i = 0; i < maxItemsToShow; i++) {
      const item = items[i];
      // Item name
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      let itemName = item.name || 'Item';
      const maxItemNameWidth = rightColumnWidth - 35;
      while (doc.getTextWidth(itemName) > maxItemNameWidth && itemName.length > 3) {
        itemName = itemName.slice(0, -4) + '...';
      }
      doc.text(itemName, rightX, detailY);

      // Item price
      doc.setTextColor(...COLORS.textMuted);
      const itemPrice = formatCurrency(item.price * (item.quantity || 1));
      doc.text(itemPrice, rightX + rightColumnWidth - 15, detailY, { align: 'right' });
      detailY += 5;
    }

    // Show "..." if there are more items
    if (items.length > maxItemsToShow) {
      doc.setTextColor(...COLORS.muted);
      doc.text(`... and ${items.length - maxItemsToShow} more item(s)`, rightX, detailY);
      detailY += 5;
    }

    // SEPARATOR LINE between items and totals
    detailY += 2;
    doc.setDrawColor(...COLORS.cardBorder);
    doc.setLineWidth(0.5);
    doc.line(rightX, detailY, rightX + rightColumnWidth - 10, detailY);
    detailY += 5;
  }

  // Subtotal, Tax, Tip breakdown
  const subtotal = receipt.subtotal ?? (receipt.total || 0) - (receipt.tax || 0) - (receipt.tip || 0);
  const tax = receipt.tax ?? 0;
  const tip = receipt.tip ?? 0;
  const total = subtotal + tax + tip;

  doc.setFontSize(8);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Subtotal', rightX, detailY);
  doc.setTextColor(...COLORS.text);
  doc.text(formatCurrency(subtotal), rightX + rightColumnWidth - 15, detailY, { align: 'right' });
  detailY += 5;

  // Tax (if present)
  if (tax > 0) {
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Tax', rightX, detailY);
    doc.setTextColor(...COLORS.text);
    doc.text(formatCurrency(tax), rightX + rightColumnWidth - 15, detailY, { align: 'right' });
    detailY += 5;
  }

  // Tip (if present)
  if (tip > 0) {
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Tip', rightX, detailY);
    doc.setTextColor(...COLORS.text);
    doc.text(formatCurrency(tip), rightX + rightColumnWidth - 15, detailY, { align: 'right' });
    detailY += 5;
  }

  // Total - bold, accent color
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(rightX, detailY, rightX + rightColumnWidth - 10, detailY);
  detailY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text('Total', rightX, detailY);
  doc.setTextColor(...COLORS.accent);
  doc.text(formatCurrency(total), rightX + rightColumnWidth - 15, detailY, { align: 'right' });
  detailY += 8;

  // SEPARATOR LINE before category/details
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.2);
  doc.line(rightX, detailY, rightX + rightColumnWidth - 10, detailY);
  detailY += 5;

  // Category with line number
  const categoryText = receipt.subcategory
    ? `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')}) - ${getSubcategoryLabel(receipt.category || 'other', receipt.subcategory)}`
    : `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')})`;

  // Details list - clean layout (reduced for space)
  const details = [
    { label: 'Category', value: categoryText },
    { label: 'Payment', value: receipt.payment_method || '-' },
    { label: 'Purpose', value: receipt.business_purpose || '-' },
  ];

  doc.setFontSize(8);

  details.forEach((detail) => {
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`${detail.label}`, rightX, detailY);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);

    let value = detail.value;
    const maxWidth = rightColumnWidth - 30;
    while (doc.getTextWidth(value) > maxWidth && value.length > 3) {
      value = value.slice(0, -4) + '...';
    }
    doc.text(value, rightX + 25, detailY);
    detailY += 6;
  });

  // Notes (if any) - muted, italic
  if (receipt.notes) {
    detailY += 2;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);

    let notes = `Note: ${receipt.notes}`;
    const maxNotesWidth = rightColumnWidth - 10;
    while (doc.getTextWidth(notes) > maxNotesWidth && notes.length > 10) {
      notes = notes.slice(0, -4) + '...';
    }
    doc.text(notes, rightX, detailY);
  }
}

/**
 * Add placeholder for missing images - shadcn/ui style
 */
function addNoImagePlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Muted background
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');

  // Dashed border
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 3, 3, 'S');

  // Icon placeholder (simple square)
  const iconSize = 12;
  const iconX = x + width / 2 - iconSize / 2;
  const iconY = y + height / 2 - iconSize;
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.5);
  doc.roundedRect(iconX, iconY, iconSize, iconSize, 1, 1, 'S');

  // Text
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('No image available', x + width / 2, y + height / 2 + 10, { align: 'center' });
}

/**
 * Add email text block when no image is available - shadcn/ui style
 * Displays the original email/text content in place of the receipt image
 */
function addEmailTextBlock(
  doc: jsPDF,
  emailText: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Card background - subtle slate tint
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  // Card border
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2, 2, 'S');

  // Header bar - minimal, dark (fits within rounded corners)
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(x, y, width, 9, 2, 2, 'F');
  doc.setFillColor(...COLORS.card);
  doc.rect(x, y + 6, width, 4, 'F');

  // Header text - positioned higher to avoid cut-off
  doc.setTextColor(...COLORS.primaryForeground);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Email Evidence', x + width / 2, y + 5, { align: 'center' });

  // Email content area
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(6);
  doc.setFont('courier', 'normal');

  const padding = 3;
  const textX = x + padding;
  const textY = y + 13;
  const textWidth = width - padding * 2;
  const maxHeight = height - 15;

  // Split text into lines that fit the width
  const lines = doc.splitTextToSize(emailText, textWidth);

  // Calculate how many lines can fit (font size 6 = ~2.5mm line height)
  const lineHeight = 2.5;
  const maxLines = Math.floor(maxHeight / lineHeight);

  // Display lines that fit
  const displayLines = lines.slice(0, maxLines);

  // Add ellipsis if truncated
  if (lines.length > maxLines && displayLines.length > 0) {
    displayLines[displayLines.length - 1] = displayLines[displayLines.length - 1].substring(0, 40) + '...';
  }

  doc.text(displayLines, textX, textY);
}

/**
 * Add page number footer - shadcn/ui style
 */
function addPageNumber(doc: jsPDF, pageNum: number): void {
  const { pageWidth, pageHeight, margin } = PDF_CONFIG;
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - margin / 2, {
    align: 'center',
  });
  doc.text(
    'Generated by TaxClip',
    pageWidth - margin,
    pageHeight - margin / 2,
    { align: 'right' }
  );
}

/**
 * Trigger browser download of PDF file
 */
export function downloadPDF(blob: Blob, taxYear: number): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TaxClip_AuditReport_FY${taxYear}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// IRS AUDIT-READY EVIDENCE BUNDLE EXPORT
// ============================================================================

/**
 * Generate IRS Audit-Ready PDF with evidence grouping
 * Each expense shows all related evidence documents on consecutive pages
 * Layout: What was purchased (Invoice/Order) + How it was paid (Payment Proof) + Receipt
 */
export async function generateIRSAuditPDF(
  receipts: Receipt[],
  options: ExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const metadata = generateExportMetadata(receipts, options.taxYear);
  const summaries = calculateCategorySummaries(receipts);

  const reportProgress = (progress: number, message: string) => {
    if (onProgress) onProgress(progress, message);
  };

  reportProgress(5, 'Generating summary page...');

  // Page 1: Summary
  await addSummaryPage(doc, metadata, summaries, options);

  // Process receipts with evidence grouping
  const receiptsWithEvidence = receipts.filter(
    (r) => r.evidence_items && r.evidence_items.length > 0
  );
  const receiptsWithoutEvidence = receipts.filter(
    (r) => !r.evidence_items || r.evidence_items.length === 0
  );

  let currentPage = 2;
  let processedCount = 0;
  const totalToProcess = receiptsWithEvidence.length + receiptsWithoutEvidence.length;

  // Process receipts WITH evidence items (new IRS audit-ready format)
  for (const receipt of receiptsWithEvidence) {
    processedCount++;
    const progress = 10 + Math.floor((processedCount / totalToProcess) * 85);
    reportProgress(progress, `Processing expense ${processedCount} of ${totalToProcess}...`);

    // Add expense overview page
    doc.addPage();
    currentPage++;
    await addExpenseOverviewPage(doc, receipt, currentPage);

    // Group evidence by type
    const grouped = groupEvidenceByType(receipt.evidence_items);

    // Add evidence pages in IRS audit-friendly order:
    // 1. Invoice/Online Order (What was purchased)
    // 2. Payment Proof (How it was paid)
    // 3. Receipt (Transaction record)
    // 4. Other documents

    for (const evidence of grouped.purchase_docs) {
      doc.addPage();
      currentPage++;
      await addEvidencePage(doc, evidence, receipt, 'What was purchased', currentPage);
    }

    for (const evidence of grouped.payment_docs) {
      doc.addPage();
      currentPage++;
      await addEvidencePage(doc, evidence, receipt, 'Payment verification', currentPage);
    }

    for (const evidence of grouped.receipts) {
      doc.addPage();
      currentPage++;
      await addEvidencePage(doc, evidence, receipt, 'Transaction receipt', currentPage);
    }

    for (const evidence of grouped.other) {
      doc.addPage();
      currentPage++;
      await addEvidencePage(doc, evidence, receipt, 'Supporting document', currentPage);
    }

    // Add comparison page if we have both invoice/order AND payment proof
    if (grouped.purchase_docs.length > 0 && grouped.payment_docs.length > 0) {
      doc.addPage();
      currentPage++;
      await addComparisonPage(
        doc,
        grouped.purchase_docs[0],
        grouped.payment_docs[0],
        receipt,
        currentPage
      );
    }
  }

  // Process receipts WITHOUT evidence items (legacy format)
  if (receiptsWithoutEvidence.length > 0) {
    reportProgress(90, 'Processing legacy receipts...');
    await addReceiptPages(doc, receiptsWithoutEvidence, options.taxYear, reportProgress);
  }

  reportProgress(100, 'PDF generation complete!');

  return doc.output('blob');
}

/**
 * Add Expense Overview Page - shadcn/ui style
 * Shows summary of expense with list of attached evidence
 */
async function addExpenseOverviewPage(
  doc: jsPDF,
  receipt: Receipt,
  pageNum: number
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  let yPos = margin;

  // Header - minimal dark style
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(...COLORS.primaryForeground);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Documentation', margin, yPos + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('IRS Audit-Ready Evidence Bundle', margin, yPos + 20);

  yPos = 40;

  // Expense Details Card with border
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, 'S');

  // Vendor name
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.merchant || 'Unknown Vendor', margin + 10, yPos + 15);

  // Amount - accent color
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.accent);
  doc.text(formatCurrency(receipt.total || 0), pageWidth - margin - 10, yPos + 18, {
    align: 'right',
  });

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');

  const detailsY = yPos + 28;
  doc.text(`Date: ${formatDate(receipt.date)}`, margin + 10, detailsY);
  const overviewCategoryText = receipt.subcategory
    ? `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')}) - ${getSubcategoryLabel(receipt.category || 'other', receipt.subcategory)}`
    : `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')})`;
  doc.text(`Category: ${overviewCategoryText}`, margin + 10, detailsY + 7);

  if (receipt.business_purpose) {
    doc.text(`Purpose: ${receipt.business_purpose}`, margin + 10, detailsY + 14);
  }

  if (receipt.payment_method) {
    doc.text(`Payment: ${receipt.payment_method}`, margin + 10, detailsY + 21);
  }

  yPos = 105;

  // Evidence Summary Label
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTACHED EVIDENCE', margin, yPos);

  yPos += 6;

  const evidenceItems = receipt.evidence_items || [];
  const grouped = groupEvidenceByType(evidenceItems);

  // Create evidence summary table
  const evidenceData: string[][] = [];

  if (grouped.purchase_docs.length > 0) {
    evidenceData.push([
      'Invoice / Online Order',
      grouped.purchase_docs.length.toString(),
      'What was purchased',
    ]);
  }
  if (grouped.payment_docs.length > 0) {
    evidenceData.push([
      'Payment Proof',
      grouped.payment_docs.length.toString(),
      'How payment was made',
    ]);
  }
  if (grouped.receipts.length > 0) {
    evidenceData.push([
      'Receipt',
      grouped.receipts.length.toString(),
      'Transaction record',
    ]);
  }
  if (grouped.other.length > 0) {
    evidenceData.push([
      'Other Documents',
      grouped.other.length.toString(),
      'Supporting documentation',
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Evidence Type', 'Count', 'Purpose']],
    body: evidenceData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableAlt,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 85 },
    },
    margin: { left: margin, right: margin },
    tableLineColor: COLORS.tableBorder,
    tableLineWidth: 0.2,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable?.finalY || yPos + 50;

  // Email text excerpt if available
  if (receipt.email_text) {
    const emailY = tableEndY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('EMAIL CONFIRMATION EXCERPT', margin, emailY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);

    // Truncate email text
    const maxChars = 500;
    let emailExcerpt = receipt.email_text.substring(0, maxChars);
    if (receipt.email_text.length > maxChars) {
      emailExcerpt += '...';
    }

    // Split into lines
    const lines = doc.splitTextToSize(emailExcerpt, pageWidth - margin * 2 - 10);
    doc.text(lines.slice(0, 8), margin + 5, emailY + 8); // Max 8 lines
  }

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(
    'Following pages contain full-size images of each evidence document.',
    margin,
    280
  );

  addPageNumber(doc, pageNum);
}

/**
 * Add Evidence Page - shadcn/ui style
 * Full-page display of evidence document with context header
 */
async function addEvidencePage(
  doc: jsPDF,
  evidence: EvidenceItem,
  receipt: Receipt,
  sectionLabel: string,
  pageNum: number
): Promise<void> {
  const { margin, pageWidth, pageHeight } = PDF_CONFIG;

  // Header - minimal dark style
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(...COLORS.primaryForeground);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(sectionLabel.toUpperCase(), margin, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `${EVIDENCE_TYPE_LABELS[evidence.evidence_type]} | ${receipt.merchant} | ${formatDate(receipt.date)}`,
    margin,
    17
  );

  // Evidence type badge on right
  const evidenceColor = getEvidenceTypeColor(evidence.evidence_type);
  doc.setFillColor(...evidenceColor);
  const badgeText = EVIDENCE_TYPE_LABELS[evidence.evidence_type];
  const badgeWidth = doc.getTextWidth(badgeText) + 8;
  doc.roundedRect(pageWidth - margin - badgeWidth, 6, badgeWidth, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(badgeText, pageWidth - margin - badgeWidth / 2, 13, { align: 'center' });

  // Evidence image - large display with border
  const imageY = 32;
  const imageMaxWidth = pageWidth - margin * 2;
  const imageMaxHeight = pageHeight - imageY - 35;

  // Image container border
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, imageY, imageMaxWidth, imageMaxHeight, 3, 3, 'S');

  if (evidence.file_url) {
    try {
      const base64 = await imageUrlToBase64(evidence.file_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 1000, 1200, 0.9);
        doc.addImage(
          compressed,
          'JPEG',
          margin,
          imageY,
          imageMaxWidth,
          imageMaxHeight,
          undefined,
          'SLOW'
        );
      } else {
        addNoImagePlaceholder(doc, margin, imageY, imageMaxWidth, imageMaxHeight);
      }
    } catch (error) {
      console.error('Error adding evidence image:', error);
      addNoImagePlaceholder(doc, margin, imageY, imageMaxWidth, imageMaxHeight);
    }
  } else {
    addNoImagePlaceholder(doc, margin, imageY, imageMaxWidth, imageMaxHeight);
  }

  // Footer with file info - muted
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(`File: ${evidence.file_name}`, margin, pageHeight - 12);
  doc.text(
    `Uploaded: ${new Date(evidence.upload_date).toLocaleDateString()}`,
    pageWidth - margin,
    pageHeight - 12,
    { align: 'right' }
  );

  addPageNumber(doc, pageNum);
}

/**
 * Add Comparison Page - shadcn/ui style
 * Side-by-side: Invoice/Order (what) vs Payment Proof (how)
 */
async function addComparisonPage(
  doc: jsPDF,
  purchaseDoc: EvidenceItem,
  paymentProof: EvidenceItem,
  receipt: Receipt,
  pageNum: number
): Promise<void> {
  const { margin, pageWidth, pageHeight } = PDF_CONFIG;
  const halfWidth = (pageWidth - margin * 3) / 2;

  // Header - minimal dark
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(...COLORS.primaryForeground);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Evidence Comparison', margin, 14);

  // Expense info bar
  doc.setFillColor(...COLORS.card);
  doc.rect(0, 22, pageWidth, 14, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.2);
  doc.line(0, 36, pageWidth, 36);

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${receipt.merchant} | ${formatCurrency(receipt.total || 0)} | ${formatDate(receipt.date)}`,
    pageWidth / 2,
    31,
    { align: 'center' }
  );

  const contentY = 48;
  const imageHeight = pageHeight - contentY - 45;

  // Left side: What was purchased
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('WHAT WAS PURCHASED', margin, contentY - 5);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(EVIDENCE_TYPE_LABELS[purchaseDoc.evidence_type], margin, contentY + 1);

  // Left image container
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, contentY + 5, halfWidth, imageHeight, 2, 2, 'S');

  if (purchaseDoc.file_url) {
    try {
      const base64 = await imageUrlToBase64(purchaseDoc.file_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 600, 700, 0.85);
        doc.addImage(
          compressed,
          'JPEG',
          margin,
          contentY + 5,
          halfWidth,
          imageHeight,
          undefined,
          'SLOW'
        );
      }
    } catch (error) {
      addNoImagePlaceholder(doc, margin, contentY + 5, halfWidth, imageHeight);
    }
  }

  // Right side: How it was paid
  const rightX = margin * 2 + halfWidth;
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW IT WAS PAID', rightX, contentY - 5);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(EVIDENCE_TYPE_LABELS[paymentProof.evidence_type], rightX, contentY + 1);

  // Right image container
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, contentY + 5, halfWidth, imageHeight, 2, 2, 'S');

  if (paymentProof.file_url) {
    try {
      const base64 = await imageUrlToBase64(paymentProof.file_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 600, 700, 0.85);
        doc.addImage(
          compressed,
          'JPEG',
          rightX,
          contentY + 5,
          halfWidth,
          imageHeight,
          undefined,
          'SLOW'
        );
      }
    } catch (error) {
      addNoImagePlaceholder(doc, rightX, contentY + 5, halfWidth, imageHeight);
    }
  }

  // Footer explanation - muted
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    'This comparison shows what was purchased alongside proof of payment for IRS audit verification.',
    pageWidth / 2,
    pageHeight - 18,
    { align: 'center' }
  );

  addPageNumber(doc, pageNum);
}

/**
 * Get color for evidence type - shadcn/ui inspired muted colors
 */
function getEvidenceTypeColor(type: EvidenceType): [number, number, number] {
  const colors: Record<EvidenceType, [number, number, number]> = {
    [EvidenceType.RECEIPT]: [34, 197, 94], // green-500
    [EvidenceType.INVOICE]: [59, 130, 246], // blue-500
    [EvidenceType.PAYMENT_PROOF]: [168, 85, 247], // violet-500
    [EvidenceType.ONLINE_ORDER]: [249, 115, 22], // orange-500
    [EvidenceType.OTHER]: [100, 116, 139], // slate-500
  };
  return colors[type] || colors[EvidenceType.OTHER];
}

/**
 * Download IRS Audit PDF with evidence bundle naming
 */
export function downloadIRSAuditPDF(blob: Blob, taxYear: number): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TaxClip_IRS_AuditBundle_FY${taxYear}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

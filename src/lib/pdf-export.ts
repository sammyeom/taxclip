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

// Colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // blue-500
  secondary: [107, 114, 128] as [number, number, number], // gray-500
  accent: [16, 185, 129] as [number, number, number], // green-500
  text: [31, 41, 55] as [number, number, number], // gray-800
  lightGray: [243, 244, 246] as [number, number, number], // gray-100
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
 * Add Summary Page (Page 1)
 */
async function addSummaryPage(
  doc: jsPDF,
  metadata: ReturnType<typeof generateExportMetadata>,
  summaries: CategorySummary[],
  options: ExportOptions
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  let yPos = margin;

  // Calculate header height based on business info
  const hasBusinessInfo = options.businessName || options.ein || options.cpaName;
  const headerHeight = hasBusinessInfo ? 55 : 45;

  // Header Section
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TaxClip Expense Report', margin, yPos + 12);

  // Subtitle - Left side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tax Year: FY${metadata.taxYear}`, margin, yPos + 22);
  doc.text(
    `Generated: ${new Date(metadata.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    margin,
    yPos + 29
  );

  // Business Info - Right side
  if (hasBusinessInfo) {
    const rightX = pageWidth - margin;
    let infoY = yPos + 22;
    doc.setFontSize(9);

    if (options.businessName) {
      doc.text(options.businessName, rightX, infoY, { align: 'right' });
      infoY += 6;
    }
    if (options.ein) {
      doc.text(`EIN: ${options.ein}`, rightX, infoY, { align: 'right' });
      infoY += 6;
    }
    if (options.cpaName) {
      doc.text(`Prepared for: ${options.cpaName}`, rightX, infoY, { align: 'right' });
    }
  }

  yPos = headerHeight + 10;

  // Summary Cards
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPENSE SUMMARY', margin, yPos);

  yPos += 8;

  // Summary Box
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 30, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);

  const summaryItems = [
    { label: 'Total Receipts', value: metadata.totalReceipts.toString() },
    { label: 'Total Expenses', value: formatCurrency(metadata.totalAmount) },
    { label: 'Total Deductible', value: formatCurrency(metadata.totalDeductible) },
  ];

  const colWidth = (pageWidth - margin * 2) / 3;
  summaryItems.forEach((item, index) => {
    const xPos = margin + colWidth * index + colWidth / 2;
    doc.text(item.label, xPos, yPos + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.text(item.value, xPos, yPos + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(10);
  });

  yPos += 45;

  // Schedule C Category Breakdown Table
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHEDULE C CATEGORY BREAKDOWN', margin, yPos);

  yPos += 5;

  // Table using autoTable
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
    'TOTAL',
    formatCurrency(summaries.reduce((sum, s) => sum + s.amount, 0)),
    summaries.reduce((sum, s) => sum + s.count, 0).toString(),
    formatCurrency(summaries.reduce((sum, s) => sum + s.deductibleAmount, 0)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Line #', 'Category', 'Amount', 'Count', 'Deductible']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 25 },      // Line #
      1: { cellWidth: 70 },      // Category (wider for long names)
      2: { cellWidth: 35, halign: 'right' },  // Amount
      3: { cellWidth: 20, halign: 'center' }, // Count
      4: { cellWidth: 30, halign: 'right' },  // Deductible
    },
    tableWidth: 180, // Match page width minus margins (210 - 15*2)
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Style total row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [229, 231, 235]; // gray-200
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

  // Page number
  addPageNumber(doc, 1);
}

/**
 * Add Receipt Detail Pages
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

    // Page Header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt Details - FY${taxYear}`, margin, 13);

    let yPos = 30;

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
 * Add single receipt block with image and details
 * Layout: Details on top, larger image below
 */
async function addReceiptBlock(
  doc: jsPDF,
  receipt: Receipt,
  yPos: number,
  blockHeight: number,
  index: number
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  const contentWidth = pageWidth - margin * 2;

  // New layout: details section (top) + image section (bottom)
  const detailsHeight = 55; // Fixed height for details
  const imageHeight = blockHeight - detailsHeight - 10; // Remaining space for image

  // Background for receipt block
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, yPos, contentWidth, blockHeight - 5, 2, 2, 'F');

  // Receipt number badge
  doc.setFillColor(...COLORS.primary);
  doc.circle(margin + 8, yPos + 8, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(index.toString(), margin + 8, yPos + 10, { align: 'center' });

  // Receipt Details (top section - full width)
  let detailY = yPos + 8;
  const detailsXPos = margin + 18;
  const detailsWidth = contentWidth - 20;

  // Vendor (Title)
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.merchant || 'Unknown Vendor', detailsXPos, detailY);
  detailY += 8;

  // Details in two columns for better space usage
  const categoryText = receipt.subcategory
    ? `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')}) - ${getSubcategoryLabel(receipt.category || 'other', receipt.subcategory)}`
    : `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')})`;

  const leftDetails = [
    { label: 'Date', value: formatDate(receipt.date) },
    { label: 'Amount', value: formatCurrency(receipt.total || 0) },
    { label: 'Category', value: categoryText },
  ];

  const rightDetails = [
    { label: 'Payment', value: receipt.payment_method || '-' },
    { label: 'Purpose', value: receipt.business_purpose || '-' },
  ];

  doc.setFontSize(9);

  // Left column
  let leftY = detailY;
  leftDetails.forEach((detail) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text(`${detail.label}:`, detailsXPos, leftY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    let value = detail.value;
    const maxWidth = detailsWidth / 2 - 40;
    while (doc.getTextWidth(value) > maxWidth && value.length > 3) {
      value = value.slice(0, -4) + '...';
    }
    doc.text(value, detailsXPos + 28, leftY);
    leftY += 6;
  });

  // Right column
  const rightXPos = margin + contentWidth / 2;
  let rightY = detailY;
  rightDetails.forEach((detail) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text(`${detail.label}:`, rightXPos, rightY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    let value = detail.value;
    const maxWidth = detailsWidth / 2 - 35;
    while (doc.getTextWidth(value) > maxWidth && value.length > 3) {
      value = value.slice(0, -4) + '...';
    }
    doc.text(value, rightXPos + 25, rightY);
    rightY += 6;
  });

  // Receipt Image or Email Text (bottom section - larger, centered)
  const imageYPos = yPos + detailsHeight;
  const maxImgWidth = Math.min(contentWidth - 20, 120); // Max 120mm wide
  const maxImgHeight = imageHeight - 5;

  if (receipt.image_url) {
    try {
      const base64 = await imageUrlToBase64(receipt.image_url);
      if (base64) {
        // Optimized for 800x600 as requested
        const compressed = await compressImageForPDF(base64, 800, 600, 0.85);

        // Center the image horizontally
        const imgX = margin + (contentWidth - maxImgWidth) / 2;

        doc.addImage(
          compressed,
          'JPEG',
          imgX,
          imageYPos,
          maxImgWidth,
          maxImgHeight,
          undefined,
          'SLOW'
        );
      } else {
        const placeholderX = margin + (contentWidth - maxImgWidth) / 2;
        addNoImagePlaceholder(doc, placeholderX, imageYPos, maxImgWidth, maxImgHeight);
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      const placeholderX = margin + (contentWidth - maxImgWidth) / 2;
      addNoImagePlaceholder(doc, placeholderX, imageYPos, maxImgWidth, maxImgHeight);
    }
  } else if (receipt.email_text) {
    // Show email text when no image is available
    addEmailTextBlock(doc, receipt.email_text, margin + 5, imageYPos, contentWidth - 10, maxImgHeight);
  } else {
    const placeholderX = margin + (contentWidth - maxImgWidth) / 2;
    addNoImagePlaceholder(doc, placeholderX, imageYPos, maxImgWidth, maxImgHeight);
  }

  // Notes (if any)
  if (receipt.notes) {
    detailY += 2;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(8);

    let notes = `Notes: ${receipt.notes}`;
    const maxNotesWidth = detailsWidth;
    while (doc.getTextWidth(notes) > maxNotesWidth && notes.length > 10) {
      notes = notes.slice(0, -4) + '...';
    }
    doc.text(notes, detailsXPos, detailY);
  }
}

/**
 * Add placeholder for missing images
 */
function addNoImagePlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  doc.setFillColor(229, 231, 235); // gray-200
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(10);
  doc.text('No Image', x + width / 2, y + height / 2, { align: 'center' });
}

/**
 * Add email text block when no image is available
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
  // Background with light blue tint to distinguish from image
  doc.setFillColor(240, 249, 255); // sky-50
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  // Border
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 2, 2, 'S');

  // Header label
  doc.setFillColor(14, 165, 233); // sky-500
  doc.roundedRect(x, y, width, 8, 2, 2, 'F');
  doc.setFillColor(240, 249, 255); // Cover bottom corners
  doc.rect(x, y + 6, width, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMAIL / TEXT EVIDENCE', x + width / 2, y + 5.5, { align: 'center' });

  // Email content
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(7);
  doc.setFont('courier', 'normal'); // Monospace font for email text

  const padding = 4;
  const textX = x + padding;
  const textY = y + 14;
  const textWidth = width - padding * 2;
  const maxHeight = height - 18; // Account for header and padding

  // Split text into lines that fit the width
  const lines = doc.splitTextToSize(emailText, textWidth);

  // Calculate how many lines can fit in the available height
  const lineHeight = 3; // Approximate line height for font size 7
  const maxLines = Math.floor(maxHeight / lineHeight);

  // Display lines that fit
  const displayLines = lines.slice(0, maxLines);

  // Add ellipsis if text is truncated
  if (lines.length > maxLines && displayLines.length > 0) {
    displayLines[displayLines.length - 1] = displayLines[displayLines.length - 1].substring(0, 50) + '...';
  }

  doc.text(displayLines, textX, textY);
}

/**
 * Add page number footer
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
 * Add Expense Overview Page
 * Shows summary of expense with list of attached evidence
 */
async function addExpenseOverviewPage(
  doc: jsPDF,
  receipt: Receipt,
  pageNum: number
): Promise<void> {
  const { margin, pageWidth } = PDF_CONFIG;
  let yPos = margin;

  // Header
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Documentation', margin, yPos + 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('IRS Audit-Ready Evidence Bundle', margin, yPos + 24);

  yPos = 45;

  // Expense Details Card
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, 'F');

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.merchant || 'Unknown Vendor', margin + 10, yPos + 15);

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.text(formatCurrency(receipt.total || 0), pageWidth - margin - 10, yPos + 18, {
    align: 'right',
  });

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'normal');

  const detailsY = yPos + 28;
  doc.text(`Date: ${formatDate(receipt.date)}`, margin + 10, detailsY);
  const overviewCategoryText = receipt.subcategory
    ? `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')}) - ${getSubcategoryLabel(receipt.category || 'other', receipt.subcategory)}`
    : `${getCategoryLabel(receipt.category || 'other')} (Line ${getScheduleCLine(receipt.category || 'other')})`;
  doc.text(`Category: ${overviewCategoryText}`, margin + 10, detailsY + 7);

  if (receipt.business_purpose) {
    doc.text(`Business Purpose: ${receipt.business_purpose}`, margin + 10, detailsY + 14);
  }

  if (receipt.payment_method) {
    doc.text(`Payment Method: ${receipt.payment_method}`, margin + 10, detailsY + 21);
  }

  yPos = 110;

  // Evidence Summary
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTACHED EVIDENCE', margin, yPos);

  yPos += 8;

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
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 85 },
    },
    margin: { left: margin, right: margin },
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
 * Add Evidence Page
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

  // Header with evidence type
  const evidenceColor = getEvidenceTypeColor(evidence.evidence_type);
  doc.setFillColor(...evidenceColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(sectionLabel.toUpperCase(), margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${EVIDENCE_TYPE_LABELS[evidence.evidence_type]} | ${receipt.merchant} | ${formatDate(receipt.date)}`,
    margin,
    20
  );

  // Evidence image - large display
  const imageY = 35;
  const imageMaxWidth = pageWidth - margin * 2;
  const imageMaxHeight = pageHeight - imageY - 40;

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

  // Footer with file info
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`File: ${evidence.file_name}`, margin, pageHeight - 15);
  doc.text(
    `Uploaded: ${new Date(evidence.upload_date).toLocaleDateString()}`,
    pageWidth - margin,
    pageHeight - 15,
    { align: 'right' }
  );

  addPageNumber(doc, pageNum);
}

/**
 * Add Comparison Page
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

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Evidence Comparison', margin, 16);

  // Expense info bar
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(0, 25, pageWidth, 15, 'F');

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${receipt.merchant} | ${formatCurrency(receipt.total || 0)} | ${formatDate(receipt.date)}`,
    pageWidth / 2,
    33,
    { align: 'center' }
  );

  const contentY = 50;
  const imageHeight = pageHeight - contentY - 50;

  // Left side: What was purchased
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('WHAT WAS PURCHASED', margin, contentY - 5);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'normal');
  doc.text(EVIDENCE_TYPE_LABELS[purchaseDoc.evidence_type], margin, contentY + 2);

  if (purchaseDoc.file_url) {
    try {
      const base64 = await imageUrlToBase64(purchaseDoc.file_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 600, 700, 0.85);
        doc.addImage(
          compressed,
          'JPEG',
          margin,
          contentY + 8,
          halfWidth,
          imageHeight,
          undefined,
          'SLOW'
        );
      }
    } catch (error) {
      addNoImagePlaceholder(doc, margin, contentY + 8, halfWidth, imageHeight);
    }
  }

  // Right side: How it was paid
  const rightX = margin * 2 + halfWidth;
  doc.setTextColor(139, 92, 246); // purple-500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW IT WAS PAID', rightX, contentY - 5);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'normal');
  doc.text(EVIDENCE_TYPE_LABELS[paymentProof.evidence_type], rightX, contentY + 2);

  if (paymentProof.file_url) {
    try {
      const base64 = await imageUrlToBase64(paymentProof.file_url);
      if (base64) {
        const compressed = await compressImageForPDF(base64, 600, 700, 0.85);
        doc.addImage(
          compressed,
          'JPEG',
          rightX,
          contentY + 8,
          halfWidth,
          imageHeight,
          undefined,
          'SLOW'
        );
      }
    } catch (error) {
      addNoImagePlaceholder(doc, rightX, contentY + 8, halfWidth, imageHeight);
    }
  }

  // Footer explanation
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(
    'This comparison shows what was purchased alongside proof of payment for IRS audit verification.',
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );

  addPageNumber(doc, pageNum);
}

/**
 * Get color for evidence type
 */
function getEvidenceTypeColor(type: EvidenceType): [number, number, number] {
  const colors: Record<EvidenceType, [number, number, number]> = {
    [EvidenceType.RECEIPT]: [16, 185, 129], // green-500
    [EvidenceType.INVOICE]: [59, 130, 246], // blue-500
    [EvidenceType.PAYMENT_PROOF]: [139, 92, 246], // purple-500
    [EvidenceType.ONLINE_ORDER]: [245, 158, 11], // amber-500
    [EvidenceType.OTHER]: [107, 114, 128], // gray-500
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

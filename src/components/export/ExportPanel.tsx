'use client';

import { useState, useCallback } from 'react';
import { Download, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Receipt } from '@/types/database';
import { generateIRSReadyCSV, downloadCSV, ExportOptions } from '@/lib/export';
import { generateAuditPDF, downloadPDF } from '@/lib/pdf-export';

interface ExportPanelProps {
  receipts: Receipt[];
  taxYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ExportPanel({
  receipts,
  taxYear,
  availableYears,
  onYearChange,
}: ExportPanelProps) {
  const [csvStatus, setCsvStatus] = useState<ExportStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>('idle');
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfMessage, setPdfMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Build export options
  const getExportOptions = (): ExportOptions => ({
    taxYear,
  });

  // Handle CSV Export
  const handleCSVExport = useCallback(async () => {
    if (receipts.length === 0) {
      setError('No receipts to export for this tax year.');
      return;
    }

    setCsvStatus('loading');
    setError(null);

    try {
      const csvContent = generateIRSReadyCSV(receipts, getExportOptions());
      downloadCSV(csvContent, taxYear);
      setCsvStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => setCsvStatus('idle'), 3000);
    } catch (err) {
      console.error('CSV export error:', err);
      setCsvStatus('error');
      setError('Failed to generate CSV. Please try again.');
    }
  }, [receipts, taxYear]);

  // Handle PDF Export
  const handlePDFExport = useCallback(async () => {
    if (receipts.length === 0) {
      setError('No receipts to export for this tax year.');
      return;
    }

    setPdfStatus('loading');
    setPdfProgress(0);
    setPdfMessage('Starting PDF generation...');
    setError(null);

    try {
      const blob = await generateAuditPDF(receipts, getExportOptions(), (progress, message) => {
        setPdfProgress(progress);
        setPdfMessage(message);
      });

      downloadPDF(blob, taxYear);
      setPdfStatus('success');
      setPdfMessage('PDF downloaded successfully!');

      // Reset status after 3 seconds
      setTimeout(() => {
        setPdfStatus('idle');
        setPdfProgress(0);
        setPdfMessage('');
      }, 3000);
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfStatus('error');
      setError('Failed to generate PDF. Please try again.');
    }
  }, [receipts, taxYear]);

  // Get button styles based on status
  const getButtonStyles = (status: ExportStatus, baseColor: string) => {
    const base = `flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 min-w-[180px]`;

    switch (status) {
      case 'loading':
        return `${base} bg-gray-400 text-white cursor-not-allowed`;
      case 'success':
        return `${base} bg-green-500 text-white`;
      case 'error':
        return `${base} bg-red-500 text-white hover:bg-red-600`;
      default:
        return `${base} ${baseColor} text-white hover:opacity-90 shadow-md hover:shadow-lg`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">IRS-Ready Export</h2>
          <p className="text-sm text-gray-500 mt-1">
            Export your expenses for Schedule C filing
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="tax-year" className="text-sm font-medium text-gray-600">
            Tax Year:
          </label>
          <select
            id="tax-year"
            value={taxYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                FY{year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipt Count Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            {receipts.length === 0 ? (
              'No receipts found for this tax year'
            ) : (
              <>
                <span className="font-semibold text-gray-800">{receipts.length}</span>
                {' '}receipt{receipts.length !== 1 ? 's' : ''} ready for export
              </>
            )}
          </span>
          {receipts.length > 0 && (
            <span className="text-sm text-gray-500">
              Total: ${receipts.reduce((sum, r) => sum + (r.total || 0), 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* CSV Export Button */}
        <button
          onClick={handleCSVExport}
          disabled={csvStatus === 'loading' || receipts.length === 0}
          className={getButtonStyles(csvStatus, 'bg-green-600')}
        >
          {csvStatus === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : csvStatus === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : csvStatus === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {csvStatus === 'success' ? 'Downloaded!' : 'Download CSV'}
        </button>

        {/* PDF Export Button */}
        <button
          onClick={handlePDFExport}
          disabled={pdfStatus === 'loading' || receipts.length === 0}
          className={getButtonStyles(pdfStatus, 'bg-blue-600')}
        >
          {pdfStatus === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : pdfStatus === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : pdfStatus === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
          {pdfStatus === 'success' ? 'Downloaded!' : 'Generate Audit PDF'}
        </button>
      </div>

      {/* PDF Progress Bar */}
      {pdfStatus === 'loading' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{pdfMessage}</span>
            <span>{pdfProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pdfProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Export Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">What&apos;s included:</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">CSV:</span>
            <span>Date, Vendor, Amount, IRS Category, Schedule C Line, Business Purpose</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-bold">PDF:</span>
            <span>Summary page with category totals + receipt images matched with details</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

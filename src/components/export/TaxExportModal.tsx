'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Download,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  Hash,
} from 'lucide-react';
import { Receipt } from '@/types/database';
import { generateIRSReadyCSV, downloadCSV, ExportOptions } from '@/lib/export';
import { generateAuditPDF, downloadPDF } from '@/lib/pdf-export';

interface TaxExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: Receipt[];
  taxYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function TaxExportModal({
  isOpen,
  onClose,
  receipts,
  taxYear,
  availableYears,
  onYearChange,
}: TaxExportModalProps) {
  // Form state
  const [businessName, setBusinessName] = useState('');
  const [ein, setEin] = useState('');
  const [cpaName, setCpaName] = useState('');

  // Export state
  const [csvStatus, setCsvStatus] = useState<ExportStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>('idle');
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfMessage, setPdfMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Build export options
  const getExportOptions = (): ExportOptions => ({
    businessName: businessName.trim() || undefined,
    ein: ein.trim() || undefined,
    cpaName: cpaName.trim() || undefined,
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

      setTimeout(() => setCsvStatus('idle'), 3000);
    } catch (err) {
      console.error('CSV export error:', err);
      setCsvStatus('error');
      setError('Failed to generate CSV. Please try again.');
    }
  }, [receipts, taxYear, businessName, ein, cpaName]);

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
      const blob = await generateAuditPDF(
        receipts,
        getExportOptions(),
        (progress, message) => {
          setPdfProgress(progress);
          setPdfMessage(message);
        }
      );

      downloadPDF(blob, taxYear);
      setPdfStatus('success');
      setPdfMessage('PDF downloaded successfully!');

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
  }, [receipts, taxYear, businessName, ein, cpaName]);

  // Format EIN as XX-XXXXXXX
  const handleEinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    if (digits.length > 2) {
      setEin(`${digits.slice(0, 2)}-${digits.slice(2)}`);
    } else {
      setEin(digits);
    }
  };

  if (!isOpen) return null;

  const isExporting = csvStatus === 'loading' || pdfStatus === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isExporting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-t-2xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Export for Tax Filing</h2>
              <p className="text-cyan-100 text-sm mt-1">
                IRS Schedule C Ready Format
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tax Year Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Year
            </label>
            <select
              value={taxYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              disabled={isExporting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  FY{year}
                </option>
              ))}
            </select>
          </div>

          {/* Receipt Count */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {receipts.length === 0 ? (
                  <span className="text-orange-600">No receipts for this year</span>
                ) : (
                  <>
                    <span className="font-bold text-gray-800">{receipts.length}</span>
                    {' '}receipt{receipts.length !== 1 ? 's' : ''} ready
                  </>
                )}
              </span>
              {receipts.length > 0 && (
                <span className="font-semibold text-green-600">
                  ${receipts.reduce((sum, r) => sum + (r.total || 0), 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Business Info (Optional) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Information (Optional)
            </h3>

            {/* Business Name */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Business Name"
                disabled={isExporting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* EIN */}
            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                EIN (Employer Identification Number)
              </label>
              <input
                type="text"
                value={ein}
                onChange={(e) => handleEinChange(e.target.value)}
                placeholder="XX-XXXXXXX"
                disabled={isExporting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* CPA Name */}
            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Prepared for (CPA/Accountant)
              </label>
              <input
                type="text"
                value={cpaName}
                onChange={(e) => setCpaName(e.target.value)}
                placeholder="CPA or Accountant Name"
                disabled={isExporting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          {/* PDF Progress */}
          {pdfStatus === 'loading' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                <span>{pdfMessage}</span>
                <span className="font-semibold">{pdfProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pdfProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* CSV Button */}
            <button
              onClick={handleCSVExport}
              disabled={isExporting || receipts.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all duration-200 ${
                csvStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : csvStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {csvStatus === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : csvStatus === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download CSV
                </>
              )}
            </button>

            {/* PDF Button */}
            <button
              onClick={handlePDFExport}
              disabled={isExporting || receipts.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all duration-200 ${
                pdfStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : pdfStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {pdfStatus === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : pdfStatus === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Downloaded!
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Audit PDF
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>CSV:</strong> Date, Vendor, Amount, IRS Category, Line #, Business Purpose, Receipt URL</p>
            <p><strong>PDF:</strong> Summary page + receipt images with details (IRS audit-ready)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

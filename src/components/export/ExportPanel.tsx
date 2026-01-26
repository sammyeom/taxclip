'use client';

import { useState, useCallback } from 'react';
import { Download, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Receipt } from '@/types/database';
import { generateBusinessReceiptCSV, downloadCSV, ExportOptions } from '@/lib/export';
import { generateAuditPDF, downloadPDF } from '@/lib/pdf-export';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportPanelProps {
  receipts: Receipt[];
  taxYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

// Calculate total from subtotal + tax + tip
const getReceiptTotal = (r: Receipt): number => {
  const subtotal = r.subtotal ?? 0;
  const tax = r.tax ?? 0;
  const tip = r.tip ?? 0;
  if (subtotal > 0 || tax > 0 || tip > 0) {
    return subtotal + tax + tip;
  }
  return r.total ?? 0;
};

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
      const csvContent = generateBusinessReceiptCSV(receipts, getExportOptions());
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

  // Get button variant based on status
  const getButtonVariant = (status: ExportStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        {/* Header with Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-xl font-bold">IRS-Ready Export</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Export your expenses for Schedule C filing
            </CardDescription>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Tax Year:
            </label>
            <Select
              value={taxYear.toString()}
              onValueChange={(value) => onYearChange(Number(value))}
            >
              <SelectTrigger className="w-[120px] sm:w-[130px] h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    FY{year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Receipt Count Info */}
        <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {receipts.length === 0 ? (
                'No receipts found for this tax year'
              ) : (
                <>
                  <span className="font-semibold text-foreground">{receipts.length}</span>
                  {' '}receipt{receipts.length !== 1 ? 's' : ''} ready for export
                </>
              )}
            </span>
            {receipts.length > 0 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                Total: ${receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* CSV Export Button */}
          <Button
            onClick={handleCSVExport}
            disabled={csvStatus === 'loading' || receipts.length === 0}
            variant={getButtonVariant(csvStatus)}
            className={`flex-1 h-10 sm:h-11 text-sm sm:text-base ${
              csvStatus === 'success'
                ? 'bg-green-500 hover:bg-green-600'
                : csvStatus === 'idle'
                ? 'bg-green-600 hover:bg-green-700'
                : ''
            }`}
          >
            {csvStatus === 'loading' ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
            ) : csvStatus === 'success' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            ) : csvStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            ) : (
              <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            )}
            {csvStatus === 'success' ? 'Downloaded!' : 'Download CSV'}
          </Button>

          {/* PDF Export Button */}
          <Button
            onClick={handlePDFExport}
            disabled={pdfStatus === 'loading' || receipts.length === 0}
            variant={getButtonVariant(pdfStatus)}
            className={`flex-1 h-10 sm:h-11 text-sm sm:text-base ${
              pdfStatus === 'success'
                ? 'bg-green-500 hover:bg-green-600'
                : pdfStatus === 'idle'
                ? 'bg-cyan-600 hover:bg-cyan-700'
                : ''
            }`}
          >
            {pdfStatus === 'loading' ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
            ) : pdfStatus === 'success' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            ) : pdfStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            )}
            {pdfStatus === 'success' ? 'Downloaded!' : 'Generate Audit PDF'}
          </Button>
        </div>

        {/* PDF Progress Bar */}
        {pdfStatus === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span>{pdfMessage}</span>
              <span>{pdfProgress}%</span>
            </div>
            <Progress value={pdfProgress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Export Info */}
        <div className="pt-3 sm:pt-4 border-t">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2">What&apos;s included:</h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">CSV:</span>
              <span>Date, Vendor, Amount, IRS Category, Schedule C Line, Business Purpose</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 font-bold flex-shrink-0">PDF:</span>
              <span>Summary page with category totals + receipt images matched with details</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

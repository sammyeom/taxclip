'use client';

import { useState, useCallback } from 'react';
import {
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
import { generateBusinessReceiptCSV, downloadCSV, ExportOptions } from '@/lib/export';
import { generateAuditPDF, downloadPDF } from '@/lib/pdf-export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      const csvContent = generateBusinessReceiptCSV(receipts, getExportOptions());
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

  const isExporting = csvStatus === 'loading' || pdfStatus === 'loading';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExporting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 -mx-6 -mt-6 px-4 sm:px-6 py-4 sm:py-5 rounded-t-lg">
          <DialogTitle className="text-lg sm:text-xl font-bold text-white">
            Export for Tax Filing
          </DialogTitle>
          <DialogDescription className="text-cyan-100 text-xs sm:text-sm">
            IRS Schedule C Ready Format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2">
          {/* Tax Year Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tax Year</Label>
            <Select
              value={taxYear.toString()}
              onValueChange={(value) => onYearChange(Number(value))}
              disabled={isExporting}
            >
              <SelectTrigger className="w-full h-10 sm:h-11">
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

          {/* Receipt Count */}
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {receipts.length === 0 ? (
                  <span className="text-orange-600">No receipts for this year</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{receipts.length}</span>
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
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Information (Optional)
            </h3>

            {/* Business Name */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-muted-foreground">
                Business Name
              </Label>
              <Input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Business Name"
                disabled={isExporting}
                className="h-9 sm:h-10"
              />
            </div>

            {/* EIN */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" />
                EIN (Employer Identification Number)
              </Label>
              <Input
                type="text"
                value={ein}
                onChange={(e) => handleEinChange(e.target.value)}
                placeholder="XX-XXXXXXX"
                disabled={isExporting}
                className="h-9 sm:h-10"
              />
            </div>

            {/* CPA Name */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Prepared for (CPA/Accountant)
              </Label>
              <Input
                type="text"
                value={cpaName}
                onChange={(e) => setCpaName(e.target.value)}
                placeholder="CPA or Accountant Name"
                disabled={isExporting}
                className="h-9 sm:h-10"
              />
            </div>
          </div>

          {/* PDF Progress */}
          {pdfStatus === 'loading' && (
            <div className="bg-cyan-50 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm text-cyan-600">
                <span>{pdfMessage}</span>
                <span className="font-semibold">{pdfProgress}%</span>
              </div>
              <Progress value={pdfProgress} className="h-2" />
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* CSV Button */}
            <Button
              onClick={handleCSVExport}
              disabled={isExporting || receipts.length === 0}
              className={`flex-1 h-10 sm:h-11 text-sm sm:text-base ${
                csvStatus === 'success'
                  ? 'bg-green-500 hover:bg-green-600'
                  : csvStatus === 'error'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {csvStatus === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                  Exporting...
                </>
              ) : csvStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Download CSV
                </>
              )}
            </Button>

            {/* PDF Button */}
            <Button
              onClick={handlePDFExport}
              disabled={isExporting || receipts.length === 0}
              className={`flex-1 h-10 sm:h-11 text-sm sm:text-base ${
                pdfStatus === 'success'
                  ? 'bg-green-500 hover:bg-green-600'
                  : pdfStatus === 'error'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-cyan-600 hover:bg-cyan-700'
              }`}
            >
              {pdfStatus === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : pdfStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Audit PDF
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong className="text-green-600">CSV:</strong> Date, Vendor, Amount, IRS Category, Line #, Business Purpose, Receipt URL</p>
            <p><strong className="text-cyan-600">PDF:</strong> Summary page + receipt images with details (IRS audit-ready)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

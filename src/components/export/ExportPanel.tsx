'use client';

import { useState, useCallback } from 'react';
import { Download, FileText, Loader2, CheckCircle, AlertCircle, Calendar, ChevronDown, Check } from 'lucide-react';
import { Receipt } from '@/types/database';
import { generateBusinessReceiptCSV, downloadCSV, ExportOptions } from '@/lib/export';
import { generateAuditPDF, downloadPDF } from '@/lib/pdf-export';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type DateRange = 'this_year' | 'last_year' | 'this_month' | 'last_3_months' | 'all_time' | 'custom';

interface ExportPanelProps {
  receipts: Receipt[];
  dateRange: DateRange;
  dateRangeLabel: string;
  dateRangeDescription: string;
  onDateRangeChange: (range: DateRange) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange?: (startDate: Date, endDate: Date) => void;
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
  dateRange,
  dateRangeLabel,
  dateRangeDescription,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}: ExportPanelProps) {
  const [csvStatus, setCsvStatus] = useState<ExportStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>('idle');
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfMessage, setPdfMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  const currentYear = new Date().getFullYear();

  // Date range options
  const dateRangeOptions = [
    { key: 'this_year' as DateRange, label: `${currentYear}`, desc: 'Current year • Jan 1 - Dec 31' },
    { key: 'last_year' as DateRange, label: `${currentYear - 1}`, desc: 'Previous year • For tax filing' },
    { key: 'this_month' as DateRange, label: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }), desc: 'Current month' },
    { key: 'last_3_months' as DateRange, label: 'Last 3 Months', desc: (() => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return `${threeMonthsAgo.toLocaleString('en-US', { month: 'short' })} - ${now.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
    })() },
    { key: 'all_time' as DateRange, label: 'All Time', desc: 'All receipts ever' },
  ];

  // Build export options
  const getExportOptions = (): ExportOptions => ({
    taxYear: dateRange === 'last_year' ? currentYear - 1 : currentYear,
  });

  // Handle custom date selection
  const handleCustomDateClick = () => {
    // Initialize with current custom dates or defaults
    const start = customStartDate || new Date(currentYear, 0, 1);
    const end = customEndDate || new Date();
    setTempStartDate(start.toISOString().split('T')[0]);
    setTempEndDate(end.toISOString().split('T')[0]);
    setShowCustomDateDialog(true);
  };

  const handleCustomDateApply = () => {
    if (tempStartDate && tempEndDate && onCustomDateChange) {
      const start = new Date(tempStartDate);
      const end = new Date(tempEndDate);
      if (start <= end) {
        onCustomDateChange(start, end);
        onDateRangeChange('custom');
        setShowCustomDateDialog(false);
      }
    }
  };

  // Handle CSV Export
  const handleCSVExport = useCallback(async () => {
    if (receipts.length === 0) {
      setError('No receipts to export for this date range.');
      return;
    }

    setCsvStatus('loading');
    setError(null);

    try {
      const csvContent = generateBusinessReceiptCSV(receipts, getExportOptions());
      downloadCSV(csvContent, getExportOptions().taxYear);
      setCsvStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => setCsvStatus('idle'), 3000);
    } catch (err) {
      console.error('CSV export error:', err);
      setCsvStatus('error');
      setError('Failed to generate CSV. Please try again.');
    }
  }, [receipts, dateRange]);

  // Handle PDF Export
  const handlePDFExport = useCallback(async () => {
    if (receipts.length === 0) {
      setError('No receipts to export for this date range.');
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

      downloadPDF(blob, getExportOptions().taxYear);
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
  }, [receipts, dateRange]);

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
    <>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          {/* Header with Date Range Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-xl font-bold">IRS-Ready Export</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Export your expenses for Schedule C filing
              </CardDescription>
            </div>

            {/* Date Range Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 h-10 px-4 bg-white border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  <span className="font-semibold text-cyan-700">{dateRangeLabel}</span>
                  <ChevronDown className="w-4 h-4 text-cyan-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {dateRangeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => onDateRangeChange(option.key)}
                    className={`flex items-center gap-3 py-3 cursor-pointer ${
                      dateRange === option.key ? 'bg-cyan-50' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      dateRange === option.key
                        ? 'border-cyan-600 bg-cyan-600'
                        : 'border-slate-300'
                    }`}>
                      {dateRange === option.key && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.desc}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCustomDateClick}
                  className={`flex items-center gap-3 py-3 cursor-pointer ${
                    dateRange === 'custom' ? 'bg-cyan-50' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    dateRange === 'custom'
                      ? 'border-cyan-600 bg-cyan-600'
                      : 'border-slate-300'
                  }`}>
                    {dateRange === 'custom' && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Custom Range</div>
                    <div className="text-xs text-slate-500">
                      {dateRange === 'custom' && customStartDate && customEndDate
                        ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'Select start and end dates'}
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6">
          {/* Receipt Count Info */}
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {receipts.length === 0 ? (
                  'No receipts found for this date range'
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{receipts.length}</span>
                    {' '}receipt{receipts.length !== 1 ? 's' : ''} • {dateRangeDescription}
                  </>
                )}
              </span>
              {receipts.length > 0 && (
                <span className="text-xs sm:text-sm font-semibold text-cyan-600">
                  ${receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0).toFixed(2)}
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

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
            <DialogDescription>
              Select the start and end dates for your export.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                max={tempEndDate || undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                min={tempStartDate || undefined}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!tempStartDate || !tempEndDate}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

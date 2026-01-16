'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getReceipts, deleteReceipt, getUserSettings, updateUserSettings, resetUserSettings } from '@/lib/supabase';
import { getReceiptImages, Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import JSZip from 'jszip';
import {
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Bell,
  Shield,
  Settings as SettingsIcon,
  Download,
  Trash2,
  RotateCcw,
  FileText,
  Archive,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AppSettings {
  // General
  currency: string;
  dateFormat: string;
  defaultCategory: string;
  autoCategorize: boolean;

  // Notifications
  emailNotifications: boolean;
  monthlySummary: boolean;
  uploadReminders: boolean;
  taxDeadlineReminders: boolean;

  // Tax Settings
  businessType: string;
  taxYear: string;
  mealsDeduction: number;
  mileageTracking: boolean;
  mileageRate: number;

  // Data & Privacy
  dataRetention: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  defaultCategory: 'other',
  autoCategorize: true,
  emailNotifications: true,
  monthlySummary: true,
  uploadReminders: false,
  taxDeadlineReminders: true,
  businessType: 'sole_proprietor',
  taxYear: 'calendar',
  mealsDeduction: 50,
  mileageTracking: false,
  mileageRate: 0.67,
  dataRetention: 7,
};

const IRS_CATEGORIES = [
  { value: 'advertising', label: 'Advertising' },
  { value: 'office_expense', label: 'Office Expense' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'meals', label: 'Meals' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'car_truck', label: 'Car & Truck' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legal_professional', label: 'Legal & Professional' },
  { value: 'rent_lease', label: 'Rent/Lease' },
  { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { value: 'other', label: 'Other' },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialogs
  const [deleteReceiptsDialog, setDeleteReceiptsDialog] = useState(false);
  const [resetSettingsDialog, setResetSettingsDialog] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiveDownloading, setArchiveDownloading] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Load settings
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await getUserSettings();

      if (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings');
        return;
      }

      // Map database fields to app settings fields
      const mappedSettings: AppSettings = {
        currency: data.currency,
        dateFormat: data.date_format,
        defaultCategory: data.default_category,
        autoCategorize: data.auto_categorize,
        emailNotifications: data.email_notifications,
        monthlySummary: data.monthly_summary,
        uploadReminders: data.receipt_reminders,
        taxDeadlineReminders: data.tax_deadline_reminders,
        businessType: data.business_type,
        taxYear: data.tax_year_type,
        mealsDeduction: data.meals_deduction_rate * 100, // Convert to percentage
        mileageTracking: data.mileage_tracking,
        mileageRate: data.mileage_rate,
        dataRetention: data.data_retention_years,
      };

      setSettings(mappedSettings);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings?: AppSettings) => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const settingsToSave = newSettings || settings;

      // Map app settings to database fields
      const dbSettings = {
        currency: settingsToSave.currency,
        date_format: settingsToSave.dateFormat,
        default_category: settingsToSave.defaultCategory,
        auto_categorize: settingsToSave.autoCategorize,
        email_notifications: settingsToSave.emailNotifications,
        monthly_summary: settingsToSave.monthlySummary,
        receipt_reminders: settingsToSave.uploadReminders,
        tax_deadline_reminders: settingsToSave.taxDeadlineReminders,
        business_type: settingsToSave.businessType,
        tax_year_type: settingsToSave.taxYear,
        meals_deduction_rate: settingsToSave.mealsDeduction / 100, // Convert to decimal
        mileage_tracking: settingsToSave.mileageTracking,
        mileage_rate: settingsToSave.mileageRate,
        data_retention_years: settingsToSave.dataRetention,
      };

      const { error: updateError } = await updateUserSettings(dbSettings);

      if (updateError) throw updateError;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Export data as CSV
  const handleExportData = async () => {
    try {
      const { data: receipts } = await getReceipts();
      if (!receipts || receipts.length === 0) {
        setError('No data to export');
        return;
      }

      const headers = 'Date,Vendor,Amount,Category,Business Purpose,Payment Method,Notes\n';
      const rows = receipts
        .map((r) => {
          const date = r.date || '';
          const vendor = (r.merchant || '').replace(/,/g, ';');
          const amount = r.total || 0;
          const category = r.category || '';
          const businessPurpose = (r.business_purpose || '').replace(/,/g, ';');
          const paymentMethod = r.payment_method || '';
          const notes = (r.notes || '').replace(/,/g, ';');
          return `${date},${vendor},${amount},${category},${businessPurpose},${paymentMethod},${notes}`;
        })
        .join('\n');

      const csv = headers + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxclip-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  // Download receipts archive
  const handleDownloadArchive = async () => {
    setArchiveDownloading(true);
    setArchiveProgress('Fetching receipts...');
    setError(null);

    try {
      const { data: receipts, error: fetchError } = await getReceipts();

      if (fetchError || !receipts || receipts.length === 0) {
        setError(receipts?.length === 0 ? 'No receipts to download.' : 'Failed to fetch receipts.');
        setArchiveDownloading(false);
        return;
      }

      const zip = new JSZip();
      const imagesFolder = zip.folder('images');

      // Create CSV content for receipt data
      const csvHeaders = ['ID', 'Date', 'Merchant', 'Total', 'Category', 'Business Purpose', 'Payment Method', 'Notes', 'Email Text', 'Image Files'];
      const csvRows = [csvHeaders.join(',')];

      let processedCount = 0;
      const totalCount = receipts.length;

      for (const receipt of receipts as Receipt[]) {
        processedCount++;
        setArchiveProgress(`Processing ${processedCount}/${totalCount} receipts...`);

        // Get all images for this receipt
        const imageUrls = getReceiptImages(receipt);
        const imageFileNames: string[] = [];

        // Download each image
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          try {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const blob = await response.blob();
              const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
              const fileName = `${receipt.id}_${i + 1}.${ext}`;
              imageFileNames.push(fileName);
              imagesFolder?.file(fileName, blob);
            }
          } catch {
            console.error(`Failed to download image: ${imageUrl}`);
          }
        }

        // Escape CSV fields
        const escapeCSV = (field: string | null | undefined): string => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Add row to CSV
        const row = [
          escapeCSV(receipt.id),
          escapeCSV(receipt.date),
          escapeCSV(receipt.merchant),
          receipt.total?.toString() || '0',
          escapeCSV(receipt.category),
          escapeCSV(receipt.business_purpose),
          escapeCSV(receipt.payment_method),
          escapeCSV(receipt.notes),
          escapeCSV(receipt.email_text),
          escapeCSV(imageFileNames.join('; ')),
        ];
        csvRows.push(row.join(','));

        // If there's email text, save it as a separate file
        if (receipt.email_text) {
          const emailFileName = `emails/${receipt.id}_email.txt`;
          zip.file(emailFileName, `Receipt: ${receipt.merchant}\nDate: ${receipt.date}\nTotal: $${receipt.total}\n\n--- Email Content ---\n\n${receipt.email_text}`);
        }
      }

      // Add CSV file to zip
      zip.file('receipts_data.csv', csvRows.join('\n'));

      // Add summary text file
      const summaryContent = `TaxClip Receipt Archive
Generated: ${new Date().toLocaleDateString()}

Total Receipts: ${receipts.length}
Total Amount: $${receipts.reduce((sum: number, r: Receipt) => sum + (r.total || 0), 0).toFixed(2)}

Files included:
- receipts_data.csv: All receipt data in CSV format
- images/: Receipt images organized by receipt ID
- emails/: Email text content (if available)

For tax filing assistance, please consult a qualified tax professional.
`;
      zip.file('README.txt', summaryContent);

      setArchiveProgress('Creating ZIP file...');

      // Generate and download the ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taxclip_archive_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Archive download error:', err);
      setError('Failed to create archive. Please try again.');
    } finally {
      setArchiveDownloading(false);
      setArchiveProgress('');
    }
  };

  // Clear cache
  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Delete all receipts
  const handleDeleteAllReceipts = async () => {
    setDeleting(true);
    try {
      const { data: receipts } = await getReceipts();
      if (receipts) {
        for (const receipt of receipts) {
          await deleteReceipt(receipt.id);
        }
      }
      setDeleteReceiptsDialog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError('Failed to delete receipts');
    } finally {
      setDeleting(false);
    }
  };

  // Reset settings
  const handleResetSettings = async () => {
    setDeleting(true);
    try {
      // Reset user settings in database
      const { error: resetError } = await resetUserSettings();

      if (resetError) throw resetError;

      // Reload settings to get defaults
      await loadSettings();

      setResetSettingsDialog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Reset settings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    } finally {
      setDeleting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = () => {
    setError('Account deletion must be requested through support. Please contact support@taxclip.com');
    setDeleteAccountDialog(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      {/* Success Toast Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">Success!</p>
              <p className="text-sm text-green-50">Settings saved successfully</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Settings</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage your app preferences and configurations</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* General Settings */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <Label className="text-sm font-semibold">Default Currency</Label>
              <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <Label className="text-sm font-semibold">Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => updateSetting('dateFormat', value)}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <Label className="text-sm font-semibold">Default Tax Category</Label>
              <Select value={settings.defaultCategory} onValueChange={(value) => updateSetting('defaultCategory', value)}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {IRS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Auto-categorize</Label>
                <p className="text-xs text-muted-foreground mt-0.5">AI category suggestions</p>
              </div>
              <Switch
                checked={settings.autoCategorize}
                onCheckedChange={(checked) => updateSetting('autoCategorize', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Email Notifications</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Receive email updates</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Monthly Summary</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly expense reports</p>
              </div>
              <Switch
                checked={settings.monthlySummary}
                onCheckedChange={(checked) => updateSetting('monthlySummary', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Upload Reminders</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Weekly upload reminders</p>
              </div>
              <Switch
                checked={settings.uploadReminders}
                onCheckedChange={(checked) => updateSetting('uploadReminders', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Tax Reminders</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Important date alerts</p>
              </div>
              <Switch
                checked={settings.taxDeadlineReminders}
                onCheckedChange={(checked) => updateSetting('taxDeadlineReminders', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              Tax Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <Label className="text-sm font-semibold">Business Type</Label>
              <Select value={settings.businessType} onValueChange={(value) => updateSetting('businessType', value)}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="s_corp">S Corporation</SelectItem>
                  <SelectItem value="c_corp">C Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <Label className="text-sm font-semibold">Tax Year</Label>
              <Select value={settings.taxYear} onValueChange={(value) => updateSetting('taxYear', value)}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">Calendar Year</SelectItem>
                  <SelectItem value="fiscal">Fiscal Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Meals Deduction (%)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">IRS standard is 50%</p>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.mealsDeduction}
                onChange={(e) => updateSetting('mealsDeduction', Number(e.target.value))}
                className="w-full sm:w-48 lg:w-64 h-9 sm:h-10"
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-semibold block">Mileage Tracking</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Track business mileage</p>
              </div>
              <Switch
                checked={settings.mileageTracking}
                onCheckedChange={(checked) => updateSetting('mileageTracking', checked)}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>

            {settings.mileageTracking && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
                <div className="flex-1">
                  <Label className="text-sm font-semibold">Mileage Rate ($/mile)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">2026: $0.67/mile</p>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.mileageRate}
                  onChange={(e) => updateSetting('mileageRate', Number(e.target.value))}
                  className="w-full sm:w-48 lg:w-64 h-9 sm:h-10"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Export All Data</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Download your data as CSV</p>
              </div>
              <Button
                variant="secondary"
                onClick={handleExportData}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-t gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Download Archive</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {archiveProgress || 'Download receipt images and data as ZIP'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleDownloadArchive}
                disabled={archiveDownloading}
                className="w-full sm:w-auto"
              >
                {archiveDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 border-t gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Data Retention</Label>
                <p className="text-xs text-muted-foreground mt-0.5">IRS recommends 7 years</p>
              </div>
              <Select value={String(settings.dataRetention)} onValueChange={(value) => updateSetting('dataRetention', Number(value))}>
                <SelectTrigger className="w-full sm:w-48 lg:w-64 h-9 sm:h-10">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Year</SelectItem>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                  <SelectItem value="7">7 Years (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-t gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Clear Cache</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Clear local browser data</p>
              </div>
              <Button
                variant="secondary"
                onClick={handleClearCache}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 border-b gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Delete All Receipts</Label>
                <p className="text-xs text-muted-foreground">Permanently delete all receipts</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setDeleteReceiptsDialog(true)}
                className="w-full sm:w-auto"
              >
                Delete Receipts
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 border-b gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Reset All Settings</Label>
                <p className="text-xs text-muted-foreground">Restore default settings</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setResetSettingsDialog(true)}
                className="w-full sm:w-auto"
              >
                Reset Settings
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Delete Account</Label>
                <p className="text-xs text-muted-foreground">Permanently delete account and data</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setDeleteAccountDialog(true)}
                className="w-full sm:w-auto"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={() => saveSettings()}
          disabled={saving}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={deleteReceiptsDialog} onOpenChange={setDeleteReceiptsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">Delete All Receipts</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              Are you sure you want to delete all receipts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllReceipts}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetSettingsDialog} onOpenChange={setResetSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 rounded-full p-3">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">Reset Settings</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              Are you sure you want to reset all settings to defaults?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSettings}
              disabled={deleting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">Delete Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              Are you absolutely sure? This will permanently delete your account and all data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

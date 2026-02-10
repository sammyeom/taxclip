'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { getReceipts, deleteReceipt, getUserSettings, updateUserSettings, resetUserSettings } from '@/lib/supabase';
import { getReceiptImages, Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import JSZip from 'jszip';
import { motion } from 'framer-motion';
import {
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Bell,
  Shield,
  Settings as SettingsIcon,
  Download,
  Trash2,
  RotateCcw,
  FileText,
  Archive,
  CreditCard,
  Crown,
  Zap,
  ExternalLink,
  Check,
  Sparkles,
  Target,
  Sun,
  Moon,
  Monitor,
  Palette,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useTheme } from 'next-themes';

interface AppSettings {
  // General
  currency: string;
  dateFormat: string;
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

// Calculate total from subtotal + tax + tip
const getReceiptTotal = (r: Receipt): number => {
  const subtotal = r.subtotal ?? 0;
  const tax = r.tax ?? 0;
  const tip = r.tip ?? 0;
  // If subtotal, tax, or tip exists, calculate total from them
  if (subtotal > 0 || tax > 0 || tip > 0) {
    return subtotal + tax + tip;
  }
  return r.total ?? 0;
};

// Wrapper component to handle Suspense for useSearchParams
function SettingsContent({ defaultTab }: { defaultTab: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();

  // Subscription and usage hooks
  const { subscription, isPro, isOnTrial, hasUsedTrial, createCheckout, openCustomerPortal } = useSubscription();
  const { monthlyCount, monthlyLimit, remainingUploads } = useUsageLimit();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile state

  // Preferences state
  const [receiptGoal, setReceiptGoal] = useState<number | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');

  // Billing state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
        autoCategorize: data.auto_categorize ?? true,
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

      // Load receipt goal and theme mode
      setReceiptGoal(data.receipt_goal || null);
      const savedTheme = data.theme_mode || 'auto';
      setThemeMode(savedTheme);
      setTheme(savedTheme === 'auto' ? 'system' : savedTheme);
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
        receipt_goal: receiptGoal,
        theme_mode: themeMode,
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
          const amount = getReceiptTotal(r);
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
        const receiptTotal = getReceiptTotal(receipt);
        const row = [
          escapeCSV(receipt.id),
          escapeCSV(receipt.date),
          escapeCSV(receipt.merchant),
          receiptTotal.toString(),
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
          zip.file(emailFileName, `Receipt: ${receipt.merchant}\nDate: ${receipt.date}\nTotal: $${receiptTotal}\n\n--- Email Content ---\n\n${receipt.email_text}`);
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

  // Handle checkout
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const checkoutUrl = await createCheckout(selectedPlan);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <p className="text-sm sm:text-base text-slate-600">Manage your account and app settings</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab Content */}
          <TabsContent value="settings">
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
          </TabsContent>

          {/* Billing Tab Content */}
          <TabsContent value="billing">
            {/* Current Plan Card */}
            <Card className="mb-6">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  {isPro ? (
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                  ) : (
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                  )}
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {isPro ? 'Pro' : 'Free'} Plan
                      {isOnTrial && (
                        <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Trial
                        </span>
                      )}
                    </h3>
                    {isPro && subscription?.plan_type === 'annual' && (
                      <span className="text-sm text-amber-600 font-medium">Yearly subscription</span>
                    )}
                    {isPro && subscription?.plan_type === 'pro' && (
                      <span className="text-sm text-cyan-600 font-medium">Monthly subscription</span>
                    )}
                  </div>
                  {isPro && (
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      PRO
                    </div>
                  )}
                </div>

                {/* Usage Display */}
                {!isPro && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Monthly Usage</span>
                      <span className="text-sm font-bold text-slate-900">
                        {monthlyCount} / {monthlyLimit === Infinity ? 'Unlimited' : monthlyLimit} receipts
                      </span>
                    </div>
                    <Progress
                      value={monthlyLimit === Infinity ? 0 : (monthlyCount / monthlyLimit) * 100}
                      className="h-3"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {remainingUploads === Infinity
                        ? 'Unlimited uploads'
                        : `${remainingUploads} uploads remaining this month`}
                    </p>
                  </div>
                )}

                {/* Pro Benefits */}
                {isPro ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-slate-700">Unlimited receipt uploads</span>
                    </div>
                    <div className="flex items-center gap-3 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-slate-700">Priority AI processing</span>
                    </div>
                    <div className="flex items-center gap-3 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-slate-700">Advanced tax reports</span>
                    </div>

                    {/* Next billing date */}
                    {(subscription?.renews_at || subscription?.ends_at || subscription?.trial_ends_at) && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {subscription?.status === 'cancelled'
                              ? `Access until: ${formatDate(subscription?.ends_at)}`
                              : isOnTrial
                                ? `Trial ends: ${formatDate(subscription?.trial_ends_at || subscription?.renews_at)}`
                                : `Next billing: ${formatDate(subscription?.renews_at)}`
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Manage Subscription Button */}
                    <Button
                      onClick={openCustomerPortal}
                      variant="outline"
                      className="w-full mt-4"
                      disabled={!subscription?.customer_portal_url}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-600 text-sm">
                      Upgrade to Pro for unlimited uploads and premium features.
                    </p>
                    <Button
                      onClick={() => setUpgradeDialogOpen(true)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                      size="lg"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Comparison Card (for free users) */}
            {!isPro && (
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Plan Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Free Plan */}
                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-semibold text-lg mb-2 text-slate-700">Free</h4>
                      <p className="text-2xl font-bold mb-4 text-slate-700">$0<span className="text-sm font-normal text-slate-500">/month</span></p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          10 receipts per month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          AI-powered scanning
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Basic reports
                        </li>
                      </ul>
                    </div>

                    {/* Monthly Pro Plan */}
                    <div className="border-2 rounded-lg p-4 bg-white">
                      <h4 className="font-semibold text-lg mb-2 flex items-center gap-2 text-slate-700">
                        Pro Monthly <Crown className="w-4 h-4 text-amber-500" />
                      </h4>
                      <p className="text-2xl font-bold mb-1 text-slate-700">
                        $9.99<span className="text-sm font-normal text-slate-500">/month</span>
                      </p>
                      {!hasUsedTrial && (
                        <p className="text-xs text-cyan-600 font-semibold mb-3 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          7-Day Free Trial Included
                        </p>
                      )}
                      {hasUsedTrial && <div className="mb-3" />}
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <strong>Unlimited</strong> receipts
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Priority AI processing
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Advanced tax reports
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Email support
                        </li>
                      </ul>
                      {/* CTA Button - below list */}
                      <Button
                        onClick={() => {
                          setSelectedPlan('monthly');
                          setUpgradeDialogOpen(true);
                        }}
                        variant="outline"
                        className="w-full mt-4 border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-semibold"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {!hasUsedTrial ? 'Start 7-Day Trial' : 'Upgrade Now'}
                      </Button>
                    </div>

                    {/* Annual Pro Plan - Premium Look */}
                    <div className="relative">
                      {/* Animated Gradient Border */}
                      <motion.div
                        className="absolute -inset-[2px] rounded-xl opacity-75"
                        style={{
                          background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)',
                          backgroundSize: '300% 100%',
                        }}
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                      <div className="relative rounded-xl p-4 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 shadow-xl h-full">
                        {/* Best Value Badge */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="inline-flex flex-col items-center bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1.5 rounded-lg text-center font-semibold shadow-md whitespace-nowrap">
                            <span className="flex items-center gap-1 text-[10px]">
                              <Sparkles className="w-2.5 h-2.5" />
                              Best Value
                            </span>
                            <span className="text-xs font-bold">Save 17%</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2 text-slate-900 mt-1">
                          Pro Annual <Crown className="w-4 h-4 text-amber-500" />
                        </h4>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-bold text-slate-900">$99</span>
                          <span className="text-sm text-slate-400 line-through">$119.88</span>
                          <span className="text-sm font-normal text-slate-500">/year</span>
                          <span className="text-sm font-medium text-cyan-600">= $8.25/month</span>
                        </div>
                        {!hasUsedTrial && (
                          <p className="text-xs text-cyan-600 font-semibold mb-3 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            7-Day Free Trial Included
                          </p>
                        )}
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <strong>Unlimited</strong> receipts
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            Priority AI processing
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            Advanced tax reports
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            Email support
                          </li>
                        </ul>
                        {/* CTA Button with Shine Effect */}
                        <Button
                          onClick={() => {
                            setSelectedPlan('yearly');
                            setUpgradeDialogOpen(true);
                          }}
                          className="relative overflow-hidden w-full mt-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-600 hover:via-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg"
                          style={{ backgroundSize: '200% 100%' }}
                        >
                          {/* Shine effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 1,
                              ease: 'easeInOut',
                            }}
                          />
                          <Zap className="w-4 h-4 mr-2" />
                          {!hasUsedTrial ? 'Start 7-Day Free Trial' : 'Upgrade Now'}
                        </Button>
                        {!hasUsedTrial && (
                          <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Cancel anytime during trial. We&apos;ll remind you before it ends.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Upgrade Plan Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              Choose your billing cycle and unlock unlimited uploads.
            </DialogDescription>
          </DialogHeader>

          {/* 7-day trial badge - only show if user hasn't used trial */}
          {!hasUsedTrial ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-700 font-semibold text-sm">
                Start with a 7-day free trial
              </p>
              <p className="text-green-600 text-xs">
                Cancel anytime during trial - no charges
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-slate-700 font-semibold text-sm">
                You have already used your free trial
              </p>
              <p className="text-slate-600 text-xs">
                Upgrade now to continue with Pro features
              </p>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Monthly Option */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-cyan-600 bg-cyan-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Monthly</p>
                  <p className="text-sm text-slate-500">Billed monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">$9.99</p>
                  <p className="text-xs text-slate-500">/month</p>
                </div>
              </div>
              {/* 7-Day Free Trial Included */}
              {!hasUsedTrial && selectedPlan === 'monthly' && (
                <div className="mt-3 pt-3 border-t border-cyan-200/50">
                  <p className="text-sm text-cyan-600 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    7-Day Free Trial Included
                  </p>
                </div>
              )}
            </button>

            {/* Annual Option - Premium Look with Animated Border */}
            <div className="relative">
              {/* Animated Gradient Border */}
              <motion.div
                className="absolute -inset-[2px] rounded-xl opacity-75"
                style={{
                  background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)',
                  backgroundSize: '300% 100%',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`relative w-full p-5 rounded-xl text-left transition-all shadow-xl ${
                  selectedPlan === 'yearly'
                    ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-0'
                    : 'bg-white border-0 hover:bg-slate-50'
                }`}
              >
                {/* Best Value Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex flex-col items-center bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1.5 rounded-lg text-center font-semibold shadow-md whitespace-nowrap">
                    <span className="flex items-center gap-1 text-xs">
                      <Sparkles className="w-3 h-3" />
                      Best Value
                    </span>
                    <span className="text-[10px] font-bold">Save 17%</span>
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      Annual
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Save 17%
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">Billed annually</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-slate-900">$99</p>
                      <p className="text-sm text-slate-400 line-through">$119.88</p>
                      <p className="text-xs text-slate-500">/year</p>
                    </div>
                    <p className="text-sm font-medium text-cyan-600">= $8.25/month</p>
                  </div>
                </div>

                {/* 7-Day Free Trial Included */}
                {!hasUsedTrial && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50">
                    <p className="text-sm text-cyan-600 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      7-Day Free Trial Included
                    </p>
                  </div>
                )}

                {/* Safety text */}
                {!hasUsedTrial && (
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Cancel anytime during trial. We&apos;ll remind you before it ends.
                  </p>
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={checkoutLoading}
              className="text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Button>
            {/* Conditional button based on selected plan */}
            {selectedPlan === 'yearly' ? (
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="relative overflow-hidden bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-600 hover:via-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg"
                style={{ backgroundSize: '200% 100%' }}
              >
                {/* Shine effect overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: 'easeInOut',
                  }}
                />
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {!hasUsedTrial ? 'Start 7-Day Free Trial' : 'Continue to Checkout'}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                variant="outline"
                className="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-semibold"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {!hasUsedTrial ? 'Start 7-Day Free Trial' : 'Continue to Checkout'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// Component that reads searchParams (needs Suspense boundary)
function SettingsPageWithParams() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'billing' ? 'billing' : 'settings';
  return <SettingsContent defaultTab={defaultTab} />;
}

// Main export with Suspense wrapper
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    }>
      <SettingsPageWithParams />
    </Suspense>
  );
}

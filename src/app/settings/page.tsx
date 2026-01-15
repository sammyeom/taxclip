'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getReceipts, deleteReceipt, getUserSettings, updateUserSettings, resetUserSettings } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
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
  const handleDownloadArchive = () => {
    setError('Receipt archive download coming soon!');
    setTimeout(() => setError(null), 3000);
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
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">General Settings</h2>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Default Currency
                </label>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Date Format
                </label>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.dateFormat}
                  onChange={(e) => updateSetting('dateFormat', e.target.value)}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Default Tax Category
                </label>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.defaultCategory}
                  onChange={(e) => updateSetting('defaultCategory', e.target.value)}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  {IRS_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Auto-categorize Receipts</p>
                <p className="text-xs text-slate-500 mt-0.5">Use AI to suggest categories</p>
              </div>
              <button
                onClick={() => updateSetting('autoCategorize', !settings.autoCategorize)}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.autoCategorize ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoCategorize ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Notifications</h2>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Email Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Receive email updates</p>
              </div>
              <button
                onClick={() =>
                  updateSetting('emailNotifications', !settings.emailNotifications)
                }
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.emailNotifications ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Monthly Summary</p>
                <p className="text-xs text-slate-500 mt-0.5">Get monthly expense reports</p>
              </div>
              <button
                onClick={() => updateSetting('monthlySummary', !settings.monthlySummary)}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.monthlySummary ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.monthlySummary ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Upload Reminders</p>
                <p className="text-xs text-slate-500 mt-0.5">Weekly reminders to upload</p>
              </div>
              <button
                onClick={() =>
                  updateSetting('uploadReminders', !settings.uploadReminders)
                }
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.uploadReminders ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.uploadReminders ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Tax Reminders</p>
                <p className="text-xs text-slate-500 mt-0.5">Alerts for important dates</p>
              </div>
              <button
                onClick={() =>
                  updateSetting('taxDeadlineReminders', !settings.taxDeadlineReminders)
                }
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.taxDeadlineReminders ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.taxDeadlineReminders ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Tax Settings</h2>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Business Type
                </label>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.businessType}
                  onChange={(e) => updateSetting('businessType', e.target.value)}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="s_corp">S Corporation</option>
                  <option value="c_corp">C Corporation</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Tax Year
                </label>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.taxYear}
                  onChange={(e) => updateSetting('taxYear', e.target.value)}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  <option value="calendar">Calendar Year</option>
                  <option value="fiscal">Fiscal Year</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Meals Deduction (%)
                </label>
                <p className="text-xs text-slate-500 mt-0.5">IRS standard is 50%</p>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.mealsDeduction}
                  onChange={(e) => updateSetting('mealsDeduction', Number(e.target.value))}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div className="flex-1 mr-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Mileage Tracking</p>
                <p className="text-xs text-slate-500 mt-0.5">Track business mileage</p>
              </div>
              <button
                onClick={() => updateSetting('mileageTracking', !settings.mileageTracking)}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.mileageTracking ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    settings.mileageTracking ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.mileageTracking && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2">
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    Mileage Rate ($/mile)
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">2026: $0.67/mile</p>
                </div>
                <div className="w-full sm:w-auto sm:flex-shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.mileageRate}
                    onChange={(e) => updateSetting('mileageRate', Number(e.target.value))}
                    className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Data & Privacy</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Export All Data</p>
                <p className="text-xs text-slate-500 mt-0.5">Download your data as CSV</p>
              </div>
              <button
                onClick={handleExportData}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-t border-slate-100 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Download Archive</p>
                <p className="text-xs text-slate-500 mt-0.5">Download receipt images as ZIP</p>
              </div>
              <button
                onClick={handleDownloadArchive}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Archive className="w-4 h-4" />
                Download
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 border-t border-slate-100 gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Data Retention
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  IRS recommends 7 years
                </p>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <select
                  value={settings.dataRetention}
                  onChange={(e) => updateSetting('dataRetention', Number(e.target.value))}
                  className="w-full sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white hover:bg-white transition-colors"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={7}>7 Years (Recommended)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-t border-slate-100 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Clear Cache</p>
                <p className="text-xs text-slate-500 mt-0.5">Clear local browser data</p>
              </div>
              <button
                onClick={handleClearCache}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-slate-200 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Danger Zone</h3>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 border-b border-slate-200 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Delete All Receipts</p>
                <p className="text-xs text-slate-500">Permanently delete all receipts</p>
              </div>
              <button
                onClick={() => setDeleteReceiptsDialog(true)}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors text-center"
              >
                Delete Receipts
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 border-b border-slate-200 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Reset All Settings</p>
                <p className="text-xs text-slate-500">Restore default settings</p>
              </div>
              <button
                onClick={() => setResetSettingsDialog(true)}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors text-center"
              >
                Reset Settings
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Delete Account</p>
                <p className="text-xs text-slate-500">Permanently delete account and data</p>
              </div>
              <button
                onClick={() => setDeleteAccountDialog(true)}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors text-center"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={() => saveSettings()}
          disabled={saving}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialogs */}
      {deleteReceiptsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete All Receipts</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete all receipts? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteReceiptsDialog(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllReceipts}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetSettingsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 rounded-full p-3">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reset Settings</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to reset all settings to defaults?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetSettingsDialog(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSettings}
                disabled={deleting}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAccountDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Account</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you absolutely sure? This will permanently delete your account and all data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAccountDialog(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

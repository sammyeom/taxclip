'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getReceiptById, updateReceipt, deleteReceipt } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types/database';
import { IRS_SCHEDULE_C_CATEGORIES, LineItem, createLineItem } from '@/types/database';
import Navigation from '@/components/Navigation';
import { SplitView } from '@/components/receipts';
import CategorySelector from '@/components/CategorySelector';
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  X,
  List,
} from 'lucide-react';

const PAYMENT_METHODS = [
  { value: '', label: 'Select payment method' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'KRW', label: 'KRW (₩)', symbol: '₩' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'CHF', label: 'CHF', symbol: 'CHF' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { value: 'HKD', label: 'HKD (HK$)', symbol: 'HK$' },
];

// Format amount with currency symbol and commas (e.g., "$1,234.56")
const formatAmount = (amount: number, currencyCode: string = 'USD') => {
  const currency = CURRENCY_OPTIONS.find((c) => c.value === currencyCode);
  const symbol = currency?.symbol || '$';
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formattedNumber}`;
};

// Format number with commas and 2 decimal places (e.g., "1,234.56")
const formatNumberWithCommas = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Parse formatted number string to raw number string (e.g., "1,234.56" -> "1234.56")
const parseFormattedNumber = (value: string): string => {
  // Remove commas and keep only digits and decimal point
  const cleaned = value.replace(/,/g, '');
  // Validate it's a valid number
  if (cleaned === '' || isNaN(parseFloat(cleaned))) return '';
  return cleaned;
};

export default function ReceiptEditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const receiptId = params.id as string;

  // Data state
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    merchant: '',
    total: '',
    category: 'other',
    subcategory: '',
    currency: 'USD',
    business_purpose: '',
    payment_method: '',
    notes: '',
    items: [] as LineItem[],
  });

  // New item input state
  const [newItemName, setNewItemName] = useState('');
  const [selectedItemForModal, setSelectedItemForModal] = useState<LineItem | null>(null);

  // Item management functions
  const handleAddItem = () => {
    if (newItemName.trim()) {
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, createLineItem(newItemName.trim(), 1, 0)],
      }));
      setNewItemName('');
    }
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleUpdateItem = (id: string, field: keyof LineItem, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalculate amount when qty or unitPrice changes
        if (field === 'qty' || field === 'unitPrice') {
          updated.amount = updated.qty * updated.unitPrice;
        }
        return updated;
      }),
    }));
  };

  const handleToggleItemSelection = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const handleSelectAllItems = (selected: boolean) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, selected })),
    }));
  };

  // Calculate total of selected items
  const selectedItemsTotal = formData.items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.amount, 0);

  // Action states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch receipt
  useEffect(() => {
    if (user && receiptId) {
      fetchReceipt();
    }
  }, [user, receiptId]);

  const fetchReceipt = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const { data, error: fetchError } = await getReceiptById(receiptId);

      if (fetchError) {
        if (fetchError.message.includes('not found') || fetchError.message.includes('No rows')) {
          setNotFound(true);
        } else {
          throw fetchError;
        }
        return;
      }

      if (!data) {
        setNotFound(true);
        return;
      }

      setReceipt(data);
      // Initialize form with current data
      // Parse items from receipt into LineItem format
      const parsedItems: LineItem[] = [];
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item, index) => {
          if (typeof item === 'string') {
            // Legacy string format - convert to LineItem
            parsedItems.push({
              id: `item_${Date.now()}_${index}`,
              name: item,
              qty: 1,
              unitPrice: 0,
              amount: 0,
              selected: true,
            });
          } else if (typeof item === 'object' && item !== null) {
            // Handle both LineItem format and ReceiptItem format (from database)
            const lineItem = item as Record<string, unknown>;
            // ReceiptItem uses 'price' and 'quantity', LineItem uses 'unitPrice' and 'qty'
            const qty = (lineItem.qty as number) || (lineItem.quantity as number) || 1;
            const unitPrice = (lineItem.unitPrice as number) || (lineItem.price as number) || 0;
            parsedItems.push({
              id: (lineItem.id as string) || `item_${Date.now()}_${index}`,
              name: (lineItem.name as string) || '',
              qty,
              unitPrice,
              amount: qty * unitPrice,
              selected: lineItem.selected !== false, // Default to true, preserve saved state
            });
          }
        });
      }

      setFormData({
        date: data.date || '',
        merchant: data.merchant || '',
        total: data.total?.toString() || '',
        category: data.category || 'other',
        subcategory: data.subcategory || '',
        currency: 'USD',
        business_purpose: data.business_purpose || '',
        payment_method: data.payment_method || '',
        notes: data.notes || '',
        items: parsedItems,
      });
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!receipt) return;

    // Validate
    if (!formData.date) {
      setError('Date is required');
      return;
    }
    if (!formData.merchant) {
      setError('Vendor is required');
      return;
    }
    if (!formData.total) {
      setError('Amount is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const totalAmount = parseFloat(formData.total);
      if (isNaN(totalAmount)) {
        throw new Error('Invalid amount');
      }

      // Calculate tax year
      const taxYear = new Date(formData.date).getFullYear();

      // Save ALL items with their selection state preserved
      // Convert LineItem[] to ReceiptItem[] for database storage
      const receiptItems = formData.items.map(item => ({
        name: item.name,
        price: item.unitPrice,
        quantity: item.qty,
        selected: item.selected,
      }));

      const updatedData = {
        date: formData.date,
        merchant: formData.merchant,
        total: totalAmount,
        category: formData.category,
        subcategory: formData.subcategory || null,
        business_purpose: formData.business_purpose || null,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
        items: receiptItems,
        tax_year: taxYear,
      };

      const { error: saveError } = await updateReceipt(receipt.id, updatedData);

      if (saveError) throw saveError;

      setSuccessMessage('Receipt updated successfully!');

      // Redirect back to receipts list after a short delay
      setTimeout(() => {
        router.push('/receipts');
      }, 1500);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!receipt) return;

    setDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await deleteReceipt(receipt.id);

      if (deleteError) throw deleteError;

      // Redirect to receipts list
      router.push('/receipts');
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete receipt');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get image URLs for Split View
  const getImageUrls = (): string[] => {
    if (!receipt) return [];

    // Check for multiple images first
    if (receipt.image_urls && receipt.image_urls.length > 0) {
      return receipt.image_urls;
    }

    // Fall back to single image
    if (receipt.image_url) {
      return [receipt.image_url];
    }

    return [];
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Receipt Not Found</h1>
          <p className="text-slate-600 mb-6">
            This receipt doesn't exist or you don't have permission to edit it.
          </p>
          <button
            onClick={() => router.push('/receipts')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  const imageUrls = getImageUrls();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/receipts')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Receipts
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Edit Receipt</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Update receipt details and verify extracted information
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Success</h3>
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Split View - Image and Data (or Email Text) */}
        {(imageUrls.length > 0 || receipt.email_text) && (
          <div className="mb-6">
            <SplitView
              images={imageUrls}
              extractedData={{
                date: formData.date,
                vendor: formData.merchant,
                amount: parseFloat(formData.total) || 0,
                currency: formData.currency,
                items: formData.items.filter((item) => item.selected),
                category: formData.category,
                paymentMethod: formData.payment_method,
                businessPurpose: formData.business_purpose,
              }}
              emailText={receipt.email_text || undefined}
            />
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4">
            Edit Receipt Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Vendor/Merchant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleFormChange('merchant', e.target.value)}
                placeholder="Enter vendor name"
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Total (Amount + Currency) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Total <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <select
                  value={formData.currency}
                  onChange={(e) => handleFormChange('currency', e.target.value)}
                  className="px-2 sm:px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium"
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberWithCommas(formData.total)}
                  onChange={(e) => handleFormChange('total', parseFormattedNumber(e.target.value))}
                  onBlur={(e) => {
                    // Re-format on blur to ensure proper formatting
                    const parsed = parseFormattedNumber(e.target.value);
                    if (parsed) handleFormChange('total', parsed);
                  }}
                  placeholder="0.00"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* IRS Schedule C Category */}
            <div className="md:col-span-2">
              <CategorySelector
                category={formData.category}
                subcategory={formData.subcategory}
                onCategoryChange={(value) => handleFormChange('category', value)}
                onSubcategoryChange={(value) => handleFormChange('subcategory', value)}
                required
                showSubcategory
              />
            </div>

            {/* Business Purpose */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Business Purpose <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.business_purpose}
                onChange={(e) => handleFormChange('business_purpose', e.target.value)}
                placeholder="e.g., Client meeting, Office supplies, Travel expense"
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => handleFormChange('payment_method', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes - Full width */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={2}
                placeholder="Optional"
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>

            {/* Line Items - Full width */}
            <div className="md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Line Items ({formData.items.length})
                  </span>
                </label>
                {formData.items.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-cyan-600 font-medium">
                      Total: {formatAmount(selectedItemsTotal, formData.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFormChange('total', selectedItemsTotal.toFixed(2))}
                      className="px-2 py-1 text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded transition-colors whitespace-nowrap"
                      title="Apply to Amount field"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* IRS Compliance Warnings */}
              {parseFloat(formData.total) >= 500 && formData.category !== 'meals' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-800">
                    <strong>Recommended:</strong> For purchases over $500, itemized details are recommended for IRS compliance.
                  </p>
                </div>
              )}
              {formData.category === 'meals' && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-800">
                    <strong>Required:</strong> For Meals category (50% deductible), item details are required for IRS documentation.
                  </p>
                </div>
              )}
              {parseFloat(formData.total) >= 500 && formData.category === 'meals' && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-800">
                    <strong>Required:</strong> For Meals category over $500, detailed item information is required for IRS audit compliance and 50% deduction documentation.
                  </p>
                </div>
              )}

              {/* Items Table - Desktop */}
              {formData.items.length > 0 && (
                <div className="hidden sm:block border border-gray-200 rounded-lg overflow-x-auto mb-3">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left w-10">
                          <input
                            type="checkbox"
                            checked={formData.items.length > 0 && formData.items.every((item) => item.selected)}
                            onChange={(e) => handleSelectAllItems(e.target.checked)}
                            className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Amount</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.items.map((item) => (
                        <tr key={item.id} className={`${item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                              placeholder="Item name"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice.toFixed(2)}
                              onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            {formatAmount(item.amount, formData.currency)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Items Cards - Mobile */}
              {formData.items.length > 0 && (
                <div className="sm:hidden space-y-2 mb-3">
                  {/* Select All */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.items.length > 0 && formData.items.every((item) => item.selected)}
                      onChange={(e) => handleSelectAllItems(e.target.checked)}
                      className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-medium text-gray-500">Select All</span>
                  </div>
                  {/* Item Cards */}
                  {formData.items.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        item.selected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                      onClick={() => setSelectedItemForModal(item)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedItemForModal(item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit item: ${item.name}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleItemSelection(item.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Qty: {item.qty}</span>
                            <span>@ {formatAmount(item.unitPrice, formData.currency)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatAmount(item.amount, formData.currency)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            className="mt-1 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder="Add new item..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add item"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.date || !formData.merchant || !formData.total || !formData.business_purpose}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    Save
                  </>
                )}
              </button>

              <button
                onClick={() => router.push('/receipts')}
                disabled={saving}
                className="flex-1 sm:flex-none border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Receipt?</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Are you sure you want to delete this receipt? This action cannot be undone.
                  </p>
                  <p className="text-sm font-semibold">
                    {receipt.merchant} - ${parseFloat(formData.total || '0').toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item Detail Bottom Sheet - Mobile */}
        {selectedItemForModal && (
          <div
            className="fixed inset-0 z-50 sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-detail-title"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelectedItemForModal(null)}
            />
            {/* Bottom Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl animate-slide-up">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                <h3 id="item-detail-title" className="text-lg font-semibold text-gray-900">
                  Edit Item
                </h3>
                <button
                  onClick={() => setSelectedItemForModal(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Content */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <textarea
                    value={selectedItemForModal.name}
                    onChange={(e) => {
                      handleUpdateItem(selectedItemForModal.id, 'name', e.target.value);
                      setSelectedItemForModal({ ...selectedItemForModal, name: e.target.value });
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none"
                    placeholder="Item name"
                  />
                </div>
                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selectedItemForModal.qty}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        handleUpdateItem(selectedItemForModal.id, 'qty', qty);
                        setSelectedItemForModal({ ...selectedItemForModal, qty, amount: qty * selectedItemForModal.unitPrice });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedItemForModal.unitPrice.toFixed(2)}
                      onChange={(e) => {
                        const unitPrice = parseFloat(e.target.value) || 0;
                        handleUpdateItem(selectedItemForModal.id, 'unitPrice', unitPrice);
                        setSelectedItemForModal({ ...selectedItemForModal, unitPrice, amount: selectedItemForModal.qty * unitPrice });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {/* Total Amount */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatAmount(selectedItemForModal.qty * selectedItemForModal.unitPrice, formData.currency)}
                    </span>
                  </div>
                </div>
                {/* Selected checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="item-selected-edit"
                    checked={selectedItemForModal.selected}
                    onChange={() => {
                      handleToggleItemSelection(selectedItemForModal.id);
                      setSelectedItemForModal({ ...selectedItemForModal, selected: !selectedItemForModal.selected });
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="item-selected-edit" className="text-sm text-gray-700">
                    Include in total calculation
                  </label>
                </div>
              </div>
              {/* Footer Actions */}
              <div className="flex gap-3 p-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    handleRemoveItem(selectedItemForModal.id);
                    setSelectedItemForModal(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                  Delete Item
                </button>
                <button
                  onClick={() => setSelectedItemForModal(null)}
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

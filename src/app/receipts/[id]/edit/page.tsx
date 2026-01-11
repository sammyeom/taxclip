'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getReceiptById, updateReceipt, deleteReceipt } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types/database';
import { IRS_SCHEDULE_C_CATEGORIES, LineItem, createLineItem } from '@/types/database';
import Navigation from '@/components/Navigation';
import { SplitView } from '@/components/receipts';
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
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
    currency: 'USD',
    business_purpose: '',
    payment_method: '',
    notes: '',
    items: [] as LineItem[],
  });

  // New item input state
  const [newItemName, setNewItemName] = useState('');

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vendor/Merchant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleFormChange('merchant', e.target.value)}
                placeholder="Enter store or vendor name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Total (Amount + Currency) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Total <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <select
                  value={formData.currency}
                  onChange={(e) => handleFormChange('currency', e.target.value)}
                  className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium"
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => handleFormChange('total', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* IRS Schedule C Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                IRS Schedule C Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {IRS_SCHEDULE_C_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    Line {cat.line}: {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => handleFormChange('payment_method', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Purpose */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Purpose
              </label>
              <input
                type="text"
                value={formData.business_purpose}
                onChange={(e) => handleFormChange('business_purpose', e.target.value)}
                placeholder="Enter business purpose (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Notes - Full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
                placeholder="Add any additional notes (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>

            {/* Line Items - Full width */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Line Items ({formData.items.length})
                  </span>
                </label>
                {formData.items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cyan-600 font-medium">
                      Selected Total: {formatAmount(selectedItemsTotal, formData.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFormChange('total', selectedItemsTotal.toFixed(2))}
                      className="px-2 py-1 text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded transition-colors"
                      title="Apply to Amount field"
                    >
                      Apply to Amount
                    </button>
                  </div>
                )}
              </div>

              {/* Items Table */}
              {formData.items.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-x-auto mb-3">
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
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.date || !formData.merchant || !formData.total}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>

              <button
                onClick={() => router.push('/receipts')}
                disabled={saving}
                className="flex-1 sm:flex-none border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200"
              >
                <Trash2 className="w-5 h-5" />
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
      </div>
    </div>
  );
}

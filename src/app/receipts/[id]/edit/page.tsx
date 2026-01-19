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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

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
    subtotal: '',
    tax: '',
    tip: '',
    category: 'other',
    subcategory: '',
    currency: 'USD',
    business_purpose: '',
    payment_method: 'credit',
    notes: '',
    items: [] as LineItem[],
  });

  // New item input state
  const [newItemName, setNewItemName] = useState('');
  const [selectedItemForModal, setSelectedItemForModal] = useState<LineItem | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<{id: string, value: string} | null>(null);

  // Track if amount field is being edited (to show raw value during editing)
  const [isEditingAmount, setIsEditingAmount] = useState(false);

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

  // Add new item and open drawer immediately (for mobile)
  const handleAddNewItemWithDrawer = () => {
    const newItem = createLineItem('', 1, 0);
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setSelectedItemForModal(newItem);
    setNewItemName('');
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
        subtotal: data.subtotal?.toString() || '',
        tax: data.tax?.toString() || '',
        tip: data.tip?.toString() || '',
        category: data.category || 'other',
        subcategory: data.subcategory || '',
        currency: 'USD',
        business_purpose: data.business_purpose || '',
        payment_method: (data.payment_method && data.payment_method !== '') ? data.payment_method : 'credit',
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

      // Parse subtotal, tax, and tip
      const subtotalAmount = formData.subtotal ? parseFloat(formData.subtotal) : null;
      const taxAmount = formData.tax ? parseFloat(formData.tax) : null;
      const tipAmount = formData.tip ? parseFloat(formData.tip) : null;

      const updatedData = {
        date: formData.date,
        merchant: formData.merchant,
        total: totalAmount,
        subtotal: subtotalAmount,
        tax: taxAmount,
        tip: tipAmount,
        category: formData.category,
        // Note: subcategory column doesn't exist in database - store in notes if needed
        business_purpose: formData.business_purpose || null,
        payment_method: formData.payment_method || null,
        notes: formData.subcategory
          ? `[Subcategory: ${formData.subcategory}] ${formData.notes || ''}`
          : (formData.notes || null),
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
          <Button
            onClick={() => router.push('/receipts')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Receipts
          </Button>
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
                subtotal: formData.subtotal ? parseFloat(formData.subtotal) : undefined,
                tax: formData.tax ? parseFloat(formData.tax) : undefined,
                tip: formData.tip ? parseFloat(formData.tip) : undefined,
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
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Vendor/Merchant <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleFormChange('merchant', e.target.value)}
                placeholder="Enter vendor name"
              />
            </div>

            {/* Total (Amount + Currency) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Total <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleFormChange('currency', value)}
                >
                  <SelectTrigger className="w-auto rounded-r-none border-r-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={isEditingAmount ? formData.total : formatNumberWithCommas(formData.total)}
                  onChange={(e) => {
                    // Allow raw input during editing (remove non-numeric chars except . and ,)
                    const value = e.target.value.replace(/[^0-9.,]/g, '');
                    handleFormChange('total', value.replace(/,/g, ''));
                  }}
                  onFocus={() => setIsEditingAmount(true)}
                  onBlur={(e) => {
                    setIsEditingAmount(false);
                    const parsed = parseFormattedNumber(e.target.value);
                    if (parsed) handleFormChange('total', parsed);
                  }}
                  placeholder="0.00"
                  className="flex-1 min-w-0 rounded-l-none"
                />
              </div>
            </div>

            {/* Subtotal, Tax, Tip - Editable breakdown */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2 sm:gap-3">
              {/* Subtotal */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-1 mb-1 min-h-[20px]">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 shrink-0">
                    Subtotal
                  </label>
                  {formData.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const itemsTotal = formData.items
                          .filter((item) => item.selected)
                          .reduce((sum, item) => sum + item.amount, 0);
                        handleFormChange('subtotal', itemsTotal.toFixed(2));
                      }}
                      className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded transition-colors shrink-0"
                      title="Calculate from line items"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.subtotal}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      handleFormChange('subtotal', value);
                    }}
                    placeholder="0.00"
                    className="pl-5 sm:pl-7 text-sm"
                  />
                </div>
              </div>
              {/* Tax */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1 min-h-[20px]">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">
                    Tax
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.tax}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      handleFormChange('tax', value);
                    }}
                    placeholder="0.00"
                    className="pl-5 sm:pl-7 text-sm"
                  />
                </div>
              </div>
              {/* Tip */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1 min-h-[20px]">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">
                    Tip
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.tip}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      handleFormChange('tip', value);
                    }}
                    placeholder="0.00"
                    className="pl-5 sm:pl-7 text-sm"
                  />
                </div>
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
              <Input
                type="text"
                value={formData.business_purpose}
                onChange={(e) => handleFormChange('business_purpose', e.target.value)}
                placeholder="e.g., Client meeting, Office supplies, Travel expense"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <Select
                value={formData.payment_method || 'credit'}
                defaultValue="credit"
                onValueChange={(value) => handleFormChange('payment_method', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.filter(m => m.value !== '').map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes - Full width */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={2}
                placeholder="Optional"
                className="resize-none"
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
              {(() => {
                const amount = parseFloat(formData.total) || 0;
                const itemCount = formData.items.length;
                const isMixedPurchase = itemCount > 1;
                const isOver500 = amount >= 500;
                const isSmallSingleItem = itemCount <= 1 && amount < 75;
                const isMeals = formData.category === 'meals';

                // No warning needed for small single-item purchases
                if (isSmallSingleItem && !isMeals) return null;

                return (
                  <>
                    {/* $500+ warning */}
                    {isOver500 && !isMeals && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">
                          <strong>Required:</strong> For purchases over $500, itemized details are required for IRS audit compliance.
                        </p>
                      </div>
                    )}
                    {/* Mixed purchase warning (multiple items, not $500+, not meals) */}
                    {isMixedPurchase && !isOver500 && !isMeals && amount >= 75 && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-amber-800">
                          <strong>Recommended:</strong> For mixed purchases (multiple items), itemized details help with IRS documentation.
                        </p>
                      </div>
                    )}
                    {/* Meals category warning */}
                    {isMeals && !isOver500 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">
                          <strong>Required:</strong> For Meals category (50% deductible), item details are required. Note: Only restaurant meals qualify - grocery shopping should use "Supplies" category.
                        </p>
                      </div>
                    )}
                    {/* Meals + $500+ combined warning */}
                    {isMeals && isOver500 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">
                          <strong>Required:</strong> For Meals over $500, detailed item information is required for IRS audit compliance. Note: Only restaurant meals qualify for 50% deduction - grocery shopping should use "Supplies" category.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Items Table - Desktop */}
              {formData.items.length > 0 && (
                <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left w-8">
                          <input
                            type="checkbox"
                            checked={formData.items.length > 0 && formData.items.every((item) => item.selected)}
                            onChange={(e) => handleSelectAllItems(e.target.checked)}
                            className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                          />
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">Qty</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28 whitespace-nowrap">Unit Price</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Amount</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.items.map((item) => (
                        <tr key={item.id} className={`${item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm truncate"
                              placeholder="Item name"
                              title={item.name}
                            />
                          </td>
                          <td className="px-2 py-2 w-14">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-center"
                            />
                          </td>
                          <td className="px-2 py-2 w-28">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingUnitPrice?.id === item.id ? editingUnitPrice.value : item.unitPrice.toFixed(2)}
                              onFocus={() => setEditingUnitPrice({ id: item.id, value: item.unitPrice.toFixed(2) })}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setEditingUnitPrice({ id: item.id, value: val });
                              }}
                              onBlur={() => {
                                if (editingUnitPrice?.id === item.id) {
                                  handleUpdateItem(item.id, 'unitPrice', parseFloat(editingUnitPrice.value) || 0);
                                  setEditingUnitPrice(null);
                                }
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-2 w-24 text-right font-medium text-gray-900 whitespace-nowrap">
                            {formatAmount(item.amount, formData.currency)}
                          </td>
                          <td className="px-2 py-2">
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
                      className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
                        item.selected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                      onClick={() => setSelectedItemForModal(item)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedItemForModal(item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit item: ${item.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleItemSelection(item.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{item.qty}x</span>
                        <p className="text-xs font-semibold text-gray-900 shrink-0">
                          {formatAmount(item.amount, formData.currency)}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item - Desktop */}
              <div className="hidden sm:flex items-center gap-2">
                <Input
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
                  className="flex-1"
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
              {/* Add new item - Mobile (opens drawer directly) */}
              <button
                type="button"
                onClick={handleAddNewItemWithDrawer}
                className="sm:hidden w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add new item</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.date || !formData.merchant || !formData.total || !formData.business_purpose}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Save
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/receipts')}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg font-semibold text-slate-900">Delete Receipt?</AlertDialogTitle>
                  <AlertDialogDescription className="mt-2">
                    Are you sure you want to delete this receipt? This action cannot be undone.
                    <span className="block mt-2 text-slate-900 font-semibold">
                      {receipt.merchant} - ${parseFloat(formData.total || '0').toFixed(2)}
                    </span>
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Item Detail Bottom Sheet - Mobile */}
        <Sheet open={!!selectedItemForModal} onOpenChange={(open) => !open && setSelectedItemForModal(null)}>
          <SheetContent
            side="bottom"
            className="sm:hidden rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom)] h-auto max-h-[90vh] max-h-[90dvh]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {selectedItemForModal && (
              <div className="flex flex-col h-full max-h-[90vh] max-h-[90dvh]">
                {/* Handle */}
                <div className="flex justify-center py-2 flex-shrink-0">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <SheetHeader className="px-4 pb-3 border-b border-gray-100 flex-shrink-0">
                  <SheetTitle className="text-lg font-semibold">
                    {selectedItemForModal.name ? 'Edit Item' : 'New Item'}
                  </SheetTitle>
                </SheetHeader>
                {/* Content - scrollable area with keyboard-aware padding */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <Textarea
                      value={selectedItemForModal.name}
                      onChange={(e) => {
                        handleUpdateItem(selectedItemForModal.id, 'name', e.target.value);
                        setSelectedItemForModal({ ...selectedItemForModal, name: e.target.value });
                      }}
                      rows={2}
                      className="resize-none text-base"
                      placeholder="Item name"
                      onFocus={(e) => {
                        const target = e.target;
                        const timeoutId = setTimeout(() => {
                          if (target && document.body.contains(target)) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 300);
                        target.dataset.scrollTimeout = String(timeoutId);
                      }}
                      onBlur={(e) => {
                        const timeoutId = e.target.dataset.scrollTimeout;
                        if (timeoutId) clearTimeout(Number(timeoutId));
                      }}
                    />
                  </div>
                  {/* Quantity & Unit Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={selectedItemForModal.qty}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          handleUpdateItem(selectedItemForModal.id, 'qty', qty);
                          setSelectedItemForModal({ ...selectedItemForModal, qty, amount: qty * selectedItemForModal.unitPrice });
                        }}
                        className="text-center text-base"
                        onFocus={(e) => {
                          const target = e.target;
                          const timeoutId = setTimeout(() => {
                            if (target && document.body.contains(target)) {
                              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 300);
                          target.dataset.scrollTimeout = String(timeoutId);
                        }}
                        onBlur={(e) => {
                          const timeoutId = e.target.dataset.scrollTimeout;
                          if (timeoutId) clearTimeout(Number(timeoutId));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selectedItemForModal.unitPrice.toFixed(2)}
                        onChange={(e) => {
                          const unitPrice = parseFloat(e.target.value) || 0;
                          handleUpdateItem(selectedItemForModal.id, 'unitPrice', unitPrice);
                          setSelectedItemForModal({ ...selectedItemForModal, unitPrice, amount: selectedItemForModal.qty * unitPrice });
                        }}
                        className="text-right text-base"
                        placeholder="0.00"
                        onFocus={(e) => {
                          const target = e.target;
                          const timeoutId = setTimeout(() => {
                            if (target && document.body.contains(target)) {
                              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 300);
                          target.dataset.scrollTimeout = String(timeoutId);
                        }}
                        onBlur={(e) => {
                          const timeoutId = e.target.dataset.scrollTimeout;
                          if (timeoutId) clearTimeout(Number(timeoutId));
                        }}
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
                  <div className="flex items-center gap-3">
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
                <SheetFooter className="flex-row gap-3 p-4 border-t border-gray-100 flex-shrink-0 bg-white">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleRemoveItem(selectedItemForModal.id);
                      setSelectedItemForModal(null);
                    }}
                    className="flex-1 h-11 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={() => setSelectedItemForModal(null)}
                    className="flex-1 h-11 bg-cyan-500 hover:bg-cyan-600"
                  >
                    Done
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getReceiptById, updateReceipt, deleteReceipt } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  ZoomIn,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  FileText,
  Clock,
  Receipt as ReceiptIcon,
  AlertCircle,
} from 'lucide-react';

// Category colors and labels (same as receipts page)
const CATEGORY_COLORS: Record<string, string> = {
  advertising: 'bg-blue-100 text-blue-800',
  office_expense: 'bg-purple-100 text-purple-800',
  supplies: 'bg-green-100 text-green-800',
  meals: 'bg-orange-100 text-orange-800',
  travel: 'bg-pink-100 text-pink-800',
  utilities: 'bg-yellow-100 text-yellow-800',
  car_truck: 'bg-indigo-100 text-indigo-800',
  insurance: 'bg-red-100 text-red-800',
  legal_professional: 'bg-teal-100 text-teal-800',
  rent_lease: 'bg-cyan-100 text-cyan-800',
  repairs_maintenance: 'bg-lime-100 text-lime-800',
  other: 'bg-gray-100 text-gray-800',
};

const CATEGORY_LABELS: Record<string, string> = {
  advertising: 'Advertising',
  office_expense: 'Office Expense',
  supplies: 'Supplies',
  meals: 'Meals (50% deductible)',
  travel: 'Travel',
  utilities: 'Utilities',
  car_truck: 'Car & Truck',
  insurance: 'Insurance',
  legal_professional: 'Legal & Professional',
  rent_lease: 'Rent/Lease',
  repairs_maintenance: 'Repairs & Maintenance',
  other: 'Other',
};

const IRS_CATEGORIES = [
  { value: 'advertising', label: 'Advertising' },
  { value: 'office_expense', label: 'Office Expense' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'meals', label: 'Meals (50% deductible)' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'car_truck', label: 'Car & Truck' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legal_professional', label: 'Legal & Professional' },
  { value: 'rent_lease', label: 'Rent/Lease' },
  { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: '', label: 'Not specified' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

export default function ReceiptDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const receiptId = params.id as string;

  // Data state
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    date: '',
    merchant: '',
    total: '',
    category: 'other',
    business_purpose: '',
    payment_method: '',
    notes: '',
  });

  // Action states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      // Initialize edit form with current data
      setEditForm({
        date: data.date || '',
        merchant: data.merchant || '',
        total: data.total?.toString() || '',
        category: data.category || 'other',
        business_purpose: data.business_purpose || '',
        payment_method: data.payment_method || '',
        notes: data.notes || '',
      });
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit mode toggle
  const handleEditClick = () => {
    setIsEditMode(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setError(null);
    // Reset form to original data
    if (receipt) {
      setEditForm({
        date: receipt.date || '',
        merchant: receipt.merchant || '',
        total: receipt.total?.toString() || '',
        category: receipt.category || 'other',
        business_purpose: receipt.business_purpose || '',
        payment_method: receipt.payment_method || '',
        notes: receipt.notes || '',
      });
    }
  };

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!receipt) return;

    // Validate
    if (!editForm.date) {
      setError('Date is required');
      return;
    }
    if (!editForm.merchant) {
      setError('Vendor is required');
      return;
    }
    if (!editForm.total) {
      setError('Amount is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const totalAmount = parseFloat(editForm.total);
      if (isNaN(totalAmount)) {
        throw new Error('Invalid amount');
      }

      // Calculate tax year
      const taxYear = new Date(editForm.date).getFullYear();

      const updatedData = {
        date: editForm.date,
        merchant: editForm.merchant,
        total: totalAmount,
        category: editForm.category,
        business_purpose: editForm.business_purpose || null,
        payment_method: editForm.payment_method || null,
        notes: editForm.notes || null,
        tax_year: taxYear,
      };

      const { data, error: saveError } = await updateReceipt(receipt.id, updatedData);

      if (saveError) throw saveError;

      setSuccessMessage('Receipt updated successfully!');
      setIsEditMode(false);

      // Refresh receipt data
      await fetchReceipt();
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Download image
  const handleDownloadImage = () => {
    if (!receipt?.image_url) return;

    const link = document.createElement('a');
    link.href = receipt.image_url;
    link.download = `receipt-${receipt.merchant}-${receipt.date}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            This receipt doesn't exist or you don't have permission to view it.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/receipts')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Receipts
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? 'Edit Receipt' : 'Receipt Details'}
            </h1>

            {!isEditMode && (
              <div className="flex gap-2">
                <button
                  onClick={handleEditClick}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <div className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5">✓</div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">Success</h3>
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Image */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Receipt Image</h2>

            {receipt.image_url ? (
              <div className="space-y-4">
                <div
                  className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={receipt.image_url}
                    alt={receipt.merchant}
                    className="w-full h-auto max-h-[600px] object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
                      <ZoomIn className="w-6 h-6 text-cyan-600" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadImage}
                    className="flex-1 border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => window.open(receipt.image_url!, '_blank')}
                    className="flex-1 border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-12 text-center">
                <ReceiptIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-slate-500">No image available</p>
              </div>
            )}
          </div>

          {/* Right column - Details or Edit Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              {isEditMode ? 'Edit Information' : 'Receipt Information'}
            </h2>

            {!isEditMode ? (
              // VIEW MODE
              <div className="space-y-6">
                {/* Date */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatDate(receipt.date)}</p>
                </div>

                {/* Vendor */}
                <div>
                  <p className="text-sm text-slate-500 mb-1">Vendor</p>
                  <h2 className="text-3xl font-bold text-slate-900">{receipt.merchant}</h2>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Amount</span>
                  </div>
                  <p className="text-4xl font-bold text-green-600">
                    {formatCurrency(receipt.total)}
                  </p>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <Tag className="w-4 h-4" />
                    <span>Category</span>
                  </div>
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                      CATEGORY_COLORS[receipt.category] || CATEGORY_COLORS.other
                    }`}
                  >
                    {CATEGORY_LABELS[receipt.category] || 'Other'}
                  </span>
                </div>

                {/* Business Purpose */}
                {receipt.business_purpose && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Business Purpose</p>
                    <p className="text-lg text-slate-900">{receipt.business_purpose}</p>
                  </div>
                )}

                {/* Payment Method */}
                {receipt.payment_method && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment Method</span>
                    </div>
                    <p className="text-lg text-slate-900 capitalize">{receipt.payment_method}</p>
                  </div>
                )}

                {/* Items */}
                {receipt.items && receipt.items.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <FileText className="w-4 h-4" />
                      <span>Items</span>
                    </div>
                    <ul className="space-y-1">
                      {receipt.items.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-700">
                          <span className="text-cyan-600">•</span>
                          <span>
                            {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                {receipt.description && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Description</p>
                    <p className="text-slate-700">{receipt.description}</p>
                  </div>
                )}

                {/* Notes */}
                {receipt.notes && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Notes</p>
                    <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{receipt.notes}</p>
                  </div>
                )}

                {/* Tax Year */}
                {receipt.tax_year && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Tax Year</p>
                    <p className="text-lg font-semibold text-slate-900">{receipt.tax_year}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-6 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Created: {formatDateTime(receipt.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Updated: {formatDateTime(receipt.updated_at)}</span>
                  </div>
                </div>
              </div>
            ) : (
              // EDIT MODE
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
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
                    value={editForm.merchant}
                    onChange={(e) => handleFormChange('merchant', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter vendor name"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.total}
                    onChange={(e) => handleFormChange('total', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {IRS_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
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
                    value={editForm.business_purpose}
                    onChange={(e) => handleFormChange('business_purpose', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Optional"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editForm.payment_method}
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

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                    placeholder="Add any additional notes"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex-1 border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>

                {/* Delete button in edit mode */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Receipt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && receipt.image_url && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-5xl w-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={receipt.image_url}
                alt={receipt.merchant}
                className="w-full h-auto max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

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
                    {receipt.merchant} - {formatCurrency(receipt.total)}
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

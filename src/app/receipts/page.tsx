'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getReceipts, deleteReceipt } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import {
  Upload,
  Loader2,
  Search,
  Filter,
  X,
  Eye,
  Edit2,
  Trash2,
  Receipt as ReceiptIcon,
  DollarSign,
  FileText,
  Calendar,
} from 'lucide-react';

// Category colors mapping
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
  meals: 'Meals',
  travel: 'Travel',
  utilities: 'Utilities',
  car_truck: 'Car & Truck',
  insurance: 'Insurance',
  legal_professional: 'Legal & Professional',
  rent_lease: 'Rent/Lease',
  repairs_maintenance: 'Repairs & Maintenance',
  other: 'Other',
};

export default function ReceiptsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirmReceipt, setDeleteConfirmReceipt] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch receipts
  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getReceipts();
      if (fetchError) throw fetchError;
      setReceipts(data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  // Filter receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      // Year filter
      if (yearFilter !== 'all' && receipt.tax_year !== parseInt(yearFilter)) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && receipt.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery && !receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (startDate && receipt.date < startDate) {
        return false;
      }
      if (endDate && receipt.date > endDate) {
        return false;
      }

      return true;
    });
  }, [receipts, yearFilter, categoryFilter, searchQuery, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCount = receipts.length;
    const filteredCount = filteredReceipts.length;
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.total || 0), 0);

    return { totalCount, filteredCount, totalAmount };
  }, [receipts, filteredReceipts]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (yearFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (searchQuery) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [yearFilter, categoryFilter, searchQuery, startDate, endDate]);

  // Clear all filters
  const clearFilters = () => {
    setYearFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmReceipt) return;

    setDeleting(true);
    try {
      const { error: deleteError } = await deleteReceipt(deleteConfirmReceipt.id);
      if (deleteError) throw deleteError;

      // Refresh receipts
      await fetchReceipts();

      // Close dialog
      setDeleteConfirmReceipt(null);
    } catch (err) {
      console.error('Error deleting receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete receipt');
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set(
      receipts.map((r) => r.tax_year).filter((year): year is number => year !== null)
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [receipts]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>

          {/* Skeleton filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Skeleton stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex gap-4 mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">My Receipts</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage and track your business expenses</p>
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

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Year Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 sm:mt-4">
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Search Vendor</label>
            <div className="relative">
              <div className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ left: '14px' }}>
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vendor name..."
                className="w-full pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-lg p-3 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <ReceiptIcon className="w-5 h-5 sm:w-8 sm:h-8" />
              <div>
                <p className="text-xs sm:text-sm text-cyan-100">Total</p>
                <p className="text-lg sm:text-3xl font-bold">{stats.totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-3 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <DollarSign className="w-5 h-5 sm:w-8 sm:h-8" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-green-100">Amount</p>
                <p className="text-base sm:text-3xl font-bold truncate">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg shadow-lg p-3 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <FileText className="w-5 h-5 sm:w-8 sm:h-8" />
              <div>
                <p className="text-xs sm:text-sm text-sky-100">Filtered</p>
                <p className="text-lg sm:text-3xl font-bold">
                  {stats.filteredCount}/{stats.totalCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredReceipts.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <ReceiptIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              {receipts.length === 0 ? 'No receipts yet' : 'No receipts found'}
            </h3>
            <p className="text-slate-600 mb-6">
              {receipts.length === 0
                ? 'Start by uploading your first receipt to track your expenses'
                : 'Try adjusting your filters to see more results'}
            </p>
            {receipts.length === 0 && (
              <button
                onClick={() => router.push('/upload')}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Receipt
              </button>
            )}
          </div>
        )}

        {/* Receipt Grid */}
        {filteredReceipts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 sm:hover:scale-105 cursor-pointer overflow-hidden"
                onClick={() => {
                  setSelectedReceipt(receipt);
                  setShowDetailModal(true);
                }}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                      {receipt.image_url ? (
                        <img
                          src={receipt.image_url}
                          alt={receipt.merchant}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                          <ReceiptIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs sm:text-sm text-slate-500">{formatDate(receipt.date)}</p>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate mb-1">
                        {receipt.merchant}
                      </h3>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {formatCurrency(receipt.total)}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-2 sm:mb-3">
                    <span
                      className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${
                        CATEGORY_COLORS[receipt.category] || CATEGORY_COLORS.other
                      }`}
                    >
                      {CATEGORY_LABELS[receipt.category] || 'Other'}
                    </span>
                  </div>

                  {/* Description */}
                  {receipt.description && (
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-3 sm:mb-4">{receipt.description}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReceipt(receipt);
                        setShowDetailModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">View</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/receipts/${receipt.id}/edit`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmReceipt(receipt);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button (floating) */}
        <button
          onClick={() => router.push('/upload')}
          className="fixed bottom-8 right-8 bg-cyan-500 hover:bg-cyan-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        >
          <Upload className="w-6 h-6" />
        </button>

        {/* Detail Modal */}
        {showDetailModal && selectedReceipt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Receipt Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Image */}
                {selectedReceipt.image_url && (
                  <div className="mb-6">
                    <img
                      src={selectedReceipt.image_url}
                      alt={selectedReceipt.merchant}
                      className="w-full h-auto max-h-96 object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Details Grid */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Date</label>
                    <p className="text-lg text-slate-900">{formatDate(selectedReceipt.date)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-500">Vendor</label>
                    <p className="text-lg font-semibold text-slate-900">{selectedReceipt.merchant}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-500">Amount</label>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedReceipt.total)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-500">Category</label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          CATEGORY_COLORS[selectedReceipt.category] || CATEGORY_COLORS.other
                        }`}
                      >
                        {CATEGORY_LABELS[selectedReceipt.category] || 'Other'}
                      </span>
                    </div>
                  </div>

                  {selectedReceipt.business_purpose && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">Business Purpose</label>
                      <p className="text-lg text-slate-900">{selectedReceipt.business_purpose}</p>
                    </div>
                  )}

                  {selectedReceipt.payment_method && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">Payment Method</label>
                      <p className="text-lg text-slate-900 capitalize">
                        {selectedReceipt.payment_method}
                      </p>
                    </div>
                  )}

                  {selectedReceipt.description && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">Description</label>
                      <p className="text-lg text-slate-900">{selectedReceipt.description}</p>
                    </div>
                  )}

                  {selectedReceipt.notes && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">Notes</label>
                      <p className="text-lg text-slate-900">{selectedReceipt.notes}</p>
                    </div>
                  )}

                  {selectedReceipt.tax_year && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">Tax Year</label>
                      <p className="text-lg text-slate-900">{selectedReceipt.tax_year}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      router.push(`/receipts/${selectedReceipt.id}/edit`);
                    }}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Receipt
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Receipt?</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Are you sure you want to delete this receipt?
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{deleteConfirmReceipt.merchant}</span> -{' '}
                    {formatCurrency(deleteConfirmReceipt.total)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmReceipt(null)}
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

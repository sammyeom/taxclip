import { create } from 'zustand';
import { Receipt } from '@/types/database';

type SortField = 'date' | 'total' | 'merchant' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface ReceiptFilters {
  category: string | null;
  taxYear: number | null;
  searchQuery: string;
  dateFrom: string | null;
  dateTo: string | null;
}

interface ReceiptState {
  receipts: Receipt[];
  selectedReceipt: Receipt | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: ReceiptFilters;
  sortField: SortField;
  sortOrder: SortOrder;

  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;

  // Actions
  setReceipts: (receipts: Receipt[]) => void;
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (id: string, receipt: Partial<Receipt>) => void;
  removeReceipt: (id: string) => void;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filter actions
  setFilter: <K extends keyof ReceiptFilters>(key: K, value: ReceiptFilters[K]) => void;
  resetFilters: () => void;
  setSort: (field: SortField, order: SortOrder) => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;

  // Computed
  getFilteredReceipts: () => Receipt[];
}

const defaultFilters: ReceiptFilters = {
  category: null,
  taxYear: null,
  searchQuery: '',
  dateFrom: null,
  dateTo: null,
};

export const useReceiptStore = create<ReceiptState>((set, get) => ({
  receipts: [],
  selectedReceipt: null,
  isLoading: false,
  error: null,

  filters: defaultFilters,
  sortField: 'date',
  sortOrder: 'desc',

  page: 1,
  pageSize: 20,
  totalCount: 0,

  setReceipts: (receipts) => set({ receipts, totalCount: receipts.length }),

  addReceipt: (receipt) => set((state) => ({
    receipts: [receipt, ...state.receipts],
    totalCount: state.totalCount + 1
  })),

  updateReceipt: (id, updatedReceipt) => set((state) => ({
    receipts: state.receipts.map((r) =>
      r.id === id ? { ...r, ...updatedReceipt } : r
    ),
    selectedReceipt: state.selectedReceipt?.id === id
      ? { ...state.selectedReceipt, ...updatedReceipt }
      : state.selectedReceipt
  })),

  removeReceipt: (id) => set((state) => ({
    receipts: state.receipts.filter((r) => r.id !== id),
    totalCount: state.totalCount - 1,
    selectedReceipt: state.selectedReceipt?.id === id ? null : state.selectedReceipt
  })),

  setSelectedReceipt: (receipt) => set({ selectedReceipt: receipt }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value },
    page: 1 // Reset to first page when filter changes
  })),

  resetFilters: () => set({ filters: defaultFilters, page: 1 }),

  setSort: (field, order) => set({ sortField: field, sortOrder: order }),

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setTotalCount: (totalCount) => set({ totalCount }),

  getFilteredReceipts: () => {
    const { receipts, filters, sortField, sortOrder } = get();

    let filtered = [...receipts];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter((r) => r.category === filters.category);
    }
    if (filters.taxYear) {
      filtered = filtered.filter((r) => r.tax_year === filters.taxYear);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.merchant?.toLowerCase().includes(query) ||
        r.business_purpose?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query)
      );
    }
    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.date <= filters.dateTo!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'date':
          aVal = a.date || '';
          bVal = b.date || '';
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'merchant':
          aVal = a.merchant?.toLowerCase() || '';
          bVal = b.merchant?.toLowerCase() || '';
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  },
}));

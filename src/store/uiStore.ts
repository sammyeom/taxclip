import { create } from 'zustand';

type ModalType =
  | 'receiptDetail'
  | 'deleteConfirm'
  | 'uploadSuccess'
  | 'exportOptions'
  | 'settings'
  | null;

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Modal
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;

  // Toast notifications
  toasts: Toast[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Theme
  isDarkMode: boolean;

  // Mobile
  isMobileMenuOpen: boolean;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Actions - Modal
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Actions - Toast
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Actions - Theme
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;

  // Actions - Mobile
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  toasts: [],
  globalLoading: false,
  loadingMessage: null,
  isDarkMode: false,
  isMobileMenuOpen: false,

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Modal actions
  openModal: (type, data) => set({
    activeModal: type,
    modalData: data ?? null
  }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Toast actions
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
  clearToasts: () => set({ toasts: [] }),

  // Loading actions
  setGlobalLoading: (loading, message) => set({
    globalLoading: loading,
    loadingMessage: message ?? null
  }),

  // Theme actions
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setDarkMode: (isDark) => set({ isDarkMode: isDark }),

  // Mobile actions
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));

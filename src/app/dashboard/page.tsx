'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getReceipts, getReceiptStats, getReceiptsByYear } from '@/lib/supabase';
import { Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import { TaxExportModal } from '@/components/export';
import {
  Loader2,
  Receipt as ReceiptIcon,
  Calendar,
  TrendingUp,
  Tag,
  Upload,
  FileText,
  BarChart3,
  ChevronRight,
  Download,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  StatCard,
  SpendingTrendChart,
  CategoryPieChart,
  InsightSection,
  MonthlyData,
  MonthComparisonData,
  CategoryData,
  InsightData,
} from '@/components/dashboard';

// Constants
const CATEGORIES: Record<string, string> = {
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

const CHART_COLORS = [
  '#06B6D4',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#6366F1',
  '#14B8A6',
];

interface StatsData {
  totalCount: number;
  totalAmount: number;
  categoryTotals: Record<string, number>;
  monthlyTotals: number[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Separate component for checkout success banner (uses useSearchParams)
function CheckoutSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShow(true);
      router.replace('/dashboard');
      setTimeout(() => setShow(false), 5000);
    }
  }, [searchParams, router]);

  if (!show) return null;

  return (
    <div className="bg-green-50 border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Welcome to TaxClip Pro! Your subscription is now active.
            </span>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Tax Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTaxYear, setExportTaxYear] = useState(new Date().getFullYear());
  const [exportReceipts, setExportReceipts] = useState<Receipt[]>([]);
  const availableYears = [2024, 2025, 2026];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: receiptsData } = await getReceipts();
      setAllReceipts(receiptsData || []);

      const { data: statsData } = await getReceiptStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Fetch receipts for export when modal opens or year changes
  useEffect(() => {
    const fetchExportReceipts = async () => {
      if (isExportModalOpen) {
        const { data } = await getReceiptsByYear(exportTaxYear);
        setExportReceipts(data || []);
      }
    };
    fetchExportReceipts();
  }, [isExportModalOpen, exportTaxYear]);

  // Current month stats
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const receipts = allReceipts.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
      count: receipts.length,
    };
  }, [allReceipts]);

  // Last month stats
  const lastMonthStats = useMemo(() => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const receipts = allReceipts.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === lastMonth && d.getFullYear() === year;
    });
    return { total: receipts.reduce((sum, r) => sum + (r.total || 0), 0) };
  }, [allReceipts]);

  // Month comparison percentage
  const monthComparison = useMemo(() => {
    if (lastMonthStats.total === 0) return null;
    return ((currentMonthStats.total - lastMonthStats.total) / lastMonthStats.total) * 100;
  }, [currentMonthStats, lastMonthStats]);

  // Current year stats
  const currentYearStats = useMemo(() => {
    const year = new Date().getFullYear();
    const receipts = allReceipts.filter((r) => new Date(r.date).getFullYear() === year);
    return {
      total: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
      count: receipts.length,
    };
  }, [allReceipts]);

  // Top category
  const topCategory = useMemo(() => {
    if (!stats?.categoryTotals) return null;
    const sorted = Object.entries(stats.categoryTotals)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { name: CATEGORIES[sorted[0][0]] || sorted[0][0], amount: sorted[0][1] };
  }, [stats]);

  // Recent receipts
  const recentReceipts = useMemo(() => {
    return [...allReceipts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [allReceipts]);

  // Monthly trend data (6 months)
  const monthlyData = useMemo((): MonthlyData[] => {
    const now = new Date();
    const data: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const receipts = allReceipts.filter((r) => {
        const d = new Date(r.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        monthFull: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        amount: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    return data;
  }, [allReceipts]);

  // Month comparison data
  const comparisonData = useMemo((): MonthComparisonData[] => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return [
      {
        month: new Date(lastMonthYear, lastMonth, 1).toLocaleDateString('en-US', { month: 'short' }),
        'Last Month': lastMonthStats.total,
        'This Month': 0,
      },
      {
        month: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { month: 'short' }),
        'Last Month': 0,
        'This Month': currentMonthStats.total,
      },
    ];
  }, [lastMonthStats, currentMonthStats]);

  // Category chart data
  const categoryData = useMemo((): CategoryData[] => {
    if (!stats?.categoryTotals) return [];
    return Object.entries(stats.categoryTotals)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount], index) => ({
        name: CATEGORIES[key] || key,
        value: amount,
        count: allReceipts.filter((r) => r.category === key).length,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [stats, allReceipts]);

  // Insight data
  const insightData = useMemo((): InsightData => {
    const topCat = categoryData[0];
    return {
      topCategory: topCat
        ? {
            name: topCat.name,
            amount: topCat.value,
            percentage: stats?.totalAmount ? (topCat.value / stats.totalAmount) * 100 : 0,
          }
        : null,
      averageAmount: stats?.totalCount ? stats.totalAmount / stats.totalCount : 0,
      estimatedTaxBenefit: stats?.totalAmount ? stats.totalAmount * 0.1 : 0,
      totalCount: stats?.totalCount || 0,
      monthlyChange: monthComparison,
    };
  }, [categoryData, stats, monthComparison]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      {/* Checkout Success Banner */}
      <Suspense fallback={null}>
        <CheckoutSuccessBanner />
      </Suspense>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            Here's your financial overview
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            icon={ReceiptIcon}
            value={stats?.totalCount || 0}
            label="Total Receipts"
            subLabel="All time"
            gradient="cyan"
          />
          <StatCard
            icon={Calendar}
            value={formatCurrency(currentMonthStats.total)}
            label="This Month"
            gradient="blue"
            trend={monthComparison !== null ? { value: monthComparison, label: 'vs last month' } : undefined}
          />
          <StatCard
            icon={TrendingUp}
            value={formatCurrency(currentYearStats.total)}
            label="This Year"
            subLabel={`${new Date().getFullYear()} YTD`}
            gradient="green"
          />
          <StatCard
            icon={Tag}
            value={topCategory?.name || 'N/A'}
            label="Top Category"
            subLabel="Most frequent"
            gradient="purple"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Recent Receipts */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Recent Receipts</h2>
                <Link href="/receipts">
                  <button className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              {recentReceipts.length === 0 ? (
                <div className="text-center py-8">
                  <ReceiptIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 text-sm">No receipts yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentReceipts.map((receipt) => (
                    <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {receipt.image_url ? (
                            <img src={receipt.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ReceiptIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {receipt.merchant}
                            </p>
                            <p className="text-green-600 font-bold text-sm ml-2">
                              {formatCurrency(receipt.total)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">{formatDate(receipt.date)}</p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full hidden sm:inline-block ${
                                CATEGORY_COLORS[receipt.category] || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {CATEGORIES[receipt.category] || receipt.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/upload">
                  <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Receipt
                  </button>
                </Link>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" /> Export for Tax Filing
                </button>
                <Link href="/receipts">
                  <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> View All Receipts
                  </button>
                </Link>
                <Link href="/reports">
                  <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Generate Report
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SpendingTrendChart monthlyData={monthlyData} comparisonData={comparisonData} />
            <CategoryPieChart data={categoryData} totalAmount={stats?.totalAmount || 0} />
            <InsightSection data={insightData} />
          </div>
        </div>
      </main>

      {/* Tax Export Modal */}
      <TaxExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        receipts={exportReceipts}
        taxYear={exportTaxYear}
        availableYears={availableYears}
        onYearChange={setExportTaxYear}
      />
    </div>
  );
}

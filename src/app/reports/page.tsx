'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getReceiptStats,
  getReceiptsByYear,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import { ExportPanel } from '@/components/export';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Receipt as ReceiptIcon,
  Tag,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  advertising: '#3B82F6',
  office_expense: '#8B5CF6',
  supplies: '#10B981',
  meals: '#F59E0B',
  travel: '#EC4899',
  utilities: '#EAB308',
  car_truck: '#6366F1',
  insurance: '#EF4444',
  legal_professional: '#14B8A6',
  rent_lease: '#06B6D4',
  repairs_maintenance: '#84CC16',
  other: '#6B7280',
};

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface StatsData {
  totalCount: number;
  totalAmount: number;
  categoryTotals: Record<string, number>;
  monthlyTotals: number[];
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Data state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available years for export
  const availableYears = [2024, 2025, 2026];

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch data when year changes
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch stats
      const { data: statsData, error: statsError } = await getReceiptStats(selectedYear);
      if (statsError) throw statsError;
      setStats(statsData);

      // Fetch all receipts for the year
      const { data: receiptsData, error: receiptsError } =
        await getReceiptsByYear(selectedYear);
      if (receiptsError) throw receiptsError;
      setAllReceipts(receiptsData || []);
      setRecentReceipts((receiptsData || []).slice(0, 10));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!stats) return null;

    const largestExpense = recentReceipts.reduce(
      (max, receipt) => (receipt.total > max.total ? receipt : max),
      recentReceipts[0] || { total: 0, merchant: 'N/A' }
    );

    const mostUsedCategory = Object.entries(stats.categoryTotals).reduce(
      (max, [category, amount]) => {
        const count = recentReceipts.filter((r) => r.category === category).length;
        return count > max.count ? { category, count, amount } : max;
      },
      { category: 'none', count: 0, amount: 0 }
    );

    return {
      largestExpense,
      mostUsedCategory,
    };
  }, [stats, recentReceipts]);

  // Prepare monthly chart data
  const monthlyChartData = useMemo(() => {
    if (!stats) return [];

    return MONTH_NAMES.map((month, index) => ({
      month,
      amount: stats.monthlyTotals[index] || 0,
    }));
  }, [stats]);

  // Prepare category pie chart data
  const categoryChartData = useMemo(() => {
    if (!stats) return [];

    return Object.entries(stats.categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        name: CATEGORIES[category] || category,
        value: amount,
        category,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  // Prepare Schedule C table data
  const scheduleCData = useMemo(() => {
    if (!stats) return [];

    const totalExpenses = stats.totalAmount;

    return Object.entries(CATEGORIES)
      .map(([key, label]) => {
        const amount = stats.categoryTotals[key] || 0;
        const count = recentReceipts.filter((r) => r.category === key).length;
        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;

        return {
          category: label,
          key,
          amount,
          count,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [stats, recentReceipts]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hasData = stats && stats.totalCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Tax Reports</h1>
              <p className="text-sm sm:text-base text-slate-600">Schedule C summary and expense analytics</p>
            </div>
          </div>
        </div>

        {/* IRS-Ready Export Panel */}
        <div className="mb-6 sm:mb-8">
          <ExportPanel
            receipts={allReceipts}
            taxYear={selectedYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!hasData ? (
          // Empty State
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              No receipts for {selectedYear}
            </h3>
            <p className="text-slate-600 mb-6">
              Upload some receipts to see your tax reports and analytics
            </p>
            <button
              onClick={() => router.push('/upload')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <ReceiptIcon className="w-5 h-5" />
              Upload Receipt
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
              {/* Total Expenses */}
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <DollarSign className="w-5 h-5 sm:w-8 sm:h-8" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-cyan-100">Expenses</p>
                    <p className="text-base sm:text-3xl font-bold truncate">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Total Receipts */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <ReceiptIcon className="w-5 h-5 sm:w-8 sm:h-8" />
                  <div>
                    <p className="text-xs sm:text-sm text-blue-100">Receipts</p>
                    <p className="text-xl sm:text-3xl font-bold">{stats.totalCount}</p>
                  </div>
                </div>
              </div>

              {/* Largest Expense */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-green-100">Largest</p>
                    <p className="text-base sm:text-2xl font-bold truncate">
                      {summaryStats?.largestExpense.total
                        ? formatCurrency(summaryStats.largestExpense.total)
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-green-100 truncate hidden sm:block">
                      {summaryStats?.largestExpense.merchant || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Most Used Category */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <Tag className="w-5 h-5 sm:w-8 sm:h-8" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-purple-100">Top Category</p>
                    <p className="text-sm sm:text-xl font-bold truncate">
                      {summaryStats?.mostUsedCategory.category !== 'none'
                        ? CATEGORIES[summaryStats!.mostUsedCategory.category]
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-purple-100 hidden sm:block">
                      {summaryStats?.mostUsedCategory.count || 0} receipts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule C Summary Table */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                Schedule C Summary
              </h2>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                        Category
                      </th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                        Amount
                      </th>
                      <th className="text-center py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                        #
                      </th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleCData.map((item) => (
                      <tr
                        key={item.key}
                        className={`border-b border-slate-100 ${
                          item.amount === 0 ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-slate-900">
                          <span className="truncate">{item.category}</span>
                          {item.key === 'meals' && item.amount > 0 && (
                            <span className="text-xs text-orange-600 ml-1 sm:ml-2 hidden sm:inline">(50%)</span>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-semibold text-slate-900">
                          {item.key === 'meals' && item.amount > 0 ? (
                            <span className="flex flex-col sm:flex-row sm:items-center sm:justify-end">
                              <span>{formatCurrency(item.amount)}</span>
                              <span className="text-xs text-orange-600 sm:ml-1">
                                ({formatCurrency(item.amount * 0.5)})
                              </span>
                            </span>
                          ) : (
                            formatCurrency(item.amount)
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-center text-xs sm:text-sm text-slate-700">{item.count}</td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-xs sm:text-sm text-slate-700">
                          {item.percentage.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-bold text-xs sm:text-sm text-slate-900">Total</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-sm sm:text-lg text-slate-900">
                        {formatCurrency(stats.totalAmount)}
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-center font-bold text-xs sm:text-sm text-slate-900">
                        {stats.totalCount}
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-xs sm:text-sm text-slate-900">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
              {/* Monthly Expenses Chart */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                  Monthly Expenses
                </h2>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748B" fontSize={10} tick={{ fontSize: 10 }} width={50} />
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="amount" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown Pie Chart */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                  Category Breakdown
                </h2>

                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.category] || '#6B7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Receipts */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                  Recent ({selectedYear})
                </h2>
                <Link href="/receipts">
                  <button className="text-cyan-600 hover:text-cyan-700 font-semibold text-xs sm:text-sm">
                    View All →
                  </button>
                </Link>
              </div>

              {recentReceipts.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">No receipts found</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                          Date
                        </th>
                        <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                          Vendor
                        </th>
                        <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">
                          Amount
                        </th>
                        <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 hidden sm:table-cell">
                          Category
                        </th>
                        <th className="text-center py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700">

                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReceipts.map((receipt) => (
                        <tr key={receipt.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-slate-700">
                            {formatDate(receipt.date)}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-900 max-w-[100px] truncate">
                            {receipt.merchant}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-right font-semibold text-green-600">
                            {formatCurrency(receipt.total)}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-slate-700 hidden sm:table-cell">
                            {CATEGORIES[receipt.category] || receipt.category}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                            <Link href={`/receipts/${receipt.id}`}>
                              <button className="text-cyan-600 hover:text-cyan-700 text-xs sm:text-sm font-semibold">
                                View
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getReceipts,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useDateFormat } from '@/contexts/DateFormatContext';
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
  Calendar,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Label } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { getSubcategoryLabel } from '@/constants/irs-categories';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DateRange = 'this_year' | 'last_year' | 'this_month' | 'last_3_months' | 'all_time';

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

// Calculate total from subtotal + tax + tip (moved outside component)
const getReceiptTotal = (r: Receipt): number => {
  const subtotal = r.subtotal ?? 0;
  const tax = r.tax ?? 0;
  const tip = r.tip ?? 0;
  // If subtotal, tax, or tip exists, calculate total from them
  if (subtotal > 0 || tax > 0 || tip > 0) {
    return subtotal + tax + tip;
  }
  return r.total ?? 0;
};

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { formatDate } = useDateFormat();

  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState<DateRange>('this_year');

  // Data state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available years for export (derive from dateRange)
  const availableYears = [2024, 2025, 2026];
  const selectedYear = dateRange === 'last_year' ? currentYear - 1 : currentYear;

  // Filter receipts by date range
  const filterReceiptsByDateRange = useCallback((receipts: Receipt[], range: DateRange) => {
    const now = new Date();
    const currentYr = now.getFullYear();
    const lastYr = currentYr - 1;
    const currentMonth = now.getMonth();

    return receipts.filter((r) => {
      const rDate = new Date(r.date);
      const receiptYear = rDate.getFullYear();
      switch (range) {
        case 'this_year':
          return receiptYear === currentYr;
        case 'last_year':
          return receiptYear === lastYr;
        case 'this_month':
          return rDate.getMonth() === currentMonth && receiptYear === currentYr;
        case 'last_3_months': {
          const threeMonthsAgo = new Date(currentYr, currentMonth - 2, 1);
          threeMonthsAgo.setHours(0, 0, 0, 0);
          return rDate >= threeMonthsAgo && rDate <= now;
        }
        case 'all_time':
        default:
          return true;
      }
    });
  }, []);

  // Get date range label
  const getDateRangeLabel = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this_year':
        return `${currentYear}`;
      case 'last_year':
        return `${currentYear - 1}`;
      case 'this_month':
        return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      case 'last_3_months':
        return 'Last 3 Months';
      case 'all_time':
        return 'All Time';
      default:
        return `${currentYear}`;
    }
  };

  // Get date range description
  const getDateRangeDescription = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this_year':
        return `Jan 1 - Dec 31, ${currentYear}`;
      case 'last_year':
        return `Jan 1 - Dec 31, ${currentYear - 1}`;
      case 'this_month': {
        const monthStart = new Date(currentYear, now.getMonth(), 1);
        const monthEnd = new Date(currentYear, now.getMonth() + 1, 0);
        return `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(currentYear, now.getMonth() - 2, 1);
        return `${threeMonthsAgo.toLocaleDateString('en-US', { month: 'short' })} - ${now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      }
      case 'all_time':
        return 'All receipts ever';
      default:
        return '';
    }
  };

  // Date range options
  const dateRangeOptions = [
    { key: 'this_year' as DateRange, label: `${currentYear}`, desc: 'Current year • Jan 1 - Dec 31' },
    { key: 'last_year' as DateRange, label: `${currentYear - 1}`, desc: 'Previous year • For tax filing' },
    { key: 'this_month' as DateRange, label: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }), desc: 'Current month' },
    { key: 'last_3_months' as DateRange, label: 'Last 3 Months', desc: (() => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return `${threeMonthsAgo.toLocaleString('en-US', { month: 'short' })} - ${now.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
    })() },
    { key: 'all_time' as DateRange, label: 'All Time', desc: 'All receipts ever' },
  ];

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch all receipts once
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Apply filtering when dateRange changes
  useEffect(() => {
    if (allReceipts.length > 0) {
      const filtered = filterReceiptsByDateRange(allReceipts, dateRange);
      setFilteredReceipts(filtered);
      setRecentReceipts(filtered.slice(0, 10));

      // Calculate stats from filtered receipts
      const statsData = calculateStats(filtered);
      setStats(statsData);
    }
  }, [dateRange, allReceipts, filterReceiptsByDateRange]);

  // Calculate stats from receipts
  const calculateStats = (receipts: Receipt[]): StatsData => {
    const totalCount = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0);

    // Category totals
    const categoryTotals: Record<string, number> = {};
    receipts.forEach(receipt => {
      const cat = receipt.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + getReceiptTotal(receipt);
    });

    // Monthly totals (Jan=0, Dec=11)
    const monthlyTotals = new Array(12).fill(0);
    receipts.forEach(receipt => {
      if (receipt.date) {
        const month = new Date(receipt.date).getMonth();
        monthlyTotals[month] += getReceiptTotal(receipt);
      }
    });

    return {
      totalCount,
      totalAmount,
      categoryTotals,
      monthlyTotals,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all receipts (filter by date field, not tax_year)
      const { data: receiptsData, error: receiptsError } = await getReceipts();
      if (receiptsError) throw receiptsError;

      const allReceiptsData = receiptsData || [];
      setAllReceipts(allReceiptsData);

      // Apply date range filter
      const filtered = filterReceiptsByDateRange(allReceiptsData, dateRange);
      setFilteredReceipts(filtered);
      setRecentReceipts(filtered.slice(0, 10));

      // Calculate stats from filtered receipts
      const statsData = calculateStats(filtered);
      setStats(statsData);
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

    // Find largest expense safely
    let largestExpense: Receipt | null = null;
    if (filteredReceipts.length > 0) {
      largestExpense = filteredReceipts.reduce(
        (max, receipt) => (getReceiptTotal(receipt) > getReceiptTotal(max) ? receipt : max),
        filteredReceipts[0]
      );
    }

    const mostUsedCategory = Object.entries(stats.categoryTotals).reduce(
      (max, [category, amount]) => {
        const count = filteredReceipts.filter((r) => r.category === category).length;
        return count > max.count ? { category, count, amount } : max;
      },
      { category: 'none', count: 0, amount: 0 }
    );

    return {
      largestExpense,
      mostUsedCategory,
    };
  }, [stats, filteredReceipts]);

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
        const count = filteredReceipts.filter((r) => r.category === key).length;
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
  }, [stats, filteredReceipts]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
        {/* Header with Date Range Picker */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Tax Reports</h1>
              <p className="text-sm sm:text-base text-slate-600">Schedule C summary and expense analytics</p>
            </div>

            {/* Date Range Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 h-10 px-4 bg-white border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  <span className="font-semibold text-cyan-700">{getDateRangeLabel()}</span>
                  <ChevronDown className="w-4 h-4 text-cyan-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {dateRangeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => setDateRange(option.key)}
                    className={`flex items-center gap-3 py-3 cursor-pointer ${
                      dateRange === option.key ? 'bg-cyan-50' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      dateRange === option.key
                        ? 'border-cyan-600 bg-cyan-600'
                        : 'border-slate-300'
                    }`}>
                      {dateRange === option.key && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.desc}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date Range Info */}
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-medium">{filteredReceipts.length}</span> receipt{filteredReceipts.length !== 1 ? 's' : ''} • {getDateRangeDescription()}
          </div>
        </div>

        {/* IRS-Ready Export Panel */}
        <div className="mb-6 sm:mb-8">
          <ExportPanel
            receipts={filteredReceipts}
            taxYear={selectedYear}
            availableYears={availableYears}
            onYearChange={(year) => setDateRange(year === currentYear ? 'this_year' : 'last_year')}
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
              No receipts for {getDateRangeLabel()}
            </h3>
            <p className="text-slate-600 mb-6">
              {dateRange === 'all_time'
                ? 'Upload some receipts to see your tax reports and analytics'
                : `No receipts found in this date range. Try selecting "All Time" or a different period.`}
            </p>
            <Button
              onClick={() => router.push('/upload')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <ReceiptIcon className="w-5 h-5 mr-2" />
              Upload Receipt
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
              {/* Total Expenses */}
              <Card className="bg-gradient-to-t from-cyan-500/5 to-card shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
                    <span className="text-sm sm:text-base font-medium">Expenses</span>
                  </div>
                  <p className="text-xl sm:text-4xl font-bold text-slate-900 truncate">{formatCurrency(stats.totalAmount)}</p>
                </CardContent>
              </Card>

              {/* Total Receipts */}
              <Card className="bg-gradient-to-t from-blue-500/5 to-card shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <ReceiptIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                    <span className="text-sm sm:text-base font-medium">Receipts</span>
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold text-slate-900">{stats.totalCount}</p>
                </CardContent>
              </Card>

              {/* Largest Expense */}
              <Card className="bg-gradient-to-t from-green-500/5 to-card shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                    <span className="text-sm sm:text-base font-medium">Largest</span>
                  </div>
                  <p className="text-lg sm:text-3xl font-bold text-slate-900 truncate">
                    {summaryStats?.largestExpense
                      ? formatCurrency(getReceiptTotal(summaryStats.largestExpense))
                      : 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                    {summaryStats?.largestExpense?.merchant || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* Most Used Category */}
              <Card className="bg-gradient-to-t from-purple-500/5 to-card shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">Top Category</span>
                  </div>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 truncate">
                    {summaryStats?.mostUsedCategory.category !== 'none'
                      ? CATEGORIES[summaryStats!.mostUsedCategory.category]
                      : 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    {summaryStats?.mostUsedCategory.count || 0} receipts
                  </p>
                </CardContent>
              </Card>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Monthly Expenses Chart */}
              <Card>
                <CardHeader className="pb-2 sm:pb-6">
                  <CardTitle className="text-sm sm:text-base md:text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-600" />
                    Monthly Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
                  <ChartContainer
                    config={{
                      amount: { label: 'Amount', color: '#06B6D4' },
                    } satisfies ChartConfig}
                    className="h-[180px] sm:h-[220px] md:h-[250px] w-full"
                  >
                    <BarChart
                      data={monthlyChartData}
                      accessibilityLayer
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={8}
                        axisLine={false}
                        fontSize={10}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tickLine={false}
                        tickMargin={5}
                        axisLine={false}
                        width={45}
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) =>
                          value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`
                        }
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(Number(value) || 0)}
                          />
                        }
                      />
                      <Bar
                        dataKey="amount"
                        fill="var(--color-amount)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown Pie Chart */}
              <Card>
                <CardHeader className="pb-2 sm:pb-6">
                  <CardTitle className="text-sm sm:text-base md:text-xl font-bold flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-600" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
                  <ChartContainer
                    config={Object.fromEntries(
                      categoryChartData.map((item) => [
                        item.name,
                        { label: item.name, color: CATEGORY_COLORS[item.category] || '#6B7280' },
                      ])
                    ) as ChartConfig}
                    className="mx-auto h-[200px] sm:h-[240px] md:h-[280px] w-full max-w-[280px] sm:max-w-none"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(Number(value) || 0)}
                          />
                        }
                      />
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius="35%"
                        outerRadius="60%"
                        paddingAngle={2}
                        strokeWidth={1}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[entry.category] || '#6B7280'}
                            stroke={CATEGORY_COLORS[entry.category] || '#6B7280'}
                          />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              const compactAmount = stats.totalAmount >= 1000
                                ? `$${(stats.totalAmount / 1000).toFixed(1)}k`
                                : `$${stats.totalAmount.toFixed(0)}`;
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) - 6}
                                    className="fill-muted-foreground text-[10px] sm:text-xs"
                                  >
                                    Total
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 8}
                                    className="fill-foreground text-xs sm:text-sm md:text-lg font-bold"
                                  >
                                    {compactAmount}
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="flex-wrap gap-1 sm:gap-2 justify-center text-[10px] sm:text-xs [&>*]:px-1"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Receipts */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                  Recent ({getDateRangeLabel()})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                >
                  <Link href="/receipts">View All →</Link>
                </Button>
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
                            {formatDate(receipt.date, { shortMonth: true })}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-900 max-w-[100px] truncate">
                            {receipt.merchant}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-right font-semibold text-green-600">
                            {formatCurrency(getReceiptTotal(receipt))}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-slate-700 hidden sm:table-cell">
                            {CATEGORIES[receipt.category] || receipt.category}
                            {receipt.subcategory && (
                              <span className="text-slate-500"> - {getSubcategoryLabel(receipt.category, receipt.subcategory)}</span>
                            )}
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-auto py-1 px-2"
                            >
                              <Link href={`/receipts/${receipt.id}`}>View</Link>
                            </Button>
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

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
import ExportPanel, { DateRange } from '@/components/export/ExportPanel';
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
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(currentYear, 0, 1));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  // Data state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaxInfoModal, setShowTaxInfoModal] = useState(false);

  // Filter receipts by date range
  const filterReceiptsByDateRange = useCallback((receipts: Receipt[], range: DateRange, startDate?: Date, endDate?: Date) => {
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
        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return rDate >= start && rDate <= end;
          }
          return true;
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
      case 'custom':
        return `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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
      case 'custom':
        return `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      default:
        return '';
    }
  };

  // Handle custom date change
  const handleCustomDateChange = (startDate: Date, endDate: Date) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

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

  // Apply filtering when dateRange or custom dates change
  useEffect(() => {
    if (allReceipts.length > 0) {
      const filtered = filterReceiptsByDateRange(allReceipts, dateRange, customStartDate, customEndDate);
      setFilteredReceipts(filtered);
      setRecentReceipts(filtered.slice(0, 10));

      // Calculate stats from filtered receipts
      const statsData = calculateStats(filtered);
      setStats(statsData);
    }
  }, [dateRange, allReceipts, filterReceiptsByDateRange, customStartDate, customEndDate]);

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
      const filtered = filterReceiptsByDateRange(allReceiptsData, dateRange, customStartDate, customEndDate);
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

  // Tax summary calculations based on filtered receipts (follows date range)
  const taxSummary = useMemo(() => {
    if (filteredReceipts.length === 0) {
      return { totalExpenses: 0, deductibleAmount: 0, estimatedSavings: 0 };
    }

    const TAX_SAVINGS_RATE = 0.373; // 22% federal + 15.3% self-employment
    const totalExpenses = filteredReceipts.reduce((sum, r) => sum + getReceiptTotal(r), 0);
    const mealsAmount = filteredReceipts
      .filter((r) => r.category === 'meals')
      .reduce((sum, r) => sum + getReceiptTotal(r), 0);
    const otherAmount = totalExpenses - mealsAmount;
    const deductibleAmount = (mealsAmount * 0.5) + otherAmount; // Meals 50%, others 100%
    const estimatedSavings = deductibleAmount * TAX_SAVINGS_RATE;

    return {
      totalExpenses,
      deductibleAmount,
      estimatedSavings,
    };
  }, [filteredReceipts]);

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
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Tax Reports</h1>
          <p className="text-sm sm:text-base text-slate-600">Schedule C summary and expense analytics</p>
        </div>

        {/* IRS-Ready Export Panel with Date Range */}
        <div className="mb-6 sm:mb-8">
          <ExportPanel
            receipts={filteredReceipts}
            dateRange={dateRange}
            dateRangeLabel={getDateRangeLabel()}
            dateRangeDescription={getDateRangeDescription()}
            onDateRangeChange={setDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={handleCustomDateChange}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
            {/* Tax Summary Card - First */}
            <Card className="mb-6 sm:mb-8 bg-gradient-to-t from-cyan-500/5 to-card shadow-sm">
              <CardContent className="pt-4 pb-5 px-5 sm:pt-5 sm:pb-8 sm:px-8">
                <div className="flex items-center gap-2 text-muted-foreground mb-6">
                  <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-500" />
                  <span className="text-xl sm:text-2xl font-bold text-foreground">Tax Summary</span>
                  <span className="text-xs sm:text-sm font-medium text-cyan-600 bg-cyan-100 px-2.5 py-1 rounded-full">
                    {getDateRangeLabel()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 sm:gap-8">
                  {/* Total Expenses */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
                      <DollarSign className="w-5 h-5 text-slate-500" />
                      <span className="text-sm sm:text-base font-medium">Total Expenses</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900">{formatCurrency(taxSummary.totalExpenses)}</p>
                  </div>

                  {/* Tax Deductible */}
                  <div className="text-center border-l border-r border-border px-4">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm sm:text-base font-medium">Tax Deductible</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-bold text-emerald-600">{formatCurrency(taxSummary.deductibleAmount)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Meals 50% + Others 100%</p>
                  </div>

                  {/* Est. Tax Savings */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
                      <DollarSign className="w-5 h-5 text-cyan-500" />
                      <span className="text-sm sm:text-base font-medium">Est. Tax Savings</span>
                      <button
                        onClick={() => setShowTaxInfoModal(true)}
                        className="text-slate-400 hover:text-cyan-600 transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-2xl sm:text-4xl font-bold text-cyan-600">~{formatCurrency(taxSummary.estimatedSavings)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">37.3% rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <Table className="min-w-[400px]">
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="text-left text-xs sm:text-sm font-semibold">
                        Category
                      </TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="text-center text-xs sm:text-sm font-semibold">
                        #
                      </TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-semibold">
                        %
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleCData.map((item) => (
                      <TableRow
                        key={item.key}
                        className={item.amount === 0 ? 'opacity-40' : ''}
                      >
                        <TableCell className="text-xs sm:text-sm">
                          <span className="truncate">{item.category}</span>
                          {item.key === 'meals' && item.amount > 0 && (
                            <span className="text-xs text-orange-600 ml-1 sm:ml-2 hidden sm:inline">(50%)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm font-semibold">
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
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">{item.count}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-muted-foreground">
                          {item.percentage.toFixed(0)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold text-xs sm:text-sm">Total</TableCell>
                      <TableCell className="text-right font-bold text-sm sm:text-lg">
                        {formatCurrency(stats.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs sm:text-sm">
                        {stats.totalCount}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs sm:text-sm">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                <p className="text-muted-foreground text-center py-8 text-sm">No receipts found</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-[400px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left text-xs sm:text-sm font-semibold">
                          Date
                        </TableHead>
                        <TableHead className="text-left text-xs sm:text-sm font-semibold">
                          Vendor
                        </TableHead>
                        <TableHead className="text-right text-xs sm:text-sm font-semibold">
                          Amount
                        </TableHead>
                        <TableHead className="text-left text-xs sm:text-sm font-semibold hidden sm:table-cell">
                          Category
                        </TableHead>
                        <TableHead className="text-center text-xs sm:text-sm font-semibold">
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReceipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground">
                            {formatDate(receipt.date, { shortMonth: true })}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm font-semibold max-w-[100px] truncate">
                            {receipt.merchant}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-right font-semibold text-green-600">
                            {formatCurrency(getReceiptTotal(receipt))}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                            {CATEGORIES[receipt.category] || receipt.category}
                            {receipt.subcategory && (
                              <span className="text-muted-foreground/70"> - {getSubcategoryLabel(receipt.category, receipt.subcategory)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 h-auto py-1 px-2"
                            >
                              <Link href={`/receipts/${receipt.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tax Info Modal */}
      <Dialog open={showTaxInfoModal} onOpenChange={setShowTaxInfoModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">About Your Tax Savings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* How It's Calculated */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">How It's Calculated</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your tax savings are estimated using a 37.3% effective tax rate, which includes:
              </p>
            </div>

            {/* Federal Income Tax Card */}
            <div className="bg-cyan-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Federal Income Tax</span>
                <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded">22%</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This is the most common tax bracket for freelancers and small business owners. When you deduct business expenses, you reduce your taxable income and save 22% in federal taxes.
              </p>
            </div>

            {/* Self-Employment Tax Card */}
            <div className="bg-cyan-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Self-Employment Tax</span>
                <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded">15.3%</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you're self-employed, you pay Social Security (12.4%) and Medicare (2.9%) taxes on your net earnings. Business expenses reduce these taxes as well.
              </p>
            </div>

            {/* Combined Rate Box */}
            <div className="bg-cyan-500 rounded-lg p-4 text-center">
              <span className="text-white font-bold text-lg">Combined Rate: 37.3%</span>
            </div>

            {/* Example Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-emerald-800 mb-2">Example:</h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Deductible expenses: $1,000<br />
                Tax savings: $1,000 × 37.3% = $373<br /><br />
                You keep $373 more in your pocket! 💰
              </p>
            </div>

            {/* What's Not Included */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">What's not included:</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                State income taxes (varies by state, typically 0-13%)<br /><br />
                This means your actual tax savings may be higher than shown here.
              </p>
            </div>

            {/* Disclaimer Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Disclaimer</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                This is an estimate based on typical tax rates for sole proprietors and single-member LLCs. Your actual savings depend on your individual tax situation, including your state, tax bracket, and business structure.
              </p>
              <p className="text-xs text-amber-700 font-semibold mt-2">
                For personalized tax advice, consult a qualified tax professional or CPA.
              </p>
            </div>

            {/* Got it Button */}
            <Button
              onClick={() => setShowTaxInfoModal(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

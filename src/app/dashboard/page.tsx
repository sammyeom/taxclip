'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useDateFormat } from '@/contexts/DateFormatContext';
import { getReceipts, getReceiptStats, getReceiptsByYear } from '@/lib/supabase';
import { Receipt } from '@/types/database';
import Navigation from '@/components/Navigation';
import { TaxExportModal } from '@/components/export';
import {
  Receipt as ReceiptIcon,
  Calendar,
  TrendingUp,
  Tag,
  Upload,
  BarChart3,
  ChevronRight,
  Download,
  CheckCircle2,
  X,
  Zap,
  Search,
  Settings,
  Eye,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ChartSkeleton,
  InsightSkeleton,
  MonthlyData,
  MonthComparisonData,
  CategoryData,
  InsightData,
} from '@/components/dashboard';
import dynamic from 'next/dynamic';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// Dynamic imports for heavy chart components (code splitting)
const DynamicSpendingTrendChart = dynamic(
  () => import('@/components/dashboard/SpendingTrendChart'),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

const DynamicCategoryPieChart = dynamic(
  () => import('@/components/dashboard/CategoryPieChart'),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

const DynamicInsightSection = dynamic(
  () => import('@/components/dashboard/InsightSection'),
  {
    loading: () => <InsightSkeleton />,
    ssr: false,
  }
);

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

// Cyan-focused color palette for charts
const CHART_COLORS = [
  '#06B6D4', // Cyan-500
  '#0891B2', // Cyan-600
  '#3B82F6', // Blue-500
  '#2563EB', // Blue-600
  '#10B981', // Emerald-500
  '#059669', // Emerald-600
  '#6B7280', // Gray-500
  '#4B5563', // Gray-600
  '#0E7490', // Cyan-700
  '#0284C7', // Sky-600
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

// formatDate is now provided by useDateFormat context

// Calculate total from subtotal + tax + tip
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

// Stat Card Component using shadcn Card (new design)
function StatCard({
  icon: Icon,
  value,
  label,
  subLabel,
  trend,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  subLabel?: string;
  trend?: { value: number; label: string };
}) {
  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <Card className="@container/card bg-gradient-to-t from-cyan-500/5 to-card shadow-sm overflow-hidden">
      {/* Mobile layout - matching Account Statistics style */}
      <div className="sm:hidden p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
          <Icon className="w-5 h-5 text-cyan-500 flex-shrink-0" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <div className="text-xl font-bold tabular-nums text-foreground truncate">
          {value}
        </div>
        {subLabel && (
          <div className="text-[10px] text-muted-foreground truncate mt-1">
            {subLabel}
          </div>
        )}
        {trend && (
          <div className="mt-1.5">
            <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      {/* Desktop layout */}
      <CardHeader className="hidden sm:block p-6 pb-4">
        <CardDescription className="flex items-center gap-2 text-base">
          <Icon className="w-6 h-6 text-cyan-500" />
          <span className="font-medium truncate">{label}</span>
        </CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums @[250px]/card:text-4xl truncate">
          {value}
        </CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline" className={isPositive ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
              {isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {/* Footer - desktop only */}
      <CardFooter className="hidden sm:flex flex-col items-start gap-1.5 text-sm">
        {trend && (
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositive ? 'Trending up' : 'Trending down'} this month
            {isPositive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
          </div>
        )}
        {subLabel && (
          <div className="text-muted-foreground">
            {subLabel}
          </div>
        )}
        {trend && (
          <div className="text-muted-foreground">
            {trend.label}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Quick Action Card Component - 2x2 Grid Style
function QuickActionCard({
  icon: Icon,
  title,
  subtitle,
  href,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="group bg-white border border-gray-100 rounded-xl p-4 hover:bg-cyan-50 hover:border-cyan-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
          <Icon className="w-5 h-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm group-hover:text-cyan-700 transition-colors">
            {title}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return href ? <Link href={href}>{content}</Link> : content;
}

// Month Comparison Card Component
function MonthComparisonCard({
  thisMonth,
  lastMonth,
  percentChange,
}: {
  thisMonth: number;
  lastMonth: number;
  percentChange: number | null;
}) {
  const isUp = percentChange !== null && percentChange >= 0;

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          This Month vs Last
          {percentChange !== null && (
            <Badge
              variant="outline"
              className={`ml-auto text-xs ${isUp ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-green-600 border-green-200 bg-green-50'}`}
            >
              {isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {isUp ? '+' : ''}{percentChange.toFixed(1)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">This Month</span>
          <span className="font-bold text-cyan-600 text-lg">{formatCurrency(thisMonth)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Last Month</span>
          <span className="font-medium text-gray-500">{formatCurrency(lastMonth)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all"
            style={{ width: `${Math.min((thisMonth / Math.max(lastMonth, thisMonth, 1)) * 100, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Checkout Success Banner Component
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
    <Alert className="rounded-none border-x-0 border-t-0 bg-green-50 border-green-200">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span className="text-green-800 font-medium">
          Welcome to TaxClip Pro! Your subscription is now active.
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-800 hover:bg-green-100"
          onClick={() => setShow(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { monthlyCount, monthlyLimit, remainingUploads, isPro } = useUsageLimit();
  const { formatDate } = useDateFormat();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredReceiptId, setHoveredReceiptId] = useState<string | null>(null);

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
      total: receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0),
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
    return { total: receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0) };
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
      total: receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0),
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

  // Monthly trend data (6 months) with average
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
        amount: receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    return data;
  }, [allReceipts]);

  // Calculate average for trend chart
  const monthlyAverage = useMemo(() => {
    const total = monthlyData.reduce((sum, d) => sum + d.amount, 0);
    return total / monthlyData.length;
  }, [monthlyData]);

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

  // Category chart data with Cyan-focused colors
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

    // Calculate deductible amount: Meals 50%, Others 100%
    const mealsAmount = stats?.categoryTotals?.meals || 0;
    const otherAmount = (stats?.totalAmount || 0) - mealsAmount;
    const deductibleAmount = (mealsAmount * 0.5) + otherAmount;

    return {
      topCategory: topCat
        ? {
            name: topCat.name,
            amount: topCat.value,
            percentage: stats?.totalAmount ? (topCat.value / stats.totalAmount) * 100 : 0,
          }
        : null,
      averageAmount: stats?.totalCount ? stats.totalAmount / stats.totalCount : 0,
      estimatedTaxBenefit: deductibleAmount * 0.22,
      totalCount: stats?.totalCount || 0,
      monthlyChange: monthComparison,
    };
  }, [categoryData, stats, monthComparison]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Loading Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 sm:h-36 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="lg:col-span-3 h-96 rounded-xl" />
            <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          </div>
        </main>
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Welcome back!
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Here's your financial overview
          </p>
        </div>

        {/* Usage Banner for Free Users */}
        {!isPro && (
          <div className="mb-6 bg-gradient-to-r from-slate-50 to-cyan-50 border border-cyan-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-semibold text-slate-700">Monthly Usage</span>
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-xs font-medium">
                    Free
                  </span>
                </div>
                <Progress
                  value={monthlyLimit === Infinity ? 0 : (monthlyCount / monthlyLimit) * 100}
                  className="h-2 w-24 sm:w-32"
                />
                <span className="text-base sm:text-lg font-semibold text-slate-700">
                  {monthlyCount}/{monthlyLimit === Infinity ? '∞' : monthlyLimit}
                </span>
                <span className="text-sm text-slate-500 hidden sm:inline">
                  ({remainingUploads === 0 ? 'Limit reached' : `${remainingUploads} left`})
                </span>
              </div>
              <Link href="/settings?tab=billing">
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm h-9">
                  <Zap className="w-4 h-4 mr-1" />
                  Upgrade
                </Button>
              </Link>
            </div>
            {monthlyCount >= 5 && monthlyLimit !== Infinity && (
              <p className="text-sm text-slate-600 mt-3">
                {monthlyCount === 5 && "You're halfway there! 5 receipts organized, 5 more to go. You're doing great on your tax prep!"}
                {monthlyCount === 6 && "Keep the momentum! Each scan is a step toward a stress-free tax season. You have 4 free slots left."}
                {monthlyCount === 7 && "TaxClip is working for you! 7 expenses captured. Thinking of going bigger? Pro offers unlimited peace of mind."}
                {monthlyCount === 8 && "Almost at the limit! Just 2 scans left. Upgrade to Pro for less than the cost of two coffees ($9.99) and never stop."}
                {monthlyCount === 9 && "Final countdown! Only 1 scan left. Don't let your bookkeeping pause here. Go Pro and keep winning."}
                {monthlyCount >= 10 && "Free limit reached. Unlock unlimited scans. Secure your tax savings for the whole year and save 20% today!"}
              </p>
            )}
          </div>
        )}

        {/* Stats Cards - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={ReceiptIcon}
            value={stats?.totalCount || 0}
            label="Total Receipts"
            subLabel="All time"
          />
          <StatCard
            icon={Calendar}
            value={formatCurrency(currentMonthStats.total)}
            label="This Month"
            trend={monthComparison !== null ? { value: monthComparison, label: 'vs last month' } : undefined}
          />
          <StatCard
            icon={TrendingUp}
            value={formatCurrency(currentYearStats.total)}
            label="This Year"
            subLabel={`${new Date().getFullYear()} YTD`}
          />
          <StatCard
            icon={Tag}
            value={topCategory?.name || 'N/A'}
            label="Top Category"
            subLabel="Most frequent"
          />
        </div>

        {/* Upload CTA */}
        <Link href="/upload" className="block mb-8">
          <div className="bg-gradient-to-r from-cyan-500 to-sky-500 rounded-xl p-6 sm:p-8 text-white hover:from-cyan-600 hover:to-sky-600 transition-all cursor-pointer shadow-lg hover:shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">Upload New Receipt</h3>
                  <p className="text-cyan-100 text-sm sm:text-base">Snap, scan, and organize in seconds with AI</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white text-cyan-600 px-6 py-3 rounded-lg font-semibold hover:bg-cyan-50 transition-colors">
                <Upload className="w-5 h-5" />
                Upload Now
              </div>
            </div>
          </div>
        </Link>

        {/* Two-column layout: 60% Left / 40% Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Left Column - 60% (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Recent Receipts - Improved */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Recent Receipts</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/receipts" className="text-primary">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentReceipts.length === 0 ? (
                  <div className="text-center py-8">
                    <ReceiptIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No receipts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="relative"
                        onMouseEnter={() => setHoveredReceiptId(receipt.id)}
                        onMouseLeave={() => setHoveredReceiptId(null)}
                      >
                        <Link href={`/receipts/${receipt.id}`}>
                          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-cyan-50 transition-colors border border-gray-100 hover:border-cyan-200">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                              {receipt.image_url ? (
                                <Image
                                  src={receipt.image_url}
                                  alt=""
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <ReceiptIcon className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm truncate text-gray-900">
                                  {receipt.merchant}
                                </p>
                                <p className="text-cyan-600 font-bold text-sm ml-2">
                                  {formatCurrency(getReceiptTotal(receipt))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">{formatDate(receipt.date, { shortMonth: true })}</p>
                                <span className="text-gray-300">|</span>
                                <Badge
                                  variant="outline"
                                  className="text-xs text-gray-500 border-gray-200"
                                >
                                  {CATEGORIES[receipt.category] || receipt.category}
                                </Badge>
                              </div>
                            </div>
                            {/* Hover Action Buttons */}
                            {hoveredReceiptId === receipt.id && (
                              <div className="hidden sm:flex items-center gap-1 absolute right-3">
                                <Link href={`/receipts/${receipt.id}`} onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="outline" className="h-8 px-2 bg-white hover:bg-cyan-50 border-cyan-200">
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Link href={`/receipts/${receipt.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="outline" className="h-8 px-2 bg-white hover:bg-cyan-50 border-cyan-200">
                                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                                    Edit
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Spending Trend with Average Line */}
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <DynamicSpendingTrendChart
                monthlyData={monthlyData}
                comparisonData={comparisonData}
                averageAmount={monthlyAverage}
              />
            </Suspense>

            {/* Spending by Category */}
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <DynamicCategoryPieChart data={categoryData} totalAmount={stats?.totalAmount || 0} />
            </Suspense>
          </div>

          {/* Right Column - 40% (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions - 2x2 Grid (No Upload) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <QuickActionCard
                    icon={Download}
                    title="Export"
                    subtitle="Download for tax filing"
                    onClick={() => setIsExportModalOpen(true)}
                  />
                  <QuickActionCard
                    icon={BarChart3}
                    title="Reports"
                    subtitle="View spending analytics"
                    href="/reports"
                  />
                  <QuickActionCard
                    icon={Search}
                    title="Search"
                    subtitle="Find any receipt"
                    href="/receipts"
                  />
                  <QuickActionCard
                    icon={Settings}
                    title="Settings"
                    subtitle="Account preferences"
                    href="/settings"
                  />
                </div>
              </CardContent>
            </Card>

            {/* This Month vs Last Month */}
            <MonthComparisonCard
              thisMonth={currentMonthStats.total}
              lastMonth={lastMonthStats.total}
              percentChange={monthComparison}
            />

            {/* Insights - Reordered */}
            <Suspense fallback={<InsightSkeleton />}>
              <DynamicInsightSection data={insightData} />
            </Suspense>
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

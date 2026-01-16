'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  ChartSkeleton,
  InsightSkeleton,
  MonthlyData,
  MonthComparisonData,
  CategoryData,
  InsightData,
} from '@/components/dashboard';
import dynamic from 'next/dynamic';
import { getSubcategoryLabel } from '@/constants/irs-categories';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

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

const CATEGORY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  advertising: 'default',
  office_expense: 'secondary',
  supplies: 'default',
  meals: 'secondary',
  travel: 'default',
  utilities: 'secondary',
  car_truck: 'default',
  insurance: 'destructive',
  legal_professional: 'secondary',
  rent_lease: 'default',
  repairs_maintenance: 'secondary',
  other: 'outline',
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
    <Card className="@container/card bg-gradient-to-t from-cyan-500/5 to-card shadow-sm">
      {/* Mobile compact header */}
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
        <CardDescription className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-500" />
          <span className="font-medium truncate">{label}</span>
        </CardDescription>
        <CardTitle className="text-lg sm:text-3xl font-bold tabular-nums @[250px]/card:text-4xl truncate">
          {value}
        </CardTitle>
        {trend && (
          <CardAction className="hidden sm:block">
            <Badge variant="outline" className={isPositive ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
              {isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {/* Footer - hidden on mobile for compact 2x2 layout */}
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
      {/* Mobile-only subLabel */}
      {subLabel && (
        <div className="sm:hidden px-3 pb-3 text-[10px] text-muted-foreground truncate">
          {subLabel}
        </div>
      )}
      {/* Mobile-only trend indicator */}
      {trend && (
        <div className="sm:hidden px-3 pb-3">
          <span className={`text-[10px] font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
        </div>
      )}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Recent Receipts */}
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
                      <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors border">
                          <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                            {receipt.image_url ? (
                              <Image
                                src={receipt.image_url}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <ReceiptIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm truncate">
                                {receipt.merchant}
                              </p>
                              <p className="text-green-600 font-bold text-sm ml-2">
                                {formatCurrency(receipt.total)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{formatDate(receipt.date)}</p>
                              <Badge
                                variant={CATEGORY_VARIANTS[receipt.category] || 'outline'}
                                className="hidden sm:inline-flex text-xs"
                              >
                                {CATEGORIES[receipt.category] || receipt.category}
                              </Badge>
                              {receipt.subcategory && (
                                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                                  - {getSubcategoryLabel(receipt.category, receipt.subcategory)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white" asChild>
                  <Link href="/upload">
                    <Upload className="w-4 h-4 mr-2" /> Upload Receipt
                  </Link>
                </Button>
                <Button
                  variant="default"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  onClick={() => setIsExportModalOpen(true)}
                >
                  <Download className="w-4 h-4 mr-2" /> Export for Tax Filing
                </Button>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/receipts">
                    <FileText className="w-4 h-4 mr-2" /> View All Receipts
                  </Link>
                </Button>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/reports">
                    <BarChart3 className="w-4 h-4 mr-2" /> Generate Report
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Charts with Suspense for progressive loading */}
          <div className="space-y-6">
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <DynamicSpendingTrendChart monthlyData={monthlyData} comparisonData={comparisonData} />
            </Suspense>
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <DynamicCategoryPieChart data={categoryData} totalAmount={stats?.totalAmount || 0} />
            </Suspense>
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
